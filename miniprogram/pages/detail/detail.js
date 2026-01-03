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
    const nutrition = foodData.nutrition || foodData.searchData?.nutrition || {}
    const allNutrition = foodData.allNutrition || {}
    
    // 如果已经有分类数据（检查是否是分类对象格式），直接使用
    if (allNutrition && typeof allNutrition === 'object' && !Array.isArray(allNutrition)) {
      // 检查是否是分类对象（包含basic、vitamin、mineral等属性）
      if (allNutrition.basic !== undefined || allNutrition.vitamin !== undefined || 
          allNutrition.mineral !== undefined || allNutrition.other !== undefined) {
        // 确保所有分类都存在（即使为空数组）
        return {
          basic: allNutrition.basic || [],
          vitamin: allNutrition.vitamin || [],
          mineral: allNutrition.mineral || [],
          other: allNutrition.other || []
        }
      }
    }
    
    // 否则从nutrition对象中提取
    const categories = {
      basic: [],
      vitamin: [],
      mineral: [],
      other: []
    }
    
    // 基础物质
    if (nutrition.protein !== undefined) {
      categories.basic.push({ label: '蛋白质', value: nutrition.protein, unit: 'g' })
    }
    if (nutrition.fat !== undefined) {
      categories.basic.push({ label: '脂肪', value: nutrition.fat, unit: 'g' })
    }
    if (nutrition.carbohydrate !== undefined) {
      categories.basic.push({ label: '碳水化合物', value: nutrition.carbohydrate, unit: 'g' })
    }
    if (nutrition.fiber !== undefined) {
      categories.basic.push({ label: '膳食纤维', value: nutrition.fiber, unit: 'g' })
    }
    if (nutrition.water !== undefined) {
      categories.basic.push({ label: '水分', value: nutrition.water, unit: 'g' })
    }
    
    // 维生素（即使值为0也要显示）
    if (nutrition.vitaminA !== undefined && nutrition.vitaminA !== null) {
      categories.vitamin.push({ label: '维生素A', value: nutrition.vitaminA, unit: 'μg' })
    }
    if (nutrition.vitaminC !== undefined && nutrition.vitaminC !== null) {
      categories.vitamin.push({ label: '维生素C', value: nutrition.vitaminC, unit: 'mg' })
    }
    if (nutrition.vitaminD !== undefined && nutrition.vitaminD !== null) {
      categories.vitamin.push({ label: '维生素D', value: nutrition.vitaminD, unit: 'μg' })
    }
    if (nutrition.vitaminE !== undefined && nutrition.vitaminE !== null) {
      categories.vitamin.push({ label: '维生素E', value: nutrition.vitaminE, unit: 'mg' })
    }
    if (nutrition.vitaminK !== undefined && nutrition.vitaminK !== null) {
      categories.vitamin.push({ label: '维生素K', value: nutrition.vitaminK, unit: 'μg' })
    }
    if (nutrition.vitaminB1 !== undefined && nutrition.vitaminB1 !== null) {
      categories.vitamin.push({ label: '维生素B1', value: nutrition.vitaminB1, unit: 'mg' })
    }
    if (nutrition.vitaminB2 !== undefined && nutrition.vitaminB2 !== null) {
      categories.vitamin.push({ label: '维生素B2', value: nutrition.vitaminB2, unit: 'mg' })
    }
    if (nutrition.vitaminB6 !== undefined && nutrition.vitaminB6 !== null) {
      categories.vitamin.push({ label: '维生素B6', value: nutrition.vitaminB6, unit: 'mg' })
    }
    if (nutrition.vitaminB12 !== undefined && nutrition.vitaminB12 !== null) {
      categories.vitamin.push({ label: '维生素B12', value: nutrition.vitaminB12, unit: 'μg' })
    }
    if (nutrition.niacin !== undefined && nutrition.niacin !== null) {
      categories.vitamin.push({ label: '烟酸(B3)', value: nutrition.niacin, unit: 'mg' })
    }
    if (nutrition.folate !== undefined && nutrition.folate !== null) {
      categories.vitamin.push({ label: '叶酸', value: nutrition.folate, unit: 'μg' })
    }
    
    // 确保返回的categories对象包含所有分类（即使为空数组）
    
    // 矿物质
    if (nutrition.calcium !== undefined) {
      categories.mineral.push({ label: '钙', value: nutrition.calcium, unit: 'mg' })
    }
    if (nutrition.iron !== undefined) {
      categories.mineral.push({ label: '铁', value: nutrition.iron, unit: 'mg' })
    }
    if (nutrition.zinc !== undefined) {
      categories.mineral.push({ label: '锌', value: nutrition.zinc, unit: 'mg' })
    }
    if (nutrition.potassium !== undefined) {
      categories.mineral.push({ label: '钾', value: nutrition.potassium, unit: 'mg' })
    }
    if (nutrition.sodium !== undefined) {
      categories.mineral.push({ label: '钠', value: nutrition.sodium, unit: 'mg' })
    }
    if (nutrition.magnesium !== undefined) {
      categories.mineral.push({ label: '镁', value: nutrition.magnesium, unit: 'mg' })
    }
    
    // 其他
    if (nutrition.cholesterol !== undefined) {
      categories.other.push({ label: '胆固醇', value: nutrition.cholesterol, unit: 'mg' })
    }
    if (nutrition.sugar !== undefined) {
      categories.other.push({ label: '糖', value: nutrition.sugar, unit: 'g' })
    }
    
    return categories
  },
  
  // 构建完整的食物详情
  buildFoodDetail(foodData) {
    // 如果已经有完整的详情数据，直接返回
    if (foodData.name && foodData.description && foodData.nutrition) {
      return foodData
    }
    
    // 否则构建完整的详情
    const foodName = foodData.name || '未知食物'
    const imageUrl = foodData.imageUrl || foodData.image || 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=200&h=200&fit=crop&auto=format'
    const calories = foodData.calories || foodData.calorie || 0
    const description = foodData.description || foodData.searchData?.description || `这是${foodName}的详细信息`
    
    // 获取营养信息
    const nutrition = foodData.nutrition || foodData.searchData?.nutrition || {}
    
    // 构建标签
    const tags = this.generateFoodTags(foodName, calories, nutrition)
    
    // 构建健康建议
    const benefits = this.generateHealthBenefits(foodName, nutrition)
    
    return {
      name: foodName,
      image: imageUrl,
      calories: calories,
      description: description,
      tags: tags,
      nutrition: nutrition,
      benefits: benefits,
      servingSize: '100克',
      storageTips: '根据食物类型适当保存',
      source: foodData.source || 'search'
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

  // 保存记录
  saveRecord() {
    if (!this.data.foodDetail) return

    wx.showLoading({ title: '保存中...' })

    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })

      // 返回上一页
      setTimeout(() => {
        if (this.data.fromPage === 'history') {
          wx.navigateBack()
        } else {
          wx.navigateTo({
            url: '/pages/history/history'
          })
        }
      }, 1500)
    }, 1000)
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

  // 分享食物
  shareFood() {
    wx.showShareMenu({
      withShareTicket: true
    })
  },

  // 分享回调
  onShareAppMessage() {
    const foodName = this.data.foodDetail?.name || '食物'
    return {
      title: `${foodName} - 营养信息`,
      path: `/pages/detail/detail?id=${this.data.foodDetail?.id || 1}`,
      imageUrl: this.data.foodDetail?.image || 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=200&fit=crop&auto=format'
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
