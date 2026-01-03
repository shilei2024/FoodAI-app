// cloudfunctions/http-proxy/index.js
const cloud = require('wx-server-sdk')
const axios = require('axios')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 允许的域名白名单
const ALLOWED_DOMAINS = [
  'api.deepseek.com',
  'aip.baidubce.com',
  'api.openai.com'
]

// 请求超时配置
const REQUEST_TIMEOUT = 30000 // 30秒

/**
 * 验证请求URL是否在白名单中
 * @param {string} url 请求URL
 * @returns {boolean} 是否允许
 */
function validateUrl(url) {
  try {
    const urlObj = new URL(url)
    return ALLOWED_DOMAINS.includes(urlObj.hostname)
  } catch (error) {
    return false
  }
}

/**
 * 主函数 - HTTP代理
 */
exports.main = async (event, context) => {
  try {
    const { url, method = 'GET', headers = {}, data = {}, timeout = REQUEST_TIMEOUT } = event
    
    // 1. 验证URL
    if (!url) {
      return {
        success: false,
        error: '缺少url参数',
        code: 'MISSING_URL'
      }
    }
    
    if (!validateUrl(url)) {
      return {
        success: false,
        error: `域名不在白名单中: ${url}`,
        code: 'DOMAIN_NOT_ALLOWED'
      }
    }
    
    // 2. 安全过滤请求头（移除敏感信息）
    const safeHeaders = { ...headers }
    
    // 移除可能包含敏感信息的请求头
    const SENSITIVE_HEADERS = [
      'cookie',
      'authorization', // 注意：这里移除，但Deepseek需要Authorization头
      'proxy-authorization',
      'x-api-key',
      'x-secret-key'
    ]
    
    // 对于Deepseek API，我们需要保留Authorization头
    const urlObj = new URL(url)
    if (urlObj.hostname === 'api.deepseek.com') {
      // 保留Authorization头，但可以添加其他安全检查
      if (headers.authorization && !headers.authorization.startsWith('Bearer ')) {
        return {
          success: false,
          error: '无效的Authorization头格式',
          code: 'INVALID_AUTH_HEADER'
        }
      }
    } else {
      // 对于其他API，移除敏感头
      SENSITIVE_HEADERS.forEach(header => {
        delete safeHeaders[header]
      })
    }
    
    // 3. 添加安全相关的请求头
    safeHeaders['User-Agent'] = 'FoodAI-CloudFunction/1.0'
    safeHeaders['X-Forwarded-For'] = cloud.getWXContext().CLIENTIP || 'unknown'
    safeHeaders['X-Request-ID'] = context.request_id
    
    // 4. 发送HTTP请求
    const config = {
      url: url,
      method: method,
      headers: safeHeaders,
      timeout: timeout,
      validateStatus: function (status) {
        return status >= 200 && status < 600 // 接受所有状态码，便于错误处理
      }
    }
    
    if (method.toUpperCase() !== 'GET' && data) {
      config.data = data
    }
    
    console.log(`发送HTTP请求: ${method} ${url}`)
    
    const response = await axios(config)
    
    // 5. 处理响应
    const result = {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    }
    
    // 6. 记录请求日志（生产环境可选择性开启）
    if (process.env.NODE_ENV === 'production') {
      try {
        const logData = {
          url: url,
          method: method,
          status: response.status,
          timestamp: Date.now(),
          requestId: context.request_id,
          ip: cloud.getWXContext().CLIENTIP || 'unknown'
        }
        
        // 注意：生产环境可能需要限制日志大小
        await cloud.database().collection('http_proxy_logs').add({
          data: logData
        })
      } catch (logError) {
        console.error('记录HTTP代理日志失败:', logError)
      }
    }
    
    return result
    
  } catch (error) {
    console.error('HTTP代理请求失败:', error)
    
    // 错误分类
    let errorCode = 'NETWORK_ERROR'
    let errorMessage = error.message
    
    if (error.code === 'ECONNABORTED') {
      errorCode = 'TIMEOUT'
      errorMessage = '请求超时'
    } else if (error.response) {
      // 服务器响应了错误状态码
      errorCode = `HTTP_${error.response.status}`
      errorMessage = `服务器错误: ${error.response.status}`
    } else if (error.request) {
      // 请求已发送但没有收到响应
      errorCode = 'NO_RESPONSE'
      errorMessage = '服务器无响应'
    }
    
    // 记录错误日志
    try {
      await cloud.database().collection('http_proxy_errors').add({
        data: {
          error: errorMessage,
          code: errorCode,
          timestamp: Date.now(),
          url: event.url,
          method: event.method
        }
      })
    } catch (logError) {
      console.error('记录HTTP代理错误日志失败:', logError)
    }
    
    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: Date.now()
    }
  }
}
