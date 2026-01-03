// components/image-cropper/index.js
const imageProcessor = require('../../utils/imageProcessor.js')

Component({
  properties: {
    // 图片源
    imageSrc: {
      type: String,
      value: '',
      observer: 'onImageSrcChange'
    },
    
    // 裁剪比例选项
    ratioOptions: {
      type: Array,
      value: [
        { label: '自由', value: 'free' },
        { label: '1:1', value: '1:1' },
        { label: '4:3', value: '4:3' },
        { label: '16:9', value: '16:9' },
        { label: '3:4', value: '3:4' },
        { label: '9:16', value: '9:16' }
      ]
    },
    
    // 默认裁剪比例
    defaultRatio: {
      type: String,
      value: 'free'
    },
    
    // 最小裁剪尺寸
    minCropSize: {
      type: Number,
      value: 100
    },
    
    // 是否显示比例选择器
    showRatioSelector: {
      type: Boolean,
      value: true
    },
    
    // 输出图片质量
    outputQuality: {
      type: Number,
      value: 90
    },
    
    // 输出图片格式
    outputType: {
      type: String,
      value: 'jpg' // jpg, png
    }
  },

  data: {
    // 容器尺寸
    containerWidth: 0,
    containerHeight: 0,
    
    // 图片尺寸
    imageWidth: 0,
    imageHeight: 0,
    imageLoaded: false,
    
    // 变换参数
    translateX: 0,
    translateY: 0,
    scale: 1,
    rotation: 0,
    
    // 裁剪框参数
    cropWidth: 300,
    cropHeight: 300,
    cropLeft: 0,
    cropTop: 0,
    
    // 限制参数
    minScale: 0.5,
    maxScale: 3,
    
    // 状态
    activeRatio: 'free',
    loading: false,
    outputSize: '',
    
    // 触摸状态
    touchStart: { x: 0, y: 0 },
    lastTouch: { x: 0, y: 0 },
    isDragging: false,
    isScaling: false,
    initialDistance: 0,
    currentTouches: []
  },

  lifetimes: {
    attached() {
      this.initComponent()
    },
    
    detached() {
      // 清理资源
      this.cleanup()
    }
  },

  methods: {
    /**
     * 初始化组件
     */
    initComponent() {
      // 获取系统信息
      const systemInfo = wx.getSystemInfoSync()
      this.systemInfo = systemInfo
      
      // 设置容器尺寸（留出操作区域空间）
      const containerHeight = systemInfo.windowHeight - 300 // 操作区域大约300rpx
      this.setData({
        containerWidth: systemInfo.windowWidth,
        containerHeight: containerHeight,
        activeRatio: this.properties.defaultRatio
      })
      
      // 初始化裁剪框位置
      this.initCropFrame()
      
      // 如果有图片源，加载图片
      if (this.properties.imageSrc) {
        this.loadImage(this.properties.imageSrc)
      }
    },
    
    /**
     * 清理资源
     */
    cleanup() {
      // 清理临时文件等
    },
    
    /**
     * 图片源变化监听
     */
    onImageSrcChange(newSrc) {
      if (newSrc) {
        this.loadImage(newSrc)
      }
    },
    
    /**
     * 加载图片
     */
    async loadImage(imageSrc) {
      this.setData({ loading: true })
      
      try {
        // 获取图片信息
        const imageInfo = await imageProcessor.getImageInfo(imageSrc)
        
        // 计算图片在容器中的显示尺寸
        const displaySize = this.calculateDisplaySize(
          imageInfo.width,
          imageInfo.height
        )
        
        // 更新数据
        this.setData({
          imageWidth: displaySize.width,
          imageHeight: displaySize.height,
          imageLoaded: true,
          loading: false
        })
        
        // 调整裁剪框位置
        this.adjustCropFrameToImage()
        
      } catch (error) {
        console.error('加载图片失败:', error)
        this.setData({ loading: false })
        this.triggerEvent('error', { error: error.message })
      }
    },
    
    /**
     * 计算图片显示尺寸
     */
    calculateDisplaySize(originalWidth, originalHeight) {
      const { containerWidth, containerHeight } = this.data
      
      // 计算适应容器的尺寸
      const widthRatio = containerWidth / originalWidth
      const heightRatio = containerHeight / originalHeight
      const ratio = Math.min(widthRatio, heightRatio)
      
      return {
        width: originalWidth * ratio,
        height: originalHeight * ratio
      }
    },
    
    /**
     * 初始化裁剪框
     */
    initCropFrame() {
      const { containerWidth, containerHeight } = this.data
      const minSize = Math.min(containerWidth, containerHeight) * 0.6
      
      // 初始裁剪框居中
      const cropWidth = minSize
      const cropHeight = minSize
      const cropLeft = (containerWidth - cropWidth) / 2
      const cropTop = (containerHeight - cropHeight) / 2
      
      this.setData({
        cropWidth,
        cropHeight,
        cropLeft,
        cropTop
      })
      
      // 计算遮罩层尺寸
      this.updateMaskDimensions()
    },
    
    /**
     * 调整裁剪框到图片位置
     */
    adjustCropFrameToImage() {
      const { containerWidth, containerHeight, imageWidth, imageHeight } = this.data
      
      // 计算图片在容器中的位置（居中）
      const imageLeft = (containerWidth - imageWidth) / 2
      const imageTop = (containerHeight - imageHeight) / 2
      
      // 调整裁剪框在图片范围内
      const cropLeft = Math.max(imageLeft, this.data.cropLeft)
      const cropTop = Math.max(imageTop, this.data.cropTop)
      const cropRight = Math.min(imageLeft + imageWidth, cropLeft + this.data.cropWidth)
      const cropBottom = Math.min(imageTop + imageHeight, cropTop + this.data.cropHeight)
      
      this.setData({
        cropWidth: cropRight - cropLeft,
        cropHeight: cropBottom - cropTop,
        cropLeft,
        cropTop,
        translateX: 0,
        translateY: 0,
        scale: 1,
        rotation: 0
      })
      
      this.updateMaskDimensions()
    },
    
    /**
     * 更新遮罩层尺寸
     */
    updateMaskDimensions() {
      const { containerWidth, containerHeight, cropLeft, cropTop, cropWidth, cropHeight } = this.data
      
      this.setData({
        maskRightWidth: containerWidth - cropLeft - cropWidth,
        maskBottomHeight: containerHeight - cropTop - cropHeight
      })
    },
    
    /**
     * 图片加载完成
     */
    onImageLoad(e) {
      console.log('图片加载完成:', e.detail)
      this.triggerEvent('load', e.detail)
    },
    
    /**
     * 触摸开始
     */
    onTouchStart(e) {
      const touches = e.touches
      this.data.currentTouches = touches
      
      if (touches.length === 1) {
        // 单指触摸 - 拖动
        const touch = touches[0]
        this.data.touchStart = { x: touch.clientX, y: touch.clientY }
        this.data.lastTouch = { x: touch.clientX, y: touch.clientY }
        this.data.isDragging = true
        
      } else if (touches.length === 2) {
        // 双指触摸 - 缩放
        const touch1 = touches[0]
        const touch2 = touches[1]
        
        const dx = touch1.clientX - touch2.clientX
        const dy = touch1.clientY - touch2.clientY
        this.data.initialDistance = Math.sqrt(dx * dx + dy * dy)
        this.data.isScaling = true
      }
    },
    
    /**
     * 触摸移动
     */
    onTouchMove(e) {
      const touches = e.touches
      
      if (touches.length === 1 && this.data.isDragging) {
        // 单指拖动
        const touch = touches[0]
        const deltaX = touch.clientX - this.data.lastTouch.x
        const deltaY = touch.clientY - this.data.lastTouch.y
        
        this.data.lastTouch = { x: touch.clientX, y: touch.clientY }
        
        // 更新位置
        this.setData({
          translateX: this.data.translateX + deltaX,
          translateY: this.data.translateY + deltaY
        })
        
      } else if (touches.length === 2 && this.data.isScaling) {
        // 双指缩放
        const touch1 = touches[0]
        const touch2 = touches[1]
        
        const dx = touch1.clientX - touch2.clientX
        const dy = touch1.clientY - touch2.clientY
        const currentDistance = Math.sqrt(dx * dx + dy * dy)
        
        if (this.data.initialDistance > 0) {
          const scaleChange = currentDistance / this.data.initialDistance
          const newScale = this.data.scale * scaleChange
          
          // 限制缩放范围
          const clampedScale = Math.max(
            this.data.minScale,
            Math.min(this.data.maxScale, newScale)
          )
          
          this.setData({
            scale: clampedScale
          })
          
          this.data.initialDistance = currentDistance
        }
      }
      
      e.preventDefault()
    },
    
    /**
     * 触摸结束
     */
    onTouchEnd(e) {
      this.data.isDragging = false
      this.data.isScaling = false
      this.data.initialDistance = 0
      this.data.currentTouches = []
    },
    
    /**
     * 改变裁剪比例
     */
    onRatioChange(e) {
      const ratio = e.currentTarget.dataset.ratio
      this.setData({ activeRatio: ratio })
      
      // 根据比例调整裁剪框
      this.adjustCropFrameByRatio(ratio)
    },
    
    /**
     * 根据比例调整裁剪框
     */
    adjustCropFrameByRatio(ratio) {
      const { containerWidth, containerHeight, cropLeft, cropTop } = this.data
      let newWidth = this.data.cropWidth
      let newHeight = this.data.cropHeight
      
      switch (ratio) {
        case '1:1':
          const size = Math.min(this.data.cropWidth, this.data.cropHeight)
          newWidth = size
          newHeight = size
          break
          
        case '4:3':
          newHeight = newWidth * 3 / 4
          break
          
        case '16:9':
          newHeight = newWidth * 9 / 16
          break
          
        case '3:4':
          newWidth = newHeight * 3 / 4
          break
          
        case '9:16':
          newWidth = newHeight * 9 / 16
          break
          
        case 'free':
        default:
          // 自由比例，不调整
          break
      }
      
      // 确保不超过容器范围
      newWidth = Math.min(newWidth, containerWidth - cropLeft)
      newHeight = Math.min(newHeight, containerHeight - cropTop)
      
      // 确保不小于最小尺寸
      newWidth = Math.max(newWidth, this.properties.minCropSize)
      newHeight = Math.max(newHeight, this.properties.minCropSize)
      
      this.setData({
        cropWidth: newWidth,
        cropHeight: newHeight
      })
      
      this.updateMaskDimensions()
    },
    
    /**
     * 旋转图片
     */
    onRotate() {
      const newRotation = (this.data.rotation + 90) % 360
      this.setData({ rotation: newRotation })
    },
    
    /**
     * 重置所有变换
     */
    onReset() {
      this.setData({
        translateX: 0,
        translateY: 0,
        scale: 1,
        rotation: 0
      })
      
      this.adjustCropFrameToImage()
    },
    
    /**
     * 放大
     */
    onZoomIn() {
      const newScale = Math.min(this.data.maxScale, this.data.scale + 0.1)
      this.setData({ scale: newScale })
    },
    
    /**
     * 缩小
     */
    onZoomOut() {
      const newScale = Math.max(this.data.minScale, this.data.scale - 0.1)
      this.setData({ scale: newScale })
    },
    
    /**
     * 取消裁剪
     */
    onCancel() {
      this.triggerEvent('cancel')
    },
    
    /**
     * 确定裁剪
     */
    async onConfirm() {
      this.setData({ loading: true })
      
      try {
        // 获取裁剪后的图片
        const croppedImage = await this.getCroppedImage()
        
        // 触发确认事件
        this.triggerEvent('confirm', {
          imagePath: croppedImage.path,
          width: croppedImage.width,
          height: croppedImage.height,
          size: croppedImage.size
        })
        
      } catch (error) {
        console.error('裁剪图片失败:', error)
        this.triggerEvent('error', { error: error.message })
      } finally {
        this.setData({ loading: false })
      }
    },
    
    /**
     * 获取裁剪后的图片
     */
    async getCroppedImage() {
      return new Promise((resolve, reject) => {
        // 创建canvas上下文
        const query = wx.createSelectorQuery().in(this)
        query.select('.image-cropper-container')
          .fields({ node: true, size: true })
          .exec(async (res) => {
            try {
              const container = res[0]
              if (!container) {
                throw new Error('容器未找到')
              }
              
              // 这里需要实际实现canvas裁剪逻辑
              // 由于小程序canvas限制，这里返回模拟数据
              const mockResult = {
                path: this.properties.imageSrc,
                width: Math.round(this.data.cropWidth),
                height: Math.round(this.data.cropHeight),
                size: 1024 * 1024 // 1MB模拟
              }
              
              resolve(mockResult)
              
            } catch (error) {
              reject(error)
            }
          })
      })
    },
    
    /**
     * 计算输出图片大小
     */
    calculateOutputSize() {
      const width = Math.round(this.data.cropWidth)
      const height = Math.round(this.data.cropHeight)
      const estimatedSize = Math.round((width * height * 3) / 1024) // 粗略估计
      
      this.setData({
        outputSize: `${estimatedSize}KB`
      })
    }
  }
})
