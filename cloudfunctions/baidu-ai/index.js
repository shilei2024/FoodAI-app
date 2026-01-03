// cloudfunctions/baidu-ai/index.js
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 百度AI配置
const BAIDU_AI_CONFIG = {
  API_KEY: process.env.BAIDU_AI_API_KEY,
  SECRET_KEY: process.env.BAIDU_AI_SECRET_KEY,
  DISH_RECOGNITION_URL: 'https://aip.baidubce.com/rest/2.0/image-classify/v2/dish',
  GENERAL_RECOGNITION_URL: 'https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general',
  TOKEN_URL: 'https://aip.baidubce.com/oauth/2.0/token'
}

/**
 * 获取百度AI access_token
 */
async function getBaiduAIAccessToken() {
  try {
    const db = cloud.database()
    const cacheCollection = db.collection('baidu_ai_cache')
    
    // 检查缓存
    const now = Date.now()
    const cacheResult = await cacheCollection
      .where({
        key: 'access_token'
      })
      .get()
    
    if (cacheResult.data.length > 0) {
      const cache = cacheResult.data[0]
      // 检查是否过期（提前5分钟过期）
      if (cache.expire_time > now + 5 * 60 * 1000) {
        return cache.value
      }
    }
    
    // 获取新token
    const tokenUrl = `${BAIDU_AI_CONFIG.TOKEN_URL}?grant_type=client_credentials&client_id=${BAIDU_AI_CONFIG.API_KEY}&client_secret=${BAIDU_AI_CONFIG.SECRET_KEY}`
    
    const response = await cloud.callFunction({
      name: 'http-request',
      data: {
        url: tokenUrl,
        method: 'GET'
      }
    })
    
    if (response.result && response.result.access_token) {
      const token = response.result.access_token
      const expireTime = now + (response.result.expires_in - 300) * 1000
      
      // 更新缓存
      if (cacheResult.data.length > 0) {
        await cacheCollection.doc(cacheResult.data[0]._id).update({
          data: {
            value: token,
            expire_time: expireTime,
            update_time: now
          }
        })
      } else {
        await cacheCollection.add({
          data: {
            key: 'access_token',
            value: token,
            expire_time: expireTime,
            create_time: now,
            update_time: now
          }
        })
      }
      
      return token
    } else {
      throw new Error('获取access_token失败')
    }
  } catch (error) {
    console.error('获取百度AI token失败:', error)
    throw error
  }
}

/**
 * 食物识别
 */
async function recognizeFood(imageBase64, options = {}) {
  try {
    const accessToken = await getBaiduAIAccessToken()
    
    const params = {
      image: imageBase64,
      top_num: options.top_num || 5,
      filter_threshold: options.filter_threshold || 0.7,
      baike_num: options.baike_num || 1
    }
    
    const response = await cloud.callFunction({
      name: 'http-request',
      data: {
        url: `${BAIDU_AI_CONFIG.DISH_RECOGNITION_URL}?access_token=${accessToken}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: params
      }
    })
    
    return response.result
  } catch (error) {
    console.error('食物识别失败:', error)
    throw error
  }
}

/**
 * 通用物体识别
 */
async function recognizeGeneral(imageBase64, options = {}) {
  try {
    const accessToken = await getBaiduAIAccessToken()
    
    const params = {
      image: imageBase64,
      baike_num: options.baike_num || 1
    }
    
    const response = await cloud.callFunction({
      name: 'http-request',
      data: {
        url: `${BAIDU_AI_CONFIG.GENERAL_RECOGNITION_URL}?access_token=${accessToken}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: params
      }
    })
    
    return response.result
  } catch (error) {
    console.error('通用物体识别失败:', error)
    throw error
  }
}

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  const { action, data, options } = event
  
  try {
    switch (action) {
      case 'recognizeFood':
        return {
          success: true,
          data: await recognizeFood(data.image, options),
          message: '食物识别成功'
        }
        
      case 'recognizeGeneral':
        return {
          success: true,
          data: await recognizeGeneral(data.image, options),
          message: '通用识别成功'
        }
        
      case 'getToken':
        return {
          success: true,
          data: {
            access_token: await getBaiduAIAccessToken()
          },
          message: '获取token成功'
        }
        
      default:
        return {
          success: false,
          message: '未知的操作类型',
          code: 400
        }
    }
  } catch (error) {
    console.error('云函数执行失败:', error)
    
    return {
      success: false,
      message: error.message || '服务器内部错误',
      code: 500,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }
}
