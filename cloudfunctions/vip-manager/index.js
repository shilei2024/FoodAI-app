// cloudfunctions/vip-manager/index.js
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 数据库引用
const db = cloud.database()
const usersCollection = db.collection('users')
const vipOrdersCollection = db.collection('vip_orders')
const vipBenefitsCollection = db.collection('vip_benefits')

// VIP套餐配置
const VIP_PLANS = {
  monthly: {
    name: '月卡',
    price: 29, // 元
    duration: 30, // 天
    features: ['无限次AI识别', '高级营养分析', '个性化推荐', '数据云端同步']
  },
  quarterly: {
    name: '季卡',
    price: 69,
    duration: 90,
    features: ['月卡所有功能', '专属客服', '优先体验新功能'],
    discount: '省18元'
  },
  yearly: {
    name: '年卡',
    price: 199,
    duration: 365,
    features: ['季卡所有功能', '无广告体验', '批量识别功能', '历史记录无限制'],
    discount: '省149元'
  },
  lifetime: {
    name: '永久会员',
    price: 599,
    duration: 9999, // 永久
    features: ['所有VIP功能', '终身免费更新', '专属标识', '优先技术支持']
  }
}

/**
 * 获取VIP套餐信息
 */
async function getVipPlans(event) {
  try {
    return {
      success: true,
      data: {
        plans: VIP_PLANS,
        timestamp: new Date()
      }
    }
  } catch (error) {
    console.error('获取VIP套餐失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 创建VIP订单
 */
async function createVipOrder(event) {
  try {
    const { userId, planType, paymentMethod = 'wechat' } = event
    
    if (!userId || !planType || !VIP_PLANS[planType]) {
      return {
        success: false,
        error: '缺少必要参数或套餐类型无效',
        code: 400
      }
    }
    
    // 检查用户是否存在
    const userQuery = await usersCollection.where({
      openid: userId
    }).get()
    
    if (userQuery.data.length === 0) {
      return {
        success: false,
        error: '用户不存在',
        code: 404
      }
    }
    
    const plan = VIP_PLANS[planType]
    const now = new Date()
    const orderId = `VIP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    // 创建订单
    const orderData = {
      orderId: orderId,
      userId: userId,
      planType: planType,
      planName: plan.name,
      price: plan.price,
      duration: plan.duration,
      paymentMethod: paymentMethod,
      status: 'pending', // pending, paid, cancelled, refunded
      createTime: now,
      updateTime: now,
      paymentInfo: {
        // 这里可以存储支付相关信息
      }
    }
    
    const addResult = await vipOrdersCollection.add({
      data: orderData
    })
    
    // 返回支付参数（实际项目中需要调用微信支付API）
    const paymentParams = {
      orderId: orderId,
      totalFee: plan.price * 100, // 转换为分
      planName: plan.name,
      description: `AI轻食记${plan.name}会员`,
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr: Math.random().toString(36).substr(2),
      package: `prepay_id=${orderId}`,
      signType: 'MD5',
      paySign: '' // 实际需要计算签名
    }
    
    return {
      success: true,
      data: {
        order: orderData,
        paymentParams: paymentParams,
        _id: addResult._id
      },
      message: '订单创建成功'
    }
    
  } catch (error) {
    console.error('创建VIP订单失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 处理支付回调
 */
async function handlePaymentCallback(event) {
  try {
    const { orderId, transactionId, paymentResult } = event
    
    if (!orderId || !paymentResult) {
      return {
        success: false,
        error: '缺少必要参数',
        code: 400
      }
    }
    
    // 查找订单
    const orderQuery = await vipOrdersCollection.where({
      orderId: orderId
    }).get()
    
    if (orderQuery.data.length === 0) {
      return {
        success: false,
        error: '订单不存在',
        code: 404
      }
    }
    
    const order = orderQuery.data[0]
    const now = new Date()
    
    if (paymentResult === 'success') {
      // 支付成功，激活VIP
      await this.activateVip(order.userId, order.planType, order.duration, orderId)
      
      // 更新订单状态
      await vipOrdersCollection.doc(order._id).update({
        data: {
          status: 'paid',
          paymentTime: now,
          transactionId: transactionId,
          updateTime: now
        }
      })
      
      return {
        success: true,
        data: {
          orderId: orderId,
          status: 'paid',
          activateTime: now
        },
        message: '支付成功，VIP已激活'
      }
      
    } else if (paymentResult === 'cancelled') {
      // 支付取消
      await vipOrdersCollection.doc(order._id).update({
        data: {
          status: 'cancelled',
          updateTime: now
        }
      })
      
      return {
        success: true,
        data: {
          orderId: orderId,
          status: 'cancelled'
        },
        message: '订单已取消'
      }
      
    } else {
      // 支付失败
      await vipOrdersCollection.doc(order._id).update({
        data: {
          status: 'failed',
          updateTime: now
        }
      })
      
      return {
        success: false,
        error: '支付失败',
        code: 500
      }
    }
    
  } catch (error) {
    console.error('处理支付回调失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 激活VIP
 */
async function activateVip(userId, planType, duration, orderId) {
  try {
    const plan = VIP_PLANS[planType]
    const now = new Date()
    const expireTime = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000)
    
    // 获取用户当前VIP信息
    const userQuery = await usersCollection.where({
      openid: userId
    }).get()
    
    if (userQuery.data.length === 0) {
      throw new Error('用户不存在')
    }
    
    const user = userQuery.data[0]
    const currentVipInfo = user.vipInfo || {}
    
    // 计算新的过期时间（如果是续费，从当前过期时间开始计算）
    let newExpireTime = expireTime
    if (currentVipInfo.isVip && currentVipInfo.expireTime) {
      const currentExpire = new Date(currentVipInfo.expireTime)
      if (currentExpire > now) {
        // 从当前过期时间开始续费
        newExpireTime = new Date(currentExpire.getTime() + duration * 24 * 60 * 60 * 1000)
      }
    }
    
    // 更新用户VIP信息
    const vipInfo = {
      isVip: true,
      vipType: planType,
      planName: plan.name,
      startTime: currentVipInfo.startTime || now,
      expireTime: newExpireTime,
      lastRenewTime: now,
      orderId: orderId,
      features: plan.features
    }
    
    await usersCollection.doc(user._id).update({
      data: {
        vipInfo: vipInfo,
        updateTime: now
      }
    })
    
    // 记录VIP激活日志
    await vipBenefitsCollection.add({
      data: {
        userId: userId,
        action: 'activate',
        planType: planType,
        orderId: orderId,
        startTime: now,
        expireTime: newExpireTime,
        timestamp: now
      }
    })
    
    console.log(`用户 ${userId} VIP已激活，套餐：${plan.name}，过期时间：${newExpireTime}`)
    
  } catch (error) {
    console.error('激活VIP失败:', error)
    throw error
  }
}

/**
 * 获取用户VIP信息
 */
async function getUserVipInfo(event) {
  try {
    const { userId } = event
    
    if (!userId) {
      return {
        success: false,
        error: '缺少用户ID',
        code: 400
      }
    }
    
    // 获取用户信息
    const userQuery = await usersCollection.where({
      openid: userId
    }).get()
    
    if (userQuery.data.length === 0) {
      return {
        success: false,
        error: '用户不存在',
        code: 404
      }
    }
    
    const user = userQuery.data[0]
    const vipInfo = user.vipInfo || {
      isVip: false,
      vipType: null,
      planName: null,
      startTime: null,
      expireTime: null
    }
    
    // 检查VIP是否过期
    if (vipInfo.isVip && vipInfo.expireTime) {
      const expireTime = new Date(vipInfo.expireTime)
      const now = new Date()
      
      if (expireTime < now) {
        // VIP已过期
        vipInfo.isVip = false
        vipInfo.isExpired = true
        
        // 更新用户VIP状态
        await usersCollection.doc(user._id).update({
          data: {
            'vipInfo.isVip': false,
            updateTime: now
          }
        })
      }
    }
    
    // 获取VIP订单历史
    const ordersQuery = await vipOrdersCollection.where({
      userId: userId,
      status: 'paid'
    })
    .orderBy('createTime', 'desc')
    .get()
    
    // 获取VIP使用记录
    const benefitsQuery = await vipBenefitsCollection.where({
      userId: userId
    })
    .orderBy('timestamp', 'desc')
    .limit(10)
    .get()
    
    return {
      success: true,
      data: {
        vipInfo: vipInfo,
        orders: ordersQuery.data,
        benefits: benefitsQuery.data,
        plans: VIP_PLANS
      }
    }
    
  } catch (error) {
    console.error('获取用户VIP信息失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 获取VIP特权列表
 */
async function getVipBenefits(event) {
  try {
    const benefits = {
      basic: [
        { title: '无限次AI识别', description: '拍照识别和搜索识别无次数限制', icon: 'infinite' },
        { title: '高级营养分析', description: '详细的营养成分分析和健康建议', icon: 'chart' },
        { title: '个性化食谱推荐', description: '基于饮食偏好推荐个性化食谱', icon: 'recipe' },
        { title: '数据云端同步', description: '多设备数据同步和备份', icon: 'cloud' }
      ],
      advanced: [
        { title: '无广告纯净体验', description: '去除所有广告干扰', icon: 'ad-free' },
        { title: '批量识别功能', description: '一次识别多张图片', icon: 'batch' },
        { title: '历史记录无限制', description: '保存所有识别记录', icon: 'history' },
        { title: '高清图片识别', description: '支持更高分辨率的图片', icon: 'hd' }
      ],
      premium: [
        { title: '专属客服支持', description: '优先客服响应和问题解决', icon: 'support' },
        { title: '优先体验新功能', description: '提前体验最新功能', icon: 'early-access' },
        { title: '专属会员标识', description: '独特的VIP标识和勋章', icon: 'badge' },
        { title: '数据分析报告', description: '月度饮食分析报告', icon: 'report' }
      ]
    }
    
    return {
      success: true,
      data: benefits
    }
    
  } catch (error) {
    console.error('获取VIP特权失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 模拟开通VIP（用于测试）
 */
async function simulateVipPurchase(event) {
  try {
    const { userId, planType } = event
    
    if (!userId || !planType || !VIP_PLANS[planType]) {
      return {
        success: false,
        error: '缺少必要参数或套餐类型无效',
        code: 400
      }
    }
    
    // 模拟支付成功
    const orderId = `TEST${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    
    // 激活VIP
    await this.activateVip(userId, planType, VIP_PLANS[planType].duration, orderId)
    
    // 创建测试订单
    const now = new Date()
    await vipOrdersCollection.add({
      data: {
        orderId: orderId,
        userId: userId,
        planType: planType,
        planName: VIP_PLANS[planType].name,
        price: VIP_PLANS[planType].price,
        duration: VIP_PLANS[planType].duration,
        paymentMethod: 'test',
        status: 'paid',
        createTime: now,
        paymentTime: now,
        updateTime: now,
        isTest: true
      }
    })
    
    return {
      success: true,
      data: {
        orderId: orderId,
        planType: planType,
        planName: VIP_PLANS[planType].name,
        activateTime: now
      },
      message: '测试VIP开通成功'
    }
    
  } catch (error) {
    console.error('模拟开通VIP失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 检查VIP状态
 */
async function checkVipStatus(event) {
  try {
    const { userId } = event
    
    if (!userId) {
      return {
        success: false,
        error: '缺少用户ID',
        code: 400
      }
    }
    
    const userQuery = await usersCollection.where({
      openid: userId
    }).get()
    
    if (userQuery.data.length === 0) {
      return {
        success: false,
        error: '用户不存在',
        code: 404
      }
    }
    
    const user = userQuery.data[0]
    const vipInfo = user.vipInfo || { isVip: false }
    const now = new Date()
    
    let status = 'not_vip'
    let daysRemaining = 0
    
    if (vipInfo.isVip && vipInfo.expireTime) {
      const expireTime = new Date(vipInfo.expireTime)
      
      if (expireTime < now) {
        status = 'expired'
      } else {
        status = 'active'
        daysRemaining = Math.ceil((expireTime - now) / (1000 * 60 * 60 * 24))
      }
    }
    
    return {
      success: true,
      data: {
        status: status,
        isVip: vipInfo.isVip && status === 'active',
        vipInfo: vipInfo,
        daysRemaining: daysRemaining,
        checkTime: now
      }
    }
    
  } catch (error) {
    console.error('检查VIP状态失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event
  
  switch (action) {
    case 'getVipPlans':
      return await getVipPlans(event)
    case 'createVipOrder':
      return await createVipOrder(event)
    case 'handlePaymentCallback':
      return await handlePaymentCallback(event)
    case 'getUserVipInfo':
      return await getUserVipInfo(event)
    case 'getVipBenefits':
      return await getVipBenefits(event)
    case 'simulateVipPurchase':
      return await simulateVipPurchase(event)
    case 'checkVipStatus':
      return await checkVipStatus(event)
    default:
      return {
        success: false,
        error: '未知的操作类型',
        code: 400
      }
  }
}
