// services/secure-ai-service.js
const config = require('../constants/config.js')
const imageUtils = require('../utils/image.js')
const dataService = require('./data-service.js')

/**
 * 安全AI服务类
 * 使用云函数保护API密钥，提供频率限制和错误处理
 */
class SecureAIService {
  constructor() {
    this.config = config
    this.imageUtils = imageUtils
    this.dataService = dataService
    
    // 使用云函数模式
    this.useCloudFunction = true
    
    // 缓存配置
    this.cache = {
      foodAnalysis: new Map(),
      ttl: 5 * 60 * 1000 // 5分钟缓存
    }
  }
  
  /**
   * 初始化云开发
   */
  initCloud() {
    try {
      if (wx.cloud) {
        wx.cloud.init({
          env: this.config.cloud.env,
          traceUser: true
        })
        console.log('云开发初始化成功')
        return true
      } else {
        console.warn('当前环境不支持云开发')
        return false
      }
    } catch (error) {
      console.error('云开发初始化失败:', error)
      return false
    }
  }
  
  /**
   * 调用云函数
   * @param {string} name 云函数名称
   * @param {Object} data 请求数据
   * @returns {Promise} Promise对象
   */
  async callCloudFunction(name, data) {
    try {
      if (!this.initCloud()) {
        throw new Error('云开发初始化失败，无法调用云函数')
      }
      
      const result = await wx.cloud.callFunction({
        name: name,
        data: data,
        config: {
          env: this.config.cloud.env
        }
      })
      
      return result.result
      
    } catch (error) {
      console.error(`调用云函数 ${name} 失败:`, error)
      throw error
    }
  }
  
  /**
   * 识别食物图片（安全版本）
   * @param {string} imagePath 图片路径
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async recognizeFood(imagePath, options = {}) {
    try {
      // 1. 压缩图片
      let processedImage = imagePath
      if (options.compress !== false) {
        const compressed = await this.imageUtils.compressImage(imagePath, {
          quality: 80,
          width: 1024,
          height: 1024
        })
        processedImage = compressed.path
      }
      
      // 2. 生成图片描述（简化版，实际应使用图片识别API）
      // 这里使用一个简单的描述，实际项目中应该使用图片识别服务
      const imageDescription = await this.generateImageDescription(processedImage)
      
      // 3. 检查缓存
      const cacheKey = `food_analysis_${imageDescription}`
      const cachedResult = this.getFromCache(cacheKey)
      if (cachedResult) {
        console.log('使用缓存结果')
        return cachedResult
      }
      
      // 4. 调用云函数进行食物分析
      const result = await this.callCloudFunction('deepseek-proxy', {
        action: 'analyzeFoodFromImage',
        data: {
          imageDescription: imageDescription
        }
      })
      
      if (!result.success) {
        throw new Error(result.error || '食物识别失败')
      }
      
      // 5. 处理结果
      const foodData = this.processFoodData(result.data, {
        imagePath: processedImage,
        source: 'cloud_function'
      })
      
      // 6. 缓存结果
      this.setToCache(cacheKey, foodData)
      
      // 7. 保存到历史记录
      if (options.saveToHistory !== false) {
        await this.dataService.saveRecognitionRecord(foodData)
      }
      
      return {
        success: true,
        data: foodData,
        rawData: result.data,
        rateLimit: result.rateLimit
      }
      
    } catch (error) {
      console.error('安全食物识别失败:', error)
      
      // 降级策略：使用内置数据库
      try {
        const fallbackResult = await this.fallbackToLocalDatabase(imagePath, options)
        return {
          success: true,
          data: fallbackResult,
          source: 'fallback',
          warning: 'AI服务暂时不可用，使用本地数据'
        }
      } catch (fallbackError) {
        return {
          success: false,
          error: error.message,
          fallbackError: fallbackError.message,
          code: 'RECOGNITION_FAILED'
        }
      }
    }
  }
  
  /**
   * 搜索食物信息（安全版本）
   * @param {string} query 搜索查询
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async searchFood(query, options = {}) {
    try {
      // 1. 提取食物名称和重量
      const { foodName, weight } = this.extractFoodInfo(query)
      
      // 2. 检查缓存
      const cacheKey = `food_search_${foodName}_${weight || 'default'}`
      const cachedResult = this.getFromCache(cacheKey)
      if (cachedResult) {
        console.log('使用缓存结果')
        return cachedResult
      }
      
      // 3. 调用云函数进行食物搜索
      const result = await this.callCloudFunction('deepseek-proxy', {
        action: 'searchFoodInfo',
        data: {
          foodDescription: query
        }
      })
      
      if (!result.success) {
        throw new Error(result.error || '食物搜索失败')
      }
      
      // 4. 处理结果
      const foodData = this.processFoodData(result.data, {
        query: query,
        foodName: foodName,
        weight: weight,
        source: 'cloud_function'
      })
      
      // 5. 缓存结果
      this.setToCache(cacheKey, foodData)
      
      // 6. 保存到历史记录
      if (options.saveToHistory !== false) {
        await this.dataService.saveRecognitionRecord(foodData)
      }
      
      return {
        success: true,
        data: foodData,
        rawData: result.data,
        rateLimit: result.rateLimit
      }
      
    } catch (error) {
      console.error('安全食物搜索失败:', error)
      
      // 降级策略：使用内置数据库
      try {
        const fallbackResult = await this.fallbackToLocalDatabase(query, options)
        return {
          success: true,
          data: fallbackResult,
          source: 'fallback',
          warning: 'AI服务暂时不可用，使用本地数据'
        }
      } catch (fallbackError) {
        return {
          success: false,
          error: error.message,
          fallbackError: fallbackError.message,
          code: 'SEARCH_FAILED'
        }
      }
    }
  }
  
  /**
   * 生成图片描述（简化版）
   * @param {string} imagePath 图片路径
   * @returns {Promise<string>} 图片描述
   */
  async generateImageDescription(imagePath) {
    // 实际项目中应该使用图片识别API
    // 这里返回一个简单的描述
    return '一张食物图片，看起来美味可口'
  }
  
  /**
   * 提取食物信息
   * @param {string} query 查询字符串
   * @returns {Object} 食物信息
   */
  extractFoodInfo(query) {
    // 简单的食物信息提取逻辑
    // 实际项目中可以更复杂
    const weightMatch = query.match(/(\d+)\s*(g|克|kg|千克|斤|两)/)
    let weight = null
    let foodName = query
    
    if (weightMatch) {
      weight = {
        value: parseFloat(weightMatch[1]),
        unit: weightMatch[2]
      }
      foodName = query.replace(weightMatch[0], '').trim()
    }
    
    return {
      foodName: foodName,
      weight: weight
    }
  }
  
  /**
   * 处理食物数据
   * @param {Object} apiData API返回的数据
   * @param {Object} metadata 元数据
   * @returns {Object} 处理后的食物数据
   */
  processFoodData(apiData, metadata = {}) {
    try {
      // 解析API响应
      let foodData
      if (apiData.choices && apiData.choices[0] && apiData.choices[0].message) {
        const content = apiData.choices[0].message.content
        try {
          foodData = JSON.parse(content)
        } catch (parseError) {
          // 如果JSON解析失败，尝试提取JSON部分
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            foodData = JSON.parse(jsonMatch[0])
          } else {
            throw new Error('无法解析API响应')
          }
        }
      } else {
        foodData = apiData
      }
      
      // 添加元数据
      return {
        ...foodData,
        metadata: {
          ...metadata,
          timestamp: Date.now(),
          processed: true
        },
        id: `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
      
    } catch (error) {
      console.error('处理食物数据失败:', error)
      throw new Error('食物数据处理失败')
    }
  }
  
  /**
   * 降级到本地数据库
   * @param {string} input 输入（图片路径或查询）
   * @param {Object} options 选项
   * @returns {Promise<Object>} 降级结果
   */
  async fallbackToLocalDatabase(input, options = {}) {
    // 这里可以调用内置的食物数据库
    // 简化版：返回一个默认的食物数据
    const defaultFoods = {
      '苹果': {
        foodName: '苹果',
        confidence: 0.9,
        description: '新鲜苹果，富含维生素和纤维',
        calorie: 52,
        nutrition: {
          protein: 0.3,
          fat: 0.2,
          carbohydrate: 14,
          fiber: 2.4,
          vitamin: 4.6,
          mineral: 0.2,
          calcium: 6,
          iron: 0.1,
          zinc: 0.1
        },
        healthScore: 85,
        suggestions: ['适合作为健康零食', '建议连皮食用以获取更多纤维'],
        tags: ['水果', '健康', '低热量']
      },
      '香蕉': {
        foodName: '香蕉',
        confidence: 0.9,
        description: '成熟香蕉，富含钾和维生素B6',
        calorie: 89,
        nutrition: {
          protein: 1.1,
          fat: 0.3,
          carbohydrate: 23,
          fiber: 2.6,
          vitamin: 8.7,
          mineral: 0.3,
          calcium: 5,
          iron: 0.3,
          zinc: 0.2
        },
        healthScore: 80,
        suggestions: ['适合运动后补充能量', '成熟香蕉更易消化'],
        tags: ['水果', '能量', '钾']
      }
    }
    
    // 简单匹配逻辑
    let matchedFood = null
    for (const [name, data] of Object.entries(defaultFoods)) {
      if (input.includes(name)) {
        matchedFood = data
        break
      }
    }
    
    if (!matchedFood) {
      matchedFood = defaultFoods['苹果'] // 默认返回苹果
    }
    
    return {
      ...matchedFood,
      metadata: {
        source: 'fallback',
        timestamp: Date.now(),
        input: input
      },
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }
  
  /**
   * 从缓存获取数据
   * @param {string} key 缓存键
   * @returns {Object|null} 缓存数据
   */
  getFromCache(key) {
    const cached = this.cache.foodAnalysis.get(key)
    if (cached && Date.now() - cached.timestamp < this.cache.ttl) {
      return cached.data
    }
    
    // 清理过期缓存
    if (cached) {
      this.cache.foodAnalysis.delete(key)
    }
    
    return null
  }
  
  /**
   * 设置缓存数据
   * @param {string} key 缓存键
   * @param {Object} data 缓存数据
   */
  setToCache(key, data) {
    this.cache.foodAnalysis.set(key, {
      data: data,
      timestamp: Date.now()
    })
    
    // 限制缓存大小
    if (this.cache.foodAnalysis.size > 100) {
      const firstKey = this.cache.foodAnalysis.keys().next().value
      this.cache.foodAnalysis.delete(firstKey)
    }
  }
  
  /**
   * 健康检查
   * @returns {Promise<Object>} 健康状态
   */
  async healthCheck() {
    try {
      const result = await this.callCloudFunction('deepseek-proxy', {
        action: 'healthCheck'
      })
      
      return {
        success: true,
        cloudFunction: result.success,
        data: result.data
      }
      
    } catch (error) {
      return {
        success: false,
        cloudFunction: false,
        error: error.message
      }
    }
  }
  
  /**
   * 获取使用统计
   * @returns {Promise<Object>} 使用统计
   */
  async getUsageStats() {
    try {
      // 这里可以调用云函数获取详细的使用统计
      // 简化版：返回本地统计
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const records = await this.dataService.getRecognitionRecords({
        startDate: today.getTime(),
        limit: 1000
      })
      
      return {
        success: true,
        data: {
          todayCount: records.length,
          totalCount: await this.dataService.getTotalRecordCount(),
          lastUsed: records.length > 0 ? records[0].timestamp : null
        }
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// 创建单例实例
const secureAIService = new SecureAIService()

module.exports = secureAIService
