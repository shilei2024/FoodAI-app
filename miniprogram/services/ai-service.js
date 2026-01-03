// services/ai-service.js
const config = require('../constants/config.js');
const api = require('../utils/api.js');
const imageUtils = require('../utils/image.js');
const dataService = require('./data-service.js');
const deepseekService = require('./deepseek-service.js');
const secureAIService = require('./secure-ai-service.js');
const baiduAIService = require('./baidu-ai-service.js');

/**
 * AI服务类
 * 支持两种模式：
 * 1. 直接调用模式（开发环境，API密钥暴露）
 * 2. 云函数模式（生产环境，API密钥受保护）
 * 
 * 注意：生产环境强烈建议使用云函数模式保护API密钥
 */
class AIService {
  constructor() {
    this.baiduAI = config.baiduAI;
    this.deepseekAI = config.deepseekAI;
    this.api = api;
    this.imageUtils = imageUtils;
    this.deepseekService = deepseekService;
    this.secureAIService = secureAIService;
    this.baiduAIService = baiduAIService;
    
    // 配置运行模式
    this.useSecureMode = this.shouldUseSecureMode();
    this.useDeepseekAPI = true;
    this.useBaiduAI = false; // 默认不使用百度AI
    
    // 检查百度AI配置
    if (this.baiduAI.apiKey && this.baiduAI.secretKey) {
      this.useBaiduAI = true;
      console.log('百度AI配置检测成功，已启用百度AI服务');
    }
    
    console.log(`AI服务模式: ${this.useSecureMode ? '安全模式（云函数）' : '直接调用模式'}`);
    console.log(`AI服务选择: ${this.useBaiduAI ? '百度AI' : 'Deepseek API'}`);
  }
  
  /**
   * 判断是否使用安全模式
   * @returns {boolean} 是否使用安全模式
   */
  shouldUseSecureMode() {
    // 根据配置决定使用哪种模式
    // 生产环境建议使用安全模式
    const env = config.debug.enabled ? 'development' : 'production';
    
    // 如果有云环境配置，优先使用安全模式
    if (config.cloud && config.cloud.env) {
      return true;
    }
    
    // 开发环境可以使用直接调用模式
    return env === 'production';
  }

  /**
   * 识别食物图片
   * @param {string} imagePath 图片路径
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async recognizeFood(imagePath, options = {}) {
    try {
      // 根据模式选择不同的实现
      if (this.useSecureMode) {
        // 安全模式：使用云函数
        return await this.secureAIService.recognizeFood(imagePath, options);
      } else {
        // 直接调用模式
        return await this.recognizeFoodDirect(imagePath, options);
      }
    } catch (error) {
      console.error('识别食物图片失败:', error);
      throw error;
    }
  }
  
  /**
   * 直接调用模式识别食物图片
   * @param {string} imagePath 图片路径
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async recognizeFoodDirect(imagePath, options = {}) {
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
      if (this.useBaiduAI) {
        // 使用百度AI API
        console.log('使用百度AI进行食物识别');
        recognitionResult = await this.recognizeFoodWithBaidu(processedImage, options);
      } else if (this.useDeepseekAPI) {
        // 使用Deepseek API
        console.log('使用Deepseek API进行食物识别');
        recognitionResult = await this.recognizeFoodWithDeepseek(processedImage, options);
      } else {
        // 降级到内置数据库
        throw new Error('未配置任何AI服务，请配置百度AI或Deepseek API密钥');
      }

      // 3. 解析识别结果
      const parsedResult = this.parseRecognitionResult(recognitionResult, options);

      // 4. 获取营养信息（如果需要）
      if (options.getNutrition !== false) {
        const source = this.useBaiduAI ? 'baidu_ai' : 'deepseek';
        const nutritionInfo = await this.getNutritionInfo(parsedResult.foodName, parsedResult.nutrition, source);
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
    try {
      console.log('使用百度AI识别食物图片...');
      
      // 调用百度AI服务
      const recognitionResult = await this.baiduAIService.recognizeFood(imagePath, options);
      
      if (!recognitionResult.success) {
        throw new Error(recognitionResult.error || '百度AI识别失败');
      }
      
      // 百度AI返回的数据格式
      const baiduResult = recognitionResult.data;
      
      // 转换为统一的格式
      const unifiedResult = {
        result: [
          {
            name: baiduResult.foodName,
            probability: baiduResult.confidence,
            calorie: baiduResult.calorie,
            has_calorie: baiduResult.hasCalorie,
            baike_info: {
              description: baiduResult.description,
              image_url: baiduResult.baikeImageUrl
            }
          }
        ],
        // 百度AI不直接提供营养信息，需要后续获取
        nutrition: {},
        // 百度AI不直接提供健康评分和建议，使用默认值
        healthScore: 70,
        suggestions: ['均衡饮食，多样化摄入'],
        tags: ['百度AI识别']
      };
      
      return unifiedResult;
      
    } catch (error) {
      console.error('百度AI识别失败:', error);
      
      // 提供更友好的错误提示
      let errorMessage = error.message;
      if (error.message.includes('API密钥未配置')) {
        errorMessage = '百度AI API密钥未配置。\n\n请在 constants/config.js 中配置：\n1. 访问 https://ai.baidu.com/\n2. 获取 API Key 和 Secret Key\n3. 配置到 baiduAI.apiKey 和 baiduAI.secretKey';
      } else if (error.message.includes('网络')) {
        errorMessage = '网络连接失败，请检查网络设置';
      } else if (error.message.includes('未识别到食物')) {
        errorMessage = '未识别到食物，请尝试重新拍照或选择更清晰的食物图片';
      }
      
      throw new Error(errorMessage);
    }
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
    
    // 确定来源
    const source = recognitionResult.tags?.includes('百度AI识别') ? 'baidu_ai' : 'deepseek_ai';
    
    // 基础信息
    const result = {
      foodName: firstResult.name || '未知食物',
      description: firstResult.baike_info?.description || '暂无描述',
      calorie: firstResult.calorie || 0,
      confidence: firstResult.probability || 0,
      imageUrl: firstResult.baike_info?.image_url || '',
      searchType: 'photo',
      source: source
    };
    
    // 处理百度AI特有的字段
    if (source === 'baidu_ai') {
      result.hasCalorie = firstResult.has_calorie || false;
      result.baikeUrl = firstResult.baike_info?.baike_url || '';
      
      // 百度AI不直接提供营养信息，使用默认值
      result.nutrition = recognitionResult.nutrition || {};
      result.healthScore = recognitionResult.healthScore || 70;
      result.suggestions = recognitionResult.suggestions || ['均衡饮食，多样化摄入'];
      result.tags = recognitionResult.tags || ['百度AI识别'];
      
    } else {
      // Deepseek AI的结果
      result.nutrition = recognitionResult.nutrition || {};
      result.healthScore = recognitionResult.healthScore || 70;
      result.suggestions = recognitionResult.suggestions || [];
      result.tags = recognitionResult.tags || [];
    }
    
    return result;
  }

  /**
   * 搜索食物信息
   * @param {string} foodName 食物名称
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async searchFoodByName(foodName, options = {}) {
    try {
      // 根据模式选择不同的实现
      if (this.useSecureMode) {
        // 安全模式：使用云函数
        return await this.secureAIService.searchFood(foodName, options);
      } else {
        // 直接调用模式
        return await this.searchFoodDirect(foodName, options);
      }
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
   * 直接调用模式搜索食物
   * @param {string} foodName 食物名称
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async searchFoodDirect(foodName, options = {}) {
    try {
      let searchResult;
      
      // 根据配置选择AI服务
      if (this.useBaiduAI) {
        // 使用百度AI搜索
        console.log('使用百度AI搜索食物');
        searchResult = await this.searchFoodByText(foodName, options);
      } else if (this.useDeepseekAPI) {
        // 使用Deepseek API搜索
        console.log('使用Deepseek API搜索食物');
        searchResult = await this.searchFoodWithDeepseek(foodName, options);
      } else {
        // 降级到内置数据库
        throw new Error('未配置任何AI服务，请配置百度AI或Deepseek API密钥');
      }
      
      // 解析识别结果
      const parsedResult = this.parseRecognitionResult(searchResult, options);
      
      // 获取营养信息（如果需要）
      if (options.getNutrition !== false) {
        const source = this.useBaiduAI ? 'baidu_ai' : 'deepseek';
        const nutritionInfo = await this.getNutritionInfo(parsedResult.foodName, parsedResult.nutrition, source);
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
      throw error;
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
    try {
      console.log('使用百度AI搜索食物:', foodName);
      
      // 百度AI没有专门的文字搜索API，我们可以使用通用物体识别
      // 或者直接返回一个模拟结果，然后使用Deepseek获取营养信息
      
      // 这里我们创建一个模拟的百度AI格式结果
      const mockBaiduResult = {
        result: [
          {
            name: foodName,
            probability: 0.9,
            calorie: 0, // 需要后续获取
            has_calorie: false,
            baike_info: {
              description: `这是${foodName}，具体营养信息请参考专业数据库。`,
              image_url: ''
            }
          }
        ]
      };
      
      return mockBaiduResult;
      
    } catch (error) {
      console.error('百度AI搜索失败:', error);
      throw new Error('百度AI搜索功能暂时不可用，请使用Deepseek API或内置数据库');
    }
  }

  /**
   * 获取营养信息
   * @param {string} foodName 食物名称
   * @param {Object} existingNutrition 现有营养数据
   * @param {string} source 数据来源
   * @returns {Promise} Promise对象
   */
  async getNutritionInfo(foodName, existingNutrition = null, source = 'deepseek') {
    try {
      // 如果已经有营养数据，直接使用
      if (existingNutrition && Object.keys(existingNutrition).length > 0) {
        return existingNutrition;
      }
      
      // 根据来源选择获取方式
      if (source === 'baidu_ai') {
        // 百度AI识别后，使用Deepseek获取营养信息（如果可用）
        if (this.useDeepseekAPI) {
          console.log('百度AI识别后，使用Deepseek获取营养信息:', foodName);
          const searchResult = await this.deepseekService.searchFoodInfo(foodName, {
            getNutrition: true
          });
          
          if (searchResult.success && searchResult.data.nutrition) {
            return searchResult.data.nutrition;
          }
        }
        
        // 降级到内置营养数据库
        console.log('使用内置营养数据库查询:', foodName);
        return this.getBuiltInNutritionInfo(foodName);
        
      } else {
        // Deepseek AI的结果
        if (this.useDeepseekAPI) {
          const searchResult = await this.deepseekService.searchFoodInfo(foodName, {
            getNutrition: true
          });
          
          if (searchResult.success && searchResult.data.nutrition) {
            return searchResult.data.nutrition;
          }
        }
        
        // 降级到内置营养数据库
        console.log('使用内置营养数据库查询:', foodName);
        return this.getBuiltInNutritionInfo(foodName);
      }
      
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
  
  /**
   * 健康检查
   * @returns {Promise<Object>} 健康状态
   */
  async healthCheck() {
    try {
      if (this.useSecureMode) {
        return await this.secureAIService.healthCheck();
      } else {
        // 直接调用模式的健康检查
        const hasDeepseekKey = !!this.deepseekAI.apiKey && this.deepseekAI.apiKey !== '';
        const hasBaiduKey = !!this.baiduAI.apiKey && this.baiduAI.apiKey !== '';
        
        return {
          success: true,
          data: {
            mode: 'direct',
            deepseekConfigured: hasDeepseekKey,
            baiduConfigured: hasBaiduKey,
            timestamp: Date.now()
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 获取使用统计
   * @returns {Promise<Object>} 使用统计
   */
  async getUsageStats() {
    try {
      if (this.useSecureMode) {
        return await this.secureAIService.getUsageStats();
      } else {
        // 直接调用模式的使用统计
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 这里可以添加本地使用统计逻辑
        return {
          success: true,
          data: {
            mode: 'direct',
            todayCount: 0, // 需要实现本地统计
            totalCount: 0,
            timestamp: Date.now()
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 切换运行模式（用于测试）
   * @param {boolean} useSecureMode 是否使用安全模式
   */
  setMode(useSecureMode) {
    this.useSecureMode = useSecureMode;
    console.log(`AI服务模式已切换为: ${this.useSecureMode ? '安全模式（云函数）' : '直接调用模式'}`);
  }
  
  /**
   * 切换AI服务（用于测试）
   * @param {string} service 服务名称：'baidu' 或 'deepseek'
   */
  setAIService(service) {
    if (service === 'baidu') {
      this.useBaiduAI = true;
      this.useDeepseekAPI = false;
      console.log('AI服务已切换为: 百度AI');
    } else if (service === 'deepseek') {
      this.useBaiduAI = false;
      this.useDeepseekAPI = true;
      console.log('AI服务已切换为: Deepseek API');
    } else {
      console.warn('未知的AI服务:', service);
    }
  }
  
  /**
   * 测试百度AI连接
   * @returns {Promise<Object>} 测试结果
   */
  async testBaiduAIConnection() {
    try {
      console.log('测试百度AI连接...');
      
      // 检查配置
      if (!this.baiduAI.apiKey || !this.baiduAI.secretKey) {
        return {
          success: false,
          error: '百度AI API密钥未配置',
          configured: false
        };
      }
      
      // 测试获取access_token
      const token = await this.baiduAIService.getAccessToken();
      
      return {
        success: true,
        configured: true,
        tokenValid: !!token,
        message: '百度AI连接测试成功',
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('百度AI连接测试失败:', error);
      
      return {
        success: false,
        configured: true,
        error: error.message,
        message: '百度AI连接测试失败',
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * 获取AI服务状态
   * @returns {Object} 服务状态
   */
  getServiceStatus() {
    return {
      baiduAI: {
        configured: !!(this.baiduAI.apiKey && this.baiduAI.secretKey),
        enabled: this.useBaiduAI,
        apiKey: this.baiduAI.apiKey ? '已配置' : '未配置',
        secretKey: this.baiduAI.secretKey ? '已配置' : '未配置'
      },
      deepseekAI: {
        configured: !!(this.deepseekAI.apiKey),
        enabled: this.useDeepseekAPI,
        apiKey: this.deepseekAI.apiKey ? '已配置' : '未配置'
      },
      currentService: this.useBaiduAI ? '百度AI' : (this.useDeepseekAPI ? 'Deepseek API' : '无'),
      secureMode: this.useSecureMode,
      timestamp: Date.now()
    };
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
  
  // 安全功能
  healthCheck: () => aiService.healthCheck(),
  getUsageStats: () => aiService.getUsageStats(),
  setMode: (useSecureMode) => aiService.setMode(useSecureMode),
  
  // 测试和调试
  testBaiduAIConnection: () => aiService.testBaiduAIConnection(),
  getServiceStatus: () => aiService.getServiceStatus(),
  setAIService: (service) => aiService.setAIService(service),
  
  // 实例
  service: aiService
};