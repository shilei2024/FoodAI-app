// services/deepseek-service.js
const config = require('../constants/config.js')

/**
 * Deepseek AI服务类
 * 直接调用Deepseek API进行食物识别和营养分析
 * 注意：API Key会暴露在小程序代码中，建议在生产环境中使用云函数
 */
class DeepseekService {
  constructor() {
    this.deepseekAI = config.deepseekAI
    this.apiKey = this.deepseekAI.apiKey
    this.baseURL = this.deepseekAI.baseURL
    this.models = this.deepseekAI.models
    this.foodAnalysis = this.deepseekAI.foodAnalysis
  }

  /**
   * 检查API密钥是否配置
   * @returns {boolean} 是否已配置
   */
  checkAPIKey() {
    if (!this.apiKey || this.apiKey === 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
      console.warn('Deepseek API密钥未配置，请在 config.js 中配置 deepseekAI.apiKey')
      
      // 在开发环境中显示更详细的提示
      if (config.debug.enabled) {
        wx.showModal({
          title: 'API密钥未配置',
          content: 'Deepseek API密钥未配置，请按照以下步骤操作：\n\n1. 访问 https://platform.deepseek.com/\n2. 获取API密钥\n3. 在 config.js 中配置 deepseekAI.apiKey\n\n配置完成后，系统将使用真实的AI数据进行食物识别和营养分析。',
          showCancel: false
        })
      }
      
      return false
    }
    return true
  }

  /**
   * 调用Deepseek API
   * @param {Array} messages 消息数组
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async callDeepseekAPI(messages, options = {}) {
    // 检查API密钥
    if (!this.checkAPIKey()) {
      throw new Error('Deepseek API密钥未配置，请在 config.js 中配置 deepseekAI.apiKey')
    }

    const requestOptions = {
      model: options.model || this.models.chat,
      messages: messages,
      temperature: options.temperature || this.foodAnalysis.temperature,
      max_tokens: options.maxTokens || this.foodAnalysis.maxTokens,
      stream: options.stream || this.foodAnalysis.stream,
      response_format: options.response_format || { type: "json_object" }
    }

    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: `${this.baseURL}/chat/completions`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          data: requestOptions,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.data)
            } else {
              reject(new Error(`Deepseek API请求失败: HTTP ${res.statusCode}`))
            }
          },
          fail: (error) => {
            reject(new Error(`网络请求失败: ${error.errMsg}`))
          }
        })
      })

      return response

    } catch (error) {
      console.error('调用Deepseek API失败:', error)
      throw error
    }
  }

  /**
   * 分析食物图片（基于图片描述）
   * @param {string} imageDescription 图片描述
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async analyzeFoodFromImage(imageDescription, options = {}) {
    try {
      const messages = [
        {
          role: 'system',
          content: this.foodAnalysis.systemPrompt
        },
        {
          role: 'user',
          content: `请分析以下食物图片：
          
图片描述：${imageDescription}

请识别食物并提供详细的营养分析。`
        }
      ]

      const response = await this.callDeepseekAPI(messages, options)
      
      // 解析响应
      const result = this.parseAPIResponse(response)
      
      return {
        success: true,
        data: result,
        rawData: response
      }

    } catch (error) {
      console.error('分析食物图片失败:', error)
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      }
    }
  }

  /**
   * 分析食物文本描述
   * @param {string} foodDescription 食物描述
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async analyzeFoodFromText(foodDescription, options = {}) {
    try {
      const messages = [
        {
          role: 'system',
          content: this.foodAnalysis.systemPrompt
        },
        {
          role: 'user',
          content: `请分析以下食物：
          
食物描述：${foodDescription}

请识别食物并提供详细的营养分析。`
        }
      ]

      const response = await this.callDeepseekAPI(messages, options)
      
      // 解析响应
      const result = this.parseAPIResponse(response)
      
      return {
        success: true,
        data: result,
        rawData: response
      }

    } catch (error) {
      console.error('分析食物文本失败:', error)
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      }
    }
  }

  /**
   * 搜索食物信息
   * @param {string} foodName 食物名称
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async searchFoodInfo(foodName, options = {}) {
    try {
      const messages = [
        {
          role: 'system',
          content: this.foodAnalysis.systemPrompt
        },
        {
          role: 'user',
          content: `请提供以下食物的详细信息：
          
食物名称：${foodName}

请提供该食物的详细营养信息和健康建议。`
        }
      ]

      const response = await this.callDeepseekAPI(messages, options)
      
      // 解析响应
      const result = this.parseAPIResponse(response)
      
      return {
        success: true,
        data: result,
        rawData: response
      }

    } catch (error) {
      console.error('搜索食物信息失败:', error)
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      }
    }
  }

  /**
   * 解析API响应
   * @param {Object} response API响应
   * @returns {Object} 解析后的结果
   */
  parseAPIResponse(response) {
    if (!response || !response.choices || response.choices.length === 0) {
      throw new Error('API响应格式错误')
    }

    const content = response.choices[0].message.content
    
    try {
      // 尝试解析JSON
      const parsedData = JSON.parse(content)
      
      // 验证必要字段
      if (!parsedData.foodName) {
        throw new Error('API响应缺少必要字段: foodName')
      }

      // 确保营养信息存在
      if (!parsedData.nutrition) {
        parsedData.nutrition = {}
      }

      // 确保数值类型正确
      const nutrition = parsedData.nutrition
      const numericFields = ['protein', 'fat', 'carbohydrate', 'fiber', 'vitamin', 'mineral', 'calcium', 'iron', 'zinc']
      
      numericFields.forEach(field => {
        if (nutrition[field] !== undefined) {
          nutrition[field] = parseFloat(nutrition[field]) || 0
        } else {
          nutrition[field] = 0
        }
      })

      // 确保热量存在
      if (parsedData.calorie === undefined) {
        parsedData.calorie = 0
      } else {
        parsedData.calorie = parseFloat(parsedData.calorie) || 0
      }

      // 确保置信度存在
      if (parsedData.confidence === undefined) {
        parsedData.confidence = 0.8
      } else {
        parsedData.confidence = parseFloat(parsedData.confidence) || 0.8
      }

      // 确保健康评分存在
      if (parsedData.healthScore === undefined) {
        parsedData.healthScore = 70
      } else {
        parsedData.healthScore = parseFloat(parsedData.healthScore) || 70
      }

      // 确保建议存在
      if (!parsedData.suggestions || !Array.isArray(parsedData.suggestions)) {
        parsedData.suggestions = ['均衡饮食，多样化摄入']
      }

      // 确保标签存在
      if (!parsedData.tags || !Array.isArray(parsedData.tags)) {
        parsedData.tags = []
      }

      // 确保描述存在
      if (!parsedData.description) {
        parsedData.description = `这是${parsedData.foodName}，具体营养信息请参考专业数据库。`
      }

      return parsedData

    } catch (error) {
      console.error('解析API响应失败:', error, '原始内容:', content)
      
      // 如果JSON解析失败，尝试提取信息
      return this.extractInfoFromText(content)
    }
  }

  /**
   * 从文本中提取信息（备用方案）
   * @param {string} text 文本内容
   * @returns {Object} 提取的信息
   */
  extractInfoFromText(text) {
    // 尝试从文本中提取食物名称
    let foodName = '未知食物'
    const foodNameMatch = text.match(/食物名称[：:]\s*([^\n]+)/)
    if (foodNameMatch) {
      foodName = foodNameMatch[1].trim()
    }

    // 尝试提取热量
    let calorie = 0
    const calorieMatch = text.match(/热量[：:]\s*([\d.]+)/)
    if (calorieMatch) {
      calorie = parseFloat(calorieMatch[1]) || 0
    }

    // 提取营养信息
    const nutrition = {
      protein: this.extractNutritionValue(text, '蛋白质'),
      fat: this.extractNutritionValue(text, '脂肪'),
      carbohydrate: this.extractNutritionValue(text, '碳水'),
      fiber: this.extractNutritionValue(text, '纤维'),
      vitamin: this.extractNutritionValue(text, '维生素'),
      mineral: this.extractNutritionValue(text, '矿物质'),
      calcium: this.extractNutritionValue(text, '钙'),
      iron: this.extractNutritionValue(text, '铁'),
      zinc: this.extractNutritionValue(text, '锌')
    }

    return {
      foodName: foodName,
      confidence: 0.7,
      description: text.substring(0, 100) + '...',
      calorie: calorie,
      nutrition: nutrition,
      healthScore: 70,
      suggestions: ['请确保饮食均衡', '多样化摄入不同食物'],
      tags: ['AI分析']
    }
  }

  /**
   * 从文本中提取营养数值
   * @param {string} text 文本
   * @param {string} nutrient 营养成分
   * @returns {number} 数值
   */
  extractNutritionValue(text, nutrient) {
    const pattern = new RegExp(`${nutrient}[：:]\s*([\d.]+)`)
    const match = text.match(pattern)
    if (match) {
      return parseFloat(match[1]) || 0
    }
    return 0
  }

  /**
   * 生成图片描述（模拟函数，实际应该使用图片识别API）
   * @param {string} imagePath 图片路径
   * @returns {Promise} Promise对象
   */
  async generateImageDescription(imagePath) {
    // 这里应该调用图片识别API生成描述
    // 暂时返回模拟描述
    return new Promise((resolve) => {
      setTimeout(() => {
        const descriptions = [
          '一张清晰的食物照片，看起来像是新鲜的水果',
          '盘中盛放的食物，颜色鲜艳，摆盘整齐',
          '烹饪完成的菜肴，热气腾腾，看起来很有食欲',
          '健康的蔬菜沙拉，多种颜色搭配',
          '传统的中式菜肴，色香味俱全'
        ]
        const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)]
        resolve(randomDescription)
      }, 500)
    })
  }

  /**
   * 批量分析食物
   * @param {Array} foodItems 食物项数组
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async batchAnalyzeFood(foodItems, options = {}) {
    const results = []
    
    for (let i = 0; i < foodItems.length; i++) {
      try {
        const item = foodItems[i]
        let result
        
        if (item.type === 'image') {
          result = await this.analyzeFoodFromImage(item.description, options)
        } else if (item.type === 'text') {
          result = await this.analyzeFoodFromText(item.description, options)
        } else {
          result = await this.searchFoodInfo(item.name, options)
        }
        
        results.push({
          index: i,
          success: result.success,
          data: result.data,
          error: result.error
        })
        
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message
        })
      }

      // 添加延迟，避免请求过快
      if (i < foodItems.length - 1) {
        await this.delay(1000)
      }
    }

    return results
  }

  /**
   * 延迟函数
   * @param {number} ms 毫秒数
   * @returns {Promise} Promise对象
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 创建单例实例
const deepseekService = new DeepseekService()

module.exports = {
  // 食物分析
  analyzeFoodFromImage: (imageDescription, options) => deepseekService.analyzeFoodFromImage(imageDescription, options),
  analyzeFoodFromText: (foodDescription, options) => deepseekService.analyzeFoodFromText(foodDescription, options),
  searchFoodInfo: (foodName, options) => deepseekService.searchFoodInfo(foodName, options),
  
  // 批量分析
  batchAnalyzeFood: (foodItems, options) => deepseekService.batchAnalyzeFood(foodItems, options),
  
  // 工具方法
  generateImageDescription: (imagePath) => deepseekService.generateImageDescription(imagePath),
  
  // 实例
  service: deepseekService
}
