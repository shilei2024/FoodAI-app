// pages/profile/profile.js
Page({
  data: {
    // 用户信息
    userInfo: {},
    hasUserInfo: false,
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
        path: ''
      },
      {
        id: 2,
        title: '隐私设置',
        icon: 'shield-o',
        desc: '管理隐私权限',
        path: ''
      },
      {
        id: 3,
        title: '通知设置',
        icon: 'bell-o',
        desc: '管理推送通知',
        path: ''
      },
      {
        id: 4,
        title: '清除缓存',
        icon: 'delete-o',
        desc: '清理本地数据',
        path: ''
      },
      {
        id: 5,
        title: '关于我们',
        icon: 'info-o',
        desc: '了解AI轻食记',
        path: ''
      },
      {
        id: 6,
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
    const userInfo = wx.getStorageSync('userInfo')
    const userStats = wx.getStorageSync('userStats') || {
      totalRecords: 156,
      aiRecords: 89,
      favoriteFoods: 12,
      continuousDays: 7
    }

    this.setData({
      userInfo: userInfo || {},
      hasUserInfo: !!userInfo,
      userStats: userStats,
      isVip: wx.getStorageSync('isVip') || false,
      vipExpireDate: wx.getStorageSync('vipExpireDate') || ''
    })
  },

  // 刷新用户数据
  refreshUserData() {
    this.loadUserData()
  },

  // 获取用户信息
  getUserProfile(e) {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        wx.setStorageSync('userInfo', res.userInfo)
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      }
    })
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('userStats')
          wx.removeStorageSync('isVip')
          wx.removeStorageSync('vipExpireDate')
          
          this.setData({
            userInfo: {},
            hasUserInfo: false,
            isVip: false,
            vipExpireDate: ''
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
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
      case 3: // 通知设置
        wx.showModal({
          title: '通知设置',
          content: '该功能即将上线，敬请期待！\n\n未来将支持：\n- 推送通知开关\n- 通知时间设置\n- 通知类型选择\n- 消息免打扰模式',
          showCancel: false,
          confirmText: '知道了'
        })
        break
      case 4: // 清除缓存
        this.clearCache()
        break
      case 5: // 关于我们
        this.showAbout()
        break
      case 6: // 帮助与反馈
        this.showHelp()
        break
    }
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              wx.showToast({
                title: '缓存已清除',
                icon: 'success'
              })
              this.refreshUserData()
            }
          })
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
    wx.showModal({
      title: '开通VIP会员',
      content: '会员功能需要配置微信支付。\n\n配置步骤：\n1. 开通微信支付商户号\n2. 配置支付密钥（config.js）\n3. 部署支付相关云函数\n\n配置完成后，用户可享受：\n✓ 无限次AI识别\n✓ 高级营养分析\n✓ 个性化食谱推荐\n✓ 数据云端同步\n\n详细配置说明请参考项目文档。',
      showCancel: true,
      cancelText: '稍后配置',
      confirmText: '查看文档',
      success: (res) => {
        if (res.confirm) {
          // 可以跳转到文档页面或打开外部链接
          wx.showToast({
            title: '请查看项目README.md',
            icon: 'none',
            duration: 2000
          })
        }
      }
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
