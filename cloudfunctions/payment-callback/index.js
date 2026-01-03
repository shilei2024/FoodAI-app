// cloudfunctions/payment-callback/index.js
const cloud = require('wx-server-sdk')
const crypto = require('crypto')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 数据库引用
const db = cloud.database()
const _ = db.command

// 微信支付配置
const WECHAT_PAY_CONFIG = {
  MCH_ID: process.env.WECHAT_PAY_MCH_ID,
  API_KEY: process.env.WECHAT_PAY_API_KEY
}

/**
 * 验证微信支付签名
 */
function verifyWechatPaySign(data, sign) {
  try {
    // 生成签名字符串
    const keys = Object.keys(data).filter(key => key !== 'sign').sort()
    const signStr = keys.map(key => `${key}=${data[key]}`).join('&') + `&key=${WECHAT_PAY_CONFIG.API_KEY}`
    
    // 计算MD5签名
    const md5 = crypto.createHash('md5')
    md5.update(signStr, 'utf8')
    const calculatedSign = md5.digest('hex').toUpperCase()
    
    return calculatedSign === sign
  } catch (error) {
    console.error('验证微信支付签名失败:', error)
    return false
  }
}

/**
 * 处理支付成功回调
 */
async function handlePaymentSuccess(data) {
  try {
    const {
      out_trade_no, // 商户订单号
      transaction_id, // 微信支付订单号
      total_fee, // 订单金额（分）
      time_end, // 支付完成时间
      openid // 用户标识
    } = data
    
    // 根据订单号查询订单
    const orderResult = await db.collection('orders')
      .where({
        order_no: out_trade_no,
        is_deleted: false
      })
      .get()
    
    if (orderResult.data.length === 0) {
      throw new Error(`订单不存在: ${out_trade_no}`)
    }
    
    const order = orderResult.data[0]
    
    // 检查订单状态
    if (order.pay_status === 'paid') {
      console.log(`订单已支付: ${out_trade_no}`)
      return { success: true, message: '订单已支付' }
    }
    
    // 验证金额
    if (parseInt(total_fee) !== order.amount) {
      throw new Error(`金额不匹配: 订单${order.amount}分, 支付${total_fee}分`)
    }
    
    const now = new Date()
    const payTime = new Date(
      time_end.substr(0, 4),
      parseInt(time_end.substr(4, 2)) - 1,
      time_end.substr(6, 2),
      time_end.substr(8, 2),
      time_end.substr(10, 2),
      time_end.substr(12, 2)
    )
    
    // 更新订单状态
    await db.collection('orders').doc(order._id).update({
      data: {
        pay_status: 'paid',
        status: 'paid',
        transaction_id: transaction_id,
        pay_time: payTime,
        update_time: now
      }
    })
    
    // 更新用户VIP状态
    await updateUserVipStatus(order.user_id, order.plan_type, order.duration)
    
    // 发送支付成功通知
    await sendPaymentSuccessNotification(order.user_id, order)
    
    console.log(`支付成功处理完成: ${out_trade_no}`)
    
    return {
      success: true,
      message: '支付成功处理完成'
    }
  } catch (error) {
    console.error('处理支付成功回调失败:', error)
    throw error
  }
}

/**
 * 更新用户VIP状态
 */
async function updateUserVipStatus(userId, planType, duration) {
  try {
    const now = new Date()
    let expireDate = new Date(now)
    
    // 计算过期时间
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
    
    // 查询用户现有VIP信息
    const vipResult = await db.collection('user_vip')
      .where({
        user_id: userId,
        is_deleted: false
      })
      .get()
    
    const vipData = {
      user_id: userId,
      plan_type: planType,
      is_vip: true,
      start_time: now,
      expire_time: expireDate,
      update_time: now
    }
    
    if (vipResult.data.length > 0) {
      // 更新现有VIP记录
      const existingVip = vipResult.data[0]
      
      // 如果新套餐比现有套餐过期时间晚，则更新
      if (expireDate > new Date(existingVip.expire_time)) {
        await db.collection('user_vip').doc(existingVip._id).update({
          data: vipData
        })
      }
    } else {
      // 创建新的VIP记录
      vipData.create_time = now
      await db.collection('user_vip').add({
        data: vipData
      })
    }
    
    // 更新用户表的VIP状态
    await db.collection('users').where({ _id: userId }).update({
      data: {
        is_vip: true,
        vip_expire_time: expireDate,
        update_time: now
      }
    })
    
    console.log(`用户VIP状态更新完成: ${userId}`)
  } catch (error) {
    console.error('更新用户VIP状态失败:', error)
    throw error
  }
}

/**
 * 发送支付成功通知
 */
async function sendPaymentSuccessNotification(userId, order) {
  try {
    // 这里可以发送模板消息、订阅消息等
    // 暂时记录日志
    
    console.log(`发送支付成功通知: 用户${userId}, 订单${order.order_no}`)
    
    // 示例：发送订阅消息
    /*
    await cloud.openapi.subscribeMessage.send({
      touser: userId,
      templateId: '支付成功模板ID',
      page: `/pages/order/detail?id=${order._id}`,
      data: {
        thing1: { value: order.plan_name },
        amount2: { value: (order.amount / 100).toFixed(2) },
        time3: { value: new Date().toLocaleString() }
      }
    })
    */
    
    return true
  } catch (error) {
    console.error('发送支付成功通知失败:', error)
    // 不抛出错误，避免影响主流程
    return false
  }
}

/**
 * 处理退款回调
 */
async function handleRefundCallback(data) {
  try {
    const {
      out_refund_no, // 商户退款单号
      out_trade_no, // 商户订单号
      refund_id, // 微信退款单号
      refund_fee, // 退款金额
      success_time // 退款成功时间
    } = data
    
    // 根据订单号查询订单
    const orderResult = await db.collection('orders')
      .where({
        order_no: out_trade_no,
        is_deleted: false
      })
      .get()
    
    if (orderResult.data.length === 0) {
      throw new Error(`订单不存在: ${out_trade_no}`)
    }
    
    const order = orderResult.data[0]
    const now = new Date()
    const refundTime = new Date(success_time)
    
    // 更新订单状态
    await db.collection('orders').doc(order._id).update({
      data: {
        pay_status: 'refunded',
        status: 'refunded',
        refund_id: refund_id,
        refund_fee: parseInt(refund_fee),
        refund_time: refundTime,
        update_time: now
      }
    })
    
    // 更新用户VIP状态（如果VIP已激活）
    if (order.pay_status === 'paid') {
      await updateUserVipAfterRefund(order.user_id)
    }
    
    // 发送退款成功通知
    await sendRefundSuccessNotification(order.user_id, order, refund_fee)
    
    console.log(`退款回调处理完成: ${out_trade_no}`)
    
    return {
      success: true,
      message: '退款回调处理完成'
    }
  } catch (error) {
    console.error('处理退款回调失败:', error)
    throw error
  }
}

/**
 * 退款后更新用户VIP状态
 */
async function updateUserVipAfterRefund(userId) {
  try {
    const now = new Date()
    
    // 查询用户VIP信息
    const vipResult = await db.collection('user_vip')
      .where({
        user_id: userId,
        is_deleted: false
      })
      .get()
    
    if (vipResult.data.length > 0) {
      const vip = vipResult.data[0]
      
      // 检查VIP是否已过期
      if (new Date(vip.expire_time) > now) {
        // VIP未过期，可以保留
        console.log(`用户VIP未过期，保留: ${userId}`)
      } else {
        // VIP已过期或即将过期，更新状态
        await db.collection('user_vip').doc(vip._id).update({
          data: {
            is_vip: false,
            update_time: now
          }
        })
        
        await db.collection('users').where({ _id: userId }).update({
          data: {
            is_vip: false,
            update_time: now
          }
        })
        
        console.log(`用户VIP状态已更新为过期: ${userId}`)
      }
    }
  } catch (error) {
    console.error('退款后更新用户VIP状态失败:', error)
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 发送退款成功通知
 */
async function sendRefundSuccessNotification(userId, order, refundFee) {
  try {
    console.log(`发送退款成功通知: 用户${userId}, 订单${order.order_no}, 退款${refundFee}分`)
    
    // 示例：发送订阅消息
    /*
    await cloud.openapi.subscribeMessage.send({
      touser: userId,
      templateId: '退款成功模板ID',
      page: `/pages/order/detail?id=${order._id}`,
      data: {
        thing1: { value: order.plan_name },
        amount2: { value: (refundFee / 100).toFixed(2) },
        time3: { value: new Date().toLocaleString() }
      }
    })
    */
    
    return true
  } catch (error) {
    console.error('发送退款成功通知失败:', error)
    return false
  }
}

/**
 * 云函数主入口 - 微信支付回调
 */
exports.main = async (event, context) => {
  try {
    const { xml } = event
    
    if (!xml) {
      return {
        return_code: 'FAIL',
        return_msg: '参数错误'
      }
    }
    
    // 验证签名
    if (!verifyWechatPaySign(xml, xml.sign)) {
      return {
        return_code: 'FAIL',
        return_msg: '签名验证失败'
      }
    }
    
    // 处理不同类型的回调
    if (xml.result_code === 'SUCCESS') {
      if (xml.refund_id) {
        // 退款回调
        await handleRefundCallback(xml)
      } else {
        // 支付回调
        await handlePaymentSuccess(xml)
      }
    } else {
      console.error('微信支付回调失败:', xml.err_code_des || xml.return_msg)
    }
    
    // 返回成功响应
    return {
      return_code: 'SUCCESS',
      return_msg: 'OK'
    }
  } catch (error) {
    console.error('支付回调云函数执行失败:', error)
    
    return {
      return_code: 'FAIL',
      return_msg: error.message || '处理失败'
    }
  }
}

/**
 * 手动验证支付结果（用于前端验证）
 */
exports.verifyPayment = async (event, context) => {
  try {
    const { orderId, transactionId } = event
    
    if (!orderId || !transactionId) {
      return {
        success: false,
        message: '参数不完整',
        code: 400
      }
    }
    
    // 查询订单
    const orderResult = await db.collection('orders')
      .where({
        _id: orderId,
        transaction_id: transactionId,
        pay_status: 'paid',
        is_deleted: false
      })
      .get()
    
    if (orderResult.data.length === 0) {
      return {
        success: false,
        message: '支付验证失败',
        code: 404
      }
    }
    
    const order = orderResult.data[0]
    
    return {
      success: true,
      data: {
        verified: true,
        order: {
          id: order._id,
          order_no: order.order_no,
          amount: order.amount,
          plan_type: order.plan_type,
          pay_time: order.pay_time
        }
      },
      message: '支付验证成功'
    }
  } catch (error) {
    console.error('验证支付结果失败:', error)
    
    return {
      success: false,
      message: error.message || '验证失败',
      code: 500
    }
  }
}
