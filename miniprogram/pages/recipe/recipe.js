// pages/recipe/recipe.js
const recipeService = require('../../services/recipe-service.js')
const auth = require('../../utils/auth.js')

Page({
  data: {
    // 输入数据
    foodInput: '',
    selectedGoal: 'health',
    selectedPreference: 'chinese',
    
    // 选项列表
    goals: [
      { id: 'weight_loss', name: '减脂' },
      { id: 'muscle_gain', name: '增肌' },
      { id: 'health', name: '保持健康' }
    ],
    
    preferences: [
      { id: 'chinese', name: '中式' },
      { id: 'western', name: '西式' },
      { id: 'japanese', name: '日式' },
      { id: 'vegetarian', name: '素食' }
    ],
    
    // 食谱数据
    currentRecipe: null,
    recipeHistory: [],
    
    // 状态
    isGenerating: false,
    canGenerate: false
  },

  onLoad(options) {
    // 页面加载时执行
    this.loadRecipeHistory()
    
    // 如果有传入的食物历史，自动填充
    if (options.foodHistory) {
      this.setData({
        foodInput: decodeURIComponent(options.foodHistory),
        canGenerate: true
      })
    }
  },

  onShow() {
    // 页面显示时执行
    this.loadRecipeHistory()
  },

  // 加载食谱历史
  loadRecipeHistory() {
    const history = recipeService.getRecipeHistory()
    this.setData({ recipeHistory: history })
  },

  // 食物输入变化
  onFoodInput(e) {
    const value = e.detail.value
    this.setData({
      foodInput: value,
      canGenerate: value.trim().length > 0
    })
  },

  // 选择目标
  selectGoal(e) {
    const goalId = e.currentTarget.dataset.id
    this.setData({ selectedGoal: goalId })
  },

  // 选择偏好
  selectPreference(e) {
    const prefId = e.currentTarget.dataset.id
    this.setData({ selectedPreference: prefId })
  },

  // 生成食谱
  async generateRecipe() {
    if (!this.data.canGenerate || this.data.isGenerating) {
      return
    }

    this.setData({ isGenerating: true })

    try {
      // 准备食物历史数据
      const foodHistory = this.parseFoodHistory(this.data.foodInput)
      
      // 准备用户目标
      const userGoal = {
        goal: this.getGoalName(this.data.selectedGoal),
        weight: 65, // 这里应该从用户资料获取
        targetWeight: 60,
        activityLevel: '中等'
      }

      // 调用食谱服务
      const result = await recipeService.generateRecipe(foodHistory, userGoal)

      if (result.success) {
        // 显示生成的食谱
        this.setData({
          currentRecipe: result.data,
          isGenerating: false
        })
        
        // 自动保存到历史
        recipeService.saveRecipe(result.data)
        this.loadRecipeHistory()
        
        wx.showToast({
          title: '食谱生成成功',
          icon: 'success',
          duration: 2000
        })
      } else {
        throw new Error(result.error || '生成食谱失败')
      }

    } catch (error) {
      console.error('生成食谱失败:', error)
      this.setData({ isGenerating: false })
      
      wx.showToast({
        title: error.message || '生成失败',
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 解析食物历史输入
  parseFoodHistory(input) {
    if (!input.trim()) {
      return []
    }

    // 简单的解析逻辑
    // 实际应用中应该更复杂
    const meals = input.split(/[，,]/)
    
    return meals.map((meal, index) => {
      let mealType = 'snacks'
      if (index === 0) mealType = 'breakfast'
      if (index === 1) mealType = 'lunch'
      
      return {
        foodName: meal.trim(),
        mealType: mealType,
        calorie: { value: 300 }, // 估算值
        timestamp: new Date().toISOString()
      }
    })
  },

  // 获取目标名称
  getGoalName(goalId) {
    const goalMap = {
      'weight_loss': '减脂',
      'muscle_gain': '增肌',
      'health': '保持健康'
    }
    return goalMap[goalId] || '保持健康'
  },

  // 查看食谱
  viewRecipe(e) {
    const index = e.currentTarget.dataset.index
    const recipe = this.data.recipeHistory[index]
    
    if (recipe) {
      this.setData({ currentRecipe: recipe })
      
      // 滚动到顶部
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 300
      })
    }
  },

  // 保存食谱
  saveRecipe() {
    if (!this.data.currentRecipe) return

    const saved = recipeService.saveRecipe(this.data.currentRecipe)
    
    if (saved) {
      this.loadRecipeHistory()
      
      wx.showToast({
        title: '已保存到历史',
        icon: 'success',
        duration: 2000
      })
    }
  },

  // 标记为已烹饪
  markAsCooked() {
    if (!this.data.currentRecipe) return

    const marked = recipeService.markAsCooked(this.data.currentRecipe.id)
    
    if (marked) {
      this.loadRecipeHistory()
      
      wx.showToast({
        title: '标记成功',
        icon: 'success',
        duration: 2000
      })
    }
  },

  // 分享食谱
  shareRecipe() {
    if (!this.data.currentRecipe) return

    wx.showShareMenu({
      withShareTicket: true
    })
  },

  // 重新生成食谱
  generateNewRecipe() {
    this.setData({ currentRecipe: null })
    
    // 滚动到生成区域
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
  },

  // 查看收藏
  viewFavorites() {
    const favorites = this.data.recipeHistory.filter(recipe => recipe.isFavorite)
    
    if (favorites.length === 0) {
      wx.showToast({
        title: '暂无收藏食谱',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 这里可以跳转到收藏页面或显示弹窗
    wx.showModal({
      title: '收藏食谱',
      content: `您有 ${favorites.length} 个收藏食谱`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 返回上一页
  goBack() {
    if (this.data.currentRecipe) {
      this.setData({ currentRecipe: null })
    } else {
      wx.navigateBack()
    }
  },

  // 分享回调
  onShareAppMessage() {
    if (this.data.currentRecipe) {
      return {
        title: `${this.data.currentRecipe.dinner.name} - 个性化食谱`,
        path: `/pages/recipe/recipe`,
        imageUrl: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=300&fit=crop&auto=format'
      }
    }
    
    return {
      title: 'AI个性化食谱生成',
      path: '/pages/recipe/recipe'
    }
  }
})
