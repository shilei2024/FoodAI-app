// utils/imageProcessor.js
// 统一的图片处理工具类 - 整合拍照和相册选择功能，基于 image.js 的基础功能

const imageUtils = require('./image.js')

/**
 * 统一的图片处理工具类
 */
class ImageProcessor {
  constructor() {
    this.utils = imageUtils.utils
  }

  /**
   * 选择图片（拍照或从相册选择）
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async selectImage(options = {}) {
    const defaultOptions = {
      sourceType: ['album', 'camera'], // 默认同时支持相册和相机
      count: 1,
      sizeType: ['compressed'],
      camera: 'back',
      compress: true, // 默认压缩
      maxSize: 500 * 1024 // 默认最大500KB
    }

    const mergedOptions = { ...defaultOptions, ...options }

    try {
      console.log('开始选择图片，选项:', mergedOptions)

      // 选择图片
      const mediaResult = await this.chooseMedia(mergedOptions)
      
      if (!mediaResult.tempFiles || mediaResult.tempFiles.length === 0) {
        throw new Error('未选择图片')
      }

      const file = mediaResult.tempFiles[0]
      console.log('选择的图片信息:', file)

      // 验证图片
      const validation = this.validateImage(file)
      if (!validation.valid) {
        throw new Error(validation.message)
      }

      // 处理图片（压缩等）
      const processedResult = await this.processImage(file, mergedOptions)

      return {
        success: true,
        data: {
          path: processedResult.path,
          size: processedResult.size,
          width: processedResult.width,
          height: processedResult.height,
          type: processedResult.type,
          originalPath: file.tempFilePath,
          originalSize: file.size,
          processed: processedResult.processed
        }
      }

    } catch (error) {
      console.error('选择图片失败:', error)
      return {
        success: false,
        error: error.message || '选择图片失败'
      }
    }
  }

  /**
   * 拍照
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async takePhoto(options = {}) {
    return this.selectImage({
      ...options,
      sourceType: ['camera']
    })
  }

  /**
   * 从相册选择图片
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async chooseFromAlbum(options = {}) {
    return this.selectImage({
      ...options,
      sourceType: ['album']
    })
  }

  /**
   * 选择媒体文件
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  chooseMedia(options) {
    return new Promise((resolve, reject) => {
      wx.chooseMedia({
        count: options.count,
        mediaType: ['image'],
        sourceType: options.sourceType,
        sizeType: options.sizeType,
        camera: options.camera,
        success: resolve,
        fail: (error) => {
          console.error('选择媒体文件失败:', error)
          
          // 处理权限错误
          if (error.errMsg && error.errMsg.includes('auth deny')) {
            reject(new Error('需要相机/相册权限，请去设置中开启'))
          } else if (error.errMsg && error.errMsg.includes('cancel')) {
            reject(new Error('用户取消了选择'))
          } else {
            reject(new Error(`选择图片失败: ${error.errMsg}`))
          }
        }
      })
    })
  }

  /**
   * 验证图片
   * @param {Object} file 文件对象
   * @returns {Object} 验证结果
   */
  validateImage(file) {
    return this.utils.validateImage(file)
  }

  /**
   * 处理图片（压缩等）
   * @param {Object} file 文件对象
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async processImage(file, options) {
    let finalPath = file.tempFilePath
    let finalSize = file.size
    let processed = false

    // 如果需要压缩
    if (options.compress && finalSize > options.maxSize) {
      console.log('开始压缩图片，原始大小:', finalSize, '目标大小:', options.maxSize)
      
      try {
        const compressResult = await this.compressImage(finalPath, {
          quality: 80,
          maxSize: options.maxSize
        })
        
        finalPath = compressResult.path
        finalSize = compressResult.size
        processed = true
        
        console.log('压缩完成，最终大小:', finalSize)
      } catch (compressError) {
        console.warn('压缩失败，使用原图:', compressError)
      }
    }

    return {
      path: finalPath,
      size: finalSize,
      width: file.width,
      height: file.height,
      type: file.fileType,
      processed: processed
    }
  }

  /**
   * 压缩图片
   * @param {string} src 源图片路径
   * @param {Object} options 压缩选项
   * @returns {Promise} Promise对象
   */
  compressImage(src, options = {}) {
    return this.utils.compressImage(src, options)
  }

  /**
   * 智能压缩图片到指定大小
   * @param {string} imagePath 图片路径
   * @param {number} maxSize 最大大小（字节）
   * @returns {Promise} Promise对象
   */
  async compressToSize(imagePath, maxSize = 500 * 1024) {
    try {
      // 获取文件信息
      const fileInfo = await this.getFileInfo(imagePath)
      
      // 如果文件已经小于最大大小，直接返回
      if (fileInfo.size <= maxSize) {
        return {
          path: imagePath,
          size: fileInfo.size
        }
      }

      // 计算压缩质量
      let quality = 80
      const sizeRatio = maxSize / fileInfo.size
      
      if (sizeRatio < 0.3) {
        quality = 30
      } else if (sizeRatio < 0.5) {
        quality = 50
      } else if (sizeRatio < 0.7) {
        quality = 70
      }

      // 压缩图片
      const compressed = await this.compressImage(imagePath, { quality })
      
      // 递归检查，确保压缩后大小符合要求
      const compressedInfo = await this.getFileInfo(compressed.path)
      if (compressedInfo.size > maxSize && quality > 10) {
        // 如果还是太大，继续压缩
        return await this.compressToSize(compressed.path, maxSize)
      }

      return compressed
    } catch (error) {
      console.error('智能压缩图片失败:', error)
      throw error
    }
  }

  /**
   * 获取文件信息
   * @param {string} filePath 文件路径
   * @returns {Promise} Promise对象
   */
  getFileInfo(filePath) {
    return this.utils.getFileInfo(filePath)
  }

  /**
   * 获取图片信息
   * @param {string} src 图片路径
   * @returns {Promise} Promise对象
   */
  getImageInfo(src) {
    return this.utils.getImageInfo(src)
  }

  /**
   * 预览图片
   * @param {Array} urls 图片URL数组
   * @param {number} current 当前显示图片的索引
   */
  previewImage(urls, current = 0) {
    this.utils.previewImage(urls, current)
  }

  /**
   * 保存图片到相册
   * @param {string} filePath 文件路径
   * @returns {Promise} Promise对象
   */
  async saveToPhotosAlbum(filePath) {
    try {
      // 检查权限
      const hasPermission = await this.checkPhotoAlbumPermission()
      if (!hasPermission) {
        throw new Error('用户拒绝授权')
      }

      // 保存图片
      await this.doSaveImage(filePath)
      
      return {
        success: true,
        message: '保存成功'
      }
    } catch (error) {
      console.error('保存图片失败:', error)
      return {
        success: false,
        error: error.message || '保存图片失败'
      }
    }
  }

  /**
   * 检查相册权限
   * @returns {Promise} Promise对象
   */
  checkPhotoAlbumPermission() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.writePhotosAlbum']) {
            // 未授权，请求授权
            wx.authorize({
              scope: 'scope.writePhotosAlbum',
              success: () => {
                resolve(true)
              },
              fail: () => {
                // 授权失败，引导用户打开设置
                wx.showModal({
                  title: '提示',
                  content: '需要您授权保存图片到相册',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting({
                        success: (settingRes) => {
                          if (settingRes.authSetting['scope.writePhotosAlbum']) {
                            resolve(true)
                          } else {
                            resolve(false)
                          }
                        }
                      })
                    } else {
                      resolve(false)
                    }
                  }
                })
              }
            })
          } else {
            // 已授权
            resolve(true)
          }
        },
        fail: (error) => {
          reject(new Error(`获取授权设置失败: ${error.errMsg}`))
        }
      })
    })
  }

  /**
   * 执行保存图片操作
   * @param {string} filePath 文件路径
   * @returns {Promise} Promise对象
   */
  doSaveImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath: filePath,
        success: () => {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          resolve()
        },
        fail: (error) => {
          reject(new Error(`保存图片失败: ${error.errMsg}`))
        }
      })
    })
  }

  /**
   * 检查相机权限
   * @returns {Promise} Promise对象
   */
  checkCameraPermission() {
    return new Promise((resolve) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.camera'] === undefined) {
            // 首次使用，需要请求授权
            wx.authorize({
              scope: 'scope.camera',
              success: () => {
                resolve(true)
              },
              fail: () => {
                resolve(false)
              }
            })
          } else if (res.authSetting['scope.camera'] === false) {
            // 用户之前拒绝了授权
            resolve(false)
          } else {
            // 已授权
            resolve(true)
          }
        },
        fail: () => {
          resolve(false)
        }
      })
    })
  }

  /**
   * 格式化文件大小
   * @param {number} bytes 字节数
   * @returns {string} 格式化后的文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// 创建单例实例
const imageProcessor = new ImageProcessor()

module.exports = {
  // 图片选择
  selectImage: (options) => imageProcessor.selectImage(options),
  takePhoto: (options) => imageProcessor.takePhoto(options),
  chooseFromAlbum: (options) => imageProcessor.chooseFromAlbum(options),
  
  // 图片处理
  compressImage: (src, options) => imageProcessor.compressImage(src, options),
  compressToSize: (imagePath, maxSize) => imageProcessor.compressToSize(imagePath, maxSize),
  getImageInfo: (src) => imageProcessor.getImageInfo(src),
  
  // 图片展示
  previewImage: (urls, current) => imageProcessor.previewImage(urls, current),
  saveToPhotosAlbum: (filePath) => imageProcessor.saveToPhotosAlbum(filePath),
  
  // 权限检查
  checkCameraPermission: () => imageProcessor.checkCameraPermission(),
  checkPhotoAlbumPermission: () => imageProcessor.checkPhotoAlbumPermission(),
  
  // 工具方法
  formatFileSize: (bytes) => imageProcessor.formatFileSize(bytes),
  
  // 实例
  processor: imageProcessor
}
