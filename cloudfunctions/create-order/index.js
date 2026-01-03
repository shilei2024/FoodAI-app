// cloudfunctions/create-order/index.js
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 数据库引用
const db = cloud.database()
const _ = db.command

/**
 * 生成订单号
 */
function generateOrderNo() {
  const date = new Date()
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.random().toString(36).substr(2, 9).toUpperCase()
  
  return `FOODAI${year}${month}${day}${random}`
}

/**
 * 验证订单数据
 */
function validateOrderData(orderData) {
  const { userId, planType, amount, description } = orderData
  
  if (!userId) {
    throw new Error('用户ID不能为空')
  }
  
  if (!planType || !['monthly', 'yearly', 'lifetime'].includes(planType)) {
    throw new Error('无效的套餐类型')
  }
  
  if (!amount || amount <= 0) {
    throw new Error('无效的订单金额')
  }
  
  if (!description) {
    throw new Error('订单描述不能为空')
  }
  
  return true
}

/**
 * 获取套餐配置
 */
function getPlanConfig(planType) {
  const plans = {
    monthly: {
      name: '月付会员',
      duration: 30, // 天
      price: 990, // 分
      features: ['无限次AI识别', '基础营养分析']
    },
    yearly: {
      name: '年付会员',
      duration: 365,
      price: 9900,
      features: ['无限次AI识别', '高级营养分析', '专属客服'],
      discount: '8.3折'
    },
    lifetime: {
      name: '永久会员',
      duration: 36500, // 100年
      price: 29900,
      features: ['无限次AI识别', '专业营养分析', '专属客服', '永久更新'],
      discount: '最划算'
    }
  }
  
  return plans[planType] || plans.monthly
}

/**
 * 创建微信支付订单
 */
async function createWechatPayOrder(orderData) {
  try {
    // 这里应该调用微信支付统一下单接口
    // 由于需要商户号和API密钥，这里返回模拟数据
    
    const now = Math.floor(Date.now() / 1000)
    
    return {
      prepay_id: `wx${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
      nonce_str: Math.random().toString(36).substr(2, 32),
      time_stamp: now.toString(),
      package: `prepay_id=wx${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
      sign_type: 'MD5',
      pay_sign: Math.random().toString(36).substr(2, 32)
    }
  } catch (error) {
    console.error('创建微信支付订单失败:', error)
    throw error
  }
}

/**
 * 保存订单到数据库
 */
async function saveOrderToDB(orderData, payData) {
  try {
    const now = new Date()
    const orderNo = generateOrderNo()
    const planConfig = getPlanConfig(orderData.planType)
    
    const order = {
      // 订单基本信息
      order_no: orderNo,
      user_id: orderData.userId,
      openid: orderData.openid,
      
      // 商品信息
      plan_type: orderData.planType,
      plan_name: planConfig.name,
      amount: orderData.amount,
      description: orderData.description,
      duration: planConfig.duration,
      features: planConfig.features,
      
      // 支付信息
      pay_data: payData,
      pay_status: 'pending', // pending, paid, refunded, cancelled
      pay_time: null,
      
      // 订单状态
      status: 'created', // created, paid, completed, cancelled
      is_deleted: false,
      
      // 时间信息
      create_time: now,
      update_time: now,
      expire_time: null
    }
    
    // 计算过期时间
    if (orderData.planType === 'lifetime') {
      order.expire_time = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate())
    } else {
      const expireDate = new Date(now)
      expireDate.setDate(now.getDate() + planConfig.duration)
      order.expire_time = expireDate
    }
    
    // 保存到数据库
    const result = await db.collection('orders').add({
      data: order
    })
    
    return {
      ...order,
      _id: result._id
    }
  } catch (error) {
    console.error('保存订单到数据库失败:', error)
    throw error
  }
}

/**
 * 检查用户未完成订单
 */
async function checkUserPendingOrders(userId) {
  try {
    const result = await db.collection('orders')
      .where({
        user_id: userId,
        status: _.in(['created', 'pending']),
        is_deleted: false
      })
      .orderBy('create_time', 'desc')
      .limit(5)
      .get()
    
    return result.data
  } catch (error) {
    console.error('检查用户未完成订单失败:', error)
    return []
  }
}

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    const { action, data } = event
    
    switch (action) {
      case 'create': {
        // 验证数据
        validateOrderData(data)
        
        // 检查用户未完成订单
        const pendingOrders = await checkUserPendingOrders(data.userId)
        if (pendingOrders.length > 0) {
          const latestOrder = pendingOrders[0]
          const createTime = new Date(latestOrder.create_time)
          const now = new Date()
          const diffMinutes = (now - createTime) / (1000 * 60)
          
          // 如果最近5分钟内有未完成订单，返回该订单
          if (diffMinutes < 5) {
            return {
              success: true,
              data: latestOrder,
              message: '存在未完成订单',
              code: 2001
            }
          }
        }
        
        // 创建微信支付订单
        const payData = await createWechatPayOrder({
          ...data,
          openid: wxContext.OPENID
        })
        
        // 保存订单到数据库
        const order = await saveOrderToDB({
          ...data,
          openid: wxContext.OPENID
        }, payData)
        
        // 返回订单信息
        return {
          success: true,
          data: {
            order_id: order._id,
            order_no: order.order_no,
            amount: order.amount,
            description: order.description,
            plan_type: order.plan_type,
            plan_name: order.plan_name,
            pay_data: order.pay_data,
            create_time: order.create_time
          },
          message: '订单创建成功'
        }
      }
      
      case 'query': {
        const { orderId, orderNo } = data
        
        let query = {}
        if (orderId) {
          query._id = orderId
        } else if (orderNo) {
          query.order_no = orderNo
        } else {
          throw new Error('需要订单ID或订单号')
        }
        
        query.user_id = data.userId
        query.is_deleted = false
        
        const result = await db.collection('orders')
          .where(query)
          .get()
        
        if (result.data.length === 0) {
          return {
            success: false,
            message: '订单不存在',
            code: 404
          }
        }
        
        const order = result.data[0]
        
        return {
          success: true,
          data: order,
          message: '查询成功'
        }
      }
      
      case 'list': {
        const { userId, page = 1, pageSize = 10, status } = data
        
        if (!userId) {
          throw new Error('用户ID不能为空')
        }
        
        let query = {
          user_id: userId,
          is_deleted: false
        }
        
        if (status) {
          query.status = status
        }
        
        const totalResult = await db.collection('orders')
          .where(query)
          .count()
        
        const listResult = await db.collection('orders')
          .where(query)
          .orderBy('create_time', 'desc')
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .get()
        
        return {
          success: true,
          data: {
            list: listResult.data,
            pagination: {
              page: page,
              pageSize: pageSize,
              total: totalResult.total,
              totalPages: Math.ceil(totalResult.total / pageSize)
            }
          },
          message: '获取订单列表成功'
        }
      }
      
      case 'cancel': {
        const { orderId, userId } = data
        
        if (!orderId || !userId) {
          throw new Error('订单ID和用户ID不能为空')
        }
        
        // 检查订单状态
        const orderResult = await db.collection('orders')
          .where({
            _id: orderId,
            user_id: userId,
            is_deleted: false
          })
          .get()
        
        if (orderResult.data.length === 0) {
          return {
            success: false,
            message: '订单不存在',
            code: 404
          }
        }
        
        const order = orderResult.data[0]
        
        // 只能取消未支付的订单
        if (order.pay_status !== 'pending') {
          return {
            success: false,
            message: '只能取消未支付的订单',
            code: 4001
          }
        }
        
        // 更新订单状态
        const now = new Date()
        await db.collection('orders').doc(orderId).update({
          data: {
            status: 'cancelled',
            pay_status: 'cancelled',
            update_time: now
          }
        })
        
        return {
          success: true,
          message: '订单取消成功'
        }
      }
      
      default:
        return {
          success: false,
          message: '未知的操作类型',
          code: 400
        }
    }
  } catch (error) {
    console.error('创建订单云函数执行失败:', error)
    
    return {
      success: false,
      message: error.message || '服务器内部错误',
      code: 500,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }
}
