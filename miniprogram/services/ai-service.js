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
    // 支持三种模式：auto（自动判断）、direct（直接调用）、secure（云函数安全模式）
    
    const mode = config.features.aiRecognition.mode || 'auto';
    
    // 如果明确指定模式，直接返回
    if (mode === 'direct') {
      console.log('使用直接调用模式（手动指定）');
      return false;
    }
    if (mode === 'secure') {
      console.log('使用云函数安全模式（手动指定）');
      return true;
    }
    
    // auto模式：根据环境自动判断
    const env = config.debug.enabled ? 'development' : 'production';
    
    // 如果有云环境配置，优先使用安全模式
    if (config.cloud && config.cloud.env) {
      console.log('检测到云环境配置，启用安全模式（云函数）');
      return true;
    }
    
    // 根据环境配置决定
    const envConfig = config.features.aiRecognition[env];
    if (envConfig) {
      const useSecure = env === 'production' ? 
        (envConfig.useSecureMode !== false) : 
        (envConfig.useSecureMode === true);
      console.log(`环境: ${env}, 使用${useSecure ? '安全模式' : '直接调用模式'}`);
      return useSecure;
    }
    
    // 默认：开发环境用直接调用，生产环境用安全模式
    console.log(`环境: ${env}, 使用${env === 'production' ? '安全模式' : '直接调用模式'}`);
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
      let usedService = '';
      
      // 2. 拍照功能只能使用百度AI进行食物识别，不允许降级
      if (this.useBaiduAI) {
        try {
          // 必须使用百度AI API进行食物识别
          console.log('使用百度AI进行食物识别');
          recognitionResult = await this.recognizeFoodWithBaidu(processedImage, options);
          usedService = 'baidu';
        } catch (baiduError) {
          console.error('百度AI识别失败:', baiduError.message);
          // 不允许降级到Deepseek进行图片识别
          throw new Error(`百度AI识别失败：${baiduError.message}`);
        }
      } else {
        // 如果没有配置百度AI，不能进行拍照识别
        throw new Error('拍照功能需要配置百度AI API密钥');
      }

      // 3. 解析识别结果
      const parsedResult = this.parseRecognitionResult(recognitionResult, options);

      // 4. 获取完整的食物分析（如果需要）- 使用统一的Deepseek分析
      if (options.getNutrition !== false) {
        console.log('拍照识别：使用统一的Deepseek完整分析:', parsedResult.foodName);
        const deepseekAnalysis = await this.getUnifiedFoodAnalysisFromDeepseek(parsedResult.foodName, 'photo');
        
        // 使用Deepseek的详细描述替换百度AI的简单描述
        if (deepseekAnalysis.description && deepseekAnalysis.description.length > 50) {
          parsedResult.description = deepseekAnalysis.description;
        }
        
        // 更新营养信息
        parsedResult.nutrition = deepseekAnalysis.nutrition || {};
        parsedResult.calorie = deepseekAnalysis.calorie || parsedResult.calorie;
        
        // 更新健康评分和建议
        parsedResult.healthScore = deepseekAnalysis.healthScore || 70;
        parsedResult.suggestions = deepseekAnalysis.suggestions || ['均衡饮食，多样化摄入'];
        parsedResult.tags = deepseekAnalysis.tags || ['百度AI识别', 'Deepseek详细分析'];
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
      
      // 转换为统一的格式，标记为拍照识别
      // 注意：百度AI的描述可能很简单，后续会用Deepseek的详细描述替换
      const unifiedResult = {
        result: [
          {
            name: baiduResult.foodName,
            probability: baiduResult.confidence,
            calorie: baiduResult.calorie,
            has_calorie: baiduResult.hasCalorie,
            baike_info: {
              description: baiduResult.description || `这是${baiduResult.foodName}，具体信息将由AI分析提供。`,
              image_url: baiduResult.baikeImageUrl
            }
          }
        ],
        // 百度AI不直接提供营养信息，需要后续获取
        nutrition: {},
        // 百度AI不直接提供健康评分和建议，使用默认值
        healthScore: 70,
        suggestions: ['均衡饮食，多样化摄入'],
        tags: ['百度AI识别'],
        searchType: 'photo', // 标记为拍照识别
        // 保存百度AI的原始信息，供后续使用
        baiduOriginalData: baiduResult
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
    
    // 根据选项确定来源和搜索类型
    const isPhotoRecognition = options.searchType === 'photo' || recognitionResult.searchType === 'photo';
    const source = isPhotoRecognition ? 'baidu_ai' : 'deepseek_search';
    const searchType = isPhotoRecognition ? 'photo' : 'text';
    
    // 基础信息
    // 优先使用Deepseek的详细描述，如果没有则使用百度AI的描述
    const description = recognitionResult.deepseekDescription || 
                       firstResult.baike_info?.description || 
                       '暂无描述';
    
    const result = {
      foodName: firstResult.name || '未知食物',
      description: description,
      calorie: firstResult.calorie || 0,
      confidence: firstResult.probability || 0,
      imageUrl: firstResult.baike_info?.image_url || '',
      searchType: searchType,
      source: source,
      // 百度AI特有字段（仅拍照识别时设置）
      hasCalorie: isPhotoRecognition ? (firstResult.has_calorie || false) : false,
      baikeUrl: isPhotoRecognition ? (firstResult.baike_info?.baike_url || '') : '',
      // 使用传入的营养信息（如果已提供）
      nutrition: recognitionResult.nutrition || {},
      healthScore: recognitionResult.healthScore || 70,
      suggestions: recognitionResult.suggestions || ['均衡饮食，多样化摄入'],
      tags: recognitionResult.tags || (isPhotoRecognition ? ['百度AI识别'] : ['文字搜索'])
    };
    
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
      
      // 搜索功能直接使用Deepseek API，不使用百度AI
      if (this.useDeepseekAPI) {
        // 使用Deepseek API搜索，获取完整结果（包含营养信息）
        console.log('文字搜索：使用Deepseek API获取完整食物信息');
        const deepseekResult = await this.deepseekService.searchFoodInfo(foodName, {
          getNutrition: true,
        // 使用统一的提示词确保一致性
        systemPrompt: `你是一个专业的营养师和食物专家。请详细分析以下食物：

食物名称：${foodName}

请提供以下完整信息：
1. 食物详细描述（100-200字，包括外观、口感、制作方法等）
2. 基础营养信息（每100克含量）
3. 健康评分（0-100分，基于营养价值和健康影响）
4. 食用建议（3-5条具体建议）
5. 相关标签（3-5个关键词）

请严格按照JSON格式返回：
{
  "foodName": "${foodName}",
  "description": "详细的食物描述...",
  "calorie": 数值,
  "nutrition": {
    "protein": 数值,
    "fat": 数值,
    "carbohydrate": 数值,
    "fiber": 数值,
    "vitamin": 数值,
    "mineral": 数值,
    "calcium": 数值,
    "iron": 数值,
    "zinc": 数值
  },
  "healthScore": 数值,
  "suggestions": ["具体建议1", "具体建议2", "具体建议3"],
  "tags": ["标签1", "标签2", "标签3"]
}`
        });
        
        if (!deepseekResult.success) {
          throw new Error(deepseekResult.error || 'Deepseek API搜索失败');
        }
        
        // 转换为统一的格式，使用Deepseek的完整描述
        searchResult = {
          result: [
            {
              name: deepseekResult.data.foodName || foodName,
              probability: deepseekResult.data.confidence || 0.9,
              calorie: deepseekResult.data.calorie || 0,
              has_calorie: !!(deepseekResult.data.calorie),
              baike_info: {
                description: deepseekResult.data.description || `这是${foodName}，具体信息将由AI分析提供。`,
                image_url: ''
              }
            }
          ],
          nutrition: deepseekResult.data.nutrition || {},
          healthScore: deepseekResult.data.healthScore || 70,
          suggestions: deepseekResult.data.suggestions || ['均衡饮食，多样化摄入'],
          tags: ['文字搜索', 'Deepseek详细分析'],
          searchType: 'text',
          // 保存Deepseek的完整描述
          deepseekDescription: deepseekResult.data.description
        };
      } else {
        // 如果没有配置Deepseek，使用内置数据库
        console.log('Deepseek API未配置，使用内置营养数据库搜索');
        searchResult = await this.searchFoodByText(foodName, options);
      }
      
      // 解析识别结果
      const parsedResult = this.parseRecognitionResult(searchResult, options);
      
      // 使用Deepseek返回的营养信息
      parsedResult.nutrition = searchResult.nutrition || {};
      parsedResult.healthScore = searchResult.healthScore || 70;
      parsedResult.suggestions = searchResult.suggestions || ['均衡饮食，多样化摄入'];
      parsedResult.tags = searchResult.tags || ['文字搜索', '内置数据库'];
      
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
      
      // 转换为与百度AI相似的格式，并标记为文字搜索
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
        tags: searchResult.data.tags,
        searchType: 'text' // 标记为文字搜索
      };
      
      return deepseekResult;
    } catch (error) {
      console.error('Deepseek API搜索失败:', error);
      // 抛出错误，不使用模拟数据
      throw error;
    }
  }

  /**
   * 使用内置数据库搜索食物（降级方案）
   * @param {string} foodName 食物名称
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async searchFoodByText(foodName, options = {}) {
    try {
      console.log('使用内置数据库搜索食物:', foodName);
      
      // 从内置营养数据库获取信息
      const nutritionInfo = this.getBuiltInNutritionInfo(foodName);
      
      // 创建模拟结果，标记为文字搜索
      const mockResult = {
        result: [
          {
            name: foodName,
            probability: 0.8,
            calorie: nutritionInfo.calories || 0,
            has_calorie: !!(nutritionInfo.calories),
            baike_info: {
              description: `这是${foodName}，营养信息来自内置数据库。`,
              image_url: ''
            }
          }
        ],
        nutrition: nutritionInfo,
        searchType: 'text' // 标记为文字搜索
      };
      
      return mockResult;
      
    } catch (error) {
      console.error('内置数据库搜索失败:', error);
      throw new Error('搜索功能暂时不可用');
    }
  }

  /**
   * 统一的Deepseek食物分析方法（用于拍照识别和文字搜索）
   * @param {string} foodName 食物名称
   * @param {string} sourceType 来源类型：'photo' 或 'text'
   * @returns {Promise} Promise对象
   */
  async getUnifiedFoodAnalysisFromDeepseek(foodName, sourceType = 'text') {
    try {
      if (!this.useDeepseekAPI) {
        console.warn('Deepseek API未配置，使用内置营养数据库');
        const nutritionInfo = this.getBuiltInNutritionInfo(foodName);
        return {
          nutrition: nutritionInfo,
          description: `这是${foodName}，营养信息来自内置数据库。`,
          healthScore: 70,
          suggestions: ['均衡饮食，多样化摄入'],
          tags: sourceType === 'photo' 
            ? ['百度AI识别', '内置数据库'] 
            : ['文字搜索', '内置数据库']
        };
      }
      
      console.log(`调用Deepseek API获取完整食物分析[${sourceType}]:`, foodName);
      
      // 统一的Deepseek调用，确保一致的食物分析
      const searchResult = await this.deepseekService.searchFoodInfo(foodName, {
        getNutrition: true,
        // 增强的提示词，要求详细的描述和完整的分析
        systemPrompt: `你是一个专业的营养师和食物专家。请详细分析以下食物：

食物名称：${foodName}

请提供以下完整信息：
1. 食物详细描述（100-200字，包括外观、口感、制作方法等）
2. 基础营养信息（每100克含量）
3. 健康评分（0-100分，基于营养价值和健康影响）
4. 食用建议（3-5条具体建议）
5. 相关标签（3-5个关键词）

请严格按照JSON格式返回：
{
  "foodName": "${foodName}",
  "description": "详细的食物描述...",
  "calorie": 数值,
  "nutrition": {
    "protein": 数值,
    "fat": 数值,
    "carbohydrate": 数值,
    "fiber": 数值,
    "vitamin": 数值,
    "mineral": 数值,
    "calcium": 数值,
    "iron": 数值,
    "zinc": 数值
  },
  "healthScore": 数值,
  "suggestions": ["具体建议1", "具体建议2", "具体建议3"],
  "tags": ["标签1", "标签2", "标签3"]
}`
      });
      
      if (searchResult.success && searchResult.data) {
        const data = searchResult.data;
        return {
          // 完整的食物信息
          description: data.description || `这是${foodName}，一种常见的食物。`,
          calorie: data.calorie || 0,
          // 基础营养信息
          nutrition: {
            protein: data.nutrition?.protein || 0,
            fat: data.nutrition?.fat || 0,
            carbohydrate: data.nutrition?.carbohydrate || 0,
            fiber: data.nutrition?.fiber || 0,
            vitamin: data.nutrition?.vitamin || 0,
            mineral: data.nutrition?.mineral || 0,
            calcium: data.nutrition?.calcium || 0,
            iron: data.nutrition?.iron || 0,
            zinc: data.nutrition?.zinc || 0,
            // 其他可能存在的营养信息
            water: data.nutrition?.water || 0,
            sugar: data.nutrition?.sugar || 0,
            cholesterol: data.nutrition?.cholesterol || 0
          },
          // Deepseek特有信息
          healthScore: data.healthScore || 70,
          suggestions: data.suggestions || ['均衡饮食，多样化摄入'],
          tags: sourceType === 'photo' 
            ? ['百度AI识别', 'Deepseek详细分析'] 
            : ['文字搜索', 'Deepseek详细分析']
        };
      } else {
        throw new Error(searchResult.error || 'Deepseek API返回失败');
      }
      
    } catch (error) {
      console.error('从Deepseek获取食物分析失败:', error);
      // 降级到内置营养数据库
      const nutritionInfo = this.getBuiltInNutritionInfo(foodName);
      return {
        nutrition: nutritionInfo,
        description: `这是${foodName}，具体信息暂时无法获取。`,
        healthScore: 70,
        suggestions: ['均衡饮食，多样化摄入'],
        tags: sourceType === 'photo' 
          ? ['百度AI识别', '分析失败'] 
          : ['文字搜索', '分析失败']
      };
    }
  }

  /**
   * 从Deepseek获取营养信息（专门用于百度AI识别后的营养分析）
   * @param {string} foodName 食物名称
   * @returns {Promise} Promise对象
   */
  async getNutritionInfoFromDeepseek(foodName) {
    // 使用统一的Deepseek分析方法，标记为拍照识别
    const analysis = await this.getUnifiedFoodAnalysisFromDeepseek(foodName, 'photo');
    return analysis.nutrition;
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
        // 百度AI识别后，使用Deepseek获取营养信息
        return await this.getNutritionInfoFromDeepseek(foodName);
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

    // 精确匹配优先
    const foodNameLower = foodName.toLowerCase();
    
    // 1. 首先尝试精确匹配
    for (const [key, value] of Object.entries(nutritionMap)) {
      if (foodNameLower === key.toLowerCase()) {
        return value;
      }
    }
    
    // 2. 如果精确匹配失败，尝试包含匹配，但避免误匹配
    // 例如："苹果派"不应该匹配到"苹果"
    const commonFoodKeywords = {
      '苹果': ['苹果', '红富士', '青苹果', '苹果果'],
      '香蕉': ['香蕉', '芭蕉'],
      '米饭': ['米饭', '白米饭', '大米饭'],
      '鸡蛋': ['鸡蛋', '蛋', '鸡蛋羹'],
      '牛肉': ['牛肉', '牛排', '牛肉片'],
      '鸡肉': ['鸡肉', '鸡胸肉', '鸡腿'],
      '鱼肉': ['鱼肉', '鱼', '鱼肉片'],
      '面包': ['面包', '吐司', '面包片'],
      '牛奶': ['牛奶', '鲜奶', '纯牛奶'],
      '蔬菜': ['蔬菜', '青菜', '叶菜']
    };
    
    for (const [foodKey, keywords] of Object.entries(commonFoodKeywords)) {
      for (const keyword of keywords) {
        // 使用正则表达式确保是完整的单词匹配，避免部分匹配
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`);
        if (regex.test(foodNameLower) && nutritionMap[foodKey]) {
          return nutritionMap[foodKey];
        }
      }
    }
    
    // 3. 如果以上都失败，根据食物类别返回通用营养信息
    return this.getNutritionByCategory(foodNameLower);
  }

  /**
   * 根据食物类别获取通用营养信息
   * @param {string} foodNameLower 小写的食物名称
   * @returns {Object} 通用营养信息
   */
  getNutritionByCategory(foodNameLower) {
    // 食物类别映射
    const categoryMap = {
      '水果': {
        protein: 0.5, fat: 0.3, carbohydrate: 15, fiber: 2.0, calories: 60,
        water: 85, vitaminC: 30, potassium: 200, calcium: 10, iron: 0.3,
        vitaminA: 50, vitaminE: 0.5, sodium: 2, magnesium: 10, phosphorus: 20,
        sugar: 12, cholesterol: 0
      },
      '蔬菜': {
        protein: 2.0, fat: 0.2, carbohydrate: 5.0, fiber: 2.0, calories: 25,
        water: 90, vitaminC: 20, vitaminA: 500, vitaminK: 50, folate: 40,
        calcium: 30, iron: 1.0, potassium: 200, sodium: 20, magnesium: 15,
        phosphorus: 25, zinc: 0.3, cholesterol: 0
      },
      '肉类': {
        protein: 20, fat: 10, carbohydrate: 0, fiber: 0, calories: 200,
        water: 60, vitaminB12: 2.0, vitaminB6: 0.3, niacin: 5.0, iron: 2.0,
        zinc: 4.0, potassium: 300, sodium: 70, magnesium: 20, phosphorus: 200,
        selenium: 20, cholesterol: 80
      },
      '主食': {
        protein: 3.0, fat: 1.0, carbohydrate: 25, fiber: 1.0, calories: 120,
        water: 70, vitaminB1: 0.1, vitaminB2: 0.05, vitaminB3: 1.5, iron: 1.0,
        calcium: 20, potassium: 100, sodium: 5, magnesium: 15, phosphorus: 50,
        zinc: 0.8, cholesterol: 0
      },
      '蛋奶': {
        protein: 10, fat: 5, carbohydrate: 3, fiber: 0, calories: 100,
        water: 80, vitaminA: 100, vitaminD: 1.0, vitaminB2: 0.2, vitaminB12: 0.5,
        calcium: 100, potassium: 150, sodium: 50, magnesium: 10, phosphorus: 100,
        zinc: 1.0, cholesterol: 200
      }
    };
    
    // 判断食物类别
    if (foodNameLower.includes('果') || foodNameLower.includes('莓') || 
        foodNameLower.includes('瓜') || foodNameLower.includes('桃') ||
        foodNameLower.includes('梨') || foodNameLower.includes('葡萄')) {
      return categoryMap['水果'];
    } else if (foodNameLower.includes('菜') || foodNameLower.includes('蔬') ||
               foodNameLower.includes('豆') || foodNameLower.includes('菇')) {
      return categoryMap['蔬菜'];
    } else if (foodNameLower.includes('肉') || foodNameLower.includes('鱼') ||
               foodNameLower.includes('虾') || foodNameLower.includes('蟹')) {
      return categoryMap['肉类'];
    } else if (foodNameLower.includes('饭') || foodNameLower.includes('面') ||
               foodNameLower.includes('饼') || foodNameLower.includes('包') ||
               foodNameLower.includes('饺') || foodNameLower.includes('馄')) {
      return categoryMap['主食'];
    } else if (foodNameLower.includes('蛋') || foodNameLower.includes('奶') ||
               foodNameLower.includes('酪') || foodNameLower.includes('酸奶')) {
      return categoryMap['蛋奶'];
    }
    
    // 默认返回通用营养信息
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
        description: record.description || '',
        calorie: record.calorie || 0,
        confidence: record.confidence || 0,
        imageUrl: imagePath || record.imageUrl || '',
        nutrition: record.nutrition || {},
        searchType: 'photo',
        timestamp: new Date().getTime(),
        source: 'ai_recognition',
        // 额外信息
        healthScore: record.healthScore || 70,
        suggestions: record.suggestions || [],
        tags: record.tags || ['AI识别']
      };
      
      const result = await dataService.saveRecognitionRecord(recognitionRecord);
      console.log('保存识别记录成功:', result);
      return result;
    } catch (error) {
      console.error('保存识别记录失败:', error);
      return { success: false, error: error.message };
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
        description: record.description || '',
        calorie: record.calorie || 0,
        confidence: record.confidence || 0.9,
        imageUrl: record.imageUrl || '',
        nutrition: record.nutrition || {},
        searchType: 'text',
        timestamp: new Date().getTime(),
        source: 'text_search',
        // 额外信息
        healthScore: record.healthScore || 70,
        suggestions: record.suggestions || [],
        tags: record.tags || ['文字搜索']
      };
      
      const result = await dataService.saveRecognitionRecord(searchRecord);
      console.log('保存搜索记录成功:', result);
      return result;
    } catch (error) {
      console.error('保存搜索记录失败:', error);
      return { success: false, error: error.message };
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