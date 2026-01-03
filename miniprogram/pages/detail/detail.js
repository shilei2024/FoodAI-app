// pages/detail/detail.js
Page({
  data: {
    // 食物详情
    foodDetail: null,
    // 加载状态
    loading: false,
    // 页面类型：ai识别、手动查看
    pageType: 'view',
    // AI识别相关
    aiResult: null,
    aiProcessing: false,
    // 图片相关
    tempImagePath: '',
    showImagePicker: false,
    // 营养信息
    nutritionData: null,
    // 是否收藏
    isFavorite: false
  },

  onLoad(options) {
    // 页面加载时执行
    const { id, type, from, food } = options
    
    // 启用分享到朋友圈
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    if (type === 'ai') {
      this.setData({ pageType: 'ai' })
      this.initAIRecognition()
    } else if (id) {
      this.setData({ pageType: 'view' })
      this.loadFoodDetail(id)
    } else if (food) {
      // 从首页传递的食物数据
      this.setData({ pageType: 'view' })
      this.loadFoodFromData(food)
    } else {
      this.setData({ pageType: 'manual' })
    }

    // 记录来源
    if (from) {
      this.setData({ fromPage: from })
    }
  },
  
  // 从传递的数据加载食物详情
  loadFoodFromData(foodData) {
    try {
      // 解析传递的食物数据
      const foodDetail = JSON.parse(decodeURIComponent(foodData))
      
      // 构建完整的食物详情
      const fullFoodDetail = this.buildFoodDetail(foodDetail)
      
      // 获取营养分类数据（使用原始数据）
      const nutritionCategories = this.getNutritionCategories(foodDetail)
      
      // 确保nutritionData是对象格式（图表组件需要）
      // 优先使用foodDetail中的原始nutrition数据
      let nutritionData = foodDetail.nutrition || fullFoodDetail.nutrition || {}
      
      // 如果nutrition是数组，转换为对象格式
      if (Array.isArray(nutritionData)) {
        const nutritionObj = {}
        nutritionData.forEach(item => {
          // 将中文标签转换为英文键名
          const keyMap = {
            '蛋白质': 'protein',
            '脂肪': 'fat', 
            '碳水': 'carbohydrate',
            '碳水化合物': 'carbohydrate',
            '纤维': 'fiber',
            '膳食纤维': 'fiber',
            '水分': 'water',
            '维生素C': 'vitaminC',
            '维生素A': 'vitaminA',
            '维生素E': 'vitaminE',
            '维生素K': 'vitaminK',
            '维生素D': 'vitaminD',
            '维生素B1': 'vitaminB1',
            '维生素B2': 'vitaminB2',
            '维生素B6': 'vitaminB6',
            '维生素B12': 'vitaminB12',
            '烟酸(B3)': 'niacin',
            '叶酸': 'folate',
            '钙': 'calcium',
            '铁': 'iron',
            '锌': 'zinc',
            '钾': 'potassium',
            '钠': 'sodium',
            '镁': 'magnesium',
            '磷': 'phosphorus',
            '硒': 'selenium',
            '胆固醇': 'cholesterol',
            '糖': 'sugar'
          }
          const key = keyMap[item.label] || item.label.toLowerCase()
          nutritionObj[key] = item.value
        })
        nutritionData = nutritionObj
      }
      
      this.setData({
        foodDetail: fullFoodDetail,
        nutritionData: nutritionData,
        nutritionCategories: nutritionCategories,
        loading: false
      })
      
    } catch (error) {
      console.error('解析食物数据失败:', error)
      // 如果解析失败，显示错误信息
      this.setData({
        foodDetail: {
          name: '数据加载失败',
          description: '无法加载食物详情，请返回重试',
          image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=200&h=200&fit=crop&auto=format',
          calories: 0,
          tags: ['错误'],
          nutrition: {}
        },
        loading: false
      })
    }
  },
  
  // 获取营养分类数据
  getNutritionCategories(foodData) {
    console.log('getNutritionCategories 输入数据:', foodData)
    
    const allNutrition = foodData.allNutrition || {}
    
    // 如果已经有分类数据（检查是否是分类对象格式），直接使用
    if (allNutrition && typeof allNutrition === 'object' && !Array.isArray(allNutrition)) {
      // 检查是否是分类对象（包含basic、vitamin、mineral等属性，且至少有一个非空数组）
      const hasBasic = Array.isArray(allNutrition.basic) && allNutrition.basic.length > 0
      const hasVitamin = Array.isArray(allNutrition.vitamin) && allNutrition.vitamin.length > 0
      const hasMineral = Array.isArray(allNutrition.mineral) && allNutrition.mineral.length > 0
      const hasOther = Array.isArray(allNutrition.other) && allNutrition.other.length > 0
      
      if (hasBasic || hasVitamin || hasMineral || hasOther) {
        console.log('使用已分类的 allNutrition 数据')
        return {
          basic: allNutrition.basic || [],
          vitamin: allNutrition.vitamin || [],
          mineral: allNutrition.mineral || [],
          other: allNutrition.other || []
        }
      }
    }
    
    // 尝试从多个来源获取 nutrition 数据
    let nutrition = {}
    
    // 优先级1：直接的 nutrition 对象（如果是对象而非数组）
    if (foodData.nutrition && typeof foodData.nutrition === 'object' && !Array.isArray(foodData.nutrition)) {
      nutrition = foodData.nutrition
    }
    // 优先级2：searchData 中的 nutrition
    else if (foodData.searchData?.nutrition && typeof foodData.searchData.nutrition === 'object') {
      nutrition = foodData.searchData.nutrition
    }
    // 优先级3：aiData 中的 nutrition
    else if (foodData.aiData?.nutrition && typeof foodData.aiData.nutrition === 'object') {
      nutrition = foodData.aiData.nutrition
    }
    // 优先级4：如果 nutrition 是数组，转换为对象
    else if (Array.isArray(foodData.nutrition)) {
      nutrition = this.nutritionArrayToObject(foodData.nutrition)
    }
    // 优先级5：如果 allNutrition 是数组，转换为对象
    else if (Array.isArray(allNutrition)) {
      nutrition = this.nutritionArrayToObject(allNutrition)
    }
    
    console.log('解析后的 nutrition 对象:', nutrition)
    
    // 从nutrition对象中提取分类数据
    const categories = {
      basic: [],
      vitamin: [],
      mineral: [],
      other: []
    }
    
    // 辅助函数：添加营养成分（值为undefined时不添加，值为0时保留显示）
    const addNutrient = (category, label, value, unit) => {
      if (value !== undefined && value !== null) {
        categories[category].push({ label, value, unit })
      }
    }
    
    // 基础物质（热量、三大营养素等）
    addNutrient('basic', '热量', nutrition.calories || nutrition.calorie, '千卡')
    addNutrient('basic', '蛋白质', nutrition.protein, 'g')
    addNutrient('basic', '脂肪', nutrition.fat, 'g')
    addNutrient('basic', '碳水化合物', nutrition.carbohydrate || nutrition.carbs, 'g')
    addNutrient('basic', '膳食纤维', nutrition.fiber, 'g')
    addNutrient('basic', '水分', nutrition.water, 'g')
    addNutrient('basic', '灰分', nutrition.ash, 'g')
    
    // 维生素（全面的维生素列表）
    // 脂溶性维生素
    addNutrient('vitamin', '维生素A', nutrition.vitaminA, 'μg')
    addNutrient('vitamin', '视黄醇', nutrition.retinol, 'μg')
    addNutrient('vitamin', 'β-胡萝卜素', nutrition.betaCarotene, 'μg')
    addNutrient('vitamin', '维生素D', nutrition.vitaminD, 'μg')
    addNutrient('vitamin', '维生素E', nutrition.vitaminE, 'mg')
    addNutrient('vitamin', 'α-生育酚', nutrition.alphaTocopherol, 'mg')
    addNutrient('vitamin', '维生素K', nutrition.vitaminK, 'μg')
    
    // 水溶性维生素
    addNutrient('vitamin', '维生素C', nutrition.vitaminC, 'mg')
    addNutrient('vitamin', '维生素B1(硫胺素)', nutrition.vitaminB1 || nutrition.thiamin, 'mg')
    addNutrient('vitamin', '维生素B2(核黄素)', nutrition.vitaminB2 || nutrition.riboflavin, 'mg')
    addNutrient('vitamin', '维生素B3(烟酸)', nutrition.vitaminB3 || nutrition.niacin, 'mg')
    addNutrient('vitamin', '维生素B5(泛酸)', nutrition.vitaminB5 || nutrition.pantothenicAcid, 'mg')
    addNutrient('vitamin', '维生素B6', nutrition.vitaminB6, 'mg')
    addNutrient('vitamin', '维生素B7(生物素)', nutrition.vitaminB7 || nutrition.biotin, 'μg')
    addNutrient('vitamin', '维生素B9(叶酸)', nutrition.vitaminB9 || nutrition.folate || nutrition.folicAcid, 'μg')
    addNutrient('vitamin', '维生素B12', nutrition.vitaminB12, 'μg')
    addNutrient('vitamin', '胆碱', nutrition.choline, 'mg')
    
    // 矿物质（全面的矿物质列表）
    // 常量元素
    addNutrient('mineral', '钙', nutrition.calcium, 'mg')
    addNutrient('mineral', '磷', nutrition.phosphorus, 'mg')
    addNutrient('mineral', '钾', nutrition.potassium, 'mg')
    addNutrient('mineral', '钠', nutrition.sodium, 'mg')
    addNutrient('mineral', '镁', nutrition.magnesium, 'mg')
    addNutrient('mineral', '氯', nutrition.chloride, 'mg')
    addNutrient('mineral', '硫', nutrition.sulfur, 'mg')
    
    // 微量元素
    addNutrient('mineral', '铁', nutrition.iron, 'mg')
    addNutrient('mineral', '锌', nutrition.zinc, 'mg')
    addNutrient('mineral', '铜', nutrition.copper, 'mg')
    addNutrient('mineral', '锰', nutrition.manganese, 'mg')
    addNutrient('mineral', '硒', nutrition.selenium, 'μg')
    addNutrient('mineral', '碘', nutrition.iodine, 'μg')
    addNutrient('mineral', '氟', nutrition.fluoride, 'μg')
    addNutrient('mineral', '铬', nutrition.chromium, 'μg')
    addNutrient('mineral', '钼', nutrition.molybdenum, 'μg')
    
    // 其他成分
    addNutrient('other', '胆固醇', nutrition.cholesterol, 'mg')
    addNutrient('other', '总糖', nutrition.sugar || nutrition.totalSugar, 'g')
    addNutrient('other', '果糖', nutrition.fructose, 'g')
    addNutrient('other', '葡萄糖', nutrition.glucose, 'g')
    addNutrient('other', '蔗糖', nutrition.sucrose, 'g')
    addNutrient('other', '乳糖', nutrition.lactose, 'g')
    addNutrient('other', '麦芽糖', nutrition.maltose, 'g')
    addNutrient('other', '淀粉', nutrition.starch, 'g')
    addNutrient('other', '饱和脂肪酸', nutrition.saturatedFat, 'g')
    addNutrient('other', '单不饱和脂肪酸', nutrition.monounsaturatedFat, 'g')
    addNutrient('other', '多不饱和脂肪酸', nutrition.polyunsaturatedFat, 'g')
    addNutrient('other', '反式脂肪酸', nutrition.transFat, 'g')
    addNutrient('other', 'ω-3脂肪酸', nutrition.omega3, 'g')
    addNutrient('other', 'ω-6脂肪酸', nutrition.omega6, 'g')
    addNutrient('other', '嘌呤', nutrition.purine, 'mg')
    addNutrient('other', '咖啡因', nutrition.caffeine, 'mg')
    addNutrient('other', '酒精', nutrition.alcohol, 'g')
    
    console.log('生成的营养分类:', categories)
    return categories
  },
  
  // 将营养数组转换为对象
  nutritionArrayToObject(nutritionArray) {
    if (!nutritionArray || !Array.isArray(nutritionArray)) {
      return {}
    }
    
    const nutritionObj = {}
    const keyMap = {
      '蛋白质': 'protein',
      '脂肪': 'fat',
      '碳水': 'carbohydrate',
      '碳水化合物': 'carbohydrate',
      '纤维': 'fiber',
      '膳食纤维': 'fiber',
      '水分': 'water',
      '热量': 'calories',
      '维生素A': 'vitaminA',
      '维生素C': 'vitaminC',
      '维生素D': 'vitaminD',
      '维生素E': 'vitaminE',
      '维生素K': 'vitaminK',
      '维生素B1': 'vitaminB1',
      '维生素B2': 'vitaminB2',
      '维生素B6': 'vitaminB6',
      '维生素B12': 'vitaminB12',
      '烟酸': 'niacin',
      '烟酸(B3)': 'niacin',
      '叶酸': 'folate',
      '钙': 'calcium',
      '铁': 'iron',
      '锌': 'zinc',
      '钾': 'potassium',
      '钠': 'sodium',
      '镁': 'magnesium',
      '磷': 'phosphorus',
      '硒': 'selenium',
      '铜': 'copper',
      '锰': 'manganese',
      '胆固醇': 'cholesterol',
      '糖': 'sugar',
      '维生素': 'vitamin',
      '矿物质': 'mineral'
    }
    
    nutritionArray.forEach(item => {
      if (item && item.label !== undefined && item.value !== undefined) {
        const key = keyMap[item.label] || item.label.toLowerCase().replace(/\s+/g, '')
        nutritionObj[key] = parseFloat(item.value) || 0
      }
    })
    
    return nutritionObj
  },
  
  // 构建完整的食物详情
  buildFoodDetail(foodData) {
    // 如果已经有完整的详情数据，补充缺失字段后返回
    const foodName = foodData.name || '未知食物'
    const imageUrl = foodData.imageUrl || foodData.image || 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=200&h=200&fit=crop&auto=format'
    const calories = foodData.calories || foodData.calorie || 0
    const description = foodData.description || foodData.searchData?.description || `这是${foodName}的详细信息`
    
    // 获取营养信息
    const nutrition = foodData.nutrition || foodData.searchData?.nutrition || {}
    
    // 构建标签
    const tags = foodData.tags || this.generateFoodTags(foodName, calories, nutrition)
    
    // 构建健康建议
    const benefits = foodData.benefits || this.generateHealthBenefits(foodName, nutrition)
    
    // 生成建议信息
    const suggestionInfo = this.generateSuggestionInfo(foodName, calories, nutrition)
    
    return {
      name: foodName,
      image: imageUrl,
      calories: calories,
      description: description,
      tags: tags,
      nutrition: nutrition,
      benefits: benefits,
      servingSize: foodData.servingSize || suggestionInfo.servingSize,
      storageTips: foodData.storageTips || suggestionInfo.storageTips,
      cookingMethod: foodData.cookingMethod || suggestionInfo.cookingMethod,
      bestTime: foodData.bestTime || suggestionInfo.bestTime,
      source: foodData.source || 'search'
    }
  },
  
  // 生成建议信息
  generateSuggestionInfo(foodName, calories, nutrition) {
    const foodNameLower = foodName.toLowerCase()
    let servingSize = '100克/次'
    let storageTips = '常温或冷藏保存'
    let cookingMethod = '可直接食用或烹饪后食用'
    let bestTime = '不限'
    
    // 根据食物类型生成建议
    if (foodNameLower.includes('水果') || foodNameLower.includes('苹果') || 
        foodNameLower.includes('香蕉') || foodNameLower.includes('橙') ||
        foodNameLower.includes('梨') || foodNameLower.includes('葡萄')) {
      servingSize = '150-200克/次'
      storageTips = '常温保存，成熟后可冷藏延长保鲜期'
      cookingMethod = '清洗后直接食用，也可榨汁或制作沙拉'
      bestTime = '餐后1小时或上午10点左右'
    } else if (foodNameLower.includes('蔬菜') || foodNameLower.includes('西兰花') || 
               foodNameLower.includes('菠菜') || foodNameLower.includes('白菜') ||
               foodNameLower.includes('胡萝卜')) {
      servingSize = '100-150克/次'
      storageTips = '冷藏保存，建议3-5天内食用'
      cookingMethod = '清炒、水煮或凉拌，避免过度烹饪'
      bestTime = '午餐或晚餐'
    } else if (foodNameLower.includes('肉') || foodNameLower.includes('鸡') || 
               foodNameLower.includes('牛') || foodNameLower.includes('猪')) {
      servingSize = '50-100克/次'
      storageTips = '冷冻保存可保鲜3个月，解冻后尽快食用'
      cookingMethod = '煎、炒、炖、蒸均可，建议充分加热'
      bestTime = '午餐为宜'
    } else if (foodNameLower.includes('鱼') || foodNameLower.includes('虾') || 
               foodNameLower.includes('海鲜')) {
      servingSize = '80-120克/次'
      storageTips = '冷冻保存，解冻后当天食用'
      cookingMethod = '清蒸、红烧或煎炸，保持鲜嫩口感'
      bestTime = '午餐或晚餐'
    } else if (foodNameLower.includes('米饭') || foodNameLower.includes('面') || 
               foodNameLower.includes('馒头') || foodNameLower.includes('面包')) {
      servingSize = '150-200克/次'
      storageTips = '密封保存，避免受潮'
      cookingMethod = '蒸煮或烘烤后食用'
      bestTime = '正餐时间'
    } else if (foodNameLower.includes('蛋') || foodNameLower.includes('鸡蛋')) {
      servingSize = '1-2个/次'
      storageTips = '冷藏保存，大头朝上放置'
      cookingMethod = '水煮、煎、炒或蒸均可'
      bestTime = '早餐为宜'
    } else if (foodNameLower.includes('奶') || foodNameLower.includes('牛奶') || 
               foodNameLower.includes('酸奶')) {
      servingSize = '200-250毫升/次'
      storageTips = '冷藏保存，开封后尽快饮用'
      cookingMethod = '直接饮用或加热后饮用'
      bestTime = '早餐或睡前'
    }
    
    // 根据热量调整建议份量
    if (calories > 300) {
      servingSize = '50-80克/次（高热量食物，建议控制摄入）'
    } else if (calories < 50) {
      servingSize = '150-200克/次（低热量食物，可适量多吃）'
    }
    
    return {
      servingSize,
      storageTips,
      cookingMethod,
      bestTime
    }
  },
  
  // 生成食物标签
  generateFoodTags(foodName, calories, nutrition) {
    const tags = []
    
    // 根据食物名称添加标签
    const foodNameLower = foodName.toLowerCase()
    if (foodNameLower.includes('水果') || foodNameLower.includes('苹果') || foodNameLower.includes('香蕉')) {
      tags.push('水果')
    } else if (foodNameLower.includes('蔬菜') || foodNameLower.includes('西兰花') || foodNameLower.includes('菠菜')) {
      tags.push('蔬菜')
    } else if (foodNameLower.includes('肉') || foodNameLower.includes('鸡') || foodNameLower.includes('鱼')) {
      tags.push('肉类')
    } else if (foodNameLower.includes('主食') || foodNameLower.includes('米饭') || foodNameLower.includes('面条')) {
      tags.push('主食')
    }
    
    // 根据热量添加标签
    if (calories < 100) {
      tags.push('低卡')
    } else if (calories < 300) {
      tags.push('中卡')
    } else {
      tags.push('高卡')
    }
    
    // 根据营养信息添加标签
    if (nutrition.protein && nutrition.protein > 20) {
      tags.push('高蛋白')
    }
    if (nutrition.fat && nutrition.fat < 5) {
      tags.push('低脂')
    }
    if (nutrition.fiber && nutrition.fiber > 2) {
      tags.push('高纤维')
    }
    
    return tags
  },
  
  // 生成健康益处
  generateHealthBenefits(foodName, nutrition) {
    const benefits = []
    const foodNameLower = foodName.toLowerCase()
    
    // 通用益处
    benefits.push('提供身体所需能量')
    benefits.push('维持正常生理功能')
    
    // 根据食物类型添加特定益处
    if (foodNameLower.includes('水果') || foodNameLower.includes('苹果') || foodNameLower.includes('香蕉')) {
      benefits.push('富含维生素和抗氧化剂')
      benefits.push('有助于消化系统健康')
    } else if (foodNameLower.includes('蔬菜')) {
      benefits.push('富含膳食纤维')
      benefits.push('有助于维持肠道健康')
    } else if (foodNameLower.includes('肉') || foodNameLower.includes('鸡') || foodNameLower.includes('鱼')) {
      benefits.push('优质蛋白质来源')
      benefits.push('有助于肌肉生长和修复')
    }
    
    // 根据营养信息添加益处
    if (nutrition.protein && nutrition.protein > 10) {
      benefits.push('有助于维持肌肉质量')
    }
    if (nutrition.fiber && nutrition.fiber > 2) {
      benefits.push('有助于控制血糖和胆固醇')
    }
    
    return benefits.slice(0, 4) // 最多返回4条
  },

  // 初始化AI识别
  initAIRecognition() {
    this.setData({
      showImagePicker: true
    })
  },

  // 加载食物详情
  loadFoodDetail(id) {
    this.setData({ loading: true })

    // 模拟数据加载
    setTimeout(() => {
      const mockData = this.generateMockFoodDetail(id)
      this.setData({
        foodDetail: mockData,
        nutritionData: mockData.nutrition,
        isFavorite: Math.random() > 0.5,
        loading: false
      })
    }, 800)
  },

  // 生成模拟食物详情
  generateMockFoodDetail(id) {
    const foods = {
      1: {
        id: 1,
        name: '苹果',
        image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200&h=200&fit=crop&auto=format',
        calories: 52,
        description: '苹果是一种常见的水果，富含维生素C和膳食纤维，有助于消化和增强免疫力。',
        tags: ['水果', '低卡', '维生素'],
        nutrition: {
          protein: 0.3,
          fat: 0.2,
          carbohydrate: 13.8,
          fiber: 2.4,
          vitaminC: 4.6,
          potassium: 107
        },
        benefits: [
          '富含抗氧化剂',
          '有助于控制体重',
          '改善消化系统',
          '降低胆固醇'
        ],
        servingSize: '100克',
        storageTips: '冷藏保存可延长保鲜期'
      },
      2: {
        id: 2,
        name: '鸡胸肉',
        image: 'https://images.unsplash.com/photo-1604503468505-6ff2c5fdab2d?w=200&h=200&fit=crop&auto=format',
        calories: 165,
        description: '鸡胸肉是优质的蛋白质来源，脂肪含量低，适合健身和减肥人群。',
        tags: ['肉类', '高蛋白', '低脂'],
        nutrition: {
          protein: 31,
          fat: 3.6,
          carbohydrate: 0,
          fiber: 0,
          vitaminB6: 0.5,
          niacin: 12.5
        },
        benefits: [
          '优质蛋白质来源',
          '有助于肌肉生长',
          '低脂肪含量',
          '富含B族维生素'
        ],
        servingSize: '100克',
        storageTips: '冷冻保存，烹饪前解冻'
      },
      3: {
        id: 3,
        name: '西兰花',
        image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=200&h=200&fit=crop&auto=format',
        calories: 34,
        description: '西兰花富含维生素C、K和膳食纤维，具有抗氧化和抗炎作用。',
        tags: ['蔬菜', '高纤维', '维生素'],
        nutrition: {
          protein: 2.8,
          fat: 0.4,
          carbohydrate: 6.6,
          fiber: 2.6,
          vitaminC: 89.2,
          vitaminK: 101.6
        },
        benefits: [
          '富含抗氧化剂',
          '有助于心脏健康',
          '改善消化',
          '增强免疫力'
        ],
        servingSize: '100克',
        storageTips: '冷藏保存，尽快食用'
      }
    }

    return foods[id] || foods[1]
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.setData({
          tempImagePath: tempFilePath,
          showImagePicker: false
        })
        this.startAIRecognition(tempFilePath)
      }
    })
  },

  // 开始AI识别
  startAIRecognition(imagePath) {
    this.setData({ aiProcessing: true })

    // 模拟AI识别过程
    setTimeout(() => {
      const mockResult = {
        success: true,
        foodName: '苹果',
        confidence: 0.92,
        nutrition: {
          protein: 0.3,
          fat: 0.2,
          carbohydrate: 13.8,
          calories: 52
        },
        suggestions: [
          '建议搭配坚果食用',
          '最佳食用时间：上午',
          '每日建议摄入：1-2个'
        ]
      }

      this.setData({
        aiResult: mockResult,
        aiProcessing: false,
        foodDetail: {
          name: mockResult.foodName,
          image: imagePath,
          calories: mockResult.nutrition.calories,
          description: 'AI识别结果',
          tags: ['AI识别', '水果'],
          nutrition: mockResult.nutrition
        },
        nutritionData: mockResult.nutrition
      })
    }, 2000)
  },

  // 取消AI识别
  cancelAIRecognition() {
    this.setData({
      showImagePicker: false,
      tempImagePath: '',
      aiProcessing: false
    })
    wx.navigateBack()
  },

  // 重新识别
  redoRecognition() {
    this.setData({
      showImagePicker: true,
      aiResult: null,
      foodDetail: null,
      tempImagePath: ''
    })
  },

  // 切换收藏状态
  toggleFavorite() {
    const newStatus = !this.data.isFavorite
    this.setData({ isFavorite: newStatus })
    
    wx.showToast({
      title: newStatus ? '已收藏' : '已取消收藏',
      icon: 'success'
    })
  },

  // 分享到朋友圈
  shareToMoments() {
    const foodDetail = this.data.foodDetail
    if (!foodDetail) {
      wx.showToast({
        title: '暂无食物信息',
        icon: 'none'
      })
      return
    }

    // 微信小程序分享到朋友圈需要通过 onShareTimeline 实现
    // 这里提示用户使用右上角菜单分享
    wx.showModal({
      title: '分享到朋友圈',
      content: '请点击右上角「...」按钮，选择「分享到朋友圈」即可分享',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#07c160'
    })
  },

  // 分享给好友回调
  onShareAppMessage() {
    const foodDetail = this.data.foodDetail
    const foodName = foodDetail?.name || '食物'
    const calories = foodDetail?.calories || 0
    
    return {
      title: `🍽️ ${foodName} - ${calories}千卡/100g`,
      path: `/pages/detail/detail?id=${foodDetail?.id || 1}`,
      imageUrl: foodDetail?.image || 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=200&fit=crop&auto=format'
    }
  },

  // 分享到朋友圈回调
  onShareTimeline() {
    const foodDetail = this.data.foodDetail
    const foodName = foodDetail?.name || '食物'
    const calories = foodDetail?.calories || 0
    
    return {
      title: `${foodName} - ${calories}千卡/100g | 营养成分分析`,
      query: `id=${foodDetail?.id || 1}`,
      imageUrl: foodDetail?.image || 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=200&fit=crop&auto=format'
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
