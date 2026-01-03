// services/pay-service.js
const config = require('../constants/config.js')
const api = require('../utils/api.js')
const auth = require('../utils/auth.js')

/**
 * 支付服务类
 */
class PayService {
  constructor() {
    this.payConfig = config.payment
    this.api = api
    this.auth = auth
  }

  /**
   * 创建订单
   * @param {Object} orderData 订单数据
   * @returns {Promise} Promise对象
   */
  async createOrder(orderData) {
    try {
      // 检查登录状态
      if (!this.auth.checkLogin()) {
        throw new Error('请先登录')
      }

      // 准备订单数据
      const order = {
        ...orderData,
        userId: this.auth.getUserInfo().openId || 'anonymous',
        timestamp: Date.now(),
        nonceStr: this.generateNonceStr(),
        tradeType: 'JSAPI'
      }

      // 调用云函数创建订单
      const result = await this.callCloudFunction('create-order', order)

      if (result.success && result.data) {
        // 保存订单信息
        this.saveOrderInfo(result.data)
        
        return {
          success: true,
          data: result.data,
          message: '订单创建成功'
        }
      } else {
        throw new Error(result.message || '创建订单失败')
      }

    } catch (error) {
      console.error('创建订单失败:', error)
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      }
    }
  }

  /**
   * 发起支付
   * @param {Object} paymentData 支付数据
   * @returns {Promise} Promise对象
   */
  async requestPayment(paymentData) {
    try {
      // 检查支付参数
      if (!paymentData || !paymentData.prepayId) {
        throw new Error('支付参数不完整')
      }

      // 获取支付参数
      const payParams = await this.getPaymentParams(paymentData)

      // 发起微信支付
      const paymentResult = await this.wechatPayment(payParams)

      // 验证支付结果
      const verifiedResult = await this.verifyPayment(paymentResult, paymentData)

      if (verifiedResult.success) {
        // 更新订单状态
        await this.updateOrderStatus(paymentData.orderId, 'paid')
        
        // 更新用户VIP状态
        await this.updateUserVipStatus(paymentData)
        
        return {
          success: true,
          data: verifiedResult.data,
          message: '支付成功'
        }
      } else {
        throw new Error(verifiedResult.message || '支付验证失败')
      }

    } catch (error) {
      console.error('支付失败:', error)
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      }
    }
  }

  /**
   * 获取支付参数
   * @param {Object} paymentData 支付数据
   * @returns {Promise} Promise对象
   */
  async getPaymentParams(paymentData) {
    try {
      // 调用云函数获取支付参数（签名必须在后端生成）
      const result = await this.callCloudFunction('get-payment-params', {
        prepayId: paymentData.prepayId,
        timestamp: Math.floor(Date.now() / 1000)
      })
      
      if (result.success && result.data) {
        return result.data
      } else {
        throw new Error(result.message || '获取支付参数失败')
      }
    } catch (error) {
      console.error('获取支付参数失败:', error)
      throw new Error(`获取支付参数失败: ${error.message}\n\n支付功能需要后端支持，请确保已正确配置并部署云函数。`)
    }
  }

  /**
   * 微信支付
   * @param {Object} payParams 支付参数
   * @returns {Promise} Promise对象
   */
  wechatPayment(payParams) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        ...payParams,
        success: (res) => {
          resolve({
            success: true,
            data: res,
            message: '支付成功'
          })
        },
        fail: (error) => {
          let errorMessage = '支付失败'
          
          if (error.errMsg.includes('cancel')) {
            errorMessage = '用户取消支付'
          } else if (error.errMsg.includes('fail')) {
            errorMessage = '支付失败，请重试'
          }

          reject(new Error(errorMessage))
        }
      })
    })
  }

  /**
   * 验证支付结果
   * @param {Object} paymentResult 支付结果
   * @param {Object} paymentData 支付数据
   * @returns {Promise} Promise对象
   */
  async verifyPayment(paymentResult, paymentData) {
    try {
      // 调用云函数验证支付结果
      const verifyData = {
        orderId: paymentData.orderId,
        transactionId: paymentResult.data.transactionId,
        paymentResult: paymentResult.data
      }

      const result = await this.callCloudFunction('payment-callback', verifyData)

      return {
        success: result.success || false,
        data: result.data,
        message: result.message || '支付验证完成'
      }

    } catch (error) {
      console.error('支付验证失败:', error)
      return {
        success: false,
        error: error.message,
        message: '支付验证失败'
      }
    }
  }

  /**
   * 更新订单状态
   * @param {string} orderId 订单ID
   * @param {string} status 状态
   * @returns {Promise} Promise对象
   */
  async updateOrderStatus(orderId, status) {
    try {
      // 更新本地订单状态
      const orders = wx.getStorageSync('user_orders') || []
      const orderIndex = orders.findIndex(order => order.orderId === orderId)
      
      if (orderIndex !== -1) {
        orders[orderIndex].status = status
        orders[orderIndex].updatedAt = Date.now()
        wx.setStorageSync('user_orders', orders)
      }

      // 调用云函数更新服务器状态
      const updateData = {
        orderId: orderId,
        status: status,
        updatedAt: Date.now()
      }

      await this.callCloudFunction('update-order-status', updateData)

      return { success: true }
    } catch (error) {
      console.error('更新订单状态失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 更新用户VIP状态
   * @param {Object} paymentData 支付数据
   * @returns {Promise} Promise对象
   */
  async updateUserVipStatus(paymentData) {
    try {
      const { planType, duration } = paymentData
      
      // 计算过期时间
      const expireDate = this.calculateExpireDate(planType, duration)
      
      // 更新本地VIP信息
      const vipInfo = {
        isVip: true,
        planType: planType,
        expireDate: expireDate,
        activatedAt: Date.now(),
        orderId: paymentData.orderId
      }

      wx.setStorageSync('userVipInfo', vipInfo)

      // 调用云函数更新服务器VIP状态
      await this.callCloudFunction('update-vip-status', vipInfo)

      return { success: true, vipInfo }
    } catch (error) {
      console.error('更新VIP状态失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 计算过期时间
   * @param {string} planType 套餐类型
   * @param {number} duration 时长（天）
   * @returns {string} 过期日期字符串
   */
  calculateExpireDate(planType, duration = 30) {
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
        expireDate.setFullYear(now.getFullYear() + 100) // 永久
        break
      default:
        expireDate.setDate(now.getDate() + duration)
    }

    return expireDate.toISOString().split('T')[0]
  }

  /**
   * 获取订单列表
   * @param {Object} options 选项
   * @returns {Array} 订单列表
   */
  getOrderList(options = {}) {
    let orders = wx.getStorageSync('user_orders') || []
    
    // 过滤选项
    if (options.status) {
      orders = orders.filter(order => order.status === options.status)
    }
    
    if (options.limit) {
      orders = orders.slice(0, options.limit)
    }
    
    // 排序（最新的在前）
    orders.sort((a, b) => b.createdAt - a.createdAt)

    return orders
  }

  /**
   * 获取订单详情
   * @param {string} orderId 订单ID
   * @returns {Object|null} 订单详情
   */
  getOrderDetail(orderId) {
    const orders = wx.getStorageSync('user_orders') || []
    return orders.find(order => order.orderId === orderId) || null
  }

  /**
   * 保存订单信息
   * @param {Object} orderInfo 订单信息
   */
  saveOrderInfo(orderInfo) {
    const orders = wx.getStorageSync('user_orders') || []
    
    // 检查是否已存在
    const existingIndex = orders.findIndex(order => order.orderId === orderInfo.orderId)
    
    if (existingIndex !== -1) {
      orders[existingIndex] = { ...orders[existingIndex], ...orderInfo }
    } else {
      orders.push({
        ...orderInfo,
        createdAt: Date.now(),
        status: 'pending'
      })
    }

    // 限制订单数量
    const maxOrders = 50
    if (orders.length > maxOrders) {
      orders.splice(maxOrders)
    }

    wx.setStorageSync('user_orders', orders)
  }

  /**
   * 调用云函数
   * @param {string} functionName 函数名
   * @param {Object} data 数据
   * @returns {Promise} Promise对象
   */
  async callCloudFunction(functionName, data) {
    try {
      // 检查云函数配置
      const config = require('../constants/config.js')
      
      // 优先使用微信云开发
      if (wx.cloud && config.cloud && config.cloud.env) {
        try {
          const result = await wx.cloud.callFunction({
            name: functionName,
            data: data
          })
          return result.result
        } catch (error) {
          console.error(`微信云函数调用失败: ${error.message}`)
          // 继续尝试其他方式
        }
      }
      
      // 使用腾讯云函数（个人认证用户替代方案）
      if (config.tencentSCF && config.tencentSCF.baseUrl) {
        const result = await new Promise((resolve, reject) => {
          wx.request({
            url: `${config.tencentSCF.baseUrl}/${functionName}`,
            method: 'POST',
            data: data,
            timeout: config.tencentSCF.timeout || 30000,
            success: (res) => {
              if (res.statusCode === 200) {
                resolve(res.data)
              } else {
                reject(new Error(`云函数调用失败: HTTP ${res.statusCode}`))
              }
            },
            fail: reject
          })
        })
        return result
      }
      
      // 如果没有配置云函数，抛出错误
      throw new Error(`支付功能需要配置云函数。\n\n请选择以下方式之一：\n\n1. 【推荐】配置微信云开发：\n   - 开通微信云开发（需企业认证）\n   - 在 config.js 中配置 cloud.env\n   - 部署 cloudfunctions/ 目录下的云函数\n\n2. 配置腾讯云函数（个人认证可用）：\n   - 在腾讯云部署云函数\n   - 在 config.js 中配置 tencentSCF.baseUrl\n\n详细配置说明请参考项目文档。`)
      
    } catch (error) {
      console.error(`调用云函数 ${functionName} 失败:`, error)
      throw error
    }
  }

  /**
   * 生成随机字符串
   * @param {number} length 长度
   * @returns {string} 随机字符串
   */
  generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }


  /**
   * 获取支付统计
   * @returns {Object} 统计信息
   */
  getPaymentStats() {
    const orders = this.getOrderList()
    
    const stats = {
      totalOrders: orders.length,
      totalAmount: 0,
      paidOrders: 0,
      pendingOrders: 0,
      failedOrders: 0,
      byPlanType: {},
      byMonth: {}
    }

    orders.forEach(order => {
      // 统计金额
      if (order.amount) {
        stats.totalAmount += order.amount
      }

      // 统计状态
      if (order.status === 'paid') {
        stats.paidOrders++
      } else if (order.status === 'pending') {
        stats.pendingOrders++
      } else if (order.status === 'failed') {
        stats.failedOrders++
      }

      // 按套餐类型统计
      if (order.planType) {
        stats.byPlanType[order.planType] = (stats.byPlanType[order.planType] || 0) + 1
      }

      // 按月统计
      if (order.createdAt) {
        const date = new Date(order.createdAt)
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
        stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1
      }
    })

    return stats
  }

  /**
   * 退款申请
   * @param {string} orderId 订单ID
   * @param {string} reason 退款原因
   * @returns {Promise} Promise对象
   */
  async requestRefund(orderId, reason) {
    try {
      const order = this.getOrderDetail(orderId)
      if (!order) {
        throw new Error('订单不存在')
      }

      if (order.status !== 'paid') {
        throw new Error('只有已支付的订单可以退款')
      }

      // 检查退款时间限制（7天内）
      const orderDate = new Date(order.createdAt)
      const now = new Date()
      const diffDays = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24))
      
      if (diffDays > 7) {
        throw new Error('订单已超过7天退款期限')
      }

      // 调用退款接口
      const refundData = {
        orderId: orderId,
        reason: reason,
        amount: order.amount
      }

      const result = await this.callCloudFunction('request-refund', refundData)

      if (result.success) {
        // 更新订单状态
        await this.updateOrderStatus(orderId, 'refunding')
        
        return {
          success: true,
          data: result.data,
          message: '退款申请已提交'
        }
      } else {
        throw new Error(result.message || '退款申请失败')
      }

    } catch (error) {
      console.error('退款申请失败:', error)
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      }
    }
  }
}

// 创建单例实例
const payService = new PayService()

module.exports = {
  // 订单相关
  createOrder: (orderData) => payService.createOrder(orderData),
  getOrderList: (options) => payService.getOrderList(options),
  getOrderDetail: (orderId) => payService.getOrderDetail(orderId),
  
  // 支付相关
  requestPayment: (paymentData) => payService.requestPayment(paymentData),
  
  // 退款相关
  requestRefund: (orderId, reason) => payService.requestRefund(orderId, reason),
  
  // 统计
  getPaymentStats: () => payService.getPaymentStats(),
  
  // 工具方法
  calculateExpireDate: (planType, duration) => payService.calculateExpireDate(planType, duration),
  
  // 实例
  service: payService
}
