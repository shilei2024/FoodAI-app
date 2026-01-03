// utils/auth.js
const config = require('../constants/config.js')

/**
 * 权限验证工具类
 */
class AuthUtils {
  constructor() {
    this.scopes = config.auth.scopes || {}
    this.tokenKey = config.auth.tokenKey || 'token'
    this.userInfoKey = config.auth.userInfoKey || 'userInfo'
  }

  /**
   * 检查登录状态
   * @returns {boolean} 是否已登录
   */
  checkLogin() {
    const token = wx.getStorageSync(this.tokenKey)
    const userInfo = wx.getStorageSync(this.userInfoKey)
    
    return !!(token && userInfo)
  }

  /**
   * 获取用户信息
   * @returns {Object|null} 用户信息
   */
  getUserInfo() {
    return wx.getStorageSync(this.userInfoKey) || null
  }

  /**
   * 获取token
   * @returns {string|null} token
   */
  getToken() {
    return wx.getStorageSync(this.tokenKey) || null
  }

  /**
   * 保存用户信息
   * @param {Object} userInfo 用户信息
   * @param {string} token token
   */
  saveUserInfo(userInfo, token = null) {
    if (userInfo) {
      wx.setStorageSync(this.userInfoKey, userInfo)
    }
    if (token) {
      wx.setStorageSync(this.tokenKey, token)
    }
  }

  /**
   * 清除用户信息
   */
  clearUserInfo() {
    wx.removeStorageSync(this.tokenKey)
    wx.removeStorageSync(this.userInfoKey)
    wx.removeStorageSync('userVipInfo')
  }

  /**
   * 检查权限
   * @param {string} scope 权限范围
   * @returns {Promise} Promise对象
   */
  checkPermission(scope) {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting[scope] === undefined) {
            // 未询问过，请求授权
            this.requestPermission(scope)
              .then(resolve)
              .catch(reject)
          } else if (res.authSetting[scope] === false) {
            // 已拒绝，引导用户打开设置
            this.guideToSetting(scope)
              .then(resolve)
              .catch(reject)
          } else {
            // 已授权
            resolve(true)
          }
        },
        fail: (error) => {
          reject(new Error(`获取权限设置失败: ${error.errMsg}`))
        }
      })
    })
  }

  /**
   * 请求权限
   * @param {string} scope 权限范围
   * @returns {Promise} Promise对象
   */
  requestPermission(scope) {
    return new Promise((resolve, reject) => {
      wx.authorize({
        scope: scope,
        success: () => {
          resolve(true)
        },
        fail: (error) => {
          if (error.errMsg.includes('auth deny')) {
            // 用户拒绝，引导打开设置
            this.guideToSetting(scope)
              .then(resolve)
              .catch(reject)
          } else {
            reject(new Error(`请求权限失败: ${error.errMsg}`))
          }
        }
      })
    })
  }

  /**
   * 引导用户打开设置
   * @param {string} scope 权限范围
   * @returns {Promise} Promise对象
   */
  guideToSetting(scope) {
    return new Promise((resolve, reject) => {
      const scopeNames = {
        'scope.userInfo': '用户信息',
        'scope.userLocation': '地理位置',
        'scope.address': '通讯地址',
        'scope.invoiceTitle': '发票抬头',
        'scope.invoice': '获取发票',
        'scope.werun': '微信运动步数',
        'scope.record': '录音功能',
        'scope.writePhotosAlbum': '保存到相册',
        'scope.camera': '摄像头'
      }

      const scopeName = scopeNames[scope] || '相关功能'

      wx.showModal({
        title: '权限提示',
        content: `需要您授权${scopeName}权限，请前往设置页面打开权限`,
        confirmText: '去设置',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.openSetting({
              success: (settingRes) => {
                if (settingRes.authSetting[scope]) {
                  resolve(true)
                } else {
                  reject(new Error('用户未授权'))
                }
              },
              fail: (error) => {
                reject(new Error(`打开设置失败: ${error.errMsg}`))
              }
            })
          } else {
            reject(new Error('用户取消授权'))
          }
        }
      })
    })
  }

  /**
   * 检查VIP权限
   * @returns {boolean} 是否是VIP
   */
  checkVipPermission() {
    const vipInfo = wx.getStorageSync('userVipInfo')
    if (!vipInfo || !vipInfo.isVip) {
      return false
    }

    // 检查过期时间
    if (vipInfo.expireDate) {
      const expireDate = new Date(vipInfo.expireDate)
      const now = new Date()
      return expireDate > now
    }

    return true
  }

  /**
   * 获取VIP信息
   * @returns {Object|null} VIP信息
   */
  getVipInfo() {
    const vipInfo = wx.getStorageSync('userVipInfo')
    if (!vipInfo || !vipInfo.isVip) {
      return null
    }

    // 计算剩余天数
    if (vipInfo.expireDate) {
      const expireDate = new Date(vipInfo.expireDate)
      const now = new Date()
      const diffTime = expireDate - now
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      vipInfo.remainingDays = diffDays > 0 ? diffDays : 0
      vipInfo.isExpired = diffDays <= 0
    }

    return vipInfo
  }

  /**
   * 检查功能权限
   * @param {string} feature 功能名称
   * @returns {boolean} 是否有权限
   */
  checkFeaturePermission(feature) {
    // 获取功能配置
    const featureConfig = config.features[feature]
    if (!featureConfig) {
      return true // 未配置的功能默认允许
    }

    // 检查是否需要VIP
    if (featureConfig.requireVip) {
      return this.checkVipPermission()
    }

    // 检查其他条件
    if (featureConfig.conditions) {
      return this.checkConditions(featureConfig.conditions)
    }

    return true
  }

  /**
   * 检查条件
   * @param {Array} conditions 条件数组
   * @returns {boolean} 是否满足条件
   */
  checkConditions(conditions) {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'login':
          if (!this.checkLogin()) return false
          break
        case 'vip':
          if (!this.checkVipPermission()) return false
          break
        case 'scope':
          // 这里可以添加其他scope检查
          break
        default:
          break
      }
    }
    return true
  }

  /**
   * 登录拦截
   * @param {Function} successCallback 成功回调
   * @param {Function} failCallback 失败回调
   */
  loginInterceptor(successCallback, failCallback = null) {
    if (this.checkLogin()) {
      successCallback()
    } else {
      this.showLoginModal(successCallback, failCallback)
    }
  }

  /**
   * 显示登录弹窗
   * @param {Function} successCallback 成功回调
   * @param {Function} failCallback 失败回调
   */
  showLoginModal(successCallback, failCallback) {
    wx.showModal({
      title: '登录提示',
      content: '需要登录后才能使用此功能',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/profile/profile',
            success: () => {
              if (failCallback) failCallback()
            }
          })
        } else {
          if (failCallback) failCallback()
        }
      }
    })
  }

  /**
   * VIP权限拦截
   * @param {Function} successCallback 成功回调
   * @param {Function} failCallback 失败回调
   */
  vipInterceptor(successCallback, failCallback = null) {
    if (this.checkVipPermission()) {
      successCallback()
    } else {
      this.showVipModal(successCallback, failCallback)
    }
  }

  /**
   * 显示VIP弹窗
   * @param {Function} successCallback 成功回调
   * @param {Function} failCallback 失败回调
   */
  showVipModal(successCallback, failCallback) {
    wx.showModal({
      title: 'VIP功能',
      content: '此功能需要VIP会员才能使用',
      confirmText: '开通VIP',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 跳转到VIP开通页面
          wx.navigateTo({
            url: '/pages/profile/profile?tab=vip',
            success: () => {
              if (failCallback) failCallback()
            }
          })
        } else {
          if (failCallback) failCallback()
        }
      }
    })
  }

  /**
   * 检查并请求所有必要权限
   * @returns {Promise} Promise对象
   */
  async checkAllRequiredPermissions() {
    const requiredScopes = config.auth.requiredScopes || []
    const results = {}

    for (const scope of requiredScopes) {
      try {
        const hasPermission = await this.checkPermission(scope)
        results[scope] = hasPermission
      } catch (error) {
        results[scope] = false
        console.error(`检查权限 ${scope} 失败:`, error)
      }
    }

    return results
  }

  /**
   * 同步用户信息到服务器
   * @returns {Promise} Promise对象
   */
  async syncUserInfo() {
    if (!this.checkLogin()) {
      throw new Error('用户未登录')
    }

    const userInfo = this.getUserInfo()
    const token = this.getToken()

    // 这里可以添加同步到服务器的逻辑
    // 例如：调用API更新用户信息
    
    return { success: true, userInfo }
  }

  /**
   * 检查当日使用次数
   * @param {string} feature 功能名称
   * @returns {Object} 检查结果
   */
  checkDailyLimit(feature = 'aiRecognition') {
    const today = new Date().toISOString().split('T')[0]
    const usageKey = `daily_usage_${feature}_${today}`
    
    // 获取今日使用记录
    const usageData = wx.getStorageSync(usageKey) || {
      count: 0,
      date: today,
      features: {}
    }
    
    // 获取功能配置
    const featureConfig = config.features[feature]
    if (!featureConfig) {
      return {
        canUse: true,
        remaining: Infinity,
        total: Infinity,
        used: usageData.count
      }
    }
    
    // 确定限制次数
    let limit = featureConfig.dailyLimit || 10
    if (this.checkVipPermission() && featureConfig.vipDailyLimit) {
      limit = featureConfig.vipDailyLimit
    }
    
    const remaining = Math.max(0, limit - usageData.count)
    
    return {
      canUse: remaining > 0,
      remaining: remaining,
      total: limit,
      used: usageData.count,
      isVip: this.checkVipPermission()
    }
  }

  /**
   * 记录功能使用
   * @param {string} feature 功能名称
   * @returns {boolean} 是否记录成功
   */
  recordFeatureUsage(feature = 'aiRecognition') {
    const today = new Date().toISOString().split('T')[0]
    const usageKey = `daily_usage_${feature}_${today}`
    
    // 获取今日使用记录
    const usageData = wx.getStorageSync(usageKey) || {
      count: 0,
      date: today,
      features: {}
    }
    
    // 更新使用次数
    usageData.count += 1
    usageData.lastUsed = new Date().toISOString()
    usageData.features[feature] = (usageData.features[feature] || 0) + 1
    
    // 保存记录
    wx.setStorageSync(usageKey, usageData)
    
    return true
  }

  /**
   * 检查功能权限
   * @param {string} feature 功能名称
   * @returns {Object} 权限检查结果
   */
  canUseFeature(feature) {
    // 1. 检查功能是否启用
    const featureConfig = config.features[feature]
    if (!featureConfig || !featureConfig.enabled) {
      return {
        canUse: false,
        reason: '功能未启用',
        code: 'FEATURE_DISABLED'
      }
    }
    
    // 2. 检查是否需要登录
    if (featureConfig.requireLogin && !this.checkLogin()) {
      return {
        canUse: false,
        reason: '需要登录',
        code: 'LOGIN_REQUIRED'
      }
    }
    
    // 3. 检查是否需要VIP
    if (featureConfig.requireVip && !this.checkVipPermission()) {
      return {
        canUse: false,
        reason: '需要VIP会员',
        code: 'VIP_REQUIRED'
      }
    }
    
    // 4. 检查每日限制
    if (featureConfig.dailyLimit) {
      const limitCheck = this.checkDailyLimit(feature)
      if (!limitCheck.canUse) {
        return {
          canUse: false,
          reason: '今日使用次数已用完',
          code: 'DAILY_LIMIT_EXCEEDED',
          limitInfo: limitCheck
        }
      }
    }
    
    // 5. 检查其他条件
    if (featureConfig.conditions) {
      const conditionsMet = this.checkConditions(featureConfig.conditions)
      if (!conditionsMet) {
        return {
          canUse: false,
          reason: '不满足使用条件',
          code: 'CONDITIONS_NOT_MET'
        }
      }
    }
    
    return {
      canUse: true,
      reason: '可以使用',
      code: 'SUCCESS'
    }
  }

  /**
   * 获取用户等级
   * @returns {string} 用户等级
   */
  getUserLevel() {
    // 检查是否登录
    if (!this.checkLogin()) {
      return 'guest' // 游客
    }
    
    // 检查VIP状态
    const vipInfo = this.getVipInfo()
    if (vipInfo) {
      if (vipInfo.isExpired) {
        return 'expired_vip' // 过期VIP
      }
      
      // 根据VIP类型返回等级
      if (vipInfo.level === 'premium') {
        return 'premium_vip' // 高级会员
      } else if (vipInfo.level === 'lifetime') {
        return 'lifetime_vip' // 永久会员
      }
      
      return 'vip' // 普通VIP
    }
    
    // 检查用户行为等级
    const userInfo = this.getUserInfo()
    if (userInfo) {
      // 可以根据用户行为计算等级
      const userStats = wx.getStorageSync('user_stats') || {}
      const recognitionCount = userStats.recognitionCount || 0
      const daysActive = userStats.daysActive || 0
      
      if (recognitionCount > 100 && daysActive > 30) {
        return 'active_user' // 活跃用户
      } else if (recognitionCount > 10) {
        return 'regular_user' // 常规用户
      }
    }
    
    return 'free_user' // 免费用户
  }

  /**
   * 获取用户等级详情
   * @returns {Object} 等级详情
   */
  getUserLevelDetails() {
    const level = this.getUserLevel()
    
    const levelDetails = {
      guest: {
        name: '游客',
        description: '未登录用户',
        features: ['基础浏览'],
        limits: {
          dailyRecognition: 3,
          historyRecords: 10,
          export: false
        },
        upgradeTo: 'free_user'
      },
      free_user: {
        name: '免费用户',
        description: '已登录的免费用户',
        features: ['基础AI识别', '基础营养分析', '历史记录'],
        limits: {
          dailyRecognition: 10,
          historyRecords: 100,
          export: false
        },
        upgradeTo: 'vip'
      },
      active_user: {
        name: '活跃用户',
        description: '高频使用的免费用户',
        features: ['免费用户所有功能', '优先支持'],
        limits: {
          dailyRecognition: 15,
          historyRecords: 200,
          export: true
        },
        upgradeTo: 'vip'
      },
      vip: {
        name: 'VIP会员',
        description: '付费会员',
        features: ['无限AI识别', '详细营养分析', '健康评分', '数据导出'],
        limits: {
          dailyRecognition: 100,
          historyRecords: 1000,
          export: true
        },
        upgradeTo: 'premium_vip'
      },
      premium_vip: {
        name: '高级会员',
        description: '高级付费会员',
        features: ['VIP所有功能', '个性化食谱', '专家解读', '专属客服'],
        limits: {
          dailyRecognition: 500,
          historyRecords: 5000,
          export: true
        },
        upgradeTo: 'lifetime_vip'
      },
      lifetime_vip: {
        name: '永久会员',
        description: '永久付费会员',
        features: ['所有功能', '永久更新', '最高优先级支持'],
        limits: {
          dailyRecognition: Infinity,
          historyRecords: Infinity,
          export: true
        },
        upgradeTo: null
      },
      expired_vip: {
        name: '过期VIP',
        description: 'VIP已过期',
        features: ['基础AI识别', '历史记录查看'],
        limits: {
          dailyRecognition: 5,
          historyRecords: 50,
          export: false
        },
        upgradeTo: 'vip'
      }
    }
    
    return levelDetails[level] || levelDetails.free_user
  }

  /**
   * 重置每日使用计数
   * @param {string} date 日期（YYYY-MM-DD），默认为今天
   */
  resetDailyUsage(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0]
    
    // 删除当日的所有使用记录
    const keys = wx.getStorageInfoSync().keys
    keys.forEach(key => {
      if (key.startsWith('daily_usage_') && key.endsWith(`_${targetDate}`)) {
        wx.removeStorageSync(key)
      }
    })
    
    return true
  }

  /**
   * 获取使用统计
   * @param {number} days 统计天数，默认7天
   * @returns {Object} 使用统计
   */
  getUsageStats(days = 7) {
    const stats = {
      total: 0,
      byFeature: {},
      byDate: {},
      trends: []
    }
    
    const today = new Date()
    const keys = wx.getStorageInfoSync().keys
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      let dailyTotal = 0
      const dailyFeatures = {}
      
      // 查找当日的使用记录
      keys.forEach(key => {
        if (key.startsWith('daily_usage_') && key.endsWith(`_${dateStr}`)) {
          const usageData = wx.getStorageSync(key)
          if (usageData) {
            dailyTotal += usageData.count
            
            // 提取功能名称
            const match = key.match(/daily_usage_(.+)_\d{4}-\d{2}-\d{2}/)
            if (match) {
              const feature = match[1]
              dailyFeatures[feature] = usageData.count
              
              // 累计功能使用
              stats.byFeature[feature] = (stats.byFeature[feature] || 0) + usageData.count
            }
          }
        }
      })
      
      stats.byDate[dateStr] = {
        total: dailyTotal,
        features: dailyFeatures
      }
      
      stats.total += dailyTotal
      stats.trends.unshift({
        date: dateStr,
        total: dailyTotal
      })
    }
    
    return stats
  }
}

// 创建单例实例
const authUtils = new AuthUtils()

module.exports = {
  // 登录相关
  checkLogin: () => authUtils.checkLogin(),
  getUserInfo: () => authUtils.getUserInfo(),
  getToken: () => authUtils.getToken(),
  saveUserInfo: (userInfo, token) => authUtils.saveUserInfo(userInfo, token),
  clearUserInfo: () => authUtils.clearUserInfo(),
  syncUserInfo: () => authUtils.syncUserInfo(),

  // 权限检查
  checkPermission: (scope) => authUtils.checkPermission(scope),
  checkAllRequiredPermissions: () => authUtils.checkAllRequiredPermissions(),
  
  // VIP相关
  checkVipPermission: () => authUtils.checkVipPermission(),
  getVipInfo: () => authUtils.getVipInfo(),
  
  // 功能权限
  checkFeaturePermission: (feature) => authUtils.checkFeaturePermission(feature),
  canUseFeature: (feature) => authUtils.canUseFeature(feature),
  
  // 使用限制
  checkDailyLimit: (feature) => authUtils.checkDailyLimit(feature),
  recordFeatureUsage: (feature) => authUtils.recordFeatureUsage(feature),
  resetDailyUsage: (date) => authUtils.resetDailyUsage(date),
  getUsageStats: (days) => authUtils.getUsageStats(days),
  
  // 用户等级
  getUserLevel: () => authUtils.getUserLevel(),
  getUserLevelDetails: () => authUtils.getUserLevelDetails(),
  
  // 拦截器
  loginInterceptor: (successCallback, failCallback) => authUtils.loginInterceptor(successCallback, failCallback),
  vipInterceptor: (successCallback, failCallback) => authUtils.vipInterceptor(successCallback, failCallback),
  
  // 实例
  utils: authUtils
}
