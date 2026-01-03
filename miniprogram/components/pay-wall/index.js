// components/pay-wall/index.js
Component({
  properties: {
    // 付费墙类型：vip, feature, content
    type: {
      type: String,
      value: 'vip'
    },
    // 功能名称
    featureName: {
      type: String,
      value: ''
    },
    // 价格信息
    priceInfo: {
      type: Object,
      value: {
        monthly: 9.9,
        yearly: 99,
        lifetime: 299
      }
    },
    // 是否显示关闭按钮
    showClose: {
      type: Boolean,
      value: true
    },
    // 自定义样式
    customStyle: {
      type: String,
      value: ''
    }
  },

  data: {
    // 组件状态
    showPayWall: false,
    selectedPlan: 'monthly',
    // 用户会员状态
    userVipInfo: null,
    // 支付状态
    paying: false,
    // 计算属性
    yearlySaveAmount: 0
  },

  observers: {
    // 观察价格信息变化，计算节省金额
    'priceInfo.monthly, priceInfo.yearly'(monthly, yearly) {
      if (monthly && yearly) {
        const saveAmount = (monthly * 12 - yearly).toFixed(1)
        this.setData({ yearlySaveAmount: saveAmount })
      }
    }
  },

  methods: {
    // 显示付费墙
    show() {
      this.setData({ showPayWall: true })
      this.loadUserVipInfo()
      // 初始计算节省金额
      const { monthly, yearly } = this.data.priceInfo
      if (monthly && yearly) {
        const saveAmount = (monthly * 12 - yearly).toFixed(1)
        this.setData({ yearlySaveAmount: saveAmount })
      }
    },

    // 隐藏付费墙
    hide() {
      this.setData({ showPayWall: false })
    },

    // 加载用户会员信息
    loadUserVipInfo() {
      const userVipInfo = wx.getStorageSync('userVipInfo') || {
        isVip: false,
        expireDate: '',
        planType: ''
      }
      this.setData({ userVipInfo })
    },

    // 选择套餐
    selectPlan(e) {
      const plan = e.currentTarget.dataset.plan
      if (plan !== this.data.selectedPlan) {
        this.setData({ selectedPlan: plan })
      }
    },

    // 立即支付
    payNow() {
      if (this.data.paying) return

      this.setData({ paying: true })

      // 模拟支付过程
      setTimeout(() => {
        // 支付成功
        const newVipInfo = {
          isVip: true,
          expireDate: this.calculateExpireDate(),
          planType: this.data.selectedPlan
        }

        wx.setStorageSync('userVipInfo', newVipInfo)
        
        this.setData({
          paying: false,
          userVipInfo: newVipInfo
        })

        this.triggerEvent('paysuccess', {
          plan: this.data.selectedPlan,
          price: this.data.priceInfo[this.data.selectedPlan]
        })

        wx.showToast({
          title: '支付成功',
          icon: 'success'
        })

        // 关闭付费墙
        setTimeout(() => {
          this.hide()
        }, 1500)
      }, 2000)
    },

    // 计算过期日期
    calculateExpireDate() {
      const now = new Date()
      let expireDate = new Date(now)

      switch (this.data.selectedPlan) {
        case 'monthly':
          expireDate.setMonth(now.getMonth() + 1)
          break
        case 'yearly':
          expireDate.setFullYear(now.getFullYear() + 1)
          break
        case 'lifetime':
          expireDate.setFullYear(now.getFullYear() + 100) // 永久
          break
      }

      return expireDate.toISOString().split('T')[0]
    },

    // 恢复购买
    restorePurchase() {
      wx.showToast({
        title: '恢复购买功能开发中',
        icon: 'none'
      })
    },

    // 查看会员权益
    viewBenefits() {
      this.triggerEvent('viewbenefits')
    },

    // 关闭付费墙
    onClose() {
      this.hide()
      this.triggerEvent('close')
    },

    // 点击遮罩层
    onMaskTap() {
      if (this.data.showClose) {
        this.onClose()
      }
    }
  },

  // 组件生命周期
  lifetimes: {
    ready() {
      // 组件加载时检查用户会员状态
      this.loadUserVipInfo()
    }
  },

  // 页面生命周期
  pageLifetimes: {
    show() {
      // 页面显示时刷新会员信息
      this.loadUserVipInfo()
    }
  }
})
