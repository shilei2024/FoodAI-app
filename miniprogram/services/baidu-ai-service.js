// services/baidu-ai-service.js
const config = require('../constants/config.js')
const api = require('../utils/api.js')
const imageUtils = require('../utils/image.js')

/**
 * 百度AI服务类
 * 提供百度AI图像识别功能，包括食物识别和通用物体识别
 */
class BaiduAIService {
  constructor() {
    this.config = config.baiduAI
    this.api = api
    this.imageUtils = imageUtils
    
    // 缓存access_token
    this.accessTokenCache = {
      token: null,
      expireTime: 0,
      refreshTime: 0
    }
    
    // 缓存识别结果
    this.recognitionCache = new Map()
    this.cacheTTL = 5 * 60 * 1000 // 5分钟缓存
  }
  
  /**
   * 检查API密钥是否配置
   * @returns {boolean} 是否已配置
   */
  checkAPIKey() {
    if (!this.config.apiKey || !this.config.secretKey) {
      console.warn('百度AI API密钥未配置，请在 config.js 中配置 baiduAI.apiKey 和 baiduAI.secretKey')
      
      // 在开发环境中显示更详细的提示
      if (config.debug.enabled) {
        wx.showModal({
          title: 'API密钥未配置',
          content: '百度AI API密钥未配置，请按照以下步骤操作：\n\n1. 访问 https://ai.baidu.com/\n2. 注册并登录百度AI开放平台\n3. 创建应用并获取API Key和Secret Key\n4. 在 config.js 中配置 baiduAI.apiKey 和 baiduAI.secretKey\n\n配置完成后，系统将使用百度AI进行食物识别。',
          showCancel: false
        })
      }
      
      return false
    }
    return true
  }
  
  /**
   * 获取百度AI access_token
   * @returns {Promise<string>} access_token
   */
  async getAccessToken() {
    // 检查缓存
    const now = Date.now()
    if (this.accessTokenCache.token && this.accessTokenCache.expireTime > now) {
      console.log('使用缓存的access_token')
      return this.accessTokenCache.token
    }
    
    // 检查API密钥
    if (!this.checkAPIKey()) {
      throw new Error('百度AI API密钥未配置，请在 config.js 中配置 baiduAI.apiKey 和 baiduAI.secretKey')
    }
    
    try {
      const tokenUrl = 'https://aip.baidubce.com/oauth/2.0/token'
      
      console.log('请求百度AI access_token...')
      
      // 关键：使用原生wx.request，不使用封装的api.get
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: tokenUrl,
          method: 'GET',
          data: {
            grant_type: 'client_credentials',
            client_id: this.config.apiKey,
            client_secret: this.config.secretKey
          },
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.data)  // ✅ 直接返回data部分
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`))
            }
          },
          fail: (err) => {
            console.error('wx.request失败:', err)
            reject(err)
          }
        })
      })
      
      if (response && response.access_token) {
        const token = response.access_token
        const expiresIn = response.expires_in || 2592000 // 默认30天
        const expireTime = now + (expiresIn - 300) * 1000 // 提前5分钟过期
        
        // 更新缓存
        this.accessTokenCache = {
          token: token,
          expireTime: expireTime,
          refreshTime: now
        }
        
        console.log('获取access_token成功:', token.substring(0, 20) + '...')
        console.log('有效期:', expiresIn, '秒')
        return token
        
      } else {
        console.error('百度AI返回错误数据:', response)
        throw new Error('获取access_token失败: ' + (response.error_description || JSON.stringify(response)))
      }
      
    } catch (error) {
      console.error('获取百度AI access_token失败:', error)
      
      // 清理缓存，下次重新获取
      this.accessTokenCache = {}
      
      // 提供更友好的错误提示
      let errorMessage = '获取百度AI访问令牌失败'
      if (error.message.includes('网络')) {
        errorMessage = '网络连接失败，请检查网络设置'
      } else if (error.message.includes('invalid_client')) {
        errorMessage = 'API密钥无效，请检查配置'
      } else if (error.message.includes('unauthorized_client')) {
        errorMessage = 'API密钥未授权，请检查应用权限'
      }
      
      throw new Error(`${errorMessage}: ${error.message}`)
    }
  }
  
  /**
   * 将图片转换为Base64
   * @param {string} imagePath 图片路径
   * @returns {Promise<string>} Base64字符串
   */
  async imageToBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          resolve(res.data)
        },
        fail: (error) => {
          reject(new Error(`图片读取失败: ${error.errMsg}`))
        }
      })
    })
  }
  
  /**
   * 识别食物图片
   * @param {string} imagePath 图片路径
   * @param {Object} options 选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeFood(imagePath, options = {}) {
    try {
      // 检查缓存
      const cacheKey = `food_${imagePath}_${JSON.stringify(options)}`
      const cachedResult = this.getFromCache(cacheKey)
      if (cachedResult) {
        console.log('使用缓存的识别结果')
        return cachedResult
      }
      
      // 获取access_token
      const accessToken = await this.getAccessToken()
      
      // 压缩图片（如果需要）
      let processedImage = imagePath
      if (options.compress !== false) {
        const compressed = await this.imageUtils.compressImage(imagePath, {
          quality: 80,
          width: 1024,
          height: 1024
        })
        processedImage = compressed.path
      }
      
      // 转换为Base64
      const imageBase64 = await this.imageToBase64(processedImage)
      
      // 准备请求参数
      const params = {
        image: imageBase64,
        top_num: options.top_num || this.config.recognition.topNum || 5,
        filter_threshold: options.filter_threshold || this.config.recognition.filterThreshold || 0.7,
        baike_num: options.baike_num || this.config.recognition.baikeNum || 1
      }
      
      // 调用百度AI食物识别接口
      const recognitionUrl = `${this.config.recognition.url}?access_token=${accessToken}`
      
      console.log('调用百度AI食物识别接口...')
      
      // 直接使用wx.request调用百度AI API，避免通用API客户端的格式处理
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: recognitionUrl,
          method: 'POST',
          header: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: params,
          success: (res) => {
            console.log('百度AI API响应:', res)
            resolve(res.data)
          },
          fail: (error) => {
            console.error('百度AI API请求失败:', error)
            reject(new Error(`网络请求失败: ${error.errMsg}`))
          }
        })
      })
      
      // 处理响应
      const result = this.processFoodRecognitionResponse(response, {
        imagePath: processedImage,
        options: options
      })
      
      // 缓存结果
      this.setToCache(cacheKey, result)
      
      return {
        success: true,
        data: result,
        rawData: response
      }
      
    } catch (error) {
      console.error('百度AI食物识别失败:', error)
      
      return {
        success: false,
        error: error.message,
        code: error.code || -1,
        rawError: error
      }
    }
  }
  
  /**
   * 通用物体识别
   * @param {string} imagePath 图片路径
   * @param {Object} options 选项
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeGeneral(imagePath, options = {}) {
    try {
      // 检查缓存
      const cacheKey = `general_${imagePath}_${JSON.stringify(options)}`
      const cachedResult = this.getFromCache(cacheKey)
      if (cachedResult) {
        console.log('使用缓存的通用识别结果')
        return cachedResult
      }
      
      // 获取access_token
      const accessToken = await this.getAccessToken()
      
      // 压缩图片（如果需要）
      let processedImage = imagePath
      if (options.compress !== false) {
        const compressed = await this.imageUtils.compressImage(imagePath, {
          quality: 80,
          width: 1024,
          height: 1024
        })
        processedImage = compressed.path
      }
      
      // 转换为Base64
      const imageBase64 = await this.imageToBase64(processedImage)
      
      // 准备请求参数
      const params = {
        image: imageBase64,
        baike_num: options.baike_num || 1
      }
      
      // 调用百度AI通用物体识别接口
      const recognitionUrl = `${this.config.generalRecognition.url}?access_token=${accessToken}`
      
      console.log('调用百度AI通用物体识别接口...')
      
      // 直接使用wx.request调用百度AI API
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: recognitionUrl,
          method: 'POST',
          header: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: params,
          success: (res) => {
            console.log('百度AI通用识别API响应:', res)
            resolve(res.data)
          },
          fail: (error) => {
            console.error('百度AI通用识别API请求失败:', error)
            reject(new Error(`网络请求失败: ${error.errMsg}`))
          }
        })
      })
      
      // 处理响应
      const result = this.processGeneralRecognitionResponse(response, {
        imagePath: processedImage,
        options: options
      })
      
      // 缓存结果
      this.setToCache(cacheKey, result)
      
      return {
        success: true,
        data: result,
        rawData: response
      }
      
    } catch (error) {
      console.error('百度AI通用物体识别失败:', error)
      
      return {
        success: false,
        error: error.message,
        code: error.code || -1,
        rawError: error
      }
    }
  }
  
  /**
   * 处理食物识别响应
   * @param {Object} response API响应
   * @param {Object} metadata 元数据
   * @returns {Object} 处理后的结果
   */
  processFoodRecognitionResponse(response, metadata = {}) {
    console.log('处理百度AI食物识别响应:', response)
    
    // 检查百度AI API的错误响应格式
    if (!response) {
      throw new Error('百度AI识别失败: 无响应')
    }
    
    // 百度AI API错误格式1: error_code字段
    if (response.error_code) {
      throw new Error(`百度AI识别失败: ${response.error_msg || `错误码: ${response.error_code}`}`)
    }
    
    // 百度AI API错误格式2: error字段
    if (response.error) {
      throw new Error(`百度AI识别失败: ${response.error_description || response.error}`)
    }
    
    // 检查是否有识别结果
    if (!response.result || response.result.length === 0) {
      throw new Error('未识别到食物，请尝试重新拍照')
    }
    
    const firstResult = response.result[0]
    const baikeInfo = firstResult.baike_info || {}
    
    // 构建标准格式的结果
    const result = {
      // 基础信息
      foodName: firstResult.name || '未知食物',
      confidence: firstResult.probability || 0,
      calorie: firstResult.calorie || 0,
      hasCalorie: firstResult.has_calorie || false,
      
      // 百科信息
      description: baikeInfo.description || '暂无描述',
      baikeUrl: baikeInfo.baike_url || '',
      baikeImageUrl: baikeInfo.image_url || '',
      
      // 原始数据
      rawResult: firstResult,
      allResults: response.result,
      
      // 元数据
      metadata: {
        ...metadata,
        source: 'baidu_ai',
        timestamp: Date.now(),
        apiVersion: 'v2/dish'
      }
    }
    
    return result
  }
  
  /**
   * 处理通用物体识别响应
   * @param {Object} response API响应
   * @param {Object} metadata 元数据
   * @returns {Object} 处理后的结果
   */
  processGeneralRecognitionResponse(response, metadata = {}) {
    console.log('处理百度AI通用识别响应:', response)
    
    // 检查百度AI API的错误响应格式
    if (!response) {
      throw new Error('百度AI通用识别失败: 无响应')
    }
    
    // 百度AI API错误格式1: error_code字段
    if (response.error_code) {
      throw new Error(`百度AI通用识别失败: ${response.error_msg || `错误码: ${response.error_code}`}`)
    }
    
    // 百度AI API错误格式2: error字段
    if (response.error) {
      throw new Error(`百度AI通用识别失败: ${response.error_description || response.error}`)
    }
    
    // 检查是否有识别结果
    if (!response.result || response.result.length === 0) {
      throw new Error('未识别到物体，请尝试重新拍照')
    }
    
    const firstResult = response.result[0]
    const baikeInfo = firstResult.baike_info || {}
    
    // 构建标准格式的结果
    const result = {
      // 基础信息
      objectName: firstResult.keyword || '未知物体',
      confidence: firstResult.score || 0,
      root: firstResult.root || '',
      
      // 百科信息
      description: baikeInfo.description || '暂无描述',
      baikeUrl: baikeInfo.baike_url || '',
      baikeImageUrl: baikeInfo.image_url || '',
      
      // 原始数据
      rawResult: firstResult,
      allResults: response.result,
      
      // 元数据
      metadata: {
        ...metadata,
        source: 'baidu_ai_general',
        timestamp: Date.now(),
        apiVersion: 'v2/advanced_general'
      }
    }
    
    return result
  }
  
  /**
   * 从缓存获取数据
   * @param {string} key 缓存键
   * @returns {Object|null} 缓存数据
   */
  getFromCache(key) {
    const cached = this.recognitionCache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data
    }
    
    // 清理过期缓存
    if (cached) {
      this.recognitionCache.delete(key)
    }
    
    return null
  }
  
  /**
   * 设置缓存数据
   * @param {string} key 缓存键
   * @param {Object} data 缓存数据
   */
  setToCache(key, data) {
    this.recognitionCache.set(key, {
      data: data,
      timestamp: Date.now()
    })
    
    // 限制缓存大小
    if (this.recognitionCache.size > 50) {
      const firstKey = this.recognitionCache.keys().next().value
      this.recognitionCache.delete(firstKey)
    }
  }
  
  /**
   * 清除缓存
   */
  clearCache() {
    this.recognitionCache.clear()
    this.accessTokenCache = {
      token: null,
      expireTime: 0,
      refreshTime: 0
    }
    console.log('百度AI缓存已清除')
  }
  
  /**
   * 健康检查
   * @returns {Promise<Object>} 健康状态
   */
  async healthCheck() {
    try {
      // 尝试获取access_token
      const hasApiKey = this.checkAPIKey()
      
      if (!hasApiKey) {
        return {
          success: false,
          error: 'API密钥未配置',
          configured: false
        }
      }
      
      // 测试获取access_token
      const token = await this.getAccessToken()
      
      return {
        success: true,
        configured: true,
        tokenValid: !!token,
        cacheStatus: {
          tokenCache: this.accessTokenCache.token ? '有效' : '无效',
          recognitionCacheSize: this.recognitionCache.size
        },
        timestamp: Date.now()
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        configured: true,
        timestamp: Date.now()
      }
    }
  }
  
  /**
   * 获取服务信息
   * @returns {Object} 服务信息
   */
  getServiceInfo() {
    return {
      name: '百度AI图像识别服务',
      version: '1.0.0',
      features: ['食物识别', '通用物体识别'],
      endpoints: {
        foodRecognition: this.config.recognition.url,
        generalRecognition: this.config.generalRecognition.url,
        tokenUrl: 'https://aip.baidubce.com/oauth/2.0/token'
      },
      cache: {
        tokenCache: this.accessTokenCache.token ? '已缓存' : '未缓存',
        recognitionCacheSize: this.recognitionCache.size
      }
    }
  }
}

// 创建单例实例
const baiduAIService = new BaiduAIService()

module.exports = {
  // 主要功能
  recognizeFood: (imagePath, options) => baiduAIService.recognizeFood(imagePath, options),
  recognizeGeneral: (imagePath, options) => baiduAIService.recognizeGeneral(imagePath, options),
  
  // 工具方法
  getAccessToken: () => baiduAIService.getAccessToken(),
  imageToBase64: (imagePath) => baiduAIService.imageToBase64(imagePath),
  
  // 缓存管理
  clearCache: () => baiduAIService.clearCache(),
  
  // 健康检查
  healthCheck: () => baiduAIService.healthCheck(),
  getServiceInfo: () => baiduAIService.getServiceInfo(),
  
  // 实例
  service: baiduAIService
}
