// app.js
const config = require('./constants/config.js')

App({
  // 全局数据
  globalData: {
    userInfo: null,
    isVip: false,
    vipExpireDate: null,
    systemInfo: null,
    networkType: 'unknown',
    // 新增：用户状态相关
    isLoggedIn: false,
    isGuest: true,
    userStatus: 'guest', // guest, logged_in, vip
    // 新增：使用次数限制
    dailyPhotoLimit: 5, // 拍照识别每天5次
    dailySearchLimit: 10, // 搜索识别每天10次
    todayPhotoCount: 0,
    todaySearchCount: 0
  },

  // 应用启动时执行
  onLaunch(options) {
    console.log('AI轻食记小程序启动', options)
    
    // 初始化云开发
    this.initCloud()
    
    // 获取系统信息
    this.getSystemInfo()
    
    // 监听网络状态
    this.listenNetworkStatus()
    
    // 检查更新
    this.checkUpdate()
    
    // 初始化用户数据
    this.initUserData()
    
    // 性能监控
    this.startPerformanceMonitoring()
  },

  // 应用显示时执行
  onShow(options) {
    console.log('小程序显示', options)
    
    // 更新用户状态
    this.updateUserStatus()
    
    // 检查分享参数
    if (options.query && options.query.share) {
      this.handleShareEntry(options.query)
    }
  },

  // 应用隐藏时执行
  onHide() {
    console.log('小程序隐藏')
    
    // 保存用户数据
    this.saveUserData()
  },

  // 应用错误时执行
  onError(error) {
    console.error('小程序错误:', error)
    
    // 错误上报
    this.reportError(error)
  },

  // 页面不存在时执行
  onPageNotFound(res) {
    console.warn('页面不存在:', res)
    
    wx.redirectTo({
      url: '/pages/index/index'
    })
  },

  // 初始化云开发
  initCloud() {
    try {
      // 临时禁用云开发，解决手机预览问题
      // 如需启用云开发，请取消注释以下代码
      /*
      // 检查是否支持云开发
      if (wx.cloud) {
        // 初始化云开发
        wx.cloud.init({
          env: 'cloud1-9g3r4c7s10dc06ca', // 云环境ID，请替换为您的实际环境ID
          traceUser: true // 记录用户访问
        })
        console.log('云开发初始化成功')
        
        // 设置全局云开发实例
        this.cloud = wx.cloud
        
        // 初始化云数据库
        this.initCloudDatabase()
      } else {
        console.warn('当前版本不支持云开发')
      }
      */
      console.log('云开发已临时禁用（解决手机预览问题）')
    } catch (error) {
      console.error('云开发初始化失败:', error)
    }
  },
  
  // 初始化云数据库
  initCloudDatabase() {
    try {
      // 获取数据库实例
      this.db = wx.cloud.database()
      console.log('云数据库初始化成功')
    } catch (error) {
      console.error('云数据库初始化失败:', error)
    }
  },

  // 获取系统信息（使用新版API）
  getSystemInfo() {
    try {
      // 使用新版API获取设备信息
      const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync()
      this.globalData.systemInfo = deviceInfo
      console.log('设备信息:', deviceInfo)
      
      // 根据系统信息调整配置
      this.adjustConfigBySystem(deviceInfo)
    } catch (error) {
      console.error('获取设备信息失败:', error)
    }
  },

  // 根据系统信息调整配置
  adjustConfigBySystem(systemInfo) {
    // 根据设备类型调整UI
    if (systemInfo.platform === 'ios') {
      // iOS特定配置
      this.globalData.isIOS = true
    } else if (systemInfo.platform === 'android') {
      // Android特定配置
      this.globalData.isAndroid = true
    }
    
    // 根据屏幕尺寸调整
    const { windowWidth, windowHeight } = systemInfo
    this.globalData.screenWidth = windowWidth
    this.globalData.screenHeight = windowHeight
    this.globalData.isSmallScreen = windowWidth < 375
  },

  // 监听网络状态
  listenNetworkStatus() {
    // 获取当前网络状态
    wx.getNetworkType({
      success: (res) => {
        this.globalData.networkType = res.networkType
        console.log('当前网络类型:', res.networkType)
      }
    })
    
    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      this.globalData.networkType = res.networkType
      console.log('网络状态变化:', res)
      
      // 网络状态变化处理
      this.handleNetworkChange(res)
    })
  },

  // 处理网络变化
  handleNetworkChange(networkInfo) {
    if (networkInfo.networkType === 'none') {
      // 无网络连接
      wx.showToast({
        title: '网络连接已断开',
        icon: 'none',
        duration: 3000
      })
    } else if (this.globalData.networkType === 'none') {
      // 从无网络恢复到有网络
      wx.showToast({
        title: '网络已恢复',
        icon: 'success',
        duration: 2000
      })
      
      // 重新同步数据
      this.syncData()
    }
  },

  // 检查更新
  checkUpdate() {
    if (wx.getUpdateManager) {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate((res) => {
        console.log('检查更新结果:', res.hasUpdate)
      })
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })
      
      updateManager.onUpdateFailed(() => {
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        })
      })
    }
  },

  // 初始化用户数据
  initUserData() {
    // 从缓存加载用户数据
    const userInfo = wx.getStorageSync('userInfo')
    const vipInfo = wx.getStorageSync('userVipInfo')
    
    if (userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
      this.globalData.isGuest = false
      this.globalData.userStatus = 'logged_in'
    } else {
      this.globalData.userInfo = null
      this.globalData.isLoggedIn = false
      this.globalData.isGuest = true
      this.globalData.userStatus = 'guest'
    }
    
    if (vipInfo) {
      this.globalData.isVip = vipInfo.isVip || false
      this.globalData.vipExpireDate = vipInfo.expireDate || null
      
      // 检查VIP是否过期
      if (vipInfo.expireDate) {
        const expireDate = new Date(vipInfo.expireDate)
        const now = new Date()
        if (expireDate < now) {
          this.globalData.isVip = false
          wx.setStorageSync('userVipInfo', { isVip: false })
        }
      }
      
      // 如果是VIP用户，更新状态
      if (this.globalData.isVip) {
        this.globalData.userStatus = 'vip'
      }
    }
    
    // 加载今日使用次数
    this.loadTodayUsage()
  },

  // 更新用户状态
  updateUserStatus() {
    // 检查登录状态
    this.checkLoginStatus()
    
    // 同步用户数据到服务器
    this.syncUserData()
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo && this.globalData.userInfo) {
      // 用户信息被清除，重置全局数据
      this.globalData.userInfo = null
      this.globalData.isVip = false
      this.globalData.vipExpireDate = null
    }
  },

  // 同步用户数据
  async syncUserData() {
    if (!this.globalData.userInfo) return
    
    try {
      // 这里可以添加同步到服务器的逻辑
      // 例如：更新用户最后活跃时间
      
      console.log('用户数据同步完成')
    } catch (error) {
      console.error('同步用户数据失败:', error)
    }
  },

  // 同步数据
  async syncData() {
    if (this.globalData.networkType === 'none') {
      console.log('无网络连接，跳过数据同步')
      return
    }
    
    try {
      // 同步本地数据到云端
      await this.syncLocalDataToCloud()
      
      // 从云端拉取最新数据
      await this.pullDataFromCloud()
      
      console.log('数据同步完成')
    } catch (error) {
      console.error('数据同步失败:', error)
    }
  },

  // 同步本地数据到云端
  async syncLocalDataToCloud() {
    // 这里可以添加同步逻辑
    // 例如：同步识别记录、用户设置等
  },

  // 从云端拉取数据
  async pullDataFromCloud() {
    // 这里可以添加拉取逻辑
    // 例如：拉取用户VIP状态、最新消息等
  },

  // 保存用户数据
  saveUserData() {
    // 保存到缓存
    if (this.globalData.userInfo) {
      wx.setStorageSync('userInfo', this.globalData.userInfo)
    }
    
    const vipInfo = {
      isVip: this.globalData.isVip,
      expireDate: this.globalData.vipExpireDate
    }
    wx.setStorageSync('userVipInfo', vipInfo)
    
    // 保存今日使用次数
    this.saveTodayUsage()
  },
  
  // 加载今日使用次数
  loadTodayUsage() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const usageKey = `daily_usage_${today}`
      const usageData = wx.getStorageSync(usageKey)
      
      if (usageData) {
        this.globalData.todayPhotoCount = usageData.photoCount || 0
        this.globalData.todaySearchCount = usageData.searchCount || 0
      } else {
        this.globalData.todayPhotoCount = 0
        this.globalData.todaySearchCount = 0
      }
      
      console.log('加载今日使用次数:', {
        photoCount: this.globalData.todayPhotoCount,
        searchCount: this.globalData.todaySearchCount
      })
    } catch (error) {
      console.error('加载今日使用次数失败:', error)
      this.globalData.todayPhotoCount = 0
      this.globalData.todaySearchCount = 0
    }
  },
  
  // 保存今日使用次数
  saveTodayUsage() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const usageKey = `daily_usage_${today}`
      const usageData = {
        photoCount: this.globalData.todayPhotoCount,
        searchCount: this.globalData.todaySearchCount,
        saveTime: Date.now()
      }
      
      wx.setStorageSync(usageKey, usageData)
      console.log('保存今日使用次数:', usageData)
    } catch (error) {
      console.error('保存今日使用次数失败:', error)
    }
  },
  
  // 增加拍照使用次数
  incrementPhotoCount() {
    this.globalData.todayPhotoCount++
    this.saveTodayUsage()
    return this.globalData.todayPhotoCount
  },
  
  // 增加搜索使用次数
  incrementSearchCount() {
    this.globalData.todaySearchCount++
    this.saveTodayUsage()
    return this.globalData.todaySearchCount
  },
  
  // 检查拍照使用权限
  checkPhotoPermission() {
    const app = this
    
    // 检查登录状态
    if (app.globalData.isGuest) {
      return {
        canUse: false,
        reason: '请先登录',
        remaining: 0,
        limit: app.globalData.dailyPhotoLimit,
        needLogin: true
      }
    }
    
    // 检查使用次数
    const remaining = app.globalData.dailyPhotoLimit - app.globalData.todayPhotoCount
    
    if (remaining <= 0) {
      return {
        canUse: false,
        reason: '今日拍照识别次数已用完',
        remaining: 0,
        limit: app.globalData.dailyPhotoLimit,
        needLogin: false
      }
    }
    
    return {
      canUse: true,
      reason: '',
      remaining: remaining,
      limit: app.globalData.dailyPhotoLimit,
      needLogin: false
    }
  },
  
  // 检查搜索使用权限
  checkSearchPermission() {
    const app = this
    
    // 检查登录状态
    if (app.globalData.isGuest) {
      return {
        canUse: false,
        reason: '请先登录',
        remaining: 0,
        limit: app.globalData.dailySearchLimit,
        needLogin: true
      }
    }
    
    // 检查使用次数
    const remaining = app.globalData.dailySearchLimit - app.globalData.todaySearchCount
    
    if (remaining <= 0) {
      return {
        canUse: false,
        reason: '今日搜索识别次数已用完',
        remaining: 0,
        limit: app.globalData.dailySearchLimit,
        needLogin: false
      }
    }
    
    return {
      canUse: true,
      reason: '',
      remaining: remaining,
      limit: app.globalData.dailySearchLimit,
      needLogin: false
    }
  },
  
  // 用户登录
  async userLogin(userInfo) {
    try {
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
      this.globalData.isGuest = false
      this.globalData.userStatus = 'logged_in'
      
      // 保存用户信息
      wx.setStorageSync('userInfo', userInfo)
      
      // 重置今日使用次数（新用户登录）
      this.globalData.todayPhotoCount = 0
      this.globalData.todaySearchCount = 0
      this.saveTodayUsage()
      
      console.log('用户登录成功:', userInfo)
      return { success: true, message: '登录成功' }
    } catch (error) {
      console.error('用户登录失败:', error)
      return { success: false, message: '登录失败: ' + error.message }
    }
  },
  
  // 用户退出
  userLogout() {
    try {
      // 清除用户信息
      this.globalData.userInfo = null
      this.globalData.isLoggedIn = false
      this.globalData.isGuest = true
      this.globalData.userStatus = 'guest'
      this.globalData.isVip = false
      this.globalData.vipExpireDate = null
      
      // 清除缓存
      wx.removeStorageSync('userInfo')
      wx.removeStorageSync('userVipInfo')
      
      console.log('用户退出成功')
      return { success: true, message: '退出成功' }
    } catch (error) {
      console.error('用户退出失败:', error)
      return { success: false, message: '退出失败: ' + error.message }
    }
  },

  // 处理分享入口
  handleShareEntry(query) {
    console.log('分享入口参数:', query)
    
    // 这里可以处理分享带来的流量
    // 例如：记录分享来源、给予奖励等
    
    if (query.inviter) {
      // 记录邀请关系
      this.recordInvitation(query.inviter)
    }
  },

  // 记录邀请关系
  recordInvitation(inviterId) {
    // 这里可以记录邀请关系
    // 例如：保存到本地缓存，下次同步到服务器
    const invitations = wx.getStorageSync('user_invitations') || []
    invitations.push({
      inviterId: inviterId,
      inviteTime: Date.now()
    })
    wx.setStorageSync('user_invitations', invitations)
  },

  // 错误上报
  reportError(error) {
    if (!config.error.report.enabled) return
    
    // 采样率控制
    if (Math.random() > config.error.report.sampleRate) return
    
    try {
      const errorData = {
        message: error.message || '未知错误',
        stack: error.stack,
        timestamp: Date.now(),
        version: config.app.version,
        platform: this.globalData.systemInfo?.platform,
        system: this.globalData.systemInfo?.system,
        userId: this.globalData.userInfo?.openId || 'anonymous'
      }
      
      // 这里可以上报到错误监控平台
      console.log('错误上报:', errorData)
      
      // 示例：调用云函数上报错误
      /*
      wx.cloud.callFunction({
        name: 'error-report',
        data: errorData
      })
      */
    } catch (reportError) {
      console.error('错误上报失败:', reportError)
    }
  },

  // 开始性能监控
  startPerformanceMonitoring() {
    if (!config.performance.enabled) return
    
    // 采样率控制
    if (Math.random() > config.performance.sampleRate) return
    
    try {
      // 这里可以添加性能监控逻辑
      // 例如：监控页面加载时间、API响应时间等
      
      console.log('性能监控已启动')
    } catch (error) {
      console.error('启动性能监控失败:', error)
    }
  },

  // 工具方法：显示加载提示
  showLoading(title = '加载中...') {
    wx.showLoading({
      title: title,
      mask: true
    })
  },

  // 工具方法：隐藏加载提示
  hideLoading() {
    wx.hideLoading()
  },

  // 工具方法：显示成功提示
  showSuccess(message, duration = 2000) {
    wx.showToast({
      title: message,
      icon: 'success',
      duration: duration
    })
  },

  // 工具方法：显示错误提示
  showError(message, duration = 3000) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: duration
    })
  },

  // 工具方法：显示确认对话框
  showConfirm(title, content, confirmText = '确定', cancelText = '取消') {
    return new Promise((resolve) => {
      wx.showModal({
        title: title,
        content: content,
        confirmText: confirmText,
        cancelText: cancelText,
        success: (res) => {
          resolve(res.confirm)
        }
      })
    })
  },

  // 工具方法：检查网络连接
  checkNetworkConnection() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          resolve(res.networkType !== 'none')
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  },

  // 工具方法：获取当前位置
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'wgs84',
        success: resolve,
        fail: reject
      })
    })
  },

  // 工具方法：设置剪贴板
  setClipboardData(text) {
    return new Promise((resolve, reject) => {
      wx.setClipboardData({
        data: text,
        success: resolve,
        fail: reject
      })
    })
  },

  // 工具方法：获取剪贴板数据
  getClipboardData() {
    return new Promise((resolve, reject) => {
      wx.getClipboardData({
        success: (res) => {
          resolve(res.data)
        },
        fail: reject
      })
    })
  }
})
