// pages/privacy/privacy.js
const userService = require('../../services/user-service.js')

Page({
  data: {
    // 隐私设置
    privacySettings: [
      {
        id: 1,
        title: '数据收集授权',
        icon: 'database',
        desc: '允许收集使用数据改进服务',
        value: true,
        type: 'switch'
      },
      {
        id: 2,
        title: '个性化推荐',
        icon: 'bullhorn-o',
        desc: '基于使用习惯推荐内容',
        value: true,
        type: 'switch'
      },
      {
        id: 3,
        title: '位置信息',
        icon: 'location-o',
        desc: '获取位置提供本地化服务',
        value: false,
        type: 'switch'
      },
      {
        id: 4,
        title: '相机权限',
        icon: 'photograph',
        desc: '使用相机进行食物识别',
        value: true,
        type: 'switch'
      },
      {
        id: 5,
        title: '相册权限',
        icon: 'photo-o',
        desc: '访问相册选择食物图片',
        value: true,
        type: 'switch'
      },
      {
        id: 6,
        title: '第三方分享',
        icon: 'share',
        desc: '允许分享到微信等平台',
        value: true,
        type: 'switch'
      },
      {
        id: 7,
        title: '数据导出格式',
        icon: 'down',
        desc: '选择数据导出格式',
        value: 'json',
        type: 'select',
        options: ['json', 'csv']
      },
      {
        id: 8,
        title: '自动删除记录',
        icon: 'delete',
        desc: '自动删除超过30天的记录',
        value: false,
        type: 'switch'
      }
    ],
    // 数据管理选项
    dataManagement: [
      {
        id: 1,
        title: '查看个人数据',
        icon: 'eye-o',
        desc: '查看我们收集的个人数据'
      },
      {
        id: 2,
        title: '导出个人数据',
        icon: 'down',
        desc: '导出所有个人数据'
      },
      {
        id: 3,
        title: '删除个人数据',
        icon: 'delete-o',
        desc: '请求删除所有个人数据'
      },
      {
        id: 4,
        title: '隐私政策',
        icon: 'document',
        desc: '查看完整的隐私政策'
      }
    ]
  },

  onLoad() {
    this.loadPrivacySettings()
  },

  // 加载隐私设置
  loadPrivacySettings() {
    const savedSettings = userService.getUserSettings()
    
    // 更新设置值
    const privacySettings = this.data.privacySettings.map(setting => {
      if (savedSettings[setting.title] !== undefined) {
        return { ...setting, value: savedSettings[setting.title] }
      }
      return setting
    })

    this.setData({
      privacySettings: privacySettings
    })
  },

  // 保存隐私设置
  savePrivacySettings() {
    const settings = {}
    this.data.privacySettings.forEach(setting => {
      settings[setting.title] = setting.value
    })
    
    userService.updateUserSettings(settings)
    
    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    })
  },

  // 处理隐私设置变化
  onPrivacySettingChange(e) {
    const { id } = e.currentTarget.dataset
    const { value } = e.detail
    
    const privacySettings = this.data.privacySettings.map(setting => {
      if (setting.id === id) {
        return { ...setting, value: value }
      }
      return setting
    })

    this.setData({
      privacySettings: privacySettings
    })

    // 自动保存设置
    this.savePrivacySettings()
  },

  // 处理数据管理点击
  handleDataManagement(e) {
    const { id } = e.currentTarget.dataset
    
    switch(id) {
      case 1: // 查看个人数据
        this.viewPersonalData()
        break
      case 2: // 导出个人数据
        this.exportPersonalData()
        break
      case 3: // 删除个人数据
        this.deletePersonalData()
        break
      case 4: // 隐私政策
        this.showPrivacyPolicy()
        break
    }
  },

  // 查看个人数据
  viewPersonalData() {
    const userInfo = userService.getUserInfo()
    const userStats = userService.getUserStats()
    const userPreferences = userService.getUserPreferences()
    
    const dataSummary = `
用户信息：
• 昵称：${userInfo.nickName || '未设置'}
• 注册时间：${userInfo.registerTime || '未知'}
• 最后登录：${userInfo.lastLoginTime || '未知'}

使用统计：
• 总记录数：${userStats.totalRecords || 0}
• AI识别次数：${userStats.aiRecords || 0}
• 连续记录天数：${userStats.continuousDays || 0}

饮食偏好：
• 菜系偏好：${userPreferences.cuisine || '未设置'}
• 饮食类型：${userPreferences.dietType || '未设置'}
• 辣度偏好：${userPreferences.spiceLevel || '未设置'}
• 过敏食物：${userPreferences.allergies?.join(', ') || '无'}
• 不喜欢的食物：${userPreferences.dislikes?.join(', ') || '无'}
    `.trim()

    wx.showModal({
      title: '个人数据概览',
      content: dataSummary,
      confirmText: '导出数据',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          this.exportPersonalData()
        }
      }
    })
  },

  // 导出个人数据
  exportPersonalData() {
    wx.showActionSheet({
      itemList: ['导出为JSON', '导出为CSV'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.exportAsJSON()
        } else if (res.tapIndex === 1) {
          this.exportAsCSV()
        }
      }
    })
  },

  // 导出为JSON
  exportAsJSON() {
    const userInfo = userService.getUserInfo()
    const userStats = userService.getUserStats()
    const userPreferences = userService.getUserPreferences()
    
    const exportData = {
      userInfo: userInfo,
      userStats: userStats,
      userPreferences: userPreferences,
      exportTime: new Date().toISOString(),
      exportFormat: 'json'
    }
    
    const jsonStr = JSON.stringify(exportData, null, 2)
    
    // 在实际应用中，这里应该将数据保存到文件或分享
    wx.showModal({
      title: '数据导出',
      content: 'JSON数据已准备就绪。\n\n由于小程序限制，请复制以下数据：',
      editable: true,
      editableValue: jsonStr.substring(0, 1000) + (jsonStr.length > 1000 ? '\n\n...（数据过长，已截断）' : ''),
      confirmText: '复制',
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
  },

  // 导出为CSV
  exportAsCSV() {
    wx.showToast({
      title: 'CSV导出功能开发中',
      icon: 'none'
    })
  },

  // 删除个人数据
  deletePersonalData() {
    wx.showModal({
      title: '删除个人数据',
      content: '警告：此操作将删除所有个人数据，包括：\n\n• 用户信息\n• 识别记录\n• 使用统计\n• 饮食偏好\n\n删除后数据无法恢复，确定要继续吗？',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          this.confirmDeleteData()
        }
      }
    })
  },

  // 确认删除数据
  confirmDeleteData() {
    wx.showLoading({
      title: '删除中...',
    })

    // 模拟删除过程
    setTimeout(() => {
      wx.hideLoading()
      
      // 清除所有用户数据
      userService.clearUserInfo()
      wx.removeStorageSync('user_settings')
      wx.removeStorageSync('userStats')
      wx.removeStorageSync('user_preferences')
      wx.removeStorageSync('recognition_records')
      
      wx.showModal({
        title: '删除完成',
        content: '所有个人数据已删除。\n\n小程序将返回首页。',
        showCancel: false,
        success: () => {
          wx.reLaunch({
            url: '/pages/index/index'
          })
        }
      })
    }, 2000)
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    const privacyPolicy = `
AI轻食记隐私政策

1. 数据收集
我们收集以下类型的数据：
• 用户基本信息（昵称、头像）
• 使用数据（识别记录、使用频率）
• 设备信息（设备型号、系统版本）
• 位置信息（如授权）

2. 数据使用
收集的数据用于：
• 提供核心服务（食物识别）
• 改进服务质量
• 个性化推荐
• 统计分析

3. 数据保护
我们采取以下措施保护您的数据：
• 本地存储加密
• 数据传输加密
• 访问权限控制
• 定期安全审计

4. 数据共享
我们不会将您的数据出售给第三方。
仅在以下情况共享数据：
• 获得您的明确同意
• 法律要求
• 保护用户安全

5. 您的权利
您有权：
• 访问个人数据
• 更正错误数据
• 删除个人数据
• 撤回数据授权

6. 联系我们
如有隐私相关问题，请联系：
support@foodai.com

最后更新：2025年1月
    `.trim()

    wx.showModal({
      title: '隐私政策',
      content: privacyPolicy,
      showCancel: false,
      confirmText: '我已阅读并同意'
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: '隐私设置 - AI轻食记',
      path: '/pages/privacy/privacy'
    }
  }
})
