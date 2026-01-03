// services/ai-service.js
const config = require('../constants/config.js');
const api = require('../utils/api.js');
const imageUtils = require('../utils/image.js');
const dataService = require('./data-service.js');
const deepseekService = require('./deepseek-service.js');

/**
 * AI服务类
 * 直接调用百度AI API（不依赖云函数）
 * 注意：API Key和Secret Key会暴露在小程序代码中，建议在生产环境中使用云函数
 */
class AIService {
  constructor() {
    this.baiduAI = config.baiduAI;
    this.deepseekAI = config.deepseekAI;
    this.api = api;
    this.imageUtils = imageUtils;
    this.deepseekService = deepseekService;
    // 使用Deepseek API模式
    this.useDeepseekAPI = true;
    // 直接调用模式（不使用云函数）
    this.useDirectCall = true;
  }

  /**
   * 识别食物图片
   * @param {string} imagePath 图片路径
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async recognizeFood(imagePath, options = {}) {
    try {
      // 1. 压缩图片（如果需要）
      let processedImage = imagePath;
      if (options.compress !== false) {
        const compressed = await this.imageUtils.compressImage(imagePath, {
          quality: 80,
          width: 1024,
          height: 1024
        });
        processedImage = compressed.path;
      }

      let recognitionResult;
      
      // 2. 根据配置选择AI服务
      if (this.useDeepseekAPI) {
        // 使用Deepseek API
        recognitionResult = await this.recognizeFoodWithDeepseek(processedImage, options);
      } else {
        // 使用百度AI API（需要配置）
        recognitionResult = await this.recognizeFoodWithBaidu(processedImage, options);
      }

      // 3. 解析识别结果
      const parsedResult = this.parseRecognitionResult(recognitionResult, options);

      // 4. 获取营养信息（如果需要）
      if (options.getNutrition !== false) {
        const nutritionInfo = await this.getNutritionInfo(parsedResult.foodName, parsedResult.nutrition);
        parsedResult.nutrition = nutritionInfo;
      }

      // 5. 保存识别记录（如果需要）
      if (options.saveRecord !== false) {
        await this.saveRecognitionRecord(parsedResult, imagePath);
      }

      return {
        success: true,
        data: parsedResult,
        rawData: recognitionResult
      };

    } catch (error) {
      console.error('食物识别失败:', error);
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      };
    }
  }

  /**
   * 使用Deepseek API识别食物图片
   * @param {string} imagePath 图片路径
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async recognizeFoodWithDeepseek(imagePath, options = {}) {
    try {
      // 1. 生成图片描述（模拟或使用图片识别API）
      const imageDescription = await this.deepseekService.generateImageDescription(imagePath);
      
      // 2. 调用Deepseek API分析食物
      const analysisResult = await this.deepseekService.analyzeFoodFromImage(imageDescription, options);
      
      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Deepseek API分析失败');
      }
      
      // 3. 转换为与百度AI相似的格式
      const deepseekResult = {
        result: [
          {
            name: analysisResult.data.foodName,
            probability: analysisResult.data.confidence,
            calorie: analysisResult.data.calorie,
            has_calorie: analysisResult.data.calorie > 0,
            baike_info: {
              description: analysisResult.data.description,
              image_url: imagePath
            }
          }
        ],
        nutrition: analysisResult.data.nutrition,
        healthScore: analysisResult.data.healthScore,
        suggestions: analysisResult.data.suggestions,
        tags: analysisResult.data.tags
      };
      
      return deepseekResult;
    } catch (error) {
      console.error('Deepseek API识别失败:', error);
      // 抛出错误，不使用模拟数据
      throw error;
    }
  }

  /**
   * 使用百度AI识别食物图片
   * @param {string} imagePath 图片路径
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async recognizeFoodWithBaidu(imagePath, options = {}) {
    // 检查API密钥是否配置
    if (!this.baiduAI.apiKey || !this.baiduAI.secretKey) {
      throw new Error('百度AI API密钥未配置。\n\n请在 constants/config.js 中配置：\n1. 访问 https://ai.baidu.com/\n2. 获取 API Key 和 Secret Key\n3. 配置到 baiduAI.apiKey 和 baiduAI.secretKey')
    }
    
    // TODO: 实现百度AI识别逻辑
    // 1. 获取access_token
    // 2. 调用百度AI图像识别API
    // 3. 解析并返回结果
    
    throw new Error('百度AI识别功能尚未完全实现。\n\n当前推荐使用Deepseek API（在config.js中配置deepseekAI.apiKey）。\n\n如需使用百度AI，请参考百度AI开放平台文档完善此功能。')
  }

  /**
   * 解析识别结果
   * @param {Object} recognitionResult 识别结果
   * @param {Object} options 选项
   * @returns {Object} 解析后的结果
   */
  parseRecognitionResult(recognitionResult, options = {}) {
    if (!recognitionResult || !recognitionResult.result || recognitionResult.result.length === 0) {
      throw new Error('识别结果为空');
    }

    const firstResult = recognitionResult.result[0];
    
    return {
      foodName: firstResult.name || '未知食物',
      description: firstResult.baike_info?.description || '暂无描述',
      calorie: firstResult.calorie || 0,
      confidence: firstResult.probability || 0,
      imageUrl: firstResult.baike_info?.image_url || '',
      nutrition: recognitionResult.nutrition || {},
      healthScore: recognitionResult.healthScore || 70,
      suggestions: recognitionResult.suggestions || [],
      tags: recognitionResult.tags || [],
      searchType: 'photo',
      source: 'ai_recognition'
    };
  }

  /**
   * 搜索食物信息
   * @param {string} foodName 食物名称
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async searchFoodByName(foodName, options = {}) {
    try {
      let searchResult;
      
      // 根据配置选择AI服务
      if (this.useDeepseekAPI) {
        // 使用Deepseek API搜索
        searchResult = await this.searchFoodWithDeepseek(foodName, options);
      } else {
        // 使用百度AI搜索
        searchResult = await this.searchFoodByText(foodName, options);
      }
      
      // 解析识别结果
      const parsedResult = this.parseRecognitionResult(searchResult, options);
      
      // 获取营养信息（如果需要）
      if (options.getNutrition !== false) {
        const nutritionInfo = await this.getNutritionInfo(parsedResult.foodName, parsedResult.nutrition);
        parsedResult.nutrition = nutritionInfo;
      }
      
      // 保存搜索记录（如果需要）
      if (options.saveRecord !== false) {
        await this.saveSearchRecord(parsedResult, foodName);
      }
      
      return {
        success: true,
        data: parsedResult,
        rawData: searchResult
      };
      
    } catch (error) {
      console.error('搜索食物失败:', error);
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      };
    }
  }

  /**
   * 使用Deepseek API搜索食物信息
   * @param {string} foodName 食物名称
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async searchFoodWithDeepseek(foodName, options = {}) {
    try {
      // 调用Deepseek API搜索食物
      const searchResult = await this.deepseekService.searchFoodInfo(foodName, options);
      
      if (!searchResult.success) {
        throw new Error(searchResult.error || 'Deepseek API搜索失败');
      }
      
      // 转换为与百度AI相似的格式
      const deepseekResult = {
        result: [
          {
            name: searchResult.data.foodName,
            probability: searchResult.data.confidence,
            calorie: searchResult.data.calorie,
            has_calorie: searchResult.data.calorie > 0,
            baike_info: {
              description: searchResult.data.description,
              image_url: ''
            }
          }
        ],
        nutrition: searchResult.data.nutrition,
        healthScore: searchResult.data.healthScore,
        suggestions: searchResult.data.suggestions,
        tags: searchResult.data.tags
      };
      
      return deepseekResult;
    } catch (error) {
      console.error('Deepseek API搜索失败:', error);
      // 抛出错误，不使用模拟数据
      throw error;
    }
  }

  /**
   * 使用百度AI搜索食物
   * @param {string} foodName 食物名称
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async searchFoodByText(foodName, options = {}) {
    // 检查API密钥是否配置
    if (!this.baiduAI.apiKey || !this.baiduAI.secretKey) {
      throw new Error('百度AI API密钥未配置。\n\n请在 constants/config.js 中配置：\n1. 访问 https://ai.baidu.com/\n2. 获取 API Key 和 Secret Key\n3. 配置到 baiduAI.apiKey 和 baiduAI.secretKey')
    }
    
    // TODO: 实现百度AI搜索逻辑
    throw new Error('百度AI搜索功能尚未完全实现。\n\n当前推荐使用Deepseek API（在config.js中配置deepseekAI.apiKey）。')
  }

  /**
   * 获取营养信息
   * @param {string} foodName 食物名称
   * @param {Object} existingNutrition 现有营养数据
   * @returns {Promise} Promise对象
   */
  async getNutritionInfo(foodName, existingNutrition = null) {
    try {
      // 如果已经有Deepseek提供的营养数据，直接使用
      if (existingNutrition && Object.keys(existingNutrition).length > 0) {
        return existingNutrition;
      }
      
      // 否则使用Deepseek API获取营养信息
      if (this.useDeepseekAPI) {
        const searchResult = await this.deepseekService.searchFoodInfo(foodName, {
          getNutrition: true
        });
        
        if (searchResult.success && searchResult.data.nutrition) {
          return searchResult.data.nutrition;
        }
      }
      
      // 降级到内置营养数据库
      console.log('使用内置营养数据库查询:', foodName)
      return this.getBuiltInNutritionInfo(foodName);
      
    } catch (error) {
      console.error('获取营养信息失败:', error);
      return this.getDefaultNutritionInfo();
    }
  }

  /**
   * 从内置营养数据库获取营养信息
   * @param {string} foodName 食物名称
   * @returns {Object} 营养信息
   */
  getBuiltInNutritionInfo(foodName) {
    const nutritionMap = {
      '苹果': { 
        protein: 0.3, fat: 0.2, carbohydrate: 13.8, fiber: 2.4, calories: 52,
        water: 85.6, vitaminC: 4.6, potassium: 107, calcium: 6, iron: 0.1,
        vitaminA: 3, vitaminE: 0.43, sodium: 1, magnesium: 5, phosphorus: 11,
        sugar: 10.4, cholesterol: 0
      },
      '香蕉': { 
        protein: 1.1, fat: 0.3, carbohydrate: 22.8, fiber: 2.6, calories: 89,
        water: 74.9, vitaminC: 8.7, potassium: 358, calcium: 5, iron: 0.3,
        vitaminA: 64, vitaminE: 0.1, sodium: 1, magnesium: 27, phosphorus: 22,
        sugar: 12.2, cholesterol: 0
      },
      '鸡胸肉': { 
        protein: 31, fat: 3.6, carbohydrate: 0, fiber: 0, calories: 165,
        water: 65, vitaminC: 0, potassium: 256, calcium: 11, iron: 0.9,
        vitaminA: 16, vitaminE: 0.22, sodium: 74, magnesium: 28, phosphorus: 228,
        zinc: 1.0, cholesterol: 85
      },
      '米饭': { 
        protein: 2.6, fat: 0.3, carbohydrate: 28.6, fiber: 0.4, calories: 130,
        water: 68.4, vitaminC: 0, potassium: 35, calcium: 10, iron: 0.2,
        vitaminB1: 0.02, vitaminB2: 0.01, sodium: 1, magnesium: 12, phosphorus: 43,
        zinc: 0.5, cholesterol: 0
      },
      '西兰花': { 
        protein: 2.8, fat: 0.4, carbohydrate: 6.6, fiber: 2.6, calories: 34,
        water: 89.3, vitaminC: 89.2, potassium: 316, calcium: 47, iron: 0.7,
        vitaminA: 31, vitaminK: 101.6, sodium: 33, magnesium: 21, phosphorus: 66,
        vitaminB6: 0.2, folate: 63
      },
      '鸡蛋': {
        protein: 12.6, fat: 9.5, carbohydrate: 1.1, fiber: 0, calories: 155,
        water: 75, vitaminA: 140, vitaminD: 1.1, vitaminE: 1.0, vitaminK: 0.3,
        calcium: 56, iron: 1.8, potassium: 138, sodium: 142, magnesium: 12,
        phosphorus: 198, zinc: 1.3, cholesterol: 373
      },
      '牛奶': {
        protein: 3.3, fat: 3.6, carbohydrate: 4.8, fiber: 0, calories: 64,
        water: 87.7, vitaminA: 46, vitaminD: 1.3, vitaminB2: 0.18, vitaminB12: 0.4,
        calcium: 120, potassium: 150, sodium: 50, magnesium: 12, phosphorus: 95,
        zinc: 0.4, cholesterol: 14
      },
      '牛肉': {
        protein: 26, fat: 15, carbohydrate: 0, fiber: 0, calories: 250,
        water: 57, vitaminB12: 2.6, vitaminB6: 0.4, niacin: 5.4, iron: 2.6,
        zinc: 6.3, potassium: 318, sodium: 72, magnesium: 21, phosphorus: 213,
        selenium: 21, cholesterol: 90
      },
      '面包': {
        protein: 8.4, fat: 3.2, carbohydrate: 49.4, fiber: 2.7, calories: 265,
        water: 36.4, vitaminB1: 0.16, vitaminB2: 0.09, vitaminB3: 2.0, iron: 2.4,
        calcium: 16, potassium: 115, sodium: 491, magnesium: 23, phosphorus: 87,
        zinc: 0.7, cholesterol: 0
      },
      '鱼肉': {
        protein: 20, fat: 5, carbohydrate: 0, fiber: 0, calories: 130,
        water: 73, vitaminD: 10, vitaminB12: 2.0, selenium: 36, omega3: 1.0,
        calcium: 12, iron: 0.5, potassium: 350, sodium: 60, magnesium: 28,
        phosphorus: 200, zinc: 0.5, cholesterol: 60
      },
      '蔬菜': {
        protein: 2.0, fat: 0.2, carbohydrate: 5.0, fiber: 2.0, calories: 25,
        water: 90, vitaminC: 20, vitaminA: 500, vitaminK: 50, folate: 40,
        calcium: 30, iron: 1.0, potassium: 200, sodium: 20, magnesium: 15,
        phosphorus: 25, zinc: 0.3, cholesterol: 0
      }
    };

    // 尝试匹配食物名称（包含关键词）
    const foodNameLower = foodName.toLowerCase();
    for (const [key, value] of Object.entries(nutritionMap)) {
      if (foodNameLower.includes(key.toLowerCase())) {
        return value;
      }
    }

    return this.getDefaultNutritionInfo();
  }

  /**
   * 获取默认营养信息
   * @returns {Object} 默认营养信息
   */
  getDefaultNutritionInfo() {
    return {
      protein: 0,
      fat: 0,
      carbohydrate: 0,
      fiber: 0,
      calories: 0,
      water: 0,
      vitaminC: 0,
      potassium: 0,
      calcium: 0,
      iron: 0,
      sodium: 0,
      magnesium: 0,
      phosphorus: 0,
      zinc: 0,
      cholesterol: 0,
      sugar: 0
    };
  }

  /**
   * 保存识别记录
   * @param {Object} record 识别记录
   * @param {string} imagePath 图片路径
   * @returns {Promise} Promise对象
   */
  async saveRecognitionRecord(record, imagePath) {
    try {
      const recognitionRecord = {
        foodName: record.foodName,
        description: record.description,
        calorie: record.calorie,
        confidence: record.confidence,
        imageUrl: imagePath || record.imageUrl,
        nutrition: record.nutrition,
        searchType: 'photo',
        timestamp: new Date().getTime(),
        source: 'ai_recognition'
      };
      
      await dataService.saveRecognitionRecord(recognitionRecord);
    } catch (error) {
      console.error('保存识别记录失败:', error);
    }
  }

  /**
   * 保存搜索记录
   * @param {Object} record 搜索记录
   * @param {string} foodName 食物名称
   * @returns {Promise} Promise对象
   */
  async saveSearchRecord(record, foodName) {
    try {
      const searchRecord = {
        foodName: foodName,
        description: record.description,
        calorie: record.calorie,
        confidence: record.confidence,
        imageUrl: record.imageUrl || '',
        nutrition: record.nutrition,
        searchType: 'text',
        timestamp: new Date().getTime(),
        source: 'text_search'
      };
      
      await dataService.saveRecognitionRecord(searchRecord);
    } catch (error) {
      console.error('保存搜索记录失败:', error);
    }
  }

  /**
   * 解析营养结果
   * @param {Object} aiResult AI识别结果
   * @returns {Object} 营养结果
   */
  parseNutritionResult(aiResult) {
    // 解析AI返回的营养数据
    const nutrition = aiResult.nutrition || {};
    
    // 确保数值类型正确
    const numericFields = [
      'protein', 'fat', 'carbohydrate', 'fiber', 'calories',
      'vitaminC', 'vitaminA', 'vitaminE', 'vitaminK', 'vitaminB1', 'vitaminB2', 'vitaminB6', 'vitaminB12', 'vitaminD',
      'calcium', 'iron', 'zinc', 'potassium', 'sodium', 'magnesium', 'phosphorus',
      'water', 'sugar', 'cholesterol', 'niacin', 'folate', 'selenium'
    ];
    
    numericFields.forEach(field => {
      if (nutrition[field] !== undefined) {
        nutrition[field] = parseFloat(nutrition[field]) || 0;
      }
    });
    
    return nutrition;
  }
}

// 创建实例
const aiService = new AIService();

// 导出模块
module.exports = {
  // 食物识别
  recognizeFood: (imagePath, options) => aiService.recognizeFood(imagePath, options),
  
  // 食物搜索
  searchFoodByName: (foodName, options) => aiService.searchFoodByName(foodName, options),
  
  // 营养数据解析
  parseNutritionResult: (aiResult) => aiService.parseNutritionResult(aiResult),
  
  // 营养数据
  getNutritionInfo: (foodName, existingNutrition) => aiService.getNutritionInfo(foodName, existingNutrition),
  
  // 工具方法（内置营养数据库）
  getBuiltInNutritionInfo: (foodName) => aiService.getBuiltInNutritionInfo(foodName),
  getDefaultNutritionInfo: () => aiService.getDefaultNutritionInfo(),
  
  // 实例
  service: aiService
};