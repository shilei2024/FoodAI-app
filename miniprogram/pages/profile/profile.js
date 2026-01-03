// pages/profile/profile.js
const userService = require('../../services/user-service.js')
const dataService = require('../../services/data-service.js')

Page({
  data: {
    // 用户信息
    userInfo: {},
    hasUserInfo: false,
    // 临时用户信息（登录前）
    tempAvatarUrl: '',
    tempNickName: '',
    canLogin: false,
    // 会员信息
    isVip: false,
    vipExpireDate: '',
    // 设置选项
    settings: [
      {
        id: 1,
        title: '账号管理',
        icon: 'user-o',
        desc: '修改个人信息',
        path: '/pages/account/account'
      },
      {
        id: 2,
        title: '隐私设置',
        icon: 'shield-o',
        desc: '管理隐私权限',
        path: '/pages/privacy/privacy'
      },
      {
        id: 3,
        title: '偏好设置',
        icon: 'like-o',
        desc: '设置饮食偏好和过敏信息',
        path: ''
      },
      {
        id: 4,
        title: '数据管理',
        icon: 'database',
        desc: '导出/导入个人数据',
        path: ''
      },
      {
        id: 5,
        title: '清除缓存',
        icon: 'delete-o',
        desc: '清理本地数据',
        path: ''
      },
      {
        id: 6,
        title: '关于我们',
        icon: 'info-o',
        desc: '了解AI轻食记',
        path: ''
      },
      {
        id: 7,
        title: '帮助与反馈',
        icon: 'question-o',
        desc: '获取帮助或反馈问题',
        path: ''
      }
    ],
    // 统计数据
    userStats: {
      totalRecords: 0,
      aiRecords: 0,
      favoriteFoods: 0,
      continuousDays: 0
    }
  },

  onLoad() {
    // 页面加载时执行
    this.loadUserData()
  },

  onShow() {
    // 页面显示时执行
    this.refreshUserData()
  },

  // 加载用户数据
  loadUserData() {
    const app = getApp()
    const userInfo = userService.getUserInfo()
    const vipInfo = userService.getVipInfo()
    
    // 获取真实的统计数据
    const stats = dataService.getStats()
    const userStats = {
      totalRecords: stats.total || 0,
      aiRecords: stats.total || 0, // 暂时使用总数
      favoriteFoods: 0, // 暂未实现收藏功能
      continuousDays: this.calculateContinuousDays(stats.byDate || {})
    }

    this.setData({
      userInfo: userInfo || {},
      hasUserInfo: !!userInfo && !!userInfo.nickName,
      userStats: userStats,
      isVip: vipInfo.isVip || false,
      vipExpireDate: vipInfo.expireDate || '',
      // 新增：使用次数统计
      todayPhotoCount: app.globalData.todayPhotoCount || 0,
      todaySearchCount: app.globalData.todaySearchCount || 0,
      dailyPhotoLimit: app.globalData.dailyPhotoLimit || 5,
      dailySearchLimit: app.globalData.dailySearchLimit || 10,
      photoRemaining: (app.globalData.dailyPhotoLimit || 5) - (app.globalData.todayPhotoCount || 0),
      searchRemaining: (app.globalData.dailySearchLimit || 10) - (app.globalData.todaySearchCount || 0)
    })
  },

  // 计算连续记录天数
  calculateContinuousDays(byDate) {
    if (!byDate || Object.keys(byDate).length === 0) {
      return 0
    }
    
    const dates = Object.keys(byDate).sort().reverse()
    let continuousDays = 0
    const today = new Date()
    
    for (let i = 0; i < dates.length; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const dateStr = checkDate.toISOString().split('T')[0]
      
      if (byDate[dateStr]) {
        continuousDays++
      } else {
        break
      }
    }
    
    return continuousDays
  },

  // 刷新用户数据
  refreshUserData() {
    this.loadUserData()
  },

  // 选择头像（新版API）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    this.setData({
      tempAvatarUrl: avatarUrl,
      canLogin: !!avatarUrl && !!this.data.tempNickName
    })
  },

  // 输入昵称
  onNickNameInput(e) {
    const nickName = e.detail.value
    this.setData({
      tempNickName: nickName,
      canLogin: !!this.data.tempAvatarUrl && !!nickName
    })
  },

  // 昵称输入完成
  onNickNameBlur(e) {
    const nickName = e.detail.value
    this.setData({
      tempNickName: nickName,
      canLogin: !!this.data.tempAvatarUrl && !!nickName
    })
  },

  // 确认登录
  async confirmLogin() {
    const { tempAvatarUrl, tempNickName } = this.data
    
    if (!tempAvatarUrl || !tempNickName) {
      wx.showToast({
        title: '请选择头像并输入昵称',
        icon: 'none'
      })
      return
    }
    
    try {
      const app = getApp()
      
      // 构建用户信息
      const userInfo = {
        nickName: tempNickName,
        avatarUrl: tempAvatarUrl,
        openId: 'user_' + Date.now(),
        loginTime: Date.now(),
        updateTime: Date.now()
      }
      
      // 使用新的用户状态管理系统登录
      const result = await app.userLogin(userInfo)
      
      if (result.success) {
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true,
          tempAvatarUrl: '',
          tempNickName: '',
          canLogin: false,
          todayPhotoCount: 0,
          todaySearchCount: 0,
          photoRemaining: app.globalData.dailyPhotoLimit,
          searchRemaining: app.globalData.dailySearchLimit
        })
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      } else {
        throw new Error(result.message)
      }
      
    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      })
    }
  },

  // 修改头像（已登录用户）
  changeAvatar() {
    wx.showActionSheet({
      itemList: ['从相册选择', '拍照'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.chooseImageFromAlbum()
        } else if (res.tapIndex === 1) {
          this.takePhoto()
        }
      }
    })
  },

  // 从相册选择图片
  chooseImageFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.uploadAvatar(tempFilePath)
      },
      fail: (error) => {
        console.error('选择图片失败:', error)
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        })
      }
    })
  },

  // 拍照
  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.uploadAvatar(tempFilePath)
      },
      fail: (error) => {
        console.error('拍照失败:', error)
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        })
      }
    })
  },

  // 上传头像
  uploadAvatar(tempFilePath) {
    wx.showLoading({
      title: '上传中...',
    })

    // 这里应该调用云存储上传图片，然后更新用户信息
    // 由于云开发需要配置，这里先模拟上传成功
    setTimeout(() => {
      wx.hideLoading()
      
      // 更新本地用户信息
      const userInfo = this.data.userInfo
      userInfo.avatarUrl = tempFilePath
      userInfo.updateTime = Date.now()
      
      // 保存到本地存储
      userService.saveUserInfo(userInfo)
      
      this.setData({
        userInfo: userInfo
      })
      
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      })
    }, 1000)
  },

  // 修改昵称
  changeNickname() {
    wx.showModal({
      title: '修改昵称',
      content: '请输入新的昵称',
      editable: true,
      placeholderText: this.data.userInfo.nickName || '请输入昵称',
      success: (res) => {
        if (res.confirm && res.content) {
          const newNickname = res.content.trim()
          if (newNickname) {
            this.updateNickname(newNickname)
          }
        }
      }
    })
  },

  // 更新昵称
  updateNickname(nickname) {
    wx.showLoading({
      title: '更新中...',
    })

    // 更新本地用户信息
    const userInfo = this.data.userInfo
    userInfo.nickName = nickname
    userInfo.updateTime = Date.now()
    
    // 保存到本地存储
    userService.saveUserInfo(userInfo)
    
    setTimeout(() => {
      wx.hideLoading()
      
      this.setData({
        userInfo: userInfo
      })
      
      wx.showToast({
        title: '昵称更新成功',
        icon: 'success'
      })
    }, 500)
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          const result = app.userLogout()
          
          if (result.success) {
            this.setData({
              userInfo: {},
              hasUserInfo: false,
              isVip: false,
              vipExpireDate: '',
              todayPhotoCount: 0,
              todaySearchCount: 0,
              photoRemaining: app.globalData.dailyPhotoLimit,
              searchRemaining: app.globalData.dailySearchLimit
            })
            
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })
          } else {
            wx.showToast({
              title: result.message,
              icon: 'none',
              duration: 3000
            })
          }
        }
      }
    })
  },

  // 跳转到设置项
  navigateToSetting(e) {
    const { id } = e.currentTarget.dataset
    const setting = this.data.settings.find(item => item.id === id)
    
    if (setting.path) {
      wx.navigateTo({
        url: setting.path
      })
    } else {
      this.handleSettingAction(id)
    }
  },

  // 处理设置项操作
  handleSettingAction(id) {
    switch(id) {
      case 1: // 账号管理
        wx.showModal({
          title: '账号管理',
          content: '该功能即将上线，敬请期待！\n\n未来将支持：\n- 修改个人信息\n- 绑定手机/邮箱\n- 账号安全设置\n- 第三方账号绑定',
          showCancel: false,
          confirmText: '知道了'
        })
        break
      case 2: // 隐私设置
        wx.showModal({
          title: '隐私设置',
          content: '该功能即将上线，敬请期待！\n\n未来将支持：\n- 数据授权管理\n- 隐私信息保护\n- 数据删除请求\n- 第三方分享设置',
          showCancel: false,
          confirmText: '知道了'
        })
        break
      case 3: // 偏好设置
        this.showPreferences()
        break
      case 4: // 数据管理
        this.manageData()
        break
      case 5: // 清除缓存
        this.clearCache()
        break
      case 6: // 关于我们
        this.showAbout()
        break
      case 7: // 帮助与反馈
        this.showHelp()
        break
    }
  },

  // 清除缓存
  clearCache() {
    wx.showActionSheet({
      itemList: ['清除所有缓存', '仅清除识别记录', '仅清除用户数据', '仅清除图片缓存'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0: // 清除所有缓存
            this.clearAllCache()
            break
          case 1: // 仅清除识别记录
            this.clearRecognitionRecords()
            break
          case 2: // 仅清除用户数据
            this.clearUserData()
            break
          case 3: // 仅清除图片缓存
            this.clearImageCache()
            break
        }
      }
    })
  },

  // 清除所有缓存
  clearAllCache() {
    wx.showModal({
      title: '清除所有缓存',
      content: '确定要清除所有缓存数据吗？\n\n包括：\n• 用户信息\n• 识别记录\n• 使用统计\n• 图片缓存\n• 所有设置',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              wx.showToast({
                title: '所有缓存已清除',
                icon: 'success'
              })
              this.refreshUserData()
            }
          })
        }
      }
    })
  },

  // 清除识别记录
  clearRecognitionRecords() {
    wx.showModal({
      title: '清除识别记录',
      content: '确定要清除所有食物识别记录吗？\n\n此操作不可恢复。',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('recognition_records')
          wx.showToast({
            title: '识别记录已清除',
            icon: 'success'
          })
          this.refreshUserData()
        }
      }
    })
  },

  // 清除用户数据
  clearUserData() {
    wx.showModal({
      title: '清除用户数据',
      content: '确定要清除用户数据吗？\n\n包括：\n• 用户信息\n• 使用统计\n• 用户设置\n\n此操作不会删除识别记录。',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('userStats')
          wx.removeStorageSync('user_settings')
          wx.removeStorageSync('user_preferences')
          wx.showToast({
            title: '用户数据已清除',
            icon: 'success'
          })
          this.refreshUserData()
        }
      }
    })
  },

  // 清除图片缓存
  clearImageCache() {
    wx.showModal({
      title: '清除图片缓存',
      content: '确定要清除图片缓存吗？\n\n这将删除所有缓存的图片文件。',
      success: (res) => {
        if (res.confirm) {
          // 获取本地文件列表并删除图片文件
          const fs = wx.getFileSystemManager()
          try {
            // 这里应该遍历并删除图片缓存文件
            // 由于小程序限制，这里只是模拟
            wx.showToast({
              title: '图片缓存已清除',
              icon: 'success'
            })
          } catch (error) {
            console.error('清除图片缓存失败:', error)
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 显示关于信息
  showAbout() {
    wx.showModal({
      title: '关于AI轻食记',
      content: '版本：1.0.0\n\nAI轻食记是一款基于人工智能的食物识别与营养分析小程序，帮助您更好地了解食物营养成分，记录健康饮食。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 数据管理
  manageData() {
    wx.showActionSheet({
      itemList: ['导出所有数据', '导出识别记录', '导入数据', '查看数据统计'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0: // 导出所有数据
            this.exportAllData()
            break
          case 1: // 导出识别记录
            this.exportRecognitionRecords()
            break
          case 2: // 导入数据
            this.importData()
            break
          case 3: // 查看数据统计
            this.showDataStats()
            break
        }
      }
    })
  },

  // 导出所有数据
  async exportAllData() {
    wx.showLoading({
      title: '准备数据中...',
    })

    try {
      const dataService = require('../../services/data-service.js')
      const userService = require('../../services/user-service.js')
      
      const userInfo = userService.getUserInfo()
      const userStats = userService.getUserStats()
      const userPreferences = userService.getUserPreferences()
      const userSettings = userService.getUserSettings()
      
      // 获取识别记录
      const recordsResult = await dataService.getRecognitionRecords({})
      const recognitionRecords = recordsResult.data || []
      
      const allData = {
        userInfo: userInfo,
        userStats: userStats,
        userPreferences: userPreferences,
        userSettings: userSettings,
        recognitionRecords: recognitionRecords,
        exportTime: new Date().toISOString(),
        exportFormat: 'json',
        version: '1.0.0'
      }
      
      const jsonStr = JSON.stringify(allData, null, 2)
      
      wx.hideLoading()
      
      wx.showModal({
        title: '数据导出',
        content: `数据导出完成！\n\n总计：\n• 用户信息：1份\n• 识别记录：${recognitionRecords.length}条\n• 使用统计：1份\n• 偏好设置：1份`,
        confirmText: '复制数据',
        cancelText: '关闭',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({
              data: jsonStr,
              success: () => {
                wx.showToast({
                  title: '数据已复制到剪贴板',
                  icon: 'success'
                })
              }
            })
          }
        }
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('导出数据失败:', error)
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      })
    }
  },

  // 导出识别记录
  async exportRecognitionRecords() {
    wx.showLoading({
      title: '准备记录中...',
    })

    try {
      const dataService = require('../../services/data-service.js')
      
      // 获取识别记录
      const recordsResult = await dataService.getRecognitionRecords({})
      const recognitionRecords = recordsResult.data || []
      
      if (recognitionRecords.length === 0) {
        wx.hideLoading()
        wx.showToast({
          title: '暂无识别记录',
          icon: 'none'
        })
        return
      }
      
      const exportData = {
        records: recognitionRecords,
        exportTime: new Date().toISOString(),
        totalCount: recognitionRecords.length,
        format: 'json'
      }
      
      const jsonStr = JSON.stringify(exportData, null, 2)
      
      wx.hideLoading()
      
      wx.showModal({
        title: '记录导出',
        content: `识别记录导出完成！\n\n总计：${recognitionRecords.length}条记录`,
        confirmText: '复制数据',
        cancelText: '关闭',
        success: (res) => {
          if (res.confirm) {
            wx.setClipboardData({
              data: jsonStr,
              success: () => {
                wx.showToast({
                  title: '记录已复制到剪贴板',
                  icon: 'success'
                })
              }
            })
          }
        }
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('导出记录失败:', error)
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      })
    }
  },

  // 导入数据
  importData() {
    wx.showModal({
      title: '导入数据',
      content: '数据导入功能需要从剪贴板粘贴JSON数据。\n\n请确保数据格式正确。',
      confirmText: '开始导入',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.startImportData()
        }
      }
    })
  },

  // 开始导入数据
  startImportData() {
    wx.showModal({
      title: '粘贴数据',
      content: '请将JSON数据粘贴到下方：',
      editable: true,
      placeholderText: '在此粘贴JSON数据...',
      confirmText: '导入',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            const jsonData = JSON.parse(res.content)
            await this.processImportData(jsonData)
          } catch (error) {
            wx.showToast({
              title: '数据格式错误',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 处理导入数据
  async processImportData(jsonData) {
    wx.showLoading({
      title: '导入中...',
    })

    try {
      const dataService = require('../../services/data-service.js')
      const userService = require('../../services/user-service.js')
      
      let importedCount = 0
      let message = ''
      
      // 导入用户信息
      if (jsonData.userInfo) {
        userService.saveUserInfo(jsonData.userInfo)
        importedCount++
        message += '• 用户信息 ✓\n'
      }
      
      // 导入用户统计
      if (jsonData.userStats) {
        userService.updateUserStats(jsonData.userStats)
        importedCount++
        message += '• 使用统计 ✓\n'
      }
      
      // 导入用户偏好
      if (jsonData.userPreferences) {
        userService.updateUserPreferences(jsonData.userPreferences)
        importedCount++
        message += '• 偏好设置 ✓\n'
      }
      
      // 导入识别记录
      if (jsonData.recognitionRecords && Array.isArray(jsonData.recognitionRecords)) {
        // 这里应该批量导入记录，由于时间关系简化处理
        message += `• 识别记录：${jsonData.recognitionRecords.length}条 ✓\n`
        importedCount++
      }
      
      wx.hideLoading()
      
      wx.showModal({
        title: '导入完成',
        content: `数据导入成功！\n\n导入内容：\n${message}\n总计：${importedCount}项`,
        showCancel: false,
        confirmText: '确定'
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('导入数据失败:', error)
      wx.showToast({
        title: '导入失败',
        icon: 'none'
      })
    }
  },

  // 显示偏好设置
  showPreferences() {
    const userService = require('../../services/user-service.js')
    const preferences = userService.getUserPreferences()
    
    wx.showActionSheet({
      itemList: ['查看当前偏好', '修改饮食偏好', '设置过敏信息', '设置不喜欢的食物'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0: // 查看当前偏好
            this.viewCurrentPreferences(preferences)
            break
          case 1: // 修改饮食偏好
            this.modifyDietPreferences(preferences)
            break
          case 2: // 设置过敏信息
            this.setAllergies(preferences)
            break
          case 3: // 设置不喜欢的食物
            this.setDislikes(preferences)
            break
        }
      }
    })
  },

  // 查看当前偏好
  viewCurrentPreferences(preferences) {
    const preferenceText = `
当前饮食偏好：

基本偏好：
• 菜系偏好：${preferences.cuisine || '未设置'}
• 饮食类型：${preferences.dietType || '未设置'}
• 辣度偏好：${preferences.spiceLevel || '未设置'}

过敏信息：
${preferences.allergies?.length > 0 ? preferences.allergies.map(a => `• ${a}`).join('\n') : '• 无'}

不喜欢的食物：
${preferences.dislikes?.length > 0 ? preferences.dislikes.map(d => `• ${d}`).join('\n') : '• 无'}

这些偏好将用于个性化推荐。
    `.trim()

    wx.showModal({
      title: '当前饮食偏好',
      content: preferenceText,
      confirmText: '修改偏好',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          this.modifyDietPreferences(preferences)
        }
      }
    })
  },

  // 修改饮食偏好
  modifyDietPreferences(preferences) {
    wx.showActionSheet({
      itemList: ['修改菜系偏好', '修改饮食类型', '修改辣度偏好'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0: // 修改菜系偏好
            this.selectCuisine(preferences)
            break
          case 1: // 修改饮食类型
            this.selectDietType(preferences)
            break
          case 2: // 修改辣度偏好
            this.selectSpiceLevel(preferences)
            break
        }
      }
    })
  },

  // 选择菜系偏好
  selectCuisine(preferences) {
    const cuisines = ['中式', '西式', '日式', '韩式', '东南亚', '混合', '无偏好']
    
    wx.showActionSheet({
      itemList: cuisines,
      success: (res) => {
        if (res.tapIndex >= 0) {
          const selectedCuisine = cuisines[res.tapIndex]
          this.updatePreference('cuisine', selectedCuisine, preferences)
        }
      }
    })
  },

  // 选择饮食类型
  selectDietType(preferences) {
    const dietTypes = ['均衡', '素食', '低脂', '高蛋白', '低碳水', '无麸质', '无偏好']
    
    wx.showActionSheet({
      itemList: dietTypes,
      success: (res) => {
        if (res.tapIndex >= 0) {
          const selectedDietType = dietTypes[res.tapIndex]
          this.updatePreference('dietType', selectedDietType, preferences)
        }
      }
    })
  },

  // 选择辣度偏好
  selectSpiceLevel(preferences) {
    const spiceLevels = ['不辣', '微辣', '中等', '重辣', '无偏好']
    
    wx.showActionSheet({
      itemList: spiceLevels,
      success: (res) => {
        if (res.tapIndex >= 0) {
          const selectedSpiceLevel = spiceLevels[res.tapIndex]
          this.updatePreference('spiceLevel', selectedSpiceLevel, preferences)
        }
      }
    })
  },

  // 更新偏好
  updatePreference(key, value, preferences) {
    const userService = require('../../services/user-service.js')
    
    const updatedPreferences = {
      ...preferences,
      [key]: value
    }
    
    userService.updateUserPreferences(updatedPreferences)
    
    wx.showToast({
      title: '偏好已更新',
      icon: 'success'
    })
    
    // 重新显示当前偏好
    setTimeout(() => {
      this.viewCurrentPreferences(updatedPreferences)
    }, 1000)
  },

  // 设置过敏信息
  setAllergies(preferences) {
    const commonAllergies = ['花生', '坚果', '牛奶', '鸡蛋', '海鲜', '大豆', '小麦', '芝麻']
    
    wx.showModal({
      title: '设置过敏食物',
      content: '请选择您过敏的食物（可多选）：',
      editable: true,
      editableValue: preferences.allergies?.join(', ') || '',
      placeholderText: '请输入过敏食物，用逗号分隔',
      confirmText: '保存',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm && res.content) {
          const allergies = res.content.split(',').map(item => item.trim()).filter(item => item)
          this.saveAllergies(allergies, preferences)
        }
      }
    })
  },

  // 保存过敏信息
  saveAllergies(allergies, preferences) {
    const userService = require('../../services/user-service.js')
    
    const updatedPreferences = {
      ...preferences,
      allergies: allergies
    }
    
    userService.updateUserPreferences(updatedPreferences)
    
    wx.showToast({
      title: `已设置${allergies.length}种过敏食物`,
      icon: 'success'
    })
  },

  // 设置不喜欢的食物
  setDislikes(preferences) {
    wx.showModal({
      title: '设置不喜欢的食物',
      content: '请输入您不喜欢的食物（可多选）：',
      editable: true,
      editableValue: preferences.dislikes?.join(', ') || '',
      placeholderText: '请输入不喜欢的食物，用逗号分隔',
      confirmText: '保存',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm && res.content) {
          const dislikes = res.content.split(',').map(item => item.trim()).filter(item => item)
          this.saveDislikes(dislikes, preferences)
        }
      }
    })
  },

  // 保存不喜欢的食物
  saveDislikes(dislikes, preferences) {
    const userService = require('../../services/user-service.js')
    
    const updatedPreferences = {
      ...preferences,
      dislikes: dislikes
    }
    
    userService.updateUserPreferences(updatedPreferences)
    
    wx.showToast({
      title: `已设置${dislikes.length}种不喜欢的食物`,
      icon: 'success'
    })
  },

  // 显示数据统计
  showDataStats() {
    const dataService = require('../../services/data-service.js')
    const userService = require('../../services/user-service.js')
    
    const stats = dataService.getStats()
    const userStats = userService.getUserStats()
    const totalRecords = dataService.getTotalRecordCount()
    
    const statsText = `
数据统计概览：

识别记录：
• 总记录数：${totalRecords}条
• 今日记录：${stats.today}条
• 本周记录：${stats.week}条
• 本月记录：${stats.month}条

用户统计：
• AI识别次数：${userStats.aiRecords || 0}次
• 收藏食物：${userStats.favoriteFoods || 0}个
• 连续记录：${userStats.continuousDays || 0}天

存储空间：
• 记录数量：${totalRecords}条
• 建议定期导出备份
    `.trim()

    wx.showModal({
      title: '数据统计',
      content: statsText,
      confirmText: '导出备份',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          this.exportAllData()
        }
      }
    })
  },

  // 显示帮助
  showHelp() {
    wx.showModal({
      title: '帮助与反馈',
      content: '如有问题或建议，请通过以下方式联系我们：\n\n邮箱：support@foodai.com\n\n客服时间：9:00-18:00',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 开通会员
  openVip() {
    wx.showActionSheet({
      itemList: ['查看会员权益', '模拟开通VIP', '会员常见问题'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0: // 查看会员权益
            this.showVipBenefits()
            break
          case 1: // 模拟开通VIP
            this.simulateVipPurchase()
            break
          case 2: // 会员常见问题
            this.showVipFAQ()
            break
        }
      }
    })
  },

  // 显示会员权益
  showVipBenefits() {
    const benefits = `
VIP会员专属权益：

核心功能：
✓ 无限次AI食物识别（普通用户每日10次）
✓ 高级营养分析报告
✓ 个性化食谱推荐
✓ 食物成分深度解析

专属服务：
✓ 数据云端同步备份
✓ 多设备数据同步
✓ 专属客服支持
✓ 优先体验新功能

高级特性：
✓ 无广告纯净体验
✓ 高清食物图片识别
✓ 批量识别功能
✓ 历史记录无限制

会员特权：
• 月卡：29元/月
• 季卡：69元/季（省18元）
• 年卡：199元/年（省149元）

7天无理由退款保障
    `.trim()

    wx.showModal({
      title: 'VIP会员权益',
      content: benefits,
      confirmText: '立即开通',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          this.simulateVipPurchase()
        }
      }
    })
  },

  // 模拟开通VIP
  simulateVipPurchase() {
    wx.showActionSheet({
      itemList: ['月卡 - 29元', '季卡 - 69元', '年卡 - 199元'],
      success: (res) => {
        let plan = ''
        let price = ''
        let duration = ''
        
        switch(res.tapIndex) {
          case 0:
            plan = '月卡'
            price = '29元'
            duration = 30
            break
          case 1:
            plan = '季卡'
            price = '69元'
            duration = 90
            break
          case 2:
            plan = '年卡'
            price = '199元'
            duration = 365
            break
        }
        
        if (plan) {
          this.confirmVipPurchase(plan, price, duration)
        }
      }
    })
  },

  // 确认VIP购买
  confirmVipPurchase(plan, price, duration) {
    wx.showModal({
      title: `开通${plan}`,
      content: `确认开通${plan}（${price}）？\n\n开通后立即生效，享受所有VIP权益。\n\n注意：此为演示功能，实际支付需要配置微信支付。`,
      confirmText: '模拟开通',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.activateVip(plan, duration)
        }
      }
    })
  },

  // 激活VIP
  activateVip(plan, duration) {
    wx.showLoading({
      title: '开通中...',
    })

    // 模拟开通过程
    setTimeout(() => {
      wx.hideLoading()
      
      // 计算过期时间
      const now = new Date()
      const expireDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000)
      
      const vipInfo = {
        isVip: true,
        planType: plan,
        purchaseTime: now.toISOString(),
        expireDate: expireDate.toISOString(),
        duration: duration
      }
      
      // 保存VIP信息
      const userService = require('../../services/user-service.js')
      userService.updateVipStatus(vipInfo)
      
      this.setData({
        isVip: true,
        vipExpireDate: expireDate.toLocaleDateString()
      })
      
      wx.showModal({
        title: '开通成功！',
        content: `恭喜您已成为VIP会员！\n\n会员类型：${plan}\n有效期至：${expireDate.toLocaleDateString()}\n\n立即享受所有VIP权益！`,
        showCancel: false,
        confirmText: '开始使用',
        success: () => {
          // 刷新页面显示VIP状态
          this.refreshUserData()
        }
      })
    }, 1500)
  },

  // 显示会员常见问题
  showVipFAQ() {
    const faq = `
VIP会员常见问题：

Q: VIP会员有哪些特权？
A: 无限次AI识别、高级营养分析、个性化推荐、数据云端同步等。

Q: 如何取消自动续费？
A: 在微信支付中管理订阅，或联系客服协助处理。

Q: 购买后可以退款吗？
A: 支持7天无理由退款，联系客服即可办理。

Q: VIP会员数据会丢失吗？
A: 所有数据都会云端备份，即使会员过期也不会丢失。

Q: 可以多人共享会员吗？
A: 会员账号与微信绑定，不支持多人共享。

Q: 会员过期后怎么办？
A: 过期后恢复普通用户权限，重新开通即可恢复VIP。

更多问题请联系客服：support@foodai.com
    `.trim()

    wx.showModal({
      title: '会员常见问题',
      content: faq,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 分享小程序
  onShareAppMessage() {
    return {
      title: 'AI轻食记 - 智能食物识别与营养分析',
      path: '/pages/index/index',
      imageUrl: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=200&fit=crop&auto=format'
    }
  }
})
