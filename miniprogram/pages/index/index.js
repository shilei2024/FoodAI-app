// pages/index/index.js - 清理版本
const app = getApp()
const Toast = require('../../miniprogram_npm/vant-weapp/toast/toast')
const Dialog = require('../../miniprogram_npm/vant-weapp/dialog/dialog')
const imageProcessor = require('../../utils/imageProcessor.js')
const aiServiceModule = require('../../services/ai-service.js')

Page({
  data: {
    // 页面数据
    foodName: '',
    showResult: false,
    loading: false,
    activeTab: 'home',
    
    // 用户状态
    isLoggedIn: false,
    isGuest: true,
    userStatus: 'guest', // guest, logged_in, vip
    userInfo: null,
    
    // 使用次数限制
    dailyPhotoLimit: 5,
    dailySearchLimit: 10,
    todayPhotoCount: 0,
    todaySearchCount: 0,
    photoRemaining: 5,
    searchRemaining: 10,
    
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
    
    // 加载用户状态
    this.loadUserStatus()
  },

  onShow() {
    // 页面显示时更新数据
    this.loadRecentHistory()
  },

  initPage() {
    // 初始化页面
    console.log('首页初始化')
  },
  
  // 加载用户状态
  loadUserStatus() {
    const app = getApp()
    
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      isGuest: app.globalData.isGuest,
      userStatus: app.globalData.userStatus,
      userInfo: app.globalData.userInfo,
      todayPhotoCount: app.globalData.todayPhotoCount,
      todaySearchCount: app.globalData.todaySearchCount,
      photoRemaining: app.globalData.dailyPhotoLimit - app.globalData.todayPhotoCount,
      searchRemaining: app.globalData.dailySearchLimit - app.globalData.todaySearchCount
    })
    
    console.log('用户状态加载完成:', {
      isLoggedIn: this.data.isLoggedIn,
      isGuest: this.data.isGuest,
      userStatus: this.data.userStatus,
      photoRemaining: this.data.photoRemaining,
      searchRemaining: this.data.searchRemaining
    })
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
    
    // 检查用户权限
    const app = getApp()
    const permission = app.checkPhotoPermission()
    
    if (!permission.canUse) {
      if (permission.needLogin) {
        // 需要登录
        this.showLoginDialog('拍照识别')
      } else {
        // 次数用完
        wx.showModal({
          title: '使用限制',
          content: permission.reason,
          showCancel: false,
          confirmText: '知道了'
        })
      }
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

  // 打开相机拍照 - 简化稳定版本
  async openCamera() {
    console.log('开始打开相机（简化版本）')
    try {
      this.setData({ loading: true })
      
      // 直接使用 wx.chooseMedia 拍照
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
        const file = res.tempFiles[0]
        console.log('图片信息:', file)
        
        // 压缩图片（如果需要）
        let finalPath = file.tempFilePath
        let finalSize = file.size
        
        if (file.size > 500 * 1024) { // 大于500KB才压缩
          console.log('图片太大，开始压缩...')
          try {
            const compressRes = await new Promise((resolve, reject) => {
              wx.compressImage({
                src: file.tempFilePath,
                quality: 80,
                success: resolve,
                fail: reject
              })
            })
            finalPath = compressRes.tempFilePath
            finalSize = compressRes.tempFileSize || file.size
            console.log('压缩完成，新大小:', finalSize)
          } catch (compressError) {
            console.warn('压缩失败，使用原图:', compressError)
          }
        }
        
        // 构建结果对象
        const result = {
          files: [{
            path: finalPath,
            size: finalSize,
            width: file.width,
            height: file.height,
            type: file.fileType
          }],
          originalPath: file.tempFilePath,
          originalSize: file.size,
          width: file.width,
          height: file.height,
          type: file.fileType,
          processed: finalSize < file.size,
          finalPath: finalPath,
          finalSize: finalSize,
          info: {
            width: file.width,
            height: file.height
          }
        }
        
        console.log('处理成功，开始识别:', result)
        await this.handleProcessedImage(result)
      } else {
        throw new Error('未获取到图片文件')
      }
      
    } catch (error) {
      console.error('拍照处理失败:', error)
      
      // 处理权限错误
      if (error.errMsg && error.errMsg.includes('auth deny') || 
          error.message.includes('权限') || 
          error.errMsg?.includes('authorize')) {
        console.log('显示权限错误对话框')
        Dialog.confirm({
          title: '相机权限',
          message: '需要相机权限才能拍照识别食物',
          confirmButtonText: '去设置',
          cancelButtonText: '取消'
        }).then(() => {
          wx.openSetting()
        }).catch(() => {
          // 用户取消
        })
      } else if (error.errMsg && error.errMsg.includes('cancel')) {
        // 用户取消拍照，不显示错误
        console.log('用户取消了拍照')
      } else {
        // 显示友好的错误提示
        let errorMessage = '拍照失败，请重试'
        if (error.errMsg) {
          if (error.errMsg.includes('fail')) {
            errorMessage = '拍照失败，请检查相机是否正常'
          }
        }
        
        wx.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 3000
        })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  // 从相册选择图片 - 简化稳定版本
  async chooseImageFromAlbum() {
    console.log('开始从相册选择图片（简化版本）')
    try {
      this.setData({ loading: true })
      
      // 直接使用 wx.chooseMedia 选择图片
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album'],
          sizeType: ['compressed'],
          success: resolve,
          fail: reject
        })
      })
      
      console.log('选择图片成功:', res)
      
      if (res.tempFiles && res.tempFiles.length > 0) {
        const file = res.tempFiles[0]
        console.log('图片信息:', file)
        
        // 压缩图片（如果需要）
        let finalPath = file.tempFilePath
        let finalSize = file.size
        
        if (file.size > 500 * 1024) { // 大于500KB才压缩
          console.log('图片太大，开始压缩...')
          try {
            const compressRes = await new Promise((resolve, reject) => {
              wx.compressImage({
                src: file.tempFilePath,
                quality: 80,
                success: resolve,
                fail: reject
              })
            })
            finalPath = compressRes.tempFilePath
            finalSize = compressRes.tempFileSize || file.size
            console.log('压缩完成，新大小:', finalSize)
          } catch (compressError) {
            console.warn('压缩失败，使用原图:', compressError)
          }
        }
        
        // 构建结果对象
        const result = {
          files: [{
            path: finalPath,
            size: finalSize,
            width: file.width,
            height: file.height,
            type: file.fileType
          }],
          originalPath: file.tempFilePath,
          originalSize: file.size,
          width: file.width,
          height: file.height,
          type: file.fileType,
          processed: finalSize < file.size,
          finalPath: finalPath,
          finalSize: finalSize,
          info: {
            width: file.width,
            height: file.height
          }
        }
        
        console.log('处理成功，开始识别:', result)
        await this.handleProcessedImage(result)
      } else {
        throw new Error('未选择图片')
      }
      
    } catch (error) {
      console.error('选择图片处理失败:', error)
      
      if (error.errMsg && error.errMsg.includes('cancel')) {
        // 用户取消选择，不显示错误
        console.log('用户取消了图片选择')
        return
      }
      
      // 显示友好的错误提示
      let errorMessage = '选择图片失败，请重试'
      if (error.errMsg) {
        if (error.errMsg.includes('auth deny') || error.errMsg.includes('权限')) {
          errorMessage = '需要相册权限，请去设置中开启'
          
          Dialog.confirm({
            title: '相册权限',
            message: '需要相册权限才能选择图片',
            confirmButtonText: '去设置',
            cancelButtonText: '取消'
          }).then(() => {
            wx.openSetting()
          })
        } else if (error.errMsg.includes('fail')) {
          errorMessage = '选择图片失败，请重试'
        }
      }
      
      if (!error.errMsg || !error.errMsg.includes('auth deny')) {
        wx.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 3000
        })
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  // 处理已处理的图片
  async handleProcessedImage(processResult) {
    console.log('开始处理已处理的图片，输入:', processResult)
    
    // 显示加载状态
    wx.showLoading({
      title: 'AI识别中...',
      mask: true
    })
    
    try {
      
      // 获取图片路径（适配不同的返回格式）
      let imagePath = ''
      if (processResult.files && processResult.files[0]) {
        imagePath = processResult.files[0].path
      } else if (processResult.finalPath) {
        imagePath = processResult.finalPath
      } else if (typeof processResult === 'string') {
        imagePath = processResult
      } else {
        throw new Error('无法获取图片路径')
      }
      
      console.log('获取到的图片路径:', imagePath)
      
      // 调用真实的AI识别服务
      const recognitionResult = await aiServiceModule.recognizeFood(imagePath, {
        compress: false, // 已经压缩过了
        getNutrition: true,
        saveRecord: true,
        showLoading: false, // 手动控制loading
        silent: true // 不显示错误提示，手动处理
      })
      
      console.log('AI识别结果:', recognitionResult)
      
      if (recognitionResult.success) {
        // 增加拍照使用次数
        const app = getApp()
        const newCount = app.incrementPhotoCount()
        
        // 更新页面状态
        this.setData({
          todayPhotoCount: newCount,
          photoRemaining: app.globalData.dailyPhotoLimit - newCount
        })
        
        // 显示识别结果
        this.showRecognitionResult(imagePath, processResult, recognitionResult.data)
        wx.showToast({
          title: '识别成功！',
          icon: 'success',
          duration: 2000
        })
      } else {
        // 识别失败，显示错误信息但不抛出错误
        const errorMsg = recognitionResult.error || '识别失败，请重试'
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        })
        // 不抛出错误，直接返回
        return
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
        } else if (error.message.includes('无法获取图片路径')) {
          errorMessage = '图片处理失败，请重试'
        } else {
          errorMessage = error.message
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      })
      // 不重新抛出错误，让调用者处理
      return
    } finally {
      // 确保隐藏loading
      wx.hideLoading()
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
    let imageInfo = {}
    let fileSize = 0
    
    if (processResult && processResult.files && processResult.files[0]) {
      const file = processResult.files[0]
      imageInfo = {
        width: file.width || 0,
        height: file.height || 0
      }
      fileSize = file.size || 0
    } else if (processResult && processResult.finalSize) {
      fileSize = processResult.finalSize
    }
    
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
    
    // 检查用户权限
    const app = getApp()
    const permission = app.checkSearchPermission()
    
    if (!permission.canUse) {
      if (permission.needLogin) {
        // 需要登录
        this.showLoginDialog('搜索识别')
      } else {
        // 次数用完
        wx.showModal({
          title: '使用限制',
          content: permission.reason,
          showCancel: false,
          confirmText: '知道了'
        })
      }
      return
    }
    
    this.setData({ loading: true })
    
    try {
      // 使用AI服务搜索食物信息
      const searchResult = await aiServiceModule.searchFoodByName(foodName, {
        getNutrition: true,
        saveRecord: true
      })
      
      if (searchResult.success) {
        // 增加搜索使用次数
        const app = getApp()
        const newCount = app.incrementSearchCount()
        
        // 更新页面状态
        this.setData({
          todaySearchCount: newCount,
          searchRemaining: app.globalData.dailySearchLimit - newCount
        })
        
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
      imageUrl: imageUrl || '/images/default-food.png'
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
        imageUrl: record.imageUrl || '/images/default-food.png'
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

  // 测试直接拍照 - 使用新的简化版本
  async testDirectCamera() {
    try {
      console.log('测试直接拍照（简化版本）')
      this.setData({ loading: true })
      
      wx.showLoading({
        title: '测试拍照...',
        mask: true
      })
      
      // 使用新的简化方法
      await this.openCamera()
      
    } catch (error) {
      console.error('测试拍照失败:', error)
      wx.showModal({
        title: '拍照测试',
        content: `测试完成，结果请查看控制台日志
        
错误信息: ${error.message || '无'}`,
        showCancel: false,
        confirmText: '好的'
      })
    } finally {
      wx.hideLoading()
      this.setData({ loading: false })
    }
  },

  // 测试图片选择功能 - 简化版本
  async testImageSelection() {
    try {
      console.log('开始测试图片选择功能（简化版本）')
      this.setData({ loading: true })
      
      wx.showLoading({
        title: '测试图片选择...',
        mask: true
      })
      
      // 使用新的简化方法
      await this.chooseImageFromAlbum()
      
    } catch (error) {
      console.error('图片选择测试失败:', error)
      wx.showModal({
        title: '图片选择测试',
        content: `测试完成，结果请查看控制台日志
        
错误信息: ${error.message || '无'}`,
        showCancel: false,
        confirmText: '好的'
      })
    } finally {
      wx.hideLoading()
      this.setData({ loading: false })
    }
  },

  // 诊断图片选择功能
  async diagnoseImageSelection() {
    try {
      console.log('开始诊断图片选择功能...')
      this.setData({ loading: true })
      
      wx.showLoading({
        title: '诊断图片选择...',
        mask: true
      })
      
      // 检查权限
      const permissions = await this.checkAllPermissions()
      
      // 检查 wx.chooseMedia API
      const chooseMediaAvailable = typeof wx.chooseMedia === 'function'
      
      // 检查 wx.compressImage API
      const compressImageAvailable = typeof wx.compressImage === 'function'
      
      wx.hideLoading()
      
      // 显示诊断结果
      const content = `图片选择功能诊断报告：
      
权限状态：
- 相机权限: ${permissions.camera ? '✅ 已授权' : '❌ 未授权'}
- 相册权限: ${permissions.album ? '✅ 已授权' : '❌ 未授权'}

API可用性：
- wx.chooseMedia: ${chooseMediaAvailable ? '✅ 可用' : '❌ 不可用'}
- wx.compressImage: ${compressImageAvailable ? '✅ 可用' : '❌ 不可用'}

当前实现：
- 使用简化版本（直接调用 wx.chooseMedia）
- 自动压缩大图片（>500KB）
- 详细的错误处理

建议操作：
1. 点击"测试图片选择"按钮测试相册功能
2. 点击"测试直接拍照"按钮测试相机功能
3. 查看控制台日志获取详细信息`

      wx.showModal({
        title: '图片选择功能诊断',
        content: content,
        showCancel: false,
        confirmText: '知道了'
      })
      
      // 在控制台输出详细日志
      console.log('图片选择功能诊断详情:', {
        permissions,
        apiAvailability: {
          chooseMedia: chooseMediaAvailable,
          compressImage: compressImageAvailable
        },
        currentImplementation: 'simplified_version'
      })
      
    } catch (error) {
      wx.hideLoading()
      
      wx.showModal({
        title: '诊断失败',
        content: `诊断过程中出现错误：
        
错误信息: ${error.message}`,
        showCancel: false,
        confirmText: '关闭'
      })
      
      console.error('图片选择功能诊断失败:', error)
      
    } finally {
      this.setData({ loading: false })
    }
  },

  // 检查所有权限
  async checkAllPermissions() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          const authSetting = res.authSetting || {}
          resolve({
            camera: authSetting['scope.camera'] === true,
            album: authSetting['scope.writePhotosAlbum'] === true
          })
        },
        fail: () => {
          resolve({
            camera: false,
            album: false
          })
        }
      })
    })
  },

  // 诊断AI服务状态
  async diagnoseAIService() {
    try {
      console.log('开始诊断AI服务状态...')
      this.setData({ loading: true })
      
      wx.showLoading({
        title: '诊断AI服务...',
        mask: true
      })
      
      // 获取AI服务状态
      const aiService = require('../../services/ai-service.js')
      const serviceStatus = aiService.getServiceStatus()
      
      // 获取配置
      const config = require('../../constants/config.js')
      
      // 检查云函数状态
      let cloudFunctionStatus = '未知'
      try {
        const secureAIService = require('../../services/secure-ai-service.js')
        const healthCheck = await secureAIService.healthCheck()
        cloudFunctionStatus = healthCheck.cloudFunction ? '正常' : '异常'
      } catch (cloudError) {
        cloudFunctionStatus = `异常: ${cloudError.message}`
      }
      
      wx.hideLoading()
      
      // 显示诊断结果
      const content = `AI服务诊断报告：
      
配置状态：
- 百度AI: ${serviceStatus.baiduAI.configured ? '✅ 已配置' : '❌ 未配置'}
- Deepseek API: ${serviceStatus.deepseekAI.configured ? '✅ 已配置' : '❌ 未配置'}
- 当前服务: ${serviceStatus.currentService}
- 安全模式: ${serviceStatus.secureMode ? '✅ 是' : '❌ 否'}

云函数状态: ${cloudFunctionStatus}

环境配置：
- 云环境ID: ${config.cloud?.env || '❌ 未配置'}
- 调试模式: ${config.debug.enabled ? '✅ 开启' : '❌ 关闭'}

当前问题分析：
${serviceStatus.secureMode ? 
  '🔴 问题：启用了安全模式，但云函数可能未部署或配置错误\n  解决方案：\n  1. 部署云函数（http-proxy, baidu-ai）\n  2. 或修改代码使用直接调用模式' : 
  '🟢 状态：使用直接调用模式，应该可以正常工作\n  如果仍有问题，请测试百度AI直接调用'}

建议操作：
1. 点击"测试百度AI"按钮验证API密钥
2. 查看控制台错误日志获取详细信息
3. 如果使用安全模式，请部署云函数
4. 如果使用直接模式，请检查网络连接`

      wx.showModal({
        title: 'AI服务诊断报告',
        content: content,
        showCancel: false,
        confirmText: '知道了'
      })
      
      // 在控制台输出详细日志
      console.log('AI服务诊断详情:', {
        serviceStatus,
        config: {
          cloudEnv: config.cloud?.env,
          debugMode: config.debug.enabled,
          baiduAI: {
            apiKey: config.baiduAI.apiKey ? '已配置' : '未配置',
            secretKey: config.baiduAI.secretKey ? '已配置' : '未配置'
          },
          deepseekAI: {
            apiKey: config.deepseekAI.apiKey ? '已配置' : '未配置'
          }
        },
        cloudFunctionStatus
      })
      
    } catch (error) {
      wx.hideLoading()
      
      wx.showModal({
        title: '诊断失败',
        content: `诊断过程中出现错误：
        
错误信息: ${error.message}
        
请检查：
1. 代码是否有语法错误
2. 配置文件是否正确
3. 网络连接是否正常`,
        showCancel: false,
        confirmText: '关闭'
      })
      
      console.error('AI服务诊断失败:', error)
      
    } finally {
      this.setData({ loading: false })
    }
  },

  // 测试百度AI直接调用
  async testBaiduAIDirect() {
    try {
      console.log('开始测试百度AI直接调用...')
      this.setData({ loading: true })
      
      wx.showLoading({
        title: '测试百度AI...',
        mask: true
      })
      
      // 直接调用百度AI服务
      const baiduAIService = require('../../services/baidu-ai-service.js')
      
      // 使用一个测试图片（可以是本地图片或网络图片）
      const testImagePath = '/images/default-food.png'
      
      console.log('使用测试图片:', testImagePath)
      
      const result = await baiduAIService.recognizeFood(testImagePath, {
        compress: true,
        getNutrition: true,
        saveRecord: false
      })
      
      wx.hideLoading()
      
      console.log('百度AI测试结果:', result)
      
      if (result.success) {
        wx.showModal({
          title: '百度AI测试成功',
          content: `食物识别成功！
          
识别结果: ${result.data.foodName}
置信度: ${result.data.confidence}
热量: ${result.data.calorie}千卡

营养信息:
蛋白质: ${result.data.nutrition?.protein || 0}g
脂肪: ${result.data.nutrition?.fat || 0}g
碳水: ${result.data.nutrition?.carbohydrate || 0}g`,
          showCancel: false,
          confirmText: '好的'
        })
        
        // 显示结果
        this.showRecognitionResult(testImagePath, null, result.data)
        
      } else {
        wx.showModal({
          title: '百度AI测试失败',
          content: `错误: ${result.error || '未知错误'}
          
可能的原因:
1. API密钥错误
2. 网络连接问题
3. 百度AI服务不可用`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
      
    } catch (error) {
      wx.hideLoading()
      
      wx.showModal({
        title: '测试异常',
        content: `异常信息: ${error.message}
        
详细错误: ${error.stack || '无堆栈信息'}`,
        showCancel: false,
        confirmText: '关闭'
      })
      
      console.error('百度AI直接调用测试异常:', error)
      
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

  // 测试百度AI API
  async testBaiduAIAPI() {
    try {
      this.setData({ loading: true })
      
      wx.showLoading({
        title: '测试百度AI API...',
        mask: true
      })
      
      // 获取AI服务
      const aiService = require('../../services/ai-service.js')
      
      // 测试百度AI连接
      const connectionResult = await aiService.testBaiduAIConnection()
      
      wx.hideLoading()
      
      if (connectionResult.success) {
        // 获取服务状态
        const serviceStatus = aiService.getServiceStatus()
        
        // 显示测试结果
        wx.showModal({
          title: '百度AI API测试成功',
          content: `API连接成功！
          
百度AI配置状态:
- API Key: ${serviceStatus.baiduAI.apiKey}
- Secret Key: ${serviceStatus.baiduAI.secretKey}
- 服务启用: ${serviceStatus.baiduAI.enabled ? '是' : '否'}

当前AI服务: ${serviceStatus.currentService}
安全模式: ${serviceStatus.secureMode ? '是' : '否'}

测试时间: ${new Date(connectionResult.timestamp).toLocaleString()}`,
          showCancel: false,
          confirmText: '好的'
        })
        
      } else {
        wx.showModal({
          title: '百度AI API测试失败',
          content: `错误: ${connectionResult.error || '未知错误'}
          
请检查:
1. API密钥是否正确配置
2. Secret Key是否正确配置
3. 网络连接是否正常
4. 百度AI服务是否可用

配置位置: miniprogram/constants/config.js
需要配置: baiduAI.apiKey 和 baiduAI.secretKey`,
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
      
      console.error('百度AI API测试异常:', error)
      
    } finally {
      this.setData({ loading: false })
    }
  },

  // 切换AI服务
  async switchAIService() {
    try {
      const aiService = require('../../services/ai-service.js')
      const serviceStatus = aiService.getServiceStatus()
      
      const currentService = serviceStatus.currentService
      const newService = currentService === '百度AI' ? 'Deepseek API' : '百度AI'
      
      wx.showActionSheet({
        itemList: [`切换到${newService}`, '取消'],
        success: (res) => {
          if (res.tapIndex === 0) {
            aiService.setAIService(newService === '百度AI' ? 'baidu' : 'deepseek')
            
            wx.showToast({
              title: `已切换到${newService}`,
              icon: 'success',
              duration: 2000
            })
            
            // 显示新的服务状态
            setTimeout(() => {
              const newStatus = aiService.getServiceStatus()
              wx.showModal({
                title: 'AI服务状态',
                content: `当前AI服务: ${newStatus.currentService}
                
百度AI:
- 配置: ${newStatus.baiduAI.configured ? '已配置' : '未配置'}
- 启用: ${newStatus.baiduAI.enabled ? '是' : '否'}

Deepseek API:
- 配置: ${newStatus.deepseekAI.configured ? '已配置' : '未配置'}
- 启用: ${newStatus.deepseekAI.enabled ? '是' : '否'}`,
                showCancel: false,
                confirmText: '好的'
              })
            }, 500)
          }
        }
      })
      
    } catch (error) {
      console.error('切换AI服务失败:', error)
      wx.showToast({
        title: '切换失败: ' + error.message,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 显示登录对话框
  showLoginDialog(featureName = '此功能') {
    wx.showModal({
      title: '需要登录',
      content: `游客无法使用${featureName}，请先登录`,
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 跳转到登录/个人页面
          wx.navigateTo({
            url: '/pages/profile/profile'
          })
        }
      }
    })
  },
  
  // 用户登录
  async handleUserLogin() {
    try {
      const app = getApp()
      
      // 这里可以调用微信登录API
      // 为了简化，我们使用模拟登录
      const userInfo = {
        nickName: '用户' + Date.now().toString().slice(-4),
        avatarUrl: '/images/default-avatar.png',
        openId: 'user_' + Date.now(),
        loginTime: Date.now()
      }
      
      const result = await app.userLogin(userInfo)
      
      if (result.success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 2000
        })
        
        // 更新页面状态
        this.loadUserStatus()
        
        return true
      } else {
        wx.showToast({
          title: result.message,
          icon: 'none',
          duration: 3000
        })
        return false
      }
    } catch (error) {
      console.error('登录处理失败:', error)
      wx.showToast({
        title: '登录失败',
        icon: 'none',
        duration: 3000
      })
      return false
    }
  },
  
  // 用户退出
  handleUserLogout() {
    const app = getApp()
    const result = app.userLogout()
    
    if (result.success) {
      wx.showToast({
        title: '已退出登录',
        icon: 'success',
        duration: 2000
      })
      
      // 更新页面状态
      this.loadUserStatus()
    } else {
      wx.showToast({
        title: result.message,
        icon: 'none',
        duration: 3000
      })
    }
  },
  
  // 页面分享
  onShareAppMessage() {
    return {
      title: 'AI轻食记 - 智能食物识别',
      path: '/pages/index/index',
      imageUrl: '/images/default-food.png'
    }
  }
})