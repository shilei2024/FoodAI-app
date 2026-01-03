// pages/account/account.js
const userService = require('../../services/user-service.js')

Page({
  data: {
    userInfo: {},
    // 账号信息
    accountInfo: {
      phone: '',
      email: '',
      wechatBound: true,
      lastLoginTime: '',
      registerTime: ''
    },
    // 安全设置
    securitySettings: [
      {
        id: 1,
        title: '修改密码',
        icon: 'lock',
        desc: '定期修改密码更安全',
        enabled: false
      },
      {
        id: 2,
        title: '绑定手机',
        icon: 'phone',
        desc: '绑定手机号增强安全性',
        enabled: false
      },
      {
        id: 3,
        title: '绑定邮箱',
        icon: 'envelop-o',
        desc: '绑定邮箱用于找回密码',
        enabled: false
      },
      {
        id: 4,
        title: '登录设备管理',
        icon: 'computer',
        desc: '查看和管理登录设备',
        enabled: false
      },
      {
        id: 5,
        title: '账号安全等级',
        icon: 'shield',
        desc: '查看账号安全状态',
        enabled: true
      }
    ]
  },

  onLoad() {
    this.loadUserData()
  },

  onShow() {
    this.refreshUserData()
  },

  // 加载用户数据
  loadUserData() {
    const userInfo = userService.getUserInfo()
    
    // 模拟账号信息
    const accountInfo = {
      phone: userInfo?.phone || '未绑定',
      email: userInfo?.email || '未绑定',
      wechatBound: true,
      lastLoginTime: userInfo?.lastLoginTime || new Date().toLocaleString(),
      registerTime: userInfo?.registerTime || new Date().toLocaleDateString()
    }

    this.setData({
      userInfo: userInfo || {},
      accountInfo: accountInfo
    })
  },

  // 刷新用户数据
  refreshUserData() {
    this.loadUserData()
  },

  // 处理安全设置点击
  handleSecuritySetting(e) {
    const { id } = e.currentTarget.dataset
    const setting = this.data.securitySettings.find(item => item.id === id)
    
    if (!setting.enabled) {
      wx.showToast({
        title: '该功能暂未开放',
        icon: 'none'
      })
      return
    }

    switch(id) {
      case 1: // 修改密码
        this.showChangePassword()
        break
      case 2: // 绑定手机
        this.bindPhone()
        break
      case 3: // 绑定邮箱
        this.bindEmail()
        break
      case 4: // 登录设备管理
        this.showDeviceManagement()
        break
      case 5: // 账号安全等级
        this.showSecurityLevel()
        break
    }
  },

  // 显示修改密码对话框
  showChangePassword() {
    wx.showModal({
      title: '修改密码',
      content: '该功能需要后端支持，目前暂未开放。\n\n如需修改密码，请联系客服。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 绑定手机
  bindPhone() {
    wx.showModal({
      title: '绑定手机',
      content: '请输入手机号码：',
      editable: true,
      placeholderText: '请输入11位手机号',
      success: (res) => {
        if (res.confirm && res.content) {
          const phone = res.content.trim()
          if (this.validatePhone(phone)) {
            this.updatePhone(phone)
          } else {
            wx.showToast({
              title: '请输入正确的手机号',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 验证手机号
  validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  },

  // 更新手机号
  updatePhone(phone) {
    wx.showLoading({
      title: '绑定中...',
    })

    // 模拟绑定过程
    setTimeout(() => {
      wx.hideLoading()
      
      const accountInfo = this.data.accountInfo
      accountInfo.phone = phone
      
      this.setData({
        accountInfo: accountInfo
      })
      
      wx.showToast({
        title: '手机绑定成功',
        icon: 'success'
      })
    }, 1000)
  },

  // 绑定邮箱
  bindEmail() {
    wx.showModal({
      title: '绑定邮箱',
      content: '请输入邮箱地址：',
      editable: true,
      placeholderText: 'example@email.com',
      success: (res) => {
        if (res.confirm && res.content) {
          const email = res.content.trim()
          if (this.validateEmail(email)) {
            this.updateEmail(email)
          } else {
            wx.showToast({
              title: '请输入正确的邮箱地址',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 验证邮箱
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // 更新邮箱
  updateEmail(email) {
    wx.showLoading({
      title: '绑定中...',
    })

    // 模拟绑定过程
    setTimeout(() => {
      wx.hideLoading()
      
      const accountInfo = this.data.accountInfo
      accountInfo.email = email
      
      this.setData({
        accountInfo: accountInfo
      })
      
      wx.showToast({
        title: '邮箱绑定成功',
        icon: 'success'
      })
    }, 1000)
  },

  // 显示设备管理
  showDeviceManagement() {
    const devices = [
      {
        name: '当前设备',
        type: '手机',
        lastLogin: '刚刚',
        location: '本地'
      },
      {
        name: 'iPhone 12',
        type: '手机',
        lastLogin: '3天前',
        location: '北京'
      }
    ]

    wx.showModal({
      title: '登录设备管理',
      content: `当前登录设备：\n\n${devices.map(device => 
        `• ${device.name} (${device.type})\n  最后登录：${device.lastLogin}\n  位置：${device.location}`
      ).join('\n\n')}\n\n您可以在其他设备上退出登录。`,
      confirmText: '退出其他设备',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已退出其他设备',
            icon: 'success'
          })
        }
      }
    })
  },

  // 显示安全等级
  showSecurityLevel() {
    const accountInfo = this.data.accountInfo
    let securityScore = 30 // 基础分
    
    if (accountInfo.phone !== '未绑定') securityScore += 30
    if (accountInfo.email !== '未绑定') securityScore += 20
    if (accountInfo.wechatBound) securityScore += 20
    
    let securityLevel = '低'
    if (securityScore >= 70) securityLevel = '高'
    else if (securityScore >= 40) securityLevel = '中'
    
    const suggestions = []
    if (accountInfo.phone === '未绑定') suggestions.push('绑定手机号')
    if (accountInfo.email === '未绑定') suggestions.push('绑定邮箱')
    
    wx.showModal({
      title: '账号安全等级',
      content: `安全评分：${securityScore}/100\n安全等级：${securityLevel}\n\n${suggestions.length > 0 ? '建议：\n' + suggestions.map(s => '• ' + s).join('\n') : '您的账号安全状况良好！'}`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: '账号管理 - AI轻食记',
      path: '/pages/account/account'
    }
  }
})
