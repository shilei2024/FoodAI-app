// components/image-preview/index.js
const imageUtils = require('../../utils/image.js')

Component({
  properties: {
    // 图片源
    imageSrc: {
      type: String,
      value: '',
      observer: 'onImageSrcChange'
    },
    
    // 是否显示重新拍摄按钮
    showRetakeButton: {
      type: Boolean,
      value: true
    },
    
    // 是否启用缩放
    enableScale: {
      type: Boolean,
      value: true
    },
    
    // 是否显示手势提示
    showGestureHint: {
      type: Boolean,
      value: true
    },
    
    // 图片宽度
    imageWidth: {
      type: String,
      value: '100%'
    },
    
    // 图片高度
    imageHeight: {
      type: String,
      value: '100%'
    },
    
    // 最大缩放比例
    maxScale: {
      type: Number,
      value: 5
    },
    
    // 最小缩放比例
    minScale: {
      type: Number,
      value: 0.5
    }
  },

  data: {
    // 图片状态
    isLoading: true,
    isError: false,
    imageInfo: null,
    
    // 变换状态
    scale: 1,
    rotation: 0,
    translateX: 0,
    translateY: 0,
    
    // 手势状态
    isTouching: false,
    lastTouchDistance: 0,
    lastTouchX: 0,
    lastTouchY: 0,
    initialTouchX: 0,
    initialTouchY: 0,
    
    // UI状态
    showScaleIndicator: false,
    gestureHintVisible: true
  },

  lifetimes: {
    attached() {
      // 组件挂载时执行
      this.initGestureHint()
    },
    
    detached() {
      // 组件卸载时执行
      this.clearGestureHintTimer()
    }
  },

  methods: {
    /**
     * 图片源变化处理
     */
    onImageSrcChange(newSrc) {
      if (newSrc) {
        this.setData({
          isLoading: true,
          isError: false,
          scale: 1,
          rotation: 0,
          translateX: 0,
          translateY: 0
        })
        
        // 获取图片信息
        this.getImageInfo(newSrc)
      }
    },
    
    /**
     * 获取图片信息
     */
    async getImageInfo(src) {
      try {
        const info = await imageUtils.getImageInfo(src)
        this.setData({
          imageInfo: info,
          isLoading: false
        })
      } catch (error) {
        console.error('获取图片信息失败:', error)
        this.setData({
          isError: true,
          isLoading: false
        })
      }
    },
    
    /**
     * 图片加载完成
     */
    onImageLoad(e) {
      this.setData({
        isLoading: false,
        isError: false
      })
      
      // 触发加载完成事件
      this.triggerEvent('load', e.detail)
    },
    
    /**
     * 图片加载失败
     */
    onImageError(e) {
      console.error('图片加载失败:', e.detail)
      this.setData({
        isError: true,
        isLoading: false
      })
      
      // 触发加载失败事件
      this.triggerEvent('error', e.detail)
    },
    
    /**
     * 图片点击事件
     */
    onImageTap() {
      // 点击图片时隐藏手势提示
      if (this.data.gestureHintVisible) {
        this.hideGestureHint()
      }
    },
    
    /**
     * 重新拍摄
     */
    onRetake() {
      this.triggerEvent('retake')
    },
    
    /**
     * 旋转图片
     */
    onRotate() {
      const newRotation = (this.data.rotation + 90) % 360
      this.setData({ rotation: newRotation })
      
      // 触发旋转事件
      this.triggerEvent('rotate', { rotation: newRotation })
    },
    
    /**
     * 放大
     */
    onZoomIn() {
      const newScale = Math.min(this.data.scale + 0.5, this.data.maxScale)
      this.updateScale(newScale)
    },
    
    /**
     * 缩小
     */
    onZoomOut() {
      const newScale = Math.max(this.data.scale - 0.5, this.data.minScale)
      this.updateScale(newScale)
    },
    
    /**
     * 更新缩放比例
     */
    updateScale(newScale) {
      this.setData({
        scale: newScale,
        showScaleIndicator: true
      })
      
      // 3秒后隐藏缩放指示器
      clearTimeout(this.scaleIndicatorTimer)
      this.scaleIndicatorTimer = setTimeout(() => {
        this.setData({ showScaleIndicator: false })
      }, 3000)
      
      // 触发缩放事件
      this.triggerEvent('scale', { scale: newScale })
    },
    
    /**
     * 确认使用图片
     */
    onConfirm() {
      const imageData = {
        src: this.data.imageSrc,
        info: this.data.imageInfo,
        transform: {
          scale: this.data.scale,
          rotation: this.data.rotation,
          translateX: this.data.translateX,
          translateY: this.data.translateY
        }
      }
      
      this.triggerEvent('confirm', imageData)
    },
    
    /**
     * 初始化手势提示
     */
    initGestureHint() {
      if (this.data.showGestureHint) {
        // 5秒后隐藏手势提示
        this.gestureHintTimer = setTimeout(() => {
          this.hideGestureHint()
        }, 5000)
      }
    },
    
    /**
     * 隐藏手势提示
     */
    hideGestureHint() {
      this.setData({ gestureHintVisible: false })
      this.clearGestureHintTimer()
    },
    
    /**
     * 清除手势提示定时器
     */
    clearGestureHintTimer() {
      if (this.gestureHintTimer) {
        clearTimeout(this.gestureHintTimer)
        this.gestureHintTimer = null
      }
    },
    
    /**
     * 触摸开始事件
     */
    onTouchStart(e) {
      if (!this.data.enableScale) return
      
      const touches = e.touches
      
      if (touches.length === 1) {
        // 单指触摸 - 准备拖动
        this.setData({
          isTouching: true,
          lastTouchX: touches[0].clientX,
          lastTouchY: touches[0].clientY,
          initialTouchX: touches[0].clientX,
          initialTouchY: touches[0].clientY
        })
      } else if (touches.length === 2) {
        // 双指触摸 - 准备缩放
        const dx = touches[0].clientX - touches[1].clientX
        const dy = touches[0].clientY - touches[1].clientY
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        this.setData({
          isTouching: true,
          lastTouchDistance: distance
        })
      }
    },
    
    /**
     * 触摸移动事件
     */
    onTouchMove(e) {
      if (!this.data.isTouching || !this.data.enableScale) return
      
      const touches = e.touches
      
      if (touches.length === 1) {
        // 单指移动 - 拖动
        const deltaX = touches[0].clientX - this.data.lastTouchX
        const deltaY = touches[0].clientY - this.data.lastTouchY
        
        this.setData({
          translateX: this.data.translateX + deltaX,
          translateY: this.data.translateY + deltaY,
          lastTouchX: touches[0].clientX,
          lastTouchY: touches[0].clientY
        })
      } else if (touches.length === 2) {
        // 双指移动 - 缩放
        const dx = touches[0].clientX - touches[1].clientX
        const dy = touches[0].clientY - touches[1].clientY
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (this.data.lastTouchDistance > 0) {
          const scaleChange = distance / this.data.lastTouchDistance
          const newScale = this.data.scale * scaleChange
          
          // 限制缩放范围
          const clampedScale = Math.max(
            this.data.minScale,
            Math.min(newScale, this.data.maxScale)
          )
          
          this.updateScale(clampedScale)
        }
        
        this.setData({
          lastTouchDistance: distance
        })
      }
    },
    
    /**
     * 触摸结束事件
     */
    onTouchEnd(e) {
      if (!this.data.isTouching) return
      
      const touches = e.touches
      
      if (touches.length === 0) {
        // 所有手指离开
        this.setData({ isTouching: false })
        
        // 检查是否为点击（移动距离很小）
        const movedX = Math.abs(this.data.lastTouchX - this.data.initialTouchX)
        const movedY = Math.abs(this.data.lastTouchY - this.data.initialTouchY)
        
        if (movedX < 10 && movedY < 10) {
          // 点击事件
          this.onImageTap()
        }
      }
    },
    
    /**
     * 触摸取消事件
     */
    onTouchCancel() {
      this.setData({ isTouching: false })
    },
    
    /**
     * 重置变换
     */
    resetTransform() {
      this.setData({
        scale: 1,
        rotation: 0,
        translateX: 0,
        translateY: 0
      })
    },
    
    /**
     * 获取当前图片状态
     */
    getImageState() {
      return {
        src: this.data.imageSrc,
        isLoading: this.data.isLoading,
        isError: this.data.isError,
        transform: {
          scale: this.data.scale,
          rotation: this.data.rotation,
          translateX: this.data.translateX,
          translateY: this.data.translateY
        }
      }
    }
  }
})
