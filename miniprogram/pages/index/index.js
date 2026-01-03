// pages/index/index.js
const app = getApp()
const Toast = require('../../miniprogram_npm/vant-weapp/toast/toast')
const Dialog = require('../../miniprogram_npm/vant-weapp/dialog/dialog')
const imageProcessor = require('../../utils/imageProcessor.js')
const ImagePaths = require('../../utils/imagePaths.js')
const services = require('../../services/index.js')
const aiService = services.getAIService()

Page({
  data: {
    // 页面数据
    foodName: '',
    showResult: false,
    loading: false,
    activeTab: 'home',
    debugMode: true, // 开发时开启调试模式
    
    // 热门食物
    hotFoods: ['苹果', '香蕉', '米饭', '鸡蛋', '牛奶', '面包', '鸡肉', '牛肉', '鱼肉', '蔬菜'],
    
    // 识别结果
    result: {
      name: '',
      description: '',
      calories: 0,
      imageUrl: '',
      nutrition: [
        { label: '蛋白质', value: 0, unit: 'g' },
        { label: '脂肪', value: 0, unit: 'g' },
        { label: '碳水', value: 0, unit: 'g' },
        { label: '纤维', value: 0, unit: 'g' },
        { label: '维生素', value: 0, unit: 'mg' },
        { label: '矿物质', value: 0, unit: 'mg' }
      ]
    },
    
    // 最近记录（从本地存储加载）
    recentHistory: []
  },

  onLoad() {
    // 页面加载时初始化
    this.initPage()
  },

  onShow() {
    // 页面显示时更新数据
    this.loadRecentHistory()
  },

  initPage() {
    // 初始化页面
    console.log('首页初始化')
  },

  // 拍照功能 - 显示选择菜单（相机或相册）
  takePhoto() {
    console.log('点击拍照按钮')
    
    // 检查是否正在加载中
    if (this.data.loading) {
      console.log('正在处理中，请稍候')
      wx.showToast({
        title: '正在处理中，请稍候',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    // 显示选择菜单
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        console.log('用户选择了:', res.tapIndex === 0 ? '拍照' : '相册')
        const tapIndex = res.tapIndex
        if (tapIndex === 0) {
          // 拍照
          this.openCamera()
        } else if (tapIndex === 1) {
          // 从相册选择
          this.chooseImageFromAlbum()
        }
      },
      fail: (error) => {
        console.log('用户取消选择或选择失败:', error)
      }
    })
  },

  // 打开相机拍照
  async openCamera() {
    console.log('开始打开相机')
    try {
      this.setData({ loading: true })
      console.log('设置loading为true')
      
      // 先检查相机权限
      console.log('检查相机权限...')
      const cameraAuth = await this.checkCameraPermission()
      console.log('相机权限检查结果:', cameraAuth)
      
      if (!cameraAuth) {
        console.log('相机权限未授权，抛出错误')
        throw new Error('相机权限未授权')
      }
      
      console.log('调用图片处理模块...')
      // 使用图片处理模块拍照
      const result = await imageProcessor.processImagePipeline({
        capture: true,
        compress: true,
        upload: false, // 暂时不上传，先本地处理
        maxSize: 500 * 1024, // 500KB
        showActionSheet: false, // 直接拍照
        sourceType: ['camera']
      })
      
      console.log('图片处理成功，开始识别:', result)
      // 处理成功，显示结果
      await this.handleProcessedImage(result)
      
    } catch (error) {
      console.error('拍照处理失败:', error)
      
      // 处理权限错误
      if (error.message.includes('权限') || error.message.includes('authorize') || 
          error.message.includes('相机权限未授权')) {
        console.log('显示权限错误对话框')
        Dialog.confirm({
          title: '相机权限',
          message: '需要相机权限才能拍照识别食物',
          confirmButtonText: '去设置',
          cancelButtonText: '取消'
        }).then(() => {
          wx.openSetting()
        })
      } else {
        console.log('显示其他错误提示:', error.message)
        wx.showToast({
          title: error.message || '拍照失败，请重试',
          icon: 'none',
          duration: 3000
        })
      }
    } finally {
      console.log('finally块：设置loading为false')
      this.setData({ loading: false })
    }
  },

  // 从相册选择图片
  async chooseImageFromAlbum() {
    try {
      this.setData({ loading: true })
      
      // 使用图片处理模块选择图片
      const result = await imageProcessor.processImagePipeline({
        capture: true,
        compress: true,
        upload: false,
        maxSize: 500 * 1024,
        showActionSheet: false,
        sourceType: ['album']
      })
      
      // 处理成功，显示结果
      await this.handleProcessedImage(result)
      
    } catch (error) {
      console.error('选择图片处理失败:', error)
      
      if (error.message === '用户取消选择') {
        // 用户取消，不显示错误
        return
      }
      
      wx.showToast({
        title: error.message || '选择图片失败',
        icon: 'none',
        duration: 3000
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 处理已处理的图片
  async handleProcessedImage(processResult) {
    let loadingShown = false
    try {
      // 显示加载状态
      wx.showLoading({
        title: 'AI识别中...',
        mask: true
      })
      loadingShown = true
      
      // 调用真实的AI识别服务
      const recognitionResult = await aiService.recognizeFood(processResult.finalPath, {
        compress: false, // 已经压缩过了
        getNutrition: true,
        saveRecord: true,
        showLoading: false, // 手动控制loading
        silent: true // 不显示错误提示，手动处理
      })
      
      if (recognitionResult.success) {
        // 显示识别结果
        this.showRecognitionResult(processResult.finalPath, processResult, recognitionResult.data)
        wx.showToast({
          title: '识别成功！',
          icon: 'success',
          duration: 2000
        })
      } else {
        // 识别失败
        const errorMsg = recognitionResult.error || '识别失败，请重试'
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        })
        throw new Error(errorMsg)
      }
      
    } catch (error) {
      console.error('处理图片失败:', error)
      
      // 显示友好的错误提示
      let errorMessage = '识别失败，请重试'
      if (error.message) {
        if (error.message.includes('API Key') || error.message.includes('Secret Key') || 
            error.message.includes('dev_test_key')) {
          errorMessage = '请先配置百度AI密钥（在 config.js 中）'
        } else if (error.message.includes('网络')) {
          errorMessage = '网络连接失败，请检查网络'
        } else if (error.message.includes('未识别到食物')) {
          errorMessage = '未识别到食物，请重新拍照'
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'API密钥错误，请检查配置'
        } else {
          errorMessage = error.message
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      })
      throw error
    } finally {
      // 确保隐藏loading
      if (loadingShown) {
        wx.hideLoading()
      }
    }
  },

  // 完整的图片处理流程（包含裁剪选项）
  async processImageWithOptions() {
    try {
      // 第一步：拍照或选择图片
      const captureResult = await imageProcessor.captureImage({
        showActionSheet: true
      })
      
      // 第二步：显示裁剪界面（可选）
      const shouldCrop = await this.showCropDialog()
      let finalImagePath = captureResult.compressedPath
      
      if (shouldCrop) {
        // 显示裁剪组件
        finalImagePath = await this.showImageCropper(captureResult.compressedPath)
      }
      
      // 第三步：压缩到500KB以内
      const compressResult = await imageProcessor.compressImageToSize(
        finalImagePath,
        500 * 1024
      )
      
      // 第四步：处理图片
      await this.handleProcessedImage({
        finalPath: compressResult.path,
        finalSize: compressResult.size,
        ...captureResult
      })
      
    } catch (error) {
      console.error('图片处理流程失败:', error)
      throw error
    }
  },

  // 显示裁剪对话框
  showCropDialog() {
    return new Promise((resolve) => {
      Dialog.confirm({
        title: '图片裁剪',
        message: '是否需要裁剪图片？\n裁剪可以去除多余部分，提高识别准确率',
        confirmButtonText: '裁剪',
        cancelButtonText: '直接使用'
      }).then(() => {
        resolve(true)
      }).catch(() => {
        resolve(false)
      })
    })
  },

  // 显示图片裁剪组件
  showImageCropper(imagePath) {
    return new Promise((resolve, reject) => {
      // 这里可以显示一个全屏的裁剪组件
      // 由于时间关系，暂时直接返回原图
      // 实际项目中可以实现完整的裁剪界面
      console.log('显示裁剪界面:', imagePath)
      
      // 模拟裁剪过程
      setTimeout(() => {
        resolve(imagePath)
      }, 500)
    })
  },

  // 显示识别结果
  showRecognitionResult(imagePath, processResult = null, aiResult = null) {
    // 如果有处理结果，使用处理后的信息
    const imageInfo = processResult?.info || {}
    const fileSize = processResult?.finalSize || 0
    
    let resultData
    
    if (aiResult) {
      // 使用真实的AI识别结果
      const nutrition = aiResult.nutrition || {}
      const nutritionList = []
      
      // 构建营养信息列表（支持更多营养元素）
      const nutritionItems = []
      
      if (nutrition.protein !== undefined) {
        nutritionItems.push({ label: '蛋白质', value: nutrition.protein, unit: 'g', sortValue: nutrition.protein })
      }
      if (nutrition.fat !== undefined) {
        nutritionItems.push({ label: '脂肪', value: nutrition.fat, unit: 'g', sortValue: nutrition.fat })
      }
      if (nutrition.carbohydrate !== undefined) {
        nutritionItems.push({ label: '碳水', value: nutrition.carbohydrate, unit: 'g', sortValue: nutrition.carbohydrate })
      }
      if (nutrition.fiber !== undefined) {
        nutritionItems.push({ label: '纤维', value: nutrition.fiber, unit: 'g', sortValue: nutrition.fiber })
      }
      if (nutrition.vitamin !== undefined) {
        nutritionItems.push({ label: '维生素', value: nutrition.vitamin, unit: 'mg', sortValue: nutrition.vitamin })
      }
      if (nutrition.mineral !== undefined) {
        nutritionItems.push({ label: '矿物质', value: nutrition.mineral, unit: 'mg', sortValue: nutrition.mineral })
      }
      if (nutrition.calcium !== undefined) {
        nutritionItems.push({ label: '钙', value: nutrition.calcium, unit: 'mg', sortValue: nutrition.calcium })
      }
      if (nutrition.iron !== undefined) {
        nutritionItems.push({ label: '铁', value: nutrition.iron, unit: 'mg', sortValue: nutrition.iron })
      }
      if (nutrition.zinc !== undefined) {
        nutritionItems.push({ label: '锌', value: nutrition.zinc, unit: 'mg', sortValue: nutrition.zinc })
      }
      
      // 按值从大到小排序
      nutritionItems.sort((a, b) => b.sortValue - a.sortValue)
      
      // 只取前6个，移除sortValue字段
      const topNutrition = nutritionItems.slice(0, 6).map(item => {
        const { sortValue, ...rest } = item
        return rest
      })
      
      // 保存所有营养信息供详情页面使用
      const allNutrition = nutritionItems.map(item => {
        const { sortValue, ...rest } = item
        return rest
      })
      
      // 如果营养信息为空，使用默认值
      if (topNutrition.length === 0) {
        topNutrition.push(
          { label: '蛋白质', value: 0, unit: 'g' },
          { label: '脂肪', value: 0, unit: 'g' },
          { label: '碳水', value: 0, unit: 'g' },
          { label: '纤维', value: 0, unit: 'g' }
        )
      }
      
      resultData = {
        name: aiResult.foodName || '未知食物',
        description: aiResult.description || aiResult.baikeInfo?.description || '暂无描述',
        calories: aiResult.calorie || nutrition.calories || 0,
        imageUrl: imagePath,
        confidence: aiResult.confidence || 0,
        // Deepseek特有数据
        healthScore: aiResult.healthScore || 70,
        suggestions: aiResult.suggestions || [],
        tags: aiResult.tags || [],
        source: aiResult.source || 'ai',
        imageInfo: {
          width: imageInfo.width || 0,
          height: imageInfo.height || 0,
          size: this.formatFileSize(fileSize),
          processed: processResult?.processed || false
        },
        // 营养信息（只显示前6个）
        nutrition: topNutrition,
        // 保存所有营养信息供详情页面使用
        allNutrition: allNutrition,
        // 保存原始AI数据
        aiData: aiResult
      }
    } else {
      // 降级到模拟数据（不应该到达这里）
      resultData = {
        name: '未知食物',
        description: '识别失败，请重试',
        calories: 0,
        imageUrl: imagePath,
        healthScore: 0,
        suggestions: [],
        tags: [],
        source: 'error',
        imageInfo: {
          width: imageInfo.width || 0,
          height: imageInfo.height || 0,
          size: this.formatFileSize(fileSize),
          processed: processResult?.processed || false
        },
        nutrition: [
          { label: '蛋白质', value: 0, unit: 'g' },
          { label: '脂肪', value: 0, unit: 'g' },
          { label: '碳水', value: 0, unit: 'g' },
          { label: '纤维', value: 0, unit: 'g' }
        ],
        allNutrition: [],
        aiData: null
      }
    }
    
    this.setData({
      result: resultData,
      showResult: true
    })
    
    // 滚动到结果区域
    wx.pageScrollTo({
      selector: '.result-section',
      duration: 300
    })
  },

  // 格式化文件大小
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  // 输入框事件
  onFoodInput(e) {
    this.setData({
      foodName: e.detail.value
    })
  },

  // 搜索食物
  async searchFood() {
    const foodName = this.data.foodName.trim()
    
    if (!foodName) {
      wx.showToast({
        title: '请输入食物名称',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    this.setData({ loading: true })
    
    try {
      // 使用AI服务搜索食物信息
      const searchResult = await aiService.searchFoodByName(foodName, {
        getNutrition: true,
        saveRecord: true
      })
      
      if (searchResult.success) {
        // 显示搜索结果
        this.showSearchResult(searchResult.data)
        
        wx.showToast({
          title: '搜索成功！',
          icon: 'success',
          duration: 2000
        })
        
        // 滚动到结果区域
        wx.pageScrollTo({
          selector: '.result-section',
          duration: 300
        })
      } else {
        throw new Error(searchResult.error || '搜索失败')
      }
    } catch (error) {
      console.error('搜索食物失败:', error)
      
      // 显示友好的错误提示
      let errorMessage = '搜索失败，请重试'
      if (error.message) {
        if (error.message.includes('API Key') || error.message.includes('Secret Key')) {
          errorMessage = '请先配置百度AI密钥（在 config.js 中）'
        } else if (error.message.includes('网络')) {
          errorMessage = '网络连接失败，请检查网络'
        } else {
          errorMessage = error.message
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      })
      
      // 降级到模拟数据（仅用于演示）
      this.showMockSearchResult(foodName)
    } finally {
      this.setData({ loading: false })
    }
  },
  
  // 显示搜索结果
  showSearchResult(searchData) {
    const nutrition = searchData.nutrition || {}
    const nutritionItems = []
    
    // 构建营养信息列表（支持更多营养元素）
    // 基础物质
    if (nutrition.protein !== undefined) {
      nutritionItems.push({ label: '蛋白质', value: nutrition.protein, unit: 'g', sortValue: nutrition.protein, category: 'basic' })
    }
    if (nutrition.fat !== undefined) {
      nutritionItems.push({ label: '脂肪', value: nutrition.fat, unit: 'g', sortValue: nutrition.fat, category: 'basic' })
    }
    if (nutrition.carbohydrate !== undefined) {
      nutritionItems.push({ label: '碳水', value: nutrition.carbohydrate, unit: 'g', sortValue: nutrition.carbohydrate, category: 'basic' })
    }
    if (nutrition.fiber !== undefined) {
      nutritionItems.push({ label: '纤维', value: nutrition.fiber, unit: 'g', sortValue: nutrition.fiber, category: 'basic' })
    }
    if (nutrition.water !== undefined) {
      nutritionItems.push({ label: '水分', value: nutrition.water, unit: 'g', sortValue: nutrition.water, category: 'basic' })
    }
    if (nutrition.ash !== undefined) {
      nutritionItems.push({ label: '灰分', value: nutrition.ash, unit: 'g', sortValue: nutrition.ash, category: 'basic' })
    }
    
    // 维生素
    if (nutrition.vitaminA !== undefined) {
      nutritionItems.push({ label: '维生素A', value: nutrition.vitaminA, unit: 'μg', sortValue: nutrition.vitaminA, category: 'vitamin' })
    }
    if (nutrition.vitaminC !== undefined) {
      nutritionItems.push({ label: '维生素C', value: nutrition.vitaminC, unit: 'mg', sortValue: nutrition.vitaminC, category: 'vitamin' })
    }
    if (nutrition.vitaminD !== undefined) {
      nutritionItems.push({ label: '维生素D', value: nutrition.vitaminD, unit: 'μg', sortValue: nutrition.vitaminD, category: 'vitamin' })
    }
    if (nutrition.vitaminE !== undefined) {
      nutritionItems.push({ label: '维生素E', value: nutrition.vitaminE, unit: 'mg', sortValue: nutrition.vitaminE, category: 'vitamin' })
    }
    if (nutrition.vitaminK !== undefined) {
      nutritionItems.push({ label: '维生素K', value: nutrition.vitaminK, unit: 'μg', sortValue: nutrition.vitaminK, category: 'vitamin' })
    }
    if (nutrition.vitaminB1 !== undefined) {
      nutritionItems.push({ label: '维生素B1', value: nutrition.vitaminB1, unit: 'mg', sortValue: nutrition.vitaminB1, category: 'vitamin' })
    }
    if (nutrition.vitaminB2 !== undefined) {
      nutritionItems.push({ label: '维生素B2', value: nutrition.vitaminB2, unit: 'mg', sortValue: nutrition.vitaminB2, category: 'vitamin' })
    }
    if (nutrition.vitaminB6 !== undefined) {
      nutritionItems.push({ label: '维生素B6', value: nutrition.vitaminB6, unit: 'mg', sortValue: nutrition.vitaminB6, category: 'vitamin' })
    }
    if (nutrition.vitaminB12 !== undefined) {
      nutritionItems.push({ label: '维生素B12', value: nutrition.vitaminB12, unit: 'μg', sortValue: nutrition.vitaminB12, category: 'vitamin' })
    }
    if (nutrition.folate !== undefined) {
      nutritionItems.push({ label: '叶酸', value: nutrition.folate, unit: 'μg', sortValue: nutrition.folate, category: 'vitamin' })
    }
    if (nutrition.niacin !== undefined) {
      nutritionItems.push({ label: '烟酸', value: nutrition.niacin, unit: 'mg', sortValue: nutrition.niacin, category: 'vitamin' })
    }
    
    // 矿物质
    if (nutrition.calcium !== undefined) {
      nutritionItems.push({ label: '钙', value: nutrition.calcium, unit: 'mg', sortValue: nutrition.calcium, category: 'mineral' })
    }
    if (nutrition.iron !== undefined) {
      nutritionItems.push({ label: '铁', value: nutrition.iron, unit: 'mg', sortValue: nutrition.iron, category: 'mineral' })
    }
    if (nutrition.zinc !== undefined) {
      nutritionItems.push({ label: '锌', value: nutrition.zinc, unit: 'mg', sortValue: nutrition.zinc, category: 'mineral' })
    }
    if (nutrition.potassium !== undefined) {
      nutritionItems.push({ label: '钾', value: nutrition.potassium, unit: 'mg', sortValue: nutrition.potassium, category: 'mineral' })
    }
    if (nutrition.sodium !== undefined) {
      nutritionItems.push({ label: '钠', value: nutrition.sodium, unit: 'mg', sortValue: nutrition.sodium, category: 'mineral' })
    }
    if (nutrition.magnesium !== undefined) {
      nutritionItems.push({ label: '镁', value: nutrition.magnesium, unit: 'mg', sortValue: nutrition.magnesium, category: 'mineral' })
    }
    if (nutrition.phosphorus !== undefined) {
      nutritionItems.push({ label: '磷', value: nutrition.phosphorus, unit: 'mg', sortValue: nutrition.phosphorus, category: 'mineral' })
    }
    if (nutrition.selenium !== undefined) {
      nutritionItems.push({ label: '硒', value: nutrition.selenium, unit: 'μg', sortValue: nutrition.selenium, category: 'mineral' })
    }
    if (nutrition.copper !== undefined) {
      nutritionItems.push({ label: '铜', value: nutrition.copper, unit: 'mg', sortValue: nutrition.copper, category: 'mineral' })
    }
    if (nutrition.manganese !== undefined) {
      nutritionItems.push({ label: '锰', value: nutrition.manganese, unit: 'mg', sortValue: nutrition.manganese, category: 'mineral' })
    }
    
    // 其他
    if (nutrition.cholesterol !== undefined) {
      nutritionItems.push({ label: '胆固醇', value: nutrition.cholesterol, unit: 'mg', sortValue: nutrition.cholesterol, category: 'other' })
    }
    if (nutrition.sugar !== undefined) {
      nutritionItems.push({ label: '糖', value: nutrition.sugar, unit: 'g', sortValue: nutrition.sugar, category: 'other' })
    }
    
    // 按值从大到小排序
    nutritionItems.sort((a, b) => b.sortValue - a.sortValue)
    
    // 优先选择基础物质，然后选择其他重要营养成分
    const basicItems = nutritionItems.filter(item => item.category === 'basic')
    const otherItems = nutritionItems.filter(item => item.category !== 'basic')
    
    // 组合：优先基础物质，然后其他
    let selectedItems = []
    if (basicItems.length >= 4) {
      selectedItems = basicItems.slice(0, 4)
      // 从其他项目中补充2个
      selectedItems = selectedItems.concat(otherItems.slice(0, 2))
    } else {
      // 如果基础物质不足4个，全部使用
      selectedItems = basicItems.concat(otherItems.slice(0, 6 - basicItems.length))
    }
    
    // 确保不超过6个
    selectedItems = selectedItems.slice(0, 6)
    
    // 移除sortValue和category字段
    const topNutrition = selectedItems.map(item => {
      const { sortValue, category, ...rest } = item
      return rest
    })
    
    // 保存所有营养信息供详情页面使用（按分类分组）
    const allNutrition = {
      basic: nutritionItems.filter(item => item.category === 'basic').map(item => {
        const { sortValue, category, ...rest } = item
        return rest
      }),
      vitamin: nutritionItems.filter(item => item.category === 'vitamin').map(item => {
        const { sortValue, category, ...rest } = item
        return rest
      }),
      mineral: nutritionItems.filter(item => item.category === 'mineral').map(item => {
        const { sortValue, category, ...rest } = item
        return rest
      }),
      other: nutritionItems.filter(item => item.category === 'other').map(item => {
        const { sortValue, category, ...rest } = item
        return rest
      })
    }
    
    // 如果营养信息为空，使用默认值
    if (topNutrition.length === 0) {
      topNutrition.push(
        { label: '蛋白质', value: 0, unit: 'g' },
        { label: '脂肪', value: 0, unit: 'g' },
        { label: '碳水', value: 0, unit: 'g' },
        { label: '纤维', value: 0, unit: 'g' }
      )
    }
    
    const resultData = {
      name: searchData.foodName || '未知食物',
      description: searchData.description || searchData.baikeInfo?.description || '暂无描述',
      calories: searchData.calorie || nutrition.calories || 0,
      // 文字搜索时不显示图片，图片识别时才显示
      imageUrl: searchData.imageUrl || (searchData.searchType === 'photo' ? '/images/default-food.png' : ''),
      confidence: searchData.confidence || 0,
      // 搜索类型：text-文字搜索，photo-图片识别
      searchType: searchData.searchType || 'text',
      // Deepseek特有数据
      healthScore: searchData.healthScore || 70,
      suggestions: searchData.suggestions || [],
      tags: searchData.tags || [],
      source: searchData.source || 'search',
      // 营养信息（只显示前6个）
      nutrition: topNutrition,
      // 保存所有营养信息供详情页面使用
      allNutrition: allNutrition,
      searchData: searchData // 保存原始数据供详情页面使用
    }
    
    this.setData({
      result: resultData,
      showResult: true
    })
    
    // 自动保存到历史记录
    this.autoSaveToHistory(resultData.name, resultData.imageUrl)
  },
  
  // 显示模拟搜索结果（降级方案）
  showMockSearchResult(foodName) {
    const mockResult = {
      name: foodName,
      description: '这是您搜索的食物，营养成分仅供参考',
      calories: Math.floor(Math.random() * 200) + 50,
      imageUrl: '/images/default-food.png',
      nutrition: [
        { label: '蛋白质', value: (Math.random() * 20).toFixed(1), unit: 'g' },
        { label: '脂肪', value: (Math.random() * 15).toFixed(1), unit: 'g' },
        { label: '碳水', value: (Math.random() * 30).toFixed(1), unit: 'g' },
        { label: '纤维', value: (Math.random() * 10).toFixed(1), unit: 'g' }
      ],
      searchData: {
        foodName: foodName,
        source: 'mock'
      }
    }
    
    this.setData({
      result: mockResult,
      showResult: true
    })
    
    // 自动保存到历史记录
    this.autoSaveToHistory(mockResult.name, mockResult.imageUrl)
  },

  // 选择热门食物
  selectHotFood(e) {
    const food = e.currentTarget.dataset.food
    this.setData({
      foodName: food
    })
    
    // 自动搜索
    this.searchFood()
  },

  // 预览图片
  previewImage() {
    const imageUrl = this.data.result.imageUrl
    if (imageUrl) {
      wx.previewImage({
        urls: [imageUrl],
        current: imageUrl
      })
    }
  },

  // 自动保存到历史记录（搜索或识别成功后调用）
  autoSaveToHistory(foodName, imageUrl) {
    // 更新最近记录
    const newRecord = {
      name: foodName,
      time: this.formatTime(new Date()),
      imageUrl: imageUrl || ImagePaths.getDefaultFood()
    }
    
    const recentHistory = [newRecord, ...this.data.recentHistory.slice(0, 2)]
    this.setData({ recentHistory })
    
    // 可以在这里添加云存储逻辑
    console.log('自动保存记录:', newRecord)
  },

  // 查看详情
  viewDetails() {
    // 构建传递给详情页面的数据
    // 优先使用原始nutrition对象（来自searchData），如果没有则使用分类后的数据
    let nutritionData = {}
    if (this.data.result.searchData && this.data.result.searchData.nutrition) {
      // 使用原始nutrition对象
      nutritionData = this.data.result.searchData.nutrition
    } else if (this.data.result.aiData && this.data.result.aiData.nutrition) {
      // 使用AI数据中的nutrition
      nutritionData = this.data.result.aiData.nutrition
    } else if (this.data.result.allNutrition) {
      // 如果是分类数据，需要转换
      if (typeof this.data.result.allNutrition === 'object' && !Array.isArray(this.data.result.allNutrition)) {
        // 如果已经是对象，直接使用
        nutritionData = this.data.result.allNutrition
      } else {
        // 如果是数组，转换为对象
        nutritionData = this.arrayToObject(this.data.result.allNutrition)
      }
    }
    
    const foodData = {
      name: this.data.result.name,
      imageUrl: this.data.result.imageUrl,
      calories: this.data.result.calories,
      description: this.data.result.description,
      // Deepseek特有数据
      healthScore: this.data.result.healthScore || 70,
      suggestions: this.data.result.suggestions || [],
      tags: this.data.result.tags || [],
      source: this.data.result.source || 'ai',
      // 营养信息（使用原始对象格式）
      nutrition: nutritionData,
      // 保存所有营养信息数组（用于分类显示）
      allNutrition: this.data.result.allNutrition || this.data.result.nutrition,
      // AI原始数据
      aiData: this.data.result.aiData || null,
      searchData: this.data.result.searchData || {}
    }
    
    wx.navigateTo({
      url: '/pages/detail/detail?food=' + encodeURIComponent(JSON.stringify(foodData))
    })
  },
  
  // 将营养数组转换为对象
  arrayToObject(nutritionArray) {
    if (!nutritionArray || !Array.isArray(nutritionArray)) {
      return {}
    }
    
    const nutritionObj = {}
    nutritionArray.forEach(item => {
      const keyMap = {
        '蛋白质': 'protein',
        '脂肪': 'fat',
        '碳水': 'carbohydrate',
        '纤维': 'fiber',
        '维生素': 'vitamin',
        '矿物质': 'mineral'
      }
      
      const key = keyMap[item.label] || item.label.toLowerCase()
      nutritionObj[key] = item.value
    })
    
    return nutritionObj
  },

  // 查看历史记录项
  viewHistoryItem(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.recentHistory[index]
    
    // 构建传递给详情页面的数据
    const foodData = {
      name: item.name,
      imageUrl: item.imageUrl,
      calories: 0, // 历史记录可能没有热量数据
      description: `这是您之前记录的${item.name}`,
      nutrition: {},
      source: 'history'
    }
    
    wx.navigateTo({
      url: '/pages/detail/detail?food=' + encodeURIComponent(JSON.stringify(foodData))
    })
  },

  // 前往历史记录页
  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  // 加载最近记录
  loadRecentHistory() {
    try {
      // 从本地存储加载历史记录
      const records = wx.getStorageSync('recognition_records') || []
      const recentHistory = records.slice(0, 3).map(record => ({
        name: record.foodName || '未知食物',
        time: this.formatTime(new Date(record.createTime || record.timestamp)),
        imageUrl: record.imageUrl || ImagePaths.getDefaultFood()
      }))
      
      this.setData({ recentHistory })
      console.log('加载最近记录成功，共', recentHistory.length, '条')
    } catch (error) {
      console.error('加载最近记录失败:', error)
    }
  },

  // 格式化时间
  formatTime(date) {
    const now = new Date()
    const target = new Date(date)
    const diff = now - target
    
    if (diff < 60 * 1000) {
      return '刚刚'
    } else if (diff < 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 1000)) + '分钟前'
    } else if (diff < 24 * 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 60 * 1000)) + '小时前'
    } else {
      const hours = target.getHours().toString().padStart(2, '0')
      const minutes = target.getMinutes().toString().padStart(2, '0')
      return `${target.getMonth() + 1}-${target.getDate()} ${hours}:${minutes}`
    }
  },

  // 底部导航切换
  onTabChange(e) {
    const tab = e.detail
    this.setData({ activeTab: tab })
    
    switch (tab) {
      case 'home':
        // 已经在首页
        break
      case 'camera':
        this.takePhoto()
        break
      case 'history':
        wx.navigateTo({
          url: '/pages/history/history'
        })
        break
      case 'profile':
        wx.navigateTo({
          url: '/pages/profile/profile'
        })
        break
    }
  },

  // 检查相机权限
  async checkCameraPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          console.log('相机权限状态:', res.authSetting['scope.camera'])
          if (res.authSetting['scope.camera'] === undefined) {
            // 首次使用，需要请求授权
            console.log('首次使用，请求相机权限')
            wx.authorize({
              scope: 'scope.camera',
              success: () => {
                console.log('相机权限授权成功')
                resolve(true)
              },
              fail: (error) => {
                console.log('相机权限授权失败:', error)
                // 授权失败，可能是用户拒绝了
                resolve(false)
              }
            })
          } else if (res.authSetting['scope.camera'] === false) {
            // 用户之前拒绝了授权
            console.log('相机权限已被拒绝，需要引导用户去设置')
            // 这里可以引导用户去设置页面开启权限
            resolve(false)
          } else {
            // 已授权
            console.log('相机权限已授权')
            resolve(true)
          }
        },
        fail: (error) => {
          console.log('获取权限设置失败:', error)
          resolve(false)
        }
      })
    })
  },

  // 直接测试拍照（绕过权限检查）
  async testDirectCamera() {
    try {
      console.log('直接测试拍照...')
      this.setData({ loading: true })
      
      // 直接调用 wx.chooseMedia
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['camera'],
          sizeType: ['compressed'],
          camera: 'back',
          success: resolve,
          fail: reject
        })
      })
      
      console.log('拍照成功:', res)
      
      if (res.tempFiles && res.tempFiles.length > 0) {
        const imageFile = res.tempFiles[0]
        console.log('图片信息:', imageFile)
        
        // 直接处理图片
        const result = {
          originalPath: imageFile.tempFilePath,
          originalSize: imageFile.size,
          width: imageFile.width,
          height: imageFile.height,
          type: imageFile.fileType,
          processed: false,
          finalPath: imageFile.tempFilePath,
          finalSize: imageFile.size
        }
        
        await this.handleProcessedImage(result)
      }
      
    } catch (error) {
      console.error('直接测试拍照失败:', error)
      wx.showToast({
        title: '拍照失败: ' + error.errMsg,
        icon: 'none',
        duration: 3000
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 测试Deepseek API
  async testDeepseekAPI() {
    try {
      this.setData({ loading: true })
      
      wx.showLoading({
        title: '测试Deepseek API...',
        mask: true
      })
      
      // 直接调用Deepseek服务测试
      const deepseekService = require('../../services/deepseek-service.js')
      
      // 测试API连接
      const connectionResult = await deepseekService.searchFoodInfo('苹果', {
        getNutrition: true,
        maxTokens: 500
      })
      
      wx.hideLoading()
      
      if (connectionResult.success) {
        const data = connectionResult.data
        
        // 显示测试结果
        wx.showModal({
          title: 'Deepseek API测试成功',
          content: `API连接成功！
          
食物名称: ${data.foodName}
热量: ${data.calorie} kcal
健康评分: ${data.healthScore || 70}

营养信息:
蛋白质: ${data.nutrition?.protein || 0}g
脂肪: ${data.nutrition?.fat || 0}g
碳水: ${data.nutrition?.carbohydrate || 0}g
纤维: ${data.nutrition?.fiber || 0}g

建议: ${data.suggestions?.[0] || '暂无建议'}`,
          showCancel: false,
          confirmText: '好的'
        })
        
        // 也可以直接显示在结果区域
        this.showSearchResult(data)
        
      } else {
        wx.showModal({
          title: 'Deepseek API测试失败',
          content: `错误: ${connectionResult.error || '未知错误'}
          
请检查:
1. API密钥是否正确配置
2. 网络连接是否正常
3. Deepseek服务是否可用`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
      
    } catch (error) {
      wx.hideLoading()
      
      wx.showModal({
        title: '测试异常',
        content: `异常信息: ${error.message}
        
可能的原因:
1. API密钥配置错误
2. 网络请求超时
3. 代码逻辑错误`,
        showCancel: false,
        confirmText: '关闭'
      })
      
      console.error('Deepseek API测试异常:', error)
      
    } finally {
      this.setData({ loading: false })
    }
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: 'AI轻食记 - 智能食物识别',
      path: '/pages/index/index',
      imageUrl: ImagePaths.getShareCover()
    }
  }
})