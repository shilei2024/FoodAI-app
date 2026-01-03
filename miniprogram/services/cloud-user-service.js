// miniprogram/services/cloud-user-service.js
const config = require('../constants/config.js')

/**
 * 云端用户服务类
 * 提供基于云开发的用户认证、数据同步、VIP管理等功能
 */
class CloudUserService {
  constructor() {
    this.config = config
    this.userInfoKey = config.auth.userInfoKey || 'userInfo'
    this.vipInfoKey = config.auth.vipInfoKey || 'userVipInfo'
    this.tokenKey = config.auth.tokenKey || 'token'
    this.cloudEnabled = false
    
    // 检查云开发是否可用
    if (wx.cloud) {
      this.cloudEnabled = true
      console.log('云开发可用，启用云端用户服务')
    } else {
      console.warn('云开发不可用，将使用本地用户服务')
    }
  }

  /**
   * 微信登录（云端）
   */
  async wechatLogin(userInfo = null) {
    try {
      // 1. 获取登录凭证
      const loginResult = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        })
      })

      if (!loginResult.code) {
        throw new Error('登录失败：无法获取登录凭证')
      }

      console.log('获取登录凭证成功，开始云端认证')

      // 2. 调用云函数进行微信登录
      const cloudResult = await wx.cloud.callFunction({
        name: 'user-auth',
        data: {
          action: 'wechatLogin',
          code: loginResult.code,
          userInfo: userInfo
        }
      })

      const result = cloudResult.result
      
      if (!result.success) {
        throw new Error(result.error || '云端登录失败')
      }

      const { token, userInfo: cloudUserInfo, isNewUser } = result.data

      // 3. 保存登录状态到本地
      const localUserInfo = {
        ...cloudUserInfo,
        token: token,
        loginTime: Date.now(),
        isLoggedIn: true,
        isNewUser: isNewUser
      }

      this.saveLocalUserInfo(localUserInfo)
      
      // 4. 同步本地使用次数到云端
      await this.syncLocalUsageToCloud(cloudUserInfo.openid)

      return {
        success: true,
        data: localUserInfo,
        message: isNewUser ? '欢迎新用户！' : '登录成功'
      }

    } catch (error) {
      console.error('微信登录失败:', error)
      
      // 降级到本地登录
      if (!this.cloudEnabled) {
        return this.localLogin(userInfo)
      }
      
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      }
    }
  }

  /**
   * 本地登录（降级方案）
   */
  async localLogin(userInfo = null) {
    try {
      const localUserInfo = {
        openid: 'local_' + Date.now(),
        nickName: userInfo?.nickName || '本地用户' + Date.now().toString().slice(-4),
        avatarUrl: userInfo?.avatarUrl || '/images/default-avatar.png',
        isVip: false,
        vipExpireDate: null,
        token: 'local_token_' + Date.now(),
        loginTime: Date.now(),
        isLoggedIn: true,
        isNewUser: true
      }

      this.saveLocalUserInfo(localUserInfo)

      return {
        success: true,
        data: localUserInfo,
        message: '本地登录成功（云端服务不可用）'
      }
    } catch (error) {
      console.error('本地登录失败:', error)
      return {
        success: false,
        error: error.message,
        code: -1
      }
    }
  }

  /**
   * 获取用户信息（优先从云端获取）
   */
  async getUserInfo() {
    try {
      const localUserInfo = this.getLocalUserInfo()
      
      if (!localUserInfo || !localUserInfo.openid) {
        return null
      }

      // 如果云端可用，从云端获取最新信息
      if (this.cloudEnabled && localUserInfo.token && localUserInfo.token.startsWith('cloud_')) {
        const cloudResult = await wx.cloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'getUserInfo',
            userId: localUserInfo.openid
          }
        })

        const result = cloudResult.result
        
        if (result.success) {
          const cloudData = result.data
          
          // 合并云端和本地数据
          const mergedUserInfo = {
            ...localUserInfo,
            ...cloudData.userInfo,
            vipInfo: cloudData.vipInfo,
            stats: cloudData.stats,
            todayUsage: cloudData.todayUsage
          }

          // 更新本地存储
          this.saveLocalUserInfo(mergedUserInfo)
          
          return mergedUserInfo
        }
      }

      return localUserInfo

    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 降级到本地数据
      return this.getLocalUserInfo()
    }
  }

  /**
   * 更新用户信息到云端
   */
  async updateUserInfo(userInfo) {
    try {
      const localUserInfo = this.getLocalUserInfo()
      
      if (!localUserInfo || !localUserInfo.openid) {
        throw new Error('用户未登录')
      }

      // 更新本地数据
      const updatedUserInfo = {
        ...localUserInfo,
        ...userInfo,
        updateTime: Date.now()
      }

      this.saveLocalUserInfo(updatedUserInfo)

      // 同步到云端
      if (this.cloudEnabled && localUserInfo.token && localUserInfo.token.startsWith('cloud_')) {
        await wx.cloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'updateUserInfo',
            userId: localUserInfo.openid,
            userInfo: userInfo
          }
        })
      }

      return {
        success: true,
        message: '用户信息更新成功'
      }

    } catch (error) {
      console.error('更新用户信息失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 更新使用次数（同步到云端）
   */
  async updateUsage(type, count = 1) {
    try {
      const localUserInfo = this.getLocalUserInfo()
      
      if (!localUserInfo || !localUserInfo.openid) {
        throw new Error('用户未登录')
      }

      // 更新本地使用次数
      const today = new Date().toISOString().split('T')[0]
      const usageKey = `daily_usage_${today}`
      const currentUsage = wx.getStorageSync(usageKey) || {
        photoCount: 0,
        searchCount: 0,
        shareCount: 0
      }

      if (type === 'photo') {
        currentUsage.photoCount = (currentUsage.photoCount || 0) + count
      } else if (type === 'search') {
        currentUsage.searchCount = (currentUsage.searchCount || 0) + count
      } else if (type === 'share') {
        currentUsage.shareCount = (currentUsage.shareCount || 0) + count
      }

      currentUsage.lastUpdate = Date.now()
      wx.setStorageSync(usageKey, currentUsage)

      // 同步到云端
      if (this.cloudEnabled && localUserInfo.token && localUserInfo.token.startsWith('cloud_')) {
        await wx.cloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'updateUserUsage',
            userId: localUserInfo.openid,
            type: type,
            count: count
          }
        })
      }

      return {
        success: true,
        data: currentUsage,
        message: '使用次数更新成功'
      }

    } catch (error) {
      console.error('更新使用次数失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取用户使用限制（从云端获取）
   */
  async getUserLimits() {
    try {
      const localUserInfo = this.getLocalUserInfo()
      
      if (!localUserInfo || !localUserInfo.openid) {
        // 游客状态
        return {
          photo: {
            dailyLimit: 5,
            used: 0,
            remaining: 0,
            canUse: false,
            reason: '请先登录'
          },
          search: {
            dailyLimit: 10,
            used: 0,
            remaining: 0,
            canUse: false,
            reason: '请先登录'
          },
          share: {
            dailyLimit: 5,
            used: 0,
            remaining: 5,
            canUse: true
          },
          isVip: false,
          isGuest: true
        }
      }

      // 如果云端可用，从云端获取限制
      if (this.cloudEnabled && localUserInfo.token && localUserInfo.token.startsWith('cloud_')) {
        const cloudResult = await wx.cloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'getUserLimits',
            userId: localUserInfo.openid
          }
        })

        const result = cloudResult.result
        
        if (result.success) {
          const { limits, isVip } = result.data
          
          return {
            photo: {
              dailyLimit: limits.photo.dailyLimit,
              used: limits.photo.used,
              remaining: limits.photo.remaining,
              canUse: limits.photo.remaining > 0,
              reason: limits.photo.remaining <= 0 ? '今日拍照识别次数已用完' : ''
            },
            search: {
              dailyLimit: limits.search.dailyLimit,
              used: limits.search.used,
              remaining: limits.search.remaining,
              canUse: limits.search.remaining > 0,
              reason: limits.search.remaining <= 0 ? '今日搜索识别次数已用完' : ''
            },
            share: {
              dailyLimit: limits.share.dailyLimit,
              used: limits.share.used,
              remaining: limits.share.remaining,
              canUse: limits.share.remaining > 0
            },
            isVip: isVip,
            isGuest: false
          }
        }
      }

      // 降级到本地限制检查
      return this.getLocalUserLimits(localUserInfo)

    } catch (error) {
      console.error('获取用户限制失败:', error)
      // 降级到本地检查
      const localUserInfo = this.getLocalUserInfo()
      return this.getLocalUserLimits(localUserInfo)
    }
  }

  /**
   * 获取本地用户限制
   */
  getLocalUserLimits(userInfo) {
    if (!userInfo) {
      return {
        photo: { dailyLimit: 5, used: 0, remaining: 0, canUse: false, reason: '请先登录' },
        search: { dailyLimit: 10, used: 0, remaining: 0, canUse: false, reason: '请先登录' },
        share: { dailyLimit: 5, used: 0, remaining: 5, canUse: true },
        isVip: false,
        isGuest: true
      }
    }

    const today = new Date().toISOString().split('T')[0]
    const usageKey = `daily_usage_${today}`
    const usage = wx.getStorageSync(usageKey) || {
      photoCount: 0,
      searchCount: 0,
      shareCount: 0
    }

    const isVip = userInfo.isVip || false
    const photoLimit = isVip ? 999 : 5
    const searchLimit = isVip ? 999 : 10
    const shareLimit = 5

    return {
      photo: {
        dailyLimit: photoLimit,
        used: usage.photoCount || 0,
        remaining: photoLimit - (usage.photoCount || 0),
        canUse: (usage.photoCount || 0) < photoLimit,
        reason: (usage.photoCount || 0) >= photoLimit ? '今日拍照识别次数已用完' : ''
      },
      search: {
        dailyLimit: searchLimit,
        used: usage.searchCount || 0,
        remaining: searchLimit - (usage.searchCount || 0),
        canUse: (usage.searchCount || 0) < searchLimit,
        reason: (usage.searchCount || 0) >= searchLimit ? '今日搜索识别次数已用完' : ''
      },
      share: {
        dailyLimit: shareLimit,
        used: usage.shareCount || 0,
        remaining: shareLimit - (usage.shareCount || 0),
        canUse: (usage.shareCount || 0) < shareLimit
      },
      isVip: isVip,
      isGuest: false
    }
  }

  /**
   * 同步本地使用次数到云端
   */
  async syncLocalUsageToCloud(userId) {
    try {
      if (!this.cloudEnabled) {
        return { success: true, message: '云开发不可用，跳过同步' }
      }

      const today = new Date().toISOString().split('T')[0]
      const usageKey = `daily_usage_${today}`
      const usage = wx.getStorageSync(usageKey)

      if (!usage) {
        return { success: true, message: '无本地使用数据需要同步' }
      }

      // 同步拍照次数
      if (usage.photoCount > 0) {
        await wx.cloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'updateUserUsage',
            userId: userId,
            type: 'photo',
            count: usage.photoCount
          }
        })
      }

      // 同步搜索次数
      if (usage.searchCount > 0) {
        await wx.cloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'updateUserUsage',
            userId: userId,
            type: 'search',
            count: usage.searchCount
          }
        })
      }

      // 同步分享次数
      if (usage.shareCount > 0) {
        await wx.cloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'updateUserUsage',
            userId: userId,
            type: 'share',
            count: usage.shareCount
          }
        })
      }

      console.log('本地使用次数同步到云端成功')
      return { success: true, message: '同步成功' }

    } catch (error) {
      console.error('同步使用次数失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 退出登录
   */
  async logout() {
    try {
      // 清除本地数据
      this.clearLocalUserInfo()
      
      return {
        success: true,
        message: '退出登录成功'
      }
    } catch (error) {
      console.error('退出登录失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 保存用户信息到本地
   */
  saveLocalUserInfo(userInfo) {
    try {
      wx.setStorageSync(this.userInfoKey, userInfo)
      return true
    } catch (error) {
      console.error('保存用户信息失败:', error)
      return false
    }
  }

  /**
   * 获取本地用户信息
   */
  getLocalUserInfo() {
    try {
      const userInfo = wx.getStorageSync(this.userInfoKey)
      return userInfo || null
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  }

  /**
   * 清除本地用户信息
   */
  clearLocalUserInfo() {
    try {
      wx.removeStorageSync(this.userInfoKey)
      wx.removeStorageSync(this.vipInfoKey)
      wx.removeStorageSync(this.tokenKey)
      
      // 清除所有每日使用记录
      const keys = wx.getStorageInfoSync().keys
      keys.forEach(key => {
        if (key.startsWith('daily_usage_')) {
          wx.removeStorageSync(key)
        }
      })
      
      return true
    } catch (error) {
      console.error('清除用户信息失败:', error)
      return false
    }
  }

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const userInfo = this.getLocalUserInfo()
    return !!(userInfo && userInfo.isLoggedIn)
  }

  /**
   * 检查是否是VIP
   */
  isVip() {
    const userInfo = this.getLocalUserInfo()
    return !!(userInfo && userInfo.isVip)
  }

  /**
   * 获取今日使用次数
   */
  getTodayUsageCount() {
    const today = new Date().toISOString().split('T')[0]
    const usageKey = `daily_usage_${today}`
    const usage = wx.getStorageSync(usageKey) || {
      photoCount: 0,
      searchCount: 0,
      shareCount: 0
    }
    return usage
  }
}

// 创建单例实例
const cloudUserService = new CloudUserService()

module.exports = {
  // 登录相关
  wechatLogin: (userInfo) => cloudUserService.wechatLogin(userInfo),
  logout: () => cloudUserService.logout(),
  checkLoginStatus: () => cloudUserService.checkLoginStatus(),
  
  // 用户信息
  getUserInfo: () => cloudUserService.getUserInfo(),
  updateUserInfo: (userInfo) => cloudUserService.updateUserInfo(userInfo),
  
  // 使用次数
  updateUsage: (type, count) => cloudUserService.updateUsage(type, count),
  getUserLimits: () => cloudUserService.getUserLimits(),
  getTodayUsageCount: () => cloudUserService.getTodayUsageCount(),
  
  // VIP相关
  isVip: () => cloudUserService.isVip(),
  
  // 实例
  service: cloudUserService
}
