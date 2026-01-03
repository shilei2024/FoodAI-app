// services/payment-adapter.js
// 支付适配器 - 支持微信支付和支付宝支付

const config = require('../constants/config.js')
const api = require('../utils/api.js')
const auth = require('../utils/auth.js')

/**
 * 支付适配器类
 * 统一微信支付和支付宝支付接口
 */
class PaymentAdapter {
  constructor() {
    this.config = config
    this.api = api
    this.auth = auth
    
    // 检测当前平台
    this.platform = this.detectPlatform()
    
    // 初始化对应平台的支付服务
    this.paymentService = this.initPaymentService()
  }

  /**
   * 检测当前平台
   * @returns {string} 平台类型：wechat, alipay
   */
  detectPlatform() {
    // 微信小程序环境
    if (typeof wx !== 'undefined' && wx.requestPayment) {
      return 'wechat'
    }
    
    // 支付宝小程序环境
    if (typeof my !== 'undefined' && my.tradePay) {
      return 'alipay'
    }
    
    // 默认返回微信平台
    return 'wechat'
  }

  /**
   * 初始化支付服务
   * @returns {Object} 支付服务实例
   */
  initPaymentService() {
    switch (this.platform) {
      case 'wechat':
        return new WechatPaymentService(this.config, this.api, this.auth)
      case 'alipay':
        return new AlipayPaymentService(this.config, this.api, this.auth)
      default:
        return new WechatPaymentService(this.config, this.api, this.auth)
    }
  }

  /**
   * 创建订单（统一接口）
   * @param {Object} orderData 订单数据
   * @returns {Promise} Promise对象
   */
  async createOrder(orderData) {
    try {
      // 添加平台信息
      const platformOrderData = {
        ...orderData,
        platform: this.platform,
        appId: this.getAppId()
      }
      
      // 调用对应平台的创建订单方法
      const result = await this.paymentService.createOrder(platformOrderData)
      
      return {
        success: true,
        data: result.data,
        platform: this.platform,
        message: '订单创建成功'
      }
      
    } catch (error) {
      console.error('创建订单失败:', error)
      return {
        success: false,
        error: error.message,
        platform: this.platform,
        code: error.code || -1
      }
    }
  }

  /**
   * 发起支付（统一接口）
   * @param {Object} paymentData 支付数据
   * @returns {Promise} Promise对象
   */
  async requestPayment(paymentData) {
    try {
      // 调用对应平台的支付方法
      const result = await this.paymentService.requestPayment(paymentData)
      
      return {
        success: true,
        data: result.data,
        platform: this.platform,
        message: '支付成功'
      }
      
    } catch (error) {
      console.error('支付失败:', error)
      return {
        success: false,
        error: error.message,
        platform: this.platform,
        code: error.code || -1
      }
    }
  }

  /**
   * 查询订单状态（统一接口）
   * @param {string} orderId 订单ID
   * @returns {Promise} Promise对象
   */
  async checkOrderStatus(orderId) {
    try {
      const result = await this.paymentService.checkOrderStatus(orderId)
      return {
        success: true,
        data: result,
        platform: this.platform
      }
    } catch (error) {
      console.error('查询订单状态失败:', error)
      return {
        success: false,
        error: error.message,
        platform: this.platform
      }
    }
  }

  /**
   * 获取套餐列表（统一接口）
   * @returns {Promise} Promise对象
   */
  async getPackages() {
    try {
      const packages = await this.paymentService.getPackages()
      return {
        success: true,
        data: packages,
        platform: this.platform
      }
    } catch (error) {
      console.error('获取套餐列表失败:', error)
      return {
        success: false,
        error: error.message,
        platform: this.platform
      }
    }
  }

  /**
   * 处理支付回调（统一接口）
   * @param {Object} callbackData 回调数据
   * @returns {Promise} Promise对象
   */
  async handlePaymentCallback(callbackData) {
    try {
      const result = await this.paymentService.handlePaymentCallback(callbackData)
      return {
        success: true,
        data: result,
        platform: this.platform
      }
    } catch (error) {
      console.error('处理支付回调失败:', error)
      return {
        success: false,
        error: error.message,
        platform: this.platform
      }
    }
  }

  /**
   * 获取当前平台的应用ID
   * @returns {string} 应用ID
   */
  getAppId() {
    switch (this.platform) {
      case 'wechat':
        return this.config.payment.wechatPay.appId || ''
      case 'alipay':
        return this.config.payment.alipay.appId || ''
      default:
        return ''
    }
  }

  /**
   * 获取平台信息
   * @returns {Object} 平台信息
   */
  getPlatformInfo() {
    return {
      platform: this.platform,
      appId: this.getAppId(),
      supportMethods: this.getSupportPaymentMethods(),
      currency: this.config.payment.settings.currency || 'CNY'
    }
  }

  /**
   * 获取支持的支付方式
   * @returns {Array} 支付方式列表
   */
  getSupportPaymentMethods() {
    const baseMethods = ['balance', 'bank_card']
    
    switch (this.platform) {
      case 'wechat':
        return [...baseMethods, 'wechat_pay']
      case 'alipay':
        return [...baseMethods, 'alipay']
      default:
        return baseMethods
    }
  }

  /**
   * 银行卡支付引导
   * @param {Object} orderInfo 订单信息
   * @returns {Promise} Promise对象
   */
  async guideBankTransfer(orderInfo) {
    try {
      // 生成银行账户信息
      const bankInfo = this.generateBankInfo(orderInfo)
      
      // 显示银行转账引导
      const userConfirmed = await this.showBankTransferGuide(bankInfo)
      
      if (userConfirmed) {
        // 创建待审核订单
        const pendingOrder = await this.createPendingOrder(orderInfo, bankInfo)
        
        return {
          success: true,
          data: {
            orderId: pendingOrder.id,
            bankInfo: bankInfo,
            status: 'pending_review',
            message: '请按照提示完成转账，我们将在收到款项后为您处理订单'
          }
        }
      } else {
        return {
          success: false,
          error: '用户取消转账',
          code: 'USER_CANCELLED'
        }
      }
      
    } catch (error) {
      console.error('银行卡支付引导失败:', error)
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      }
    }
  }

  /**
   * 生成银行账户信息
   */
  generateBankInfo(orderInfo) {
    // 这里应该从配置中读取真实的银行账户信息
    // 为了安全，生产环境应该从服务器获取
    
    return {
      bankName: '中国工商银行',
      accountName: '某某科技有限公司',
      accountNumber: '6222 0210 0100 1234 567',
      branch: '北京分行朝阳支行',
      amount: orderInfo.amount,
      orderNumber: orderInfo.orderId,
      note: `订单号：${orderInfo.orderId}，请务必在转账备注中填写`
    }
  }

  /**
   * 显示银行转账引导
   */
  async showBankTransferGuide(bankInfo) {
    return new Promise((resolve) => {
      const content = `
银行账户信息：
开户行：${bankInfo.bankName}
户名：${bankInfo.accountName}
账号：${bankInfo.accountNumber}
支行：${bankInfo.branch}

转账金额：¥${(bankInfo.amount / 100).toFixed(2)}
订单号：${bankInfo.orderNumber}

请在转账备注中填写订单号，转账完成后请联系客服确认。
      `.trim()
      
      wx.showModal({
        title: '银行卡支付',
        content: content,
        confirmText: '已转账',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            // 用户确认已转账，跳转到转账确认页面
            wx.navigateTo({
              url: `/pages/payment/bank-transfer?orderId=${bankInfo.orderNumber}`,
              success: () => resolve(true)
            })
          } else {
            resolve(false)
          }
        }
      })
    })
  }

  /**
   * 创建待审核订单
   */
  async createPendingOrder(orderInfo, bankInfo) {
    const pendingOrder = {
      id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalOrderId: orderInfo.orderId,
      bankInfo: bankInfo,
      status: 'pending_review',
      createTime: new Date().toISOString(),
      userId: this.auth.getUserInfo()?.openId || 'anonymous'
    }
    
    // 保存到本地存储
    const pendingOrders = wx.getStorageSync('pending_bank_orders') || []
    pendingOrders.push(pendingOrder)
    wx.setStorageSync('pending_bank_orders', pendingOrders)
    
    return pendingOrder
  }
}

/**
 * 微信支付服务
 */
class WechatPaymentService {
  constructor(config, api, auth) {
    this.config = config
    this.api = api
    this.auth = auth
  }

  async createOrder(orderData) {
    // 调用微信支付创建订单接口
    const result = await this.api.post('/payment/wechat/create', orderData)
    
    if (result.success) {
      return {
        data: {
          orderId: result.data.orderId,
          prepayId: result.data.prepayId,
          nonceStr: result.data.nonceStr,
          timeStamp: result.data.timeStamp,
          package: result.data.package,
          signType: result.data.signType,
          paySign: result.data.paySign
        }
      }
    } else {
      throw new Error(result.message || '创建微信支付订单失败')
    }
  }

  async requestPayment(paymentData) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        timeStamp: paymentData.timeStamp,
        nonceStr: paymentData.nonceStr,
        package: paymentData.package,
        signType: paymentData.signType,
        paySign: paymentData.paySign,
        success: (res) => {
          resolve({
            data: {
              ...res,
              orderId: paymentData.orderId,
              platform: 'wechat'
            }
          })
        },
        fail: (error) => {
          reject(new Error(`微信支付失败: ${error.errMsg}`))
        }
      })
    })
  }

  async checkOrderStatus(orderId) {
    const result = await this.api.get(`/payment/wechat/status/${orderId}`)
    return result.data?.status || 'unknown'
  }

  async getPackages() {
    // 微信支付套餐
    return [
      {
        id: 'monthly',
        name: '月付会员',
        price: 990,
        originalPrice: 1290,
        discount: '7.7折',
        features: ['无限次AI识别', '基础营养分析'],
        platform: 'wechat'
      },
      {
        id: 'yearly',
        name: '年付会员',
        price: 9900,
        originalPrice: 11880,
        discount: '8.3折',
        features: ['无限次AI识别', '高级营养分析', '专属客服'],
        platform: 'wechat'
      },
      {
        id: 'lifetime',
        name: '永久会员',
        price: 29900,
        originalPrice: 0,
        discount: '最划算',
        features: ['无限次AI识别', '专业营养分析', '专属客服', '永久更新'],
        platform: 'wechat'
      }
    ]
  }

  async handlePaymentCallback(callbackData) {
    // 验证微信支付回调签名
    const isValid = this.verifyWechatCallback(callbackData)
    if (!isValid) {
      throw new Error('微信支付回调签名验证失败')
    }
    
    // 解析回调数据
    const paymentInfo = this.parseWechatCallback(callbackData)
    
    return {
      success: paymentInfo.result_code === 'SUCCESS',
      data: paymentInfo
    }
  }

  verifyWechatCallback(callbackData) {
    // 这里应该实现微信支付回调签名验证
    // 需要商户API密钥
    return true // 模拟验证通过
  }

  parseWechatCallback(callbackData) {
    return {
      orderId: callbackData.out_trade_no,
      transactionId: callbackData.transaction_id,
      amount: callbackData.total_fee,
      payTime: callbackData.time_end,
      result_code: callbackData.result_code,
      return_code: callbackData.return_code
    }
  }
}

/**
 * 支付宝支付服务
 */
class AlipayPaymentService {
  constructor(config, api, auth) {
    this.config = config
    this.api = api
    this.auth = auth
  }

  async createOrder(orderData) {
    // 调用支付宝创建订单接口
    const result = await this.api.post('/payment/alipay/create', orderData)
    
    if (result.success) {
      return {
        data: {
          orderId: result.data.orderId,
          tradeNo: result.data.tradeNo,
          orderStr: result.data.orderStr
        }
      }
    } else {
      throw new Error(result.message || '创建支付宝订单失败')
    }
  }

  async requestPayment(paymentData) {
    return new Promise((resolve, reject) => {
      my.tradePay({
        tradeNO: paymentData.tradeNo,
        success: (res) => {
          resolve({
            data: {
              ...res,
              orderId: paymentData.orderId,
              platform: 'alipay'
            }
          })
        },
        fail: (error) => {
          reject(new Error(`支付宝支付失败: ${error.message}`))
        }
      })
    })
  }

  async checkOrderStatus(orderId) {
    const result = await this.api.get(`/payment/alipay/status/${orderId}`)
    return result.data?.status || 'unknown'
  }

  async getPackages() {
    // 支付宝套餐（价格与微信保持一致）
    return [
      {
        id: 'monthly',
        name: '月付会员',
        price: 990,
        originalPrice: 1290,
        discount: '7.7折',
        features: ['无限次AI识别', '基础营养分析'],
        platform: 'alipay'
      },
      {
        id: 'yearly',
        name: '年付会员',
        price: 9900,
        originalPrice: 11880,
        discount: '8.3折',
        features: ['无限次AI识别', '高级营养分析', '专属客服'],
        platform: 'alipay'
      },
      {
        id: 'lifetime',
        name: '永久会员',
        price: 29900,
        originalPrice: 0,
        discount: '最划算',
        features: ['无限次AI识别', '专业营养分析', '专属客服', '永久更新'],
        platform: 'alipay'
      }
    ]
  }

  async handlePaymentCallback(callbackData) {
    // 验证支付宝回调签名
    const isValid = this.verifyAlipayCallback(callbackData)
    if (!isValid) {
      throw new Error('支付宝回调签名验证失败')
    }
    
    // 解析回调数据
    const paymentInfo = this.parseAlipayCallback(callbackData)
    
    return {
      success: paymentInfo.trade_status === 'TRADE_SUCCESS',
      data: paymentInfo
    }
  }

  verifyAlipayCallback(callbackData) {
    // 这里应该实现支付宝回调签名验证
    // 需要支付宝公钥
    return true // 模拟验证通过
  }

  parseAlipayCallback(callbackData) {
    return {
      orderId: callbackData.out_trade_no,
      tradeNo: callbackData.trade_no,
      amount: callbackData.total_amount,
      payTime: callbackData.gmt_payment,
      trade_status: callbackData.trade_status,
      buyer_id: callbackData.buyer_id
    }
  }
}

// 创建单例实例
const paymentAdapter = new PaymentAdapter()

module.exports = {
  // 统一支付接口
  createOrder: (orderData) => paymentAdapter.createOrder(orderData),
  requestPayment: (paymentData) => paymentAdapter.requestPayment(paymentData),
  checkOrderStatus: (orderId) => paymentAdapter.checkOrderStatus(orderId),
  getPackages: () => paymentAdapter.getPackages(),
  handlePaymentCallback: (callbackData) => paymentAdapter.handlePaymentCallback(callbackData),
  
  // 银行卡支付
  guideBankTransfer: (orderInfo) => paymentAdapter.guideBankTransfer(orderInfo),
  
  // 平台信息
  getPlatformInfo: () => paymentAdapter.getPlatformInfo(),
  getSupportPaymentMethods: () => paymentAdapter.getSupportPaymentMethods(),
  
  // 实例
  adapter: paymentAdapter
}
