// examples/payment-flow.js
// 微信支付完整流程示例

const payService = require('../services/pay-service.js')
const auth = require('../utils/auth.js')

/**
 * 微信支付完整流程示例
 */
class PaymentFlowExample {
  constructor() {
    this.payService = payService
    this.auth = auth
  }

  /**
   * 示例1：购买VIP套餐
   */
  async exampleBuyVipPlan() {
    console.log('=== 示例1：购买VIP套餐 ===')
    
    try {
      // 1. 检查登录状态
      if (!this.auth.checkLogin()) {
        console.log('请先登录')
        await this.showLoginModal()
        return
      }
      
      // 2. 选择套餐
      const selectedPlan = await this.selectPlan()
      if (!selectedPlan) {
        console.log('用户取消选择套餐')
        return
      }
      
      // 3. 创建订单
      console.log('正在创建订单...')
      const orderResult = await this.createOrder(selectedPlan)
      if (!orderResult.success) {
        throw new Error(`创建订单失败: ${orderResult.error}`)
      }
      
      // 4. 发起支付
      console.log('正在发起支付...')
      const paymentResult = await this.requestPayment(orderResult.data)
      if (!paymentResult.success) {
        throw new Error(`支付失败: ${paymentResult.error}`)
      }
      
      // 5. 支付成功处理
      console.log('支付成功！')
      await this.handlePaymentSuccess(paymentResult.data)
      
      // 6. 显示成功页面
      await this.showSuccessPage(paymentResult.data)
      
    } catch (error) {
      console.error('支付流程出错:', error)
      await this.handlePaymentError(error)
    }
  }

  /**
   * 示例2：购买单个功能
   */
  async exampleBuyFeature(featureName, featurePrice) {
    console.log(`=== 示例2：购买功能 "${featureName}" ===`)
    
    try {
      // 1. 检查功能权限
      const canUse = this.auth.canUseFeature(featureName)
      if (canUse.canUse) {
        console.log('功能已可用，无需购买')
        return
      }
      
      // 2. 显示付费墙
      const userConfirmed = await this.showPayWall(featureName, featurePrice)
      if (!userConfirmed) {
        console.log('用户取消购买')
        return
      }
      
      // 3. 创建功能购买订单
      const orderData = {
        type: 'feature',
        feature: featureName,
        amount: featurePrice,
        description: `购买功能：${featureName}`
      }
      
      const orderResult = await this.payService.createOrder(orderData)
      if (!orderResult.success) {
        throw new Error(`创建订单失败: ${orderResult.error}`)
      }
      
      // 4. 发起支付
      const paymentResult = await this.payService.requestPayment(orderResult.data)
      if (!paymentResult.success) {
        throw new Error(`支付失败: ${paymentResult.error}`)
      }
      
      // 5. 解锁功能
      await this.unlockFeature(featureName, paymentResult.data)
      
      console.log(`功能 "${featureName}" 购买成功！`)
      
    } catch (error) {
      console.error('功能购买流程出错:', error)
      await this.handlePaymentError(error)
    }
  }

  /**
   * 示例3：查询订单状态
   */
  async exampleCheckOrderStatus(orderId) {
    console.log(`=== 示例3：查询订单状态 ${orderId} ===`)
    
    try {
      const status = await this.payService.checkOrderStatus(orderId)
      console.log('订单状态:', status)
      
      if (status === 'paid') {
        console.log('订单已支付')
      } else if (status === 'pending') {
        console.log('订单待支付')
      } else if (status === 'refunded') {
        console.log('订单已退款')
      } else if (status === 'cancelled') {
        console.log('订单已取消')
      }
      
      return status
    } catch (error) {
      console.error('查询订单状态失败:', error)
      return null
    }
  }

  /**
   * 示例4：获取套餐列表
   */
  async exampleGetPackages() {
    console.log('=== 示例4：获取套餐列表 ===')
    
    try {
      const packages = await this.payService.getPackages()
      console.log('可用套餐:', packages)
      
      // 显示套餐选择界面
      const selectedPackage = await this.showPackageSelection(packages)
      return selectedPackage
    } catch (error) {
      console.error('获取套餐列表失败:', error)
      return null
    }
  }

  /**
   * 示例5：处理支付回调
   */
  async exampleHandlePaymentCallback(callbackData) {
    console.log('=== 示例5：处理支付回调 ===')
    
    try {
      // 验证回调签名
      const isValid = await this.verifyCallbackSignature(callbackData)
      if (!isValid) {
        throw new Error('回调签名验证失败')
      }
      
      // 解析回调数据
      const paymentInfo = this.parseCallbackData(callbackData)
      
      // 更新订单状态
      await this.updateOrderFromCallback(paymentInfo)
      
      // 更新用户状态
      await this.updateUserFromCallback(paymentInfo)
      
      // 发送支付成功通知
      await this.sendPaymentNotification(paymentInfo)
      
      console.log('支付回调处理完成')
      return { success: true }
      
    } catch (error) {
      console.error('处理支付回调失败:', error)
      return { success: false, error: error.message }
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 显示登录弹窗
   */
  async showLoginModal() {
    return new Promise((resolve) => {
      wx.showModal({
        title: '登录提示',
        content: '需要登录后才能进行支付',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/profile/profile',
              success: () => resolve(false)
            })
          } else {
            resolve(false)
          }
        }
      })
    })
  }

  /**
   * 选择套餐
   */
  async selectPlan() {
    const plans = [
      { id: 'monthly', name: '月付会员', price: 9.9, discount: '' },
      { id: 'yearly', name: '年付会员', price: 99, discount: '8.3折' },
      { id: 'lifetime', name: '永久会员', price: 299, discount: '最划算' }
    ]
    
    return new Promise((resolve) => {
      wx.showActionSheet({
        itemList: plans.map(p => `${p.name} - ¥${p.price} ${p.discount}`),
        success: (res) => {
          resolve(plans[res.tapIndex])
        },
        fail: () => {
          resolve(null)
        }
      })
    })
  }

  /**
   * 创建订单
   */
  async createOrder(plan) {
    const orderData = {
      planType: plan.id,
      amount: plan.price * 100, // 转换为分
      description: `购买${plan.name}`,
      goodsName: plan.name,
      goodsDetail: `VIP会员服务 - ${plan.name}`
    }
    
    return await this.payService.createOrder(orderData)
  }

  /**
   * 发起支付
   */
  async requestPayment(orderData) {
    return await this.payService.requestPayment(orderData)
  }

  /**
   * 处理支付成功
   */
  async handlePaymentSuccess(paymentData) {
    // 1. 更新本地VIP状态
    const vipInfo = {
      isVip: true,
      planType: paymentData.planType,
      purchaseTime: new Date().toISOString(),
      expireDate: this.calculateExpireDate(paymentData.planType)
    }
    
    wx.setStorageSync('userVipInfo', vipInfo)
    
    // 2. 发送支付成功通知
    wx.showToast({
      title: '支付成功！',
      icon: 'success',
      duration: 2000
    })
    
    // 3. 记录支付日志
    this.recordPaymentLog(paymentData)
    
    // 4. 触发支付成功事件
    this.triggerPaymentSuccessEvent(paymentData)
  }

  /**
   * 计算过期日期
   */
  calculateExpireDate(planType) {
    const now = new Date()
    let expireDate = new Date(now)
    
    switch (planType) {
      case 'monthly':
        expireDate.setMonth(now.getMonth() + 1)
        break
      case 'yearly':
        expireDate.setFullYear(now.getFullYear() + 1)
        break
      case 'lifetime':
        expireDate.setFullYear(now.getFullYear() + 100) // 100年视为永久
        break
      default:
        expireDate.setMonth(now.getMonth() + 1)
    }
    
    return expireDate.toISOString()
  }

  /**
   * 显示成功页面
   */
  async showSuccessPage(paymentData) {
    return new Promise((resolve) => {
      wx.showModal({
        title: '购买成功',
        content: `感谢您购买${paymentData.planName}！\n\n有效期至：${new Date(paymentData.expireDate).toLocaleDateString()}`,
        showCancel: false,
        confirmText: '我知道了',
        success: resolve
      })
    })
  }

  /**
   * 处理支付错误
   */
  async handlePaymentError(error) {
    wx.showToast({
      title: error.message || '支付失败',
      icon: 'none',
      duration: 3000
    })
    
    // 记录错误日志
    this.recordErrorLog(error)
  }

  /**
   * 显示付费墙
   */
  async showPayWall(featureName, price) {
    return new Promise((resolve) => {
      wx.showModal({
        title: '功能解锁',
        content: `解锁 "${featureName}" 功能需要支付 ¥${price}\n\n解锁后永久使用`,
        confirmText: '立即解锁',
        cancelText: '取消',
        success: (res) => {
          resolve(res.confirm)
        }
      })
    })
  }

  /**
   * 解锁功能
   */
  async unlockFeature(featureName, paymentData) {
    // 获取已解锁功能列表
    const unlockedFeatures = wx.getStorageSync('unlocked_features') || []
    
    // 添加新功能
    if (!unlockedFeatures.includes(featureName)) {
      unlockedFeatures.push(featureName)
      wx.setStorageSync('unlocked_features', unlockedFeatures)
    }
    
    // 记录解锁日志
    const unlockLog = {
      feature: featureName,
      unlockTime: new Date().toISOString(),
      paymentId: paymentData.paymentId,
      amount: paymentData.amount
    }
    
    wx.setStorageSync(`feature_unlock_${featureName}`, unlockLog)
    
    // 显示解锁成功提示
    wx.showToast({
      title: '功能解锁成功！',
      icon: 'success',
      duration: 2000
    })
  }

  /**
   * 显示套餐选择
   */
  async showPackageSelection(packages) {
    return new Promise((resolve) => {
      const actionItems = packages.map(pkg => 
        `${pkg.name} - ¥${(pkg.price / 100).toFixed(2)} ${pkg.discount ? `(${pkg.discount})` : ''}`
      )
      
      wx.showActionSheet({
        itemList: actionItems,
        success: (res) => {
          resolve(packages[res.tapIndex])
        },
        fail: () => {
          resolve(null)
        }
      })
    })
  }

  /**
   * 验证回调签名
   */
  async verifyCallbackSignature(callbackData) {
    // 这里应该实现微信支付回调签名验证
    // 由于需要商户密钥，这里返回模拟结果
    return true
  }

  /**
   * 解析回调数据
   */
  parseCallbackData(callbackData) {
    return {
      orderId: callbackData.out_trade_no,
      transactionId: callbackData.transaction_id,
      amount: callbackData.total_fee,
      payTime: callbackData.time_end,
      status: callbackData.result_code === 'SUCCESS' ? 'paid' : 'failed'
    }
  }

  /**
   * 更新订单状态
   */
  async updateOrderFromCallback(paymentInfo) {
    // 获取订单列表
    const orders = wx.getStorageSync('user_orders') || []
    
    // 更新对应订单
    const updatedOrders = orders.map(order => {
      if (order.orderId === paymentInfo.orderId) {
        return {
          ...order,
          status: paymentInfo.status,
          transactionId: paymentInfo.transactionId,
          payTime: paymentInfo.payTime,
          updatedAt: new Date().toISOString()
        }
      }
      return order
    })
    
    wx.setStorageSync('user_orders', updatedOrders)
  }

  /**
   * 更新用户状态
   */
  async updateUserFromCallback(paymentInfo) {
    if (paymentInfo.status === 'paid') {
      // 根据订单类型更新用户状态
      const order = await this.getOrderById(paymentInfo.orderId)
      if (order && order.type === 'vip') {
        await this.updateVipStatus(order)
      }
    }
  }

  /**
   * 发送支付通知
   */
  async sendPaymentNotification(paymentInfo) {
    // 这里可以发送模板消息或站内通知
    console.log('发送支付成功通知:', paymentInfo)
  }

  /**
   * 记录支付日志
   */
  recordPaymentLog(paymentData) {
    const paymentLogs = wx.getStorageSync('payment_logs') || []
    paymentLogs.push({
      ...paymentData,
      logTime: new Date().toISOString()
    })
    
    wx.setStorageSync('payment_logs', paymentLogs)
  }

  /**
   * 记录错误日志
   */
  recordErrorLog(error) {
    const errorLogs = wx.getStorageSync('payment_error_logs') || []
    errorLogs.push({
      message: error.message,
      stack: error.stack,
      time: new Date().toISOString()
    })
    
    wx.setStorageSync('payment_error_logs', errorLogs)
  }

  /**
   * 触发支付成功事件
   */
  triggerPaymentSuccessEvent(paymentData) {
    // 这里可以触发自定义事件
    console.log('支付成功事件:', paymentData)
  }

  /**
   * 根据ID获取订单
   */
  async getOrderById(orderId) {
    const orders = wx.getStorageSync('user_orders') || []
    return orders.find(order => order.orderId === orderId)
  }

  /**
   * 更新VIP状态
   */
  async updateVipStatus(order) {
    const vipInfo = wx.getStorageSync('userVipInfo') || {}
    
    const updatedVipInfo = {
      ...vipInfo,
      isVip: true,
      planType: order.planType,
      purchaseTime: order.payTime || new Date().toISOString(),
      expireDate: this.calculateExpireDate(order.planType)
    }
    
    wx.setStorageSync('userVipInfo', updatedVipInfo)
  }
}

// 创建实例并导出
const paymentFlowExample = new PaymentFlowExample()

module.exports = {
  // 示例方法
  exampleBuyVipPlan: () => paymentFlowExample.exampleBuyVipPlan(),
  exampleBuyFeature: (featureName, price) => paymentFlowExample.exampleBuyFeature(featureName, price),
  exampleCheckOrderStatus: (orderId) => paymentFlowExample.exampleCheckOrderStatus(orderId),
  exampleGetPackages: () => paymentFlowExample.exampleGetPackages(),
  exampleHandlePaymentCallback: (callbackData) => paymentFlowExample.exampleHandlePaymentCallback(callbackData),
  
  // 工具方法
  showLoginModal: () => paymentFlowExample.showLoginModal(),
  selectPlan: () => paymentFlowExample.selectPlan(),
  createOrder: (plan) => paymentFlowExample.createOrder(plan),
  requestPayment: (orderData) => paymentFlowExample.requestPayment(orderData),
  handlePaymentSuccess: (paymentData) => paymentFlowExample.handlePaymentSuccess(paymentData),
  handlePaymentError: (error) => paymentFlowExample.handlePaymentError(error),
  
  // 实例
  example: paymentFlowExample
}
