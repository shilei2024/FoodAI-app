// services/user-service.js
const config = require('../constants/config.js')

/**
 * 用户服务类
 * 提供用户信息管理、登录状态检查、VIP状态管理等功能
 */
class UserService {
  constructor() {
    this.config = config
    this.userInfoKey = config.auth.userInfoKey || 'userInfo'
    this.vipInfoKey = config.auth.vipInfoKey || 'userVipInfo'
    this.tokenKey = config.auth.tokenKey || 'token'
  }

  /**
   * 获取用户信息
   * @returns {Object|null} 用户信息
   */
  getUserInfo() {
    try {
      const userInfo = wx.getStorageSync(this.userInfoKey)
      return userInfo || null
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  }

  /**
   * 保存用户信息
   * @param {Object} userInfo 用户信息
   * @returns {boolean} 是否保存成功
   */
  saveUserInfo(userInfo) {
    try {
      wx.setStorageSync(this.userInfoKey, userInfo)
      return true
    } catch (error) {
      console.error('保存用户信息失败:', error)
      return false
    }
  }

  /**
   * 清除用户信息
   * @returns {boolean} 是否清除成功
   */
  clearUserInfo() {
    try {
      wx.removeStorageSync(this.userInfoKey)
      wx.removeStorageSync(this.vipInfoKey)
      wx.removeStorageSync(this.tokenKey)
      return true
    } catch (error) {
      console.error('清除用户信息失败:', error)
      return false
    }
  }

  /**
   * 检查登录状态
   * @returns {boolean} 是否已登录
   */
  checkLoginStatus() {
    const userInfo = this.getUserInfo()
    return !!userInfo
  }

  /**
   * 微信登录
   * 注意：wx.getUserProfile 已废弃，现在需要使用 button 组件的 open-type="chooseAvatar" 和 nickname input
   * @returns {Promise<Object>} 登录结果
   */
  async login() {
    try {
      // 1. 获取登录凭证 code
      const loginResult = await new Promise((resolve, reject) => {
        wx.login({
          success: resolve,
          fail: reject
        })
      })

      if (!loginResult.code) {
        throw new Error('登录失败：无法获取登录凭证')
      }

      console.log('获取登录凭证成功:', loginResult.code)

      // 2. 保存基础登录信息
      const basicUserInfo = {
        openId: 'temp_' + Date.now(), // 临时ID，实际应该从后端获取
        loginCode: loginResult.code,
        loginTime: Date.now(),
        isLoggedIn: true
      }

      this.saveUserInfo(basicUserInfo)

      return {
        success: true,
        data: basicUserInfo,
        message: '登录成功'
      }

    } catch (error) {
      console.error('登录失败:', error)
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      }
    }
  }

  /**
   * 更新用户头像
   * 使用 button 组件的 open-type="chooseAvatar" 获取头像后调用此方法
   * @param {string} avatarUrl 头像URL
   * @returns {boolean} 是否更新成功
   */
  updateAvatar(avatarUrl) {
    try {
      const userInfo = this.getUserInfo() || {}
      userInfo.avatarUrl = avatarUrl
      userInfo.updateTime = Date.now()
      return this.saveUserInfo(userInfo)
    } catch (error) {
      console.error('更新头像失败:', error)
      return false
    }
  }

  /**
   * 更新用户昵称
   * 使用 input 组件的 type="nickname" 获取昵称后调用此方法
   * @param {string} nickName 昵称
   * @returns {boolean} 是否更新成功
   */
  updateNickName(nickName) {
    try {
      const userInfo = this.getUserInfo() || {}
      userInfo.nickName = nickName
      userInfo.updateTime = Date.now()
      return this.saveUserInfo(userInfo)
    } catch (error) {
      console.error('更新昵称失败:', error)
      return false
    }
  }

  /**
   * 获取VIP信息
   * @returns {Object} VIP信息
   */
  getVipInfo() {
    try {
      const vipInfo = wx.getStorageSync(this.vipInfoKey)
      
      if (!vipInfo) {
        return {
          isVip: false,
          expireDate: null,
          planType: null
        }
      }

      // 检查VIP是否过期
      if (vipInfo.expireDate) {
        const expireDate = new Date(vipInfo.expireDate)
        const now = new Date()
        if (expireDate < now) {
          // VIP已过期
          vipInfo.isVip = false
          wx.setStorageSync(this.vipInfoKey, vipInfo)
        }
      }

      return vipInfo
    } catch (error) {
      console.error('获取VIP信息失败:', error)
      return {
        isVip: false,
        expireDate: null,
        planType: null
      }
    }
  }

  /**
   * 检查是否是VIP
   * @returns {boolean} 是否是VIP
   */
  isVip() {
    const vipInfo = this.getVipInfo()
    return vipInfo.isVip === true
  }

  /**
   * 更新VIP状态
   * @param {Object} vipData VIP数据
   * @returns {boolean} 是否更新成功
   */
  updateVipStatus(vipData) {
    try {
      const currentVipInfo = this.getVipInfo()
      const newVipInfo = {
        ...currentVipInfo,
        ...vipData,
        updateTime: Date.now()
      }
      wx.setStorageSync(this.vipInfoKey, newVipInfo)
      return true
    } catch (error) {
      console.error('更新VIP状态失败:', error)
      return false
    }
  }

  /**
   * 获取今日使用次数
   * @returns {number} 今日使用次数
   */
  getTodayUsageCount() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const usageKey = `usage_${today}`
      const usage = wx.getStorageSync(usageKey)
      return usage || 0
    } catch (error) {
      console.error('获取今日使用次数失败:', error)
      return 0
    }
  }

  /**
   * 增加今日使用次数
   * @returns {number} 增加后的使用次数
   */
  incrementTodayUsage() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const usageKey = `usage_${today}`
      const currentUsage = this.getTodayUsageCount()
      const newUsage = currentUsage + 1
      wx.setStorageSync(usageKey, newUsage)
      return newUsage
    } catch (error) {
      console.error('增加使用次数失败:', error)
      return 0
    }
  }

  /**
   * 检查是否可以使用AI识别功能
   * @returns {Object} 检查结果
   */
  checkAIUsagePermission() {
    const vipInfo = this.getVipInfo()
    const todayUsage = this.getTodayUsageCount()
    
    // VIP用户
    if (vipInfo.isVip) {
      const vipLimit = this.config.features.aiRecognition.vipDailyLimit || 100
      return {
        canUse: todayUsage < vipLimit,
        isVip: true,
        remaining: vipLimit - todayUsage,
        limit: vipLimit,
        message: todayUsage < vipLimit ? '' : 'VIP今日使用次数已达上限'
      }
    }
    
    // 普通用户
    const freeLimit = this.config.features.aiRecognition.dailyLimit || 10
    return {
      canUse: todayUsage < freeLimit,
      isVip: false,
      remaining: freeLimit - todayUsage,
      limit: freeLimit,
      message: todayUsage < freeLimit ? '' : '今日免费次数已用完，开通VIP获取更多次数'
    }
  }

  /**
   * 获取用户设置
   * @returns {Object} 用户设置
   */
  getUserSettings() {
    try {
      const settings = wx.getStorageSync('user_settings')
      return settings || {
        // 默认设置
        theme: 'light',
        language: 'zh-CN',
        notifications: true,
        autoSave: true,
        imageQuality: 'high'
      }
    } catch (error) {
      console.error('获取用户设置失败:', error)
      return {}
    }
  }

  /**
   * 更新用户设置
   * @param {Object} settings 设置
   * @returns {boolean} 是否更新成功
   */
  updateUserSettings(settings) {
    try {
      const currentSettings = this.getUserSettings()
      const newSettings = {
        ...currentSettings,
        ...settings,
        updateTime: Date.now()
      }
      wx.setStorageSync('user_settings', newSettings)
      return true
    } catch (error) {
      console.error('更新用户设置失败:', error)
      return false
    }
  }

  /**
   * 获取用户偏好（饮食偏好）
   * @returns {Object} 用户偏好
   */
  getUserPreferences() {
    try {
      const preferences = wx.getStorageSync('user_preferences')
      return preferences || {
        cuisine: '中式',
        dietType: '均衡',
        spiceLevel: '中等',
        allergies: [],
        dislikes: []
      }
    } catch (error) {
      console.error('获取用户偏好失败:', error)
      return {}
    }
  }

  /**
   * 更新用户偏好
   * @param {Object} preferences 偏好
   * @returns {boolean} 是否更新成功
   */
  updateUserPreferences(preferences) {
    try {
      const currentPreferences = this.getUserPreferences()
      const newPreferences = {
        ...currentPreferences,
        ...preferences,
        updateTime: Date.now()
      }
      wx.setStorageSync('user_preferences', newPreferences)
      return true
    } catch (error) {
      console.error('更新用户偏好失败:', error)
      return false
    }
  }

  /**
   * 获取用户统计数据
   * @returns {Object} 统计数据
   */
  getUserStats() {
    try {
      const stats = wx.getStorageSync('userStats')
      return stats || {
        totalRecords: 0,
        aiRecords: 0,
        favoriteFoods: 0,
        continuousDays: 0,
        firstUseDate: null,
        lastUseDate: null
      }
    } catch (error) {
      console.error('获取用户统计失败:', error)
      return {}
    }
  }

  /**
   * 更新用户统计数据
   * @param {Object} stats 统计数据
   * @returns {boolean} 是否更新成功
   */
  updateUserStats(stats) {
    try {
      const currentStats = this.getUserStats()
      const newStats = {
        ...currentStats,
        ...stats,
        lastUseDate: new Date().toISOString()
      }
      
      // 如果是首次使用，记录首次使用日期
      if (!newStats.firstUseDate) {
        newStats.firstUseDate = new Date().toISOString()
      }
      
      wx.setStorageSync('userStats', newStats)
      return true
    } catch (error) {
      console.error('更新用户统计失败:', error)
      return false
    }
  }

  /**
   * 退出登录
   * @returns {boolean} 是否退出成功
   */
  logout() {
    try {
      // 清除用户信息
      this.clearUserInfo()
      
      // 清除其他用户相关数据
      wx.removeStorageSync('user_settings')
      wx.removeStorageSync('userStats')
      
      // 保留用户偏好（可选）
      // wx.removeStorageSync('user_preferences')
      
      return true
    } catch (error) {
      console.error('退出登录失败:', error)
      return false
    }
  }
}

// 创建单例实例
const userService = new UserService()

module.exports = {
  // 用户信息
  getUserInfo: () => userService.getUserInfo(),
  saveUserInfo: (userInfo) => userService.saveUserInfo(userInfo),
  clearUserInfo: () => userService.clearUserInfo(),
  
  // 登录相关
  checkLoginStatus: () => userService.checkLoginStatus(),
  login: () => userService.login(),
  logout: () => userService.logout(),
  
  // 用户资料更新（新版API）
  updateAvatar: (avatarUrl) => userService.updateAvatar(avatarUrl),
  updateNickName: (nickName) => userService.updateNickName(nickName),
  
  // VIP相关
  getVipInfo: () => userService.getVipInfo(),
  isVip: () => userService.isVip(),
  updateVipStatus: (vipData) => userService.updateVipStatus(vipData),
  
  // 使用次数
  getTodayUsageCount: () => userService.getTodayUsageCount(),
  incrementTodayUsage: () => userService.incrementTodayUsage(),
  checkAIUsagePermission: () => userService.checkAIUsagePermission(),
  
  // 用户设置
  getUserSettings: () => userService.getUserSettings(),
  updateUserSettings: (settings) => userService.updateUserSettings(settings),
  
  // 用户偏好
  getUserPreferences: () => userService.getUserPreferences(),
  updateUserPreferences: (preferences) => userService.updateUserPreferences(preferences),
  
  // 用户统计
  getUserStats: () => userService.getUserStats(),
  updateUserStats: (stats) => userService.updateUserStats(stats),
  
  // 实例
  service: userService
}

