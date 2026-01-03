// utils/imageProcessor.js
/**
 * 图片处理模块 - 专门处理拍照、压缩、上传等功能
 * 模块化设计，方便扩展其他图片处理功能
 */

const config = require('../constants/config.js')

class ImageProcessor {
  constructor() {
    // 配置参数
    this.config = {
      maxSize: 500 * 1024, // 最大文件大小：500KB
      maxWidth: 1200,      // 最大宽度
      maxHeight: 1200,     // 最大高度
      quality: 80,         // 默认压缩质量
      // wx.chooseMedia 返回的 fileType 可能是 'image'，也支持具体的 MIME 类型
      allowedTypes: ['image', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif']
    }
    
    // 初始化云开发（如果可用）
    this.initCloud()
  }
  
  /**
   * 初始化云开发环境
   */
  initCloud() {
    try {
      if (wx.cloud) {
        wx.cloud.init({
          env: config.cloud.env || 'foodai-prod',
          traceUser: true
        })
      }
    } catch (error) {
      console.warn('云开发初始化失败:', error)
    }
  }
  
  /**
   * 拍照或选择图片
   * @param {Object} options 选项
   * @returns {Promise} 返回图片信息
   */
  async captureImage(options = {}) {
    const defaultOptions = {
      sourceType: ['camera', 'album'], // 相机和相册
      sizeType: ['original', 'compressed'], // 原图和压缩图
      count: 1, // 选择数量
      camera: 'back', // 后置摄像头
      showActionSheet: true // 显示选择菜单
    }
    
    const mergedOptions = { ...defaultOptions, ...options }
    
    try {
      let tempFiles = []
      
      if (mergedOptions.showActionSheet) {
        // 显示选择菜单
        tempFiles = await this.showImageSourceActionSheet(mergedOptions)
      } else {
        // 直接选择
        tempFiles = await this.chooseImageDirectly(mergedOptions)
      }
      
      if (!tempFiles || tempFiles.length === 0) {
        throw new Error('未选择图片')
      }
      
      // 处理第一张图片
      const imageFile = tempFiles[0]
      return await this.processImageFile(imageFile)
      
    } catch (error) {
      console.error('拍照/选择图片失败:', error)
      throw error
    }
  }
  
  /**
   * 显示图片来源选择菜单
   */
  showImageSourceActionSheet(options) {
    return new Promise((resolve, reject) => {
      wx.showActionSheet({
        itemList: ['拍照', '从相册选择'],
        success: async (res) => {
          try {
            const sourceType = res.tapIndex === 0 ? ['camera'] : ['album']
            const tempFiles = await this.chooseImageDirectly({
              ...options,
              sourceType
            })
            resolve(tempFiles)
          } catch (error) {
            reject(error)
          }
        },
        fail: (error) => {
          reject(new Error('用户取消选择'))
        }
      })
    })
  }
  
  /**
   * 直接选择图片
   */
  chooseImageDirectly(options) {
    return new Promise((resolve, reject) => {
      wx.chooseMedia({
        count: options.count,
        mediaType: ['image'],
        sourceType: options.sourceType,
        sizeType: options.sizeType,
        camera: options.camera,
        success: (res) => {
          resolve(res.tempFiles)
        },
        fail: (error) => {
          reject(new Error(`选择图片失败: ${error.errMsg}`))
        }
      })
    })
  }
  
  /**
   * 处理图片文件
   */
  async processImageFile(imageFile) {
    const result = {
      originalPath: imageFile.tempFilePath,
      originalSize: imageFile.size,
      width: imageFile.width,
      height: imageFile.height,
      type: imageFile.fileType,
      processed: false
    }
    
    // 验证图片
    const validation = this.validateImage(result)
    if (!validation.valid) {
      throw new Error(validation.message)
    }
    
    // 压缩图片（如果需要）
    if (result.originalSize > this.config.maxSize) {
      const compressed = await this.compressImageToSize(
        result.originalPath,
        this.config.maxSize
      )
      result.compressedPath = compressed.path
      result.compressedSize = compressed.size
      result.processed = true
    } else {
      result.compressedPath = result.originalPath
      result.compressedSize = result.originalSize
    }
    
    // 获取图片信息
    const imageInfo = await this.getImageInfo(result.compressedPath)
    result.info = imageInfo
    
    return result
  }
  
  /**
   * 验证图片
   */
  validateImage(image) {
    // 检查文件大小
    if (image.originalSize > this.config.maxSize * 2) {
      const maxSizeMB = (this.config.maxSize * 2 / 1024 / 1024).toFixed(1)
      return {
        valid: false,
        message: `图片大小不能超过${maxSizeMB}MB`
      }
    }
    
    // 检查文件类型
    // wx.chooseMedia 返回的 fileType 可能是 'image'，需要兼容处理
    const fileType = image.type || ''
    const isImageType = fileType === 'image' || 
                       fileType.startsWith('image/') ||
                       this.config.allowedTypes.includes(fileType)
    
    if (!isImageType && fileType) {
      return {
        valid: false,
        message: `不支持的文件类型: ${fileType}`
      }
    }
    
    return { valid: true }
  }
  
  /**
   * 压缩图片到指定大小
   */
  async compressImageToSize(imagePath, maxSize = this.config.maxSize) {
    try {
      // 获取原始文件大小
      const fileInfo = await this.getFileInfo(imagePath)
      
      // 如果已经小于目标大小，直接返回
      if (fileInfo.size <= maxSize) {
        return {
          path: imagePath,
          size: fileInfo.size
        }
      }
      
      // 计算压缩质量
      let quality = this.calculateCompressionQuality(fileInfo.size, maxSize)
      
      // 执行压缩
      const compressed = await this.compressImage(imagePath, { quality })
      
      // 检查压缩后大小
      const compressedInfo = await this.getFileInfo(compressed.path)
      
      // 如果还是太大，递归压缩
      if (compressedInfo.size > maxSize && quality > 10) {
        return await this.compressImageToSize(compressed.path, maxSize)
      }
      
      return {
        path: compressed.path,
        size: compressedInfo.size
      }
      
    } catch (error) {
      console.error('压缩图片失败:', error)
      throw error
    }
  }
  
  /**
   * 计算压缩质量
   */
  calculateCompressionQuality(originalSize, targetSize) {
    const ratio = targetSize / originalSize
    
    if (ratio < 0.2) return 30
    if (ratio < 0.4) return 50
    if (ratio < 0.6) return 70
    if (ratio < 0.8) return 80
    
    return 90
  }
  
  /**
   * 压缩图片
   */
  compressImage(src, options = {}) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src: src,
        quality: options.quality || this.config.quality,
        success: (res) => {
          resolve({
            path: res.tempFilePath,
            size: res.tempFileSize || 0
          })
        },
        fail: (error) => {
          reject(new Error(`压缩图片失败: ${error.errMsg}`))
        }
      })
    })
  }
  
  /**
   * 获取图片信息
   */
  getImageInfo(src) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: src,
        success: (res) => {
          resolve({
            width: res.width,
            height: res.height,
            path: res.path,
            orientation: res.orientation,
            type: res.type
          })
        },
        fail: (error) => {
          reject(new Error(`获取图片信息失败: ${error.errMsg}`))
        }
      })
    })
  }
  
  /**
   * 获取文件信息
   */
  getFileInfo(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileInfo({
        filePath: filePath,
        success: (res) => {
          resolve({
            size: res.size,
            digest: res.digest
          })
        },
        fail: (error) => {
          reject(new Error(`获取文件信息失败: ${error.errMsg}`))
        }
      })
    })
  }
  
  /**
   * 上传图片到云存储
   */
  async uploadToCloud(imagePath, options = {}) {
    try {
      // 检查云开发是否可用
      if (!wx.cloud) {
        throw new Error('云开发不可用')
      }
      
      // 生成云存储路径
      const timestamp = Date.now()
      const random = Math.random().toString(36).substr(2, 8)
      const fileName = `food_${timestamp}_${random}.jpg`
      const cloudPath = options.cloudPath || `food-images/${fileName}`
      
      // 上传文件
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: imagePath,
        config: {
          timeout: 30000 // 30秒超时
        }
      })
      
      return {
        success: true,
        fileID: uploadResult.fileID,
        cloudPath: cloudPath,
        status: 'uploaded',
        timestamp: timestamp
      }
      
    } catch (error) {
      console.error('上传图片到云存储失败:', error)
      throw error
    }
  }
  
  /**
   * 完整的图片处理流程
   */
  async processImagePipeline(options = {}) {
    const pipelineOptions = {
      capture: true,
      compress: true,
      upload: false,
      maxSize: this.config.maxSize,
      ...options
    }
    
    try {
      const steps = []
      let result = {}
      
      // 步骤1: 拍照/选择图片
      if (pipelineOptions.capture) {
        steps.push('capture')
        const captureResult = await this.captureImage({
          showActionSheet: pipelineOptions.showActionSheet !== false // 默认显示选择菜单
        })
        result = { ...result, ...captureResult }
      }
      
      // 步骤2: 压缩图片
      if (pipelineOptions.compress && result.compressedPath) {
        steps.push('compress')
        const compressResult = await this.compressImageToSize(
          result.compressedPath,
          pipelineOptions.maxSize
        )
        result.finalPath = compressResult.path
        result.finalSize = compressResult.size
      } else {
        result.finalPath = result.compressedPath || result.originalPath
        result.finalSize = result.compressedSize || result.originalSize
      }
      
      // 步骤3: 上传到云存储
      if (pipelineOptions.upload && result.finalPath) {
        steps.push('upload')
        const uploadResult = await this.uploadToCloud(result.finalPath, {
          cloudPath: pipelineOptions.cloudPath
        })
        result.upload = uploadResult
      }
      
      // 记录处理步骤
      result.steps = steps
      result.success = true
      
      return result
      
    } catch (error) {
      console.error('图片处理流程失败:', error)
      throw error
    }
  }
  
  /**
   * 批量处理图片
   */
  async batchProcessImages(imagePaths, processor) {
    if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
      return []
    }
    
    const results = []
    for (let i = 0; i < imagePaths.length; i++) {
      try {
        const result = await processor(imagePaths[i], i)
        results.push({
          index: i,
          success: true,
          data: result
        })
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message
        })
      }
    }
    
    return results
  }
  
  /**
   * 获取图片Base64编码
   */
  getImageBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          // 根据图片类型添加正确的前缀
          const mimeType = this.getMimeType(imagePath)
          const base64 = `data:${mimeType};base64,${res.data}`
          resolve(base64)
        },
        fail: (error) => {
          reject(new Error(`获取图片base64失败: ${error.errMsg}`))
        }
      })
    })
  }
  
  /**
   * 获取MIME类型
   */
  getMimeType(filePath) {
    const extension = filePath.split('.').pop().toLowerCase()
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    }
    return mimeTypes[extension] || 'image/jpeg'
  }
  
  /**
   * 预览图片
   */
  previewImage(urls, current = 0) {
    if (!urls || urls.length === 0) {
      return Promise.reject(new Error('没有可预览的图片'))
    }
    
    return new Promise((resolve, reject) => {
      wx.previewImage({
        urls: urls,
        current: urls[current] || urls[0],
        success: () => {
          resolve()
        },
        fail: (error) => {
          reject(new Error(`预览图片失败: ${error.errMsg}`))
        }
      })
    })
  }
  
  /**
   * 创建图片处理任务
   */
  createTask(taskName, processor) {
    return {
      name: taskName,
      processor: processor,
      execute: async (imagePath, options) => {
        try {
          const result = await processor(imagePath, options)
          return {
            task: taskName,
            success: true,
            result: result
          }
        } catch (error) {
          return {
            task: taskName,
            success: false,
            error: error.message
          }
        }
      }
    }
  }
}

// 创建单例实例
const imageProcessor = new ImageProcessor()

// 导出模块
module.exports = {
  // 核心功能
  captureImage: (options) => imageProcessor.captureImage(options),
  compressImageToSize: (imagePath, maxSize) => imageProcessor.compressImageToSize(imagePath, maxSize),
  uploadToCloud: (imagePath, options) => imageProcessor.uploadToCloud(imagePath, options),
  processImagePipeline: (options) => imageProcessor.processImagePipeline(options),
  
  // 工具函数
  getImageInfo: (src) => imageProcessor.getImageInfo(src),
  getImageBase64: (imagePath) => imageProcessor.getImageBase64(imagePath),
  previewImage: (urls, current) => imageProcessor.previewImage(urls, current),
  validateImage: (image) => imageProcessor.validateImage(image),
  
  // 批量处理
  batchProcessImages: (imagePaths, processor) => imageProcessor.batchProcessImages(imagePaths, processor),
  
  // 任务管理
  createTask: (taskName, processor) => imageProcessor.createTask(taskName, processor),
  
  // 配置
  config: imageProcessor.config,
  
  // 实例
  processor: imageProcessor
}
