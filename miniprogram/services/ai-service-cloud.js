// services/ai-service-cloud.js
const config = require('../constants/config.js');
const imageUtils = require('../utils/image.js');
const dataService = require('./data-service.js');

/**
 * AI服务类（云开发版本）
 * 通过云函数调用AI服务，保护API密钥
 */
class AIServiceCloud {
  constructor() {
    this.imageUtils = imageUtils;
    this.useCloudFunction = true;
  }

  /**
   * 识别食物图片（通过云函数）
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

      // 2. 将图片转换为base64
      const imageBase64 = await this.imageUtils.getImageBase64(processedImage);
      
      // 3. 调用云函数进行食物识别
      const recognitionResult = await this.callCloudFunction('baidu-ai', {
        action: 'recognizeFood',
        data: {
          image: imageBase64
        },
        options: {
          top_num: options.top_num || 5,
          filter_threshold: options.filter_threshold || 0.7,
          baike_num: options.baike_num || 1
        }
      });

      // 4. 解析识别结果
      const parsedResult = this.parseRecognitionResult(recognitionResult, options);

      // 5. 获取营养信息（如果需要）
      if (options.getNutrition !== false) {
        const nutritionInfo = await this.getNutritionInfo(parsedResult.foodName, parsedResult.nutrition);
        parsedResult.nutrition = nutritionInfo;
      }

      // 6. 保存识别记录（如果需要）
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
   * 搜索食物信息（通过云函数）
   * @param {string} foodName 食物名称
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async searchFoodByName(foodName, options = {}) {
    try {
      // 1. 调用云函数进行食物搜索
      const searchResult = await this.callCloudFunction('food-search', {
        action: 'searchFood',
        data: {
          foodName: foodName
        },
        options: options
      });

      // 2. 解析识别结果
      const parsedResult = this.parseRecognitionResult(searchResult, options);
      
      // 3. 获取营养信息（如果需要）
      if (options.getNutrition !== false) {
        const nutritionInfo = await this.getNutritionInfo(parsedResult.foodName, parsedResult.nutrition);
        parsedResult.nutrition = nutritionInfo;
      }
      
      // 4. 保存搜索记录（如果需要）
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
   * 调用云函数
   * @param {string} functionName 云函数名称
   * @param {Object} data 调用数据
   * @returns {Promise} Promise对象
   */
  async callCloudFunction(functionName, data) {
    try {
      if (!wx.cloud) {
        throw new Error('云开发未初始化，请检查配置');
      }

      const result = await wx.cloud.callFunction({
        name: functionName,
        data: data
      });

      if (result.result && result.result.success) {
        return result.result.data;
      } else {
        throw new Error(result.result?.message || '云函数调用失败');
      }
    } catch (error) {
      console.error(`调用云函数 ${functionName} 失败:`, error);
      throw error;
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
   * 获取营养信息
   * @param {string} foodName 食物名称
   * @param {Object} existingNutrition 现有营养数据
   * @returns {Promise} Promise对象
   */
  async getNutritionInfo(foodName, existingNutrition = null) {
    try {
      // 如果已经有营养数据，直接使用
      if (existingNutrition && Object.keys(existingNutrition).length > 0) {
        return existingNutrition;
      }
      
      // 调用云函数获取营养信息
      const nutritionResult = await this.callCloudFunction('nutrition-analysis', {
        action: 'getNutrition',
        data: {
          foodName: foodName
        }
      });
      
      if (nutritionResult && Object.keys(nutritionResult).length > 0) {
        return nutritionResult;
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
const aiServiceCloud = new AIServiceCloud();

// 导出模块
module.exports = {
  // 食物识别
  recognizeFood: (imagePath, options) => aiServiceCloud.recognizeFood(imagePath, options),
  
  // 食物搜索
  searchFoodByName: (foodName, options) => aiServiceCloud.searchFoodByName(foodName, options),
  
  // 营养数据解析
  parseNutritionResult: (aiResult) => aiServiceCloud.parseNutritionResult(aiResult),
  
  // 营养数据
  getNutritionInfo: (foodName, existingNutrition) => aiServiceCloud.getNutritionInfo(foodName, existingNutrition),
  
  // 工具方法（内置营养数据库）
  getBuiltInNutritionInfo: (foodName) => aiServiceCloud.getBuiltInNutritionInfo(foodName),
  getDefaultNutritionInfo: () => aiServiceCloud.getDefaultNutritionInfo(),
  
  // 实例
  service: aiServiceCloud
};
