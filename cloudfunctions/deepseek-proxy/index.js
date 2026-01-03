// cloudfunctions/deepseek-proxy/index.js
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 引入数据库
const db = cloud.database()

// Deepseek API配置
const DEEPSEEK_CONFIG = {
  BASE_URL: 'https://api.deepseek.com/v1',
  API_KEY: process.env.DEEPSEEK_API_KEY, // 从环境变量获取
  MODELS: {
    CHAT: 'deepseek-chat',
    VISION: 'deepseek-vision'
  }
}

// 请求频率限制配置
const RATE_LIMIT_CONFIG = {
  // 免费用户限制
  FREE_USER: {
    dailyLimit: 10, // 每日10次
    windowMs: 24 * 60 * 60 * 1000 // 24小时
  },
  // VIP用户限制
  VIP_USER: {
    dailyLimit: 100, // 每日100次
    windowMs: 24 * 60 * 60 * 1000
  },
  // 全局频率限制
  GLOBAL: {
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 60 // 每分钟60次
  }
}

/**
 * 检查请求频率限制
 * @param {string} openid 用户openid
 * @returns {Promise<Object>} 检查结果
 */
async function checkRateLimit(openid) {
  try {
    const now = Date.now()
    const userCollection = db.collection('api_usage')
    
    // 检查用户今日使用量
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    
    const userUsage = await userCollection
      .where({
        openid: openid,
        date: db.command.gte(startOfDay.getTime())
      })
      .get()
    
    const todayCount = userUsage.data.length
    
    // 检查用户VIP状态（简化版，实际应从用户表获取）
    const isVip = false // 默认非VIP
    const dailyLimit = isVip ? 
      RATE_LIMIT_CONFIG.VIP_USER.dailyLimit : 
      RATE_LIMIT_CONFIG.FREE_USER.dailyLimit
    
    if (todayCount >= dailyLimit) {
      return {
        allowed: false,
        message: `今日使用次数已达上限（${dailyLimit}次）`,
        remaining: 0,
        resetTime: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
      }
    }
    
    return {
      allowed: true,
      message: '请求允许',
      remaining: dailyLimit - todayCount,
      resetTime: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
    }
    
  } catch (error) {
    console.error('检查频率限制失败:', error)
    // 频率限制检查失败时，仍然允许请求（降级策略）
    return {
      allowed: true,
      message: '频率限制检查失败，降级处理',
      remaining: 999,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  }
}

/**
 * 记录API使用情况
 * @param {string} openid 用户openid
 * @param {string} endpoint 接口端点
 * @param {number} cost 消耗token数（估算）
 */
async function recordApiUsage(openid, endpoint, cost = 0) {
  try {
    const usageRecord = {
      openid: openid,
      endpoint: endpoint,
      timestamp: Date.now(),
      date: new Date().setHours(0, 0, 0, 0),
      cost: cost,
      ip: cloud.getWXContext().CLIENTIP || 'unknown'
    }
    
    await db.collection('api_usage').add({
      data: usageRecord
    })
    
  } catch (error) {
    console.error('记录API使用情况失败:', error)
    // 记录失败不影响主要功能
  }
}

/**
 * 调用Deepseek API
 * @param {Array} messages 消息数组
 * @param {Object} options 选项
 * @returns {Promise<Object>} API响应
 */
async function callDeepseekAPI(messages, options = {}) {
  // 检查API密钥
  if (!DEEPSEEK_CONFIG.API_KEY) {
    throw new Error('Deepseek API密钥未配置，请在云函数环境变量中配置 DEEPSEEK_API_KEY')
  }
  
  const requestOptions = {
    model: options.model || DEEPSEEK_CONFIG.MODELS.CHAT,
    messages: messages,
    temperature: options.temperature || 0.3,
    max_tokens: options.maxTokens || 2000,
    stream: options.stream || false,
    response_format: options.response_format || { type: "json_object" }
  }
  
  try {
    const result = await cloud.callFunction({
      name: 'http-proxy', // 需要先创建http-proxy云函数
      data: {
        url: `${DEEPSEEK_CONFIG.BASE_URL}/chat/completions`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_CONFIG.API_KEY}`
        },
        data: requestOptions,
        timeout: 30000 // 30秒超时
      }
    })
    
    return result.result
    
  } catch (error) {
    console.error('调用Deepseek API失败:', error)
    
    // 如果是网络错误，尝试重试
    if (error.errCode === -1 || error.message.includes('网络')) {
      console.log('网络错误，尝试重试...')
      // 这里可以添加重试逻辑
    }
    
    throw error
  }
}

/**
 * 食物分析系统提示词
 */
const FOOD_ANALYSIS_SYSTEM_PROMPT = `你是一个专业的营养师和食物识别专家。请根据用户提供的食物信息（图片描述或文字描述）进行以下分析：

1. 食物识别：识别食物名称（中文）
2. 营养分析：提供详细的营养信息
3. 健康建议：基于营养信息给出健康建议

请严格按照以下JSON格式返回结果：
{
  "foodName": "食物名称",
  "confidence": 0.95,
  "description": "食物描述",
  "calorie": 100,
  "nutrition": {
    "protein": 10.5,
    "fat": 5.2,
    "carbohydrate": 20.3,
    "fiber": 2.1,
    "vitamin": 15.0,
    "mineral": 8.5,
    "calcium": 50.0,
    "iron": 1.2,
    "zinc": 0.8
  },
  "healthScore": 85,
  "suggestions": ["建议1", "建议2", "建议3"],
  "tags": ["标签1", "标签2"]
}

注意：
1. 所有数值单位：蛋白质/脂肪/碳水/纤维 - 克(g)，维生素/矿物质/钙/铁/锌 - 毫克(mg)，热量 - 千卡(kcal)
2. confidence为置信度（0-1之间）
3. healthScore为健康评分（0-100）
4. 数值请基于真实营养数据估算`

/**
 * 主函数 - 云函数入口
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { openid } = wxContext
  
  try {
    // 1. 验证请求参数
    const { action, data } = event
    
    if (!action) {
      return {
        success: false,
        error: '缺少action参数',
        code: 'MISSING_ACTION'
      }
    }
    
    // 2. 检查频率限制
    const rateLimitResult = await checkRateLimit(openid)
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: rateLimitResult.message,
        code: 'RATE_LIMIT_EXCEEDED',
        data: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }
      }
    }
    
    // 3. 根据action处理请求
    let result
    switch (action) {
      case 'analyzeFoodFromImage':
        // 分析食物图片
        const { imageDescription } = data
        if (!imageDescription) {
          return {
            success: false,
            error: '缺少imageDescription参数',
            code: 'MISSING_IMAGE_DESCRIPTION'
          }
        }
        
        const messages = [
          {
            role: 'system',
            content: FOOD_ANALYSIS_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `请分析以下食物图片：
            
图片描述：${imageDescription}

请识别食物并提供详细的营养分析。`
          }
        ]
        
        result = await callDeepseekAPI(messages, {
          temperature: 0.3,
          maxTokens: 2000
        })
        break
        
      case 'searchFoodInfo':
        // 搜索食物信息
        const { foodDescription } = data
        if (!foodDescription) {
          return {
            success: false,
            error: '缺少foodDescription参数',
            code: 'MISSING_FOOD_DESCRIPTION'
          }
        }
        
        const searchMessages = [
          {
            role: 'system',
            content: FOOD_ANALYSIS_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `请分析以下食物：
            
食物描述：${foodDescription}

请提供详细的营养分析。`
          }
        ]
        
        result = await callDeepseekAPI(searchMessages, {
          temperature: 0.3,
          maxTokens: 2000
        })
        break
        
      case 'healthCheck':
        // 健康检查
        return {
          success: true,
          data: {
            status: 'healthy',
            timestamp: Date.now(),
            environment: cloud.DYNAMIC_CURRENT_ENV,
            rateLimit: rateLimitResult
          }
        }
        
      default:
        return {
          success: false,
          error: `不支持的action: ${action}`,
          code: 'UNSUPPORTED_ACTION'
        }
    }
    
    // 4. 记录API使用情况
    await recordApiUsage(openid, action, result?.usage?.total_tokens || 0)
    
    // 5. 返回结果
    return {
      success: true,
      data: result,
      rateLimit: {
        remaining: rateLimitResult.remaining - 1,
        resetTime: rateLimitResult.resetTime
      }
    }
    
  } catch (error) {
    console.error('云函数执行失败:', error)
    
    // 记录错误日志
    try {
      await db.collection('error_logs').add({
        data: {
          openid: openid,
          error: error.message,
          stack: error.stack,
          timestamp: Date.now(),
          event: JSON.stringify(event)
        }
      })
    } catch (logError) {
      console.error('记录错误日志失败:', logError)
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code || 'INTERNAL_ERROR',
      timestamp: Date.now()
    }
  }
}
