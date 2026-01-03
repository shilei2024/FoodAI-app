// services/recipe-service.js
// 食谱生成服务

const config = require('../constants/config.js')
const api = require('../utils/api.js')
const auth = require('../utils/auth.js')

/**
 * 食谱服务类
 */
class RecipeService {
  constructor() {
    this.config = config
    this.api = api
    this.auth = auth
  }

  /**
   * 生成个性化食谱
   */
  async generateRecipe(foodHistory, userGoal) {
    try {
      // 准备数据
      const recipeData = {
        foodHistory: this.formatFoodHistory(foodHistory),
        userGoal: userGoal,
        preferences: this.getUserPreferences()
      }

      // 尝试使用AI生成食谱
      const recipe = await this.generateAIRecipe(recipeData)

      return {
        success: true,
        data: recipe,
        message: '食谱生成成功'
      }

    } catch (error) {
      console.error('生成食谱失败:', error)
      return {
        success: false,
        error: error.message,
        code: error.code || -1
      }
    }
  }

  /**
   * 格式化食物历史
   */
  formatFoodHistory(foodHistory) {
    if (!foodHistory || foodHistory.length === 0) {
      return { breakfast: '未记录', lunch: '未记录', snacks: [] }
    }

    const meals = { breakfast: [], lunch: [], snacks: [] }
    foodHistory.forEach(food => {
      const mealType = food.mealType || 'snacks'
      if (meals[mealType]) {
        meals[mealType].push({
          name: food.foodName,
          calories: food.calorie?.value || 0
        })
      }
    })

    return {
      breakfast: meals.breakfast.map(f => `${f.name}`).join('、') || '未记录',
      lunch: meals.lunch.map(f => `${f.name}`).join('、') || '未记录',
      snacks: meals.snacks
    }
  }

  /**
   * 获取用户偏好
   */
  getUserPreferences() {
    return wx.getStorageSync('user_preferences') || {
      cuisine: '中式',
      dietType: '均衡',
      spiceLevel: '中等'
    }
  }

  /**
   * 使用AI生成食谱
   */
  async generateAIRecipe(recipeData) {
    try {
      // 检查Deepseek配置
      const deepseekService = require('./deepseek-service.js')
      const config = require('../constants/config.js')
      
      if (!config.deepseekAI.apiKey) {
        throw new Error('AI食谱生成功能需要配置Deepseek API密钥。\n\n请在 constants/config.js 中配置 deepseekAI.apiKey\n\n访问 https://platform.deepseek.com/ 获取API密钥。\n\n配置完成后，您将获得基于AI的个性化食谱推荐。')
      }
      
      // 构建AI提示
      const { foodHistory, userGoal, preferences } = recipeData
      const prompt = `请根据以下信息生成一份个性化晚餐食谱：

用户目标：${userGoal.goal || '健康饮食'}
今日饮食记录：
  - 早餐：${foodHistory.breakfast}
  - 午餐：${foodHistory.lunch}
饮食偏好：${preferences.cuisine}，${preferences.dietType}

请生成一份详细的晚餐食谱，包含：
1. 菜品名称
2. 食材清单（含用量）
3. 详细步骤
4. 烹饪时间和难度
5. 营养信息（热量、蛋白质、脂肪、碳水）
6. 购物清单
7. 烹饪小贴士

请严格按照以下JSON格式返回：
{
  "dinner": {
    "name": "菜品名称",
    "description": "简短描述",
    "ingredients": [{"name": "食材", "amount": "数量", "unit": "单位"}],
    "steps": ["步骤1", "步骤2"],
    "cookingTime": "时间",
    "difficulty": "难度"
  },
  "nutrition": {
    "calories": "热量 kcal",
    "protein": "蛋白质 g",
    "fat": "脂肪 g",
    "carbohydrate": "碳水 g"
  },
  "shoppingList": ["食材1", "食材2"],
  "tips": ["提示1", "提示2"]
}`
      
      // 调用Deepseek API
      const messages = [
        {
          role: 'system',
          content: '你是一位专业的营养师和厨师，擅长根据用户的饮食历史和目标，生成个性化、营养均衡的食谱。'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
      
      const response = await deepseekService.service.callDeepseekAPI(messages, {
        temperature: 0.7,
        maxTokens: 2000,
        response_format: { type: "json_object" }
      })
      
      // 解析响应
      const content = response.choices[0].message.content
      const recipeResult = JSON.parse(content)
      
      // 添加元数据
      return {
        ...recipeResult,
        id: `recipe_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        userGoal: userGoal,
        method: 'ai_generated'
      }
      
    } catch (error) {
      console.error('AI生成食谱失败:', error)
      // 如果AI生成失败，使用内置食谱模板
      console.log('降级使用内置食谱模板')
      return this.getBuiltInRecipe(recipeData)
    }
  }

  /**
   * 获取内置食谱模板（作为降级方案）
   */
  getBuiltInRecipe(recipeData) {
    const { userGoal } = recipeData

    // 根据目标选择食谱模板
    let recipe
    if (userGoal.goal === '减脂') {
      recipe = this.getWeightLossRecipe()
    } else if (userGoal.goal === '增肌') {
      recipe = this.getMuscleGainRecipe()
    } else {
      recipe = this.getHealthyRecipe()
    }

    // 添加元数据
    return {
      ...recipe,
      id: `recipe_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      userGoal: userGoal,
      method: 'built_in_template'
    }
  }

  /**
   * 减脂食谱
   */
  getWeightLossRecipe() {
    return {
      dinner: {
        name: '清蒸鲈鱼配西兰花',
        description: '低脂高蛋白的健康晚餐',
        ingredients: [
          { name: '鲈鱼', amount: '1', unit: '条' },
          { name: '西兰花', amount: '200', unit: '克' },
          { name: '姜', amount: '20', unit: '克' },
          { name: '葱', amount: '2', unit: '根' }
        ],
        steps: [
          '鲈鱼清洗干净',
          '姜葱放在鱼身上',
          '水开后蒸8-10分钟',
          '西兰花焯水2分钟'
        ],
        cookingTime: '20分钟',
        difficulty: '简单'
      },
      nutrition: {
        calories: '350 kcal',
        protein: '35g',
        fat: '12g',
        carbohydrate: '15g'
      },
      shoppingList: ['鲈鱼', '西兰花', '生姜', '小葱'],
      tips: ['蒸鱼时间不宜过长', '西兰花焯水加盐保持翠绿']
    }
  }

  /**
   * 增肌食谱
   */
  getMuscleGainRecipe() {
    return {
      dinner: {
        name: '香煎鸡胸肉配糙米饭',
        description: '高蛋白复合碳水组合',
        ingredients: [
          { name: '鸡胸肉', amount: '200', unit: '克' },
          { name: '糙米', amount: '100', unit: '克' },
          { name: '西兰花', amount: '150', unit: '克' }
        ],
        steps: [
          '糙米浸泡2小时，煮熟',
          '鸡胸肉切片腌制',
          '煎鸡胸肉至金黄',
          '西兰花焯水'
        ],
        cookingTime: '30分钟',
        difficulty: '中等'
      },
      nutrition: {
        calories: '550 kcal',
        protein: '45g',
        fat: '15g',
        carbohydrate: '60g'
      },
      shoppingList: ['鸡胸肉', '糙米', '西兰花'],
      tips: ['鸡胸肉腌制更入味', '糙米浸泡后更易熟']
    }
  }

  /**
   * 健康食谱
   */
  getHealthyRecipe() {
    return {
      dinner: {
        name: '番茄牛腩煲',
        description: '营养均衡的家常菜',
        ingredients: [
          { name: '牛腩', amount: '300', unit: '克' },
          { name: '番茄', amount: '3', unit: '个' },
          { name: '土豆', amount: '1', unit: '个' }
        ],
        steps: [
          '牛腩焯水',
          '番茄去皮切块',
          '炖煮1小时',
          '加入蔬菜继续炖'
        ],
        cookingTime: '1.5小时',
        difficulty: '中等'
      },
      nutrition: {
        calories: '480 kcal',
        protein: '30g',
        fat: '18g',
        carbohydrate: '50g'
      },
      shoppingList: ['牛腩', '番茄', '土豆'],
      tips: ['牛腩焯水去腥', '番茄去皮更易炖烂']
    }
  }

  /**
   * 获取食谱历史
   */
  getRecipeHistory() {
    return wx.getStorageSync('recipe_history') || []
  }

  /**
   * 保存食谱
   */
  saveRecipe(recipe) {
    const history = this.getRecipeHistory()
    history.unshift(recipe)
    
    // 限制数量
    if (history.length > 20) {
      history.splice(20)
    }
    
    wx.setStorageSync('recipe_history', history)
    return true
  }

  /**
   * 标记食谱为已烹饪
   */
  markAsCooked(recipeId) {
    const history = this.getRecipeHistory()
    const recipe = history.find(r => r.id === recipeId)
    if (recipe) {
      recipe.isCooked = true
      recipe.cookedAt = new Date().toISOString()
      wx.setStorageSync('recipe_history', history)
      return true
    }
    return false
  }

  /**
   * 收藏食谱
   */
  toggleFavorite(recipeId) {
    const history = this.getRecipeHistory()
    const recipe = history.find(r => r.id === recipeId)
    if (recipe) {
      recipe.isFavorite = !recipe.isFavorite
      wx.setStorageSync('recipe_history', history)
      return recipe.isFavorite
    }
    return false
  }
}

// 创建单例实例
const recipeService = new RecipeService()

module.exports = {
  // 食谱生成
  generateRecipe: (foodHistory, userGoal) => recipeService.generateRecipe(foodHistory, userGoal),
  
  // 食谱管理
  getRecipeHistory: () => recipeService.getRecipeHistory(),
  saveRecipe: (recipe) => recipeService.saveRecipe(recipe),
  markAsCooked: (recipeId) => recipeService.markAsCooked(recipeId),
  toggleFavorite: (recipeId) => recipeService.toggleFavorite(recipeId),
  
  // 实例
  service: recipeService
}
