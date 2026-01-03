// utils/image.js
const config = require('../constants/config.js')

/**
 * 图片处理工具类
 */
class ImageUtils {
  constructor() {
    this.maxSize = config.image.maxSize // 最大文件大小（字节）
    this.allowedTypes = config.image.allowedTypes // 允许的文件类型
    this.quality = config.image.quality // 图片质量
  }

  /**
   * 选择图片
   * @param {Object} options 选择选项
   * @returns {Promise} Promise对象
   */
  chooseImage(options = {}) {
    const defaultOptions = {
      count: 1,
      sizeType: ['compressed'], // 压缩图
      sourceType: ['album', 'camera'], // 相册和相机
      camera: 'back' // 后置摄像头
    }

    const mergedOptions = { ...defaultOptions, ...options }

    return new Promise((resolve, reject) => {
      wx.chooseMedia({
        ...mergedOptions,
        success: (res) => {
          const files = res.tempFiles.map(file => ({
            path: file.tempFilePath,
            size: file.size,
            type: file.fileType,
            width: file.width,
            height: file.height,
            duration: file.duration
          }))

          // 验证图片
          const validationResults = files.map(file => this.validateImage(file))
          const invalidFiles = validationResults.filter(result => !result.valid)

          if (invalidFiles.length > 0) {
            reject(new Error(`图片验证失败: ${invalidFiles.map(f => f.message).join(', ')}`))
            return
          }

          resolve(files)
        },
        fail: (error) => {
          reject(new Error(`选择图片失败: ${error.errMsg}`))
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
    // 检查文件大小
    if (file.size > this.maxSize) {
      const maxSizeMB = (this.maxSize / (1024 * 1024)).toFixed(1)
      return {
        valid: false,
        message: `图片大小不能超过${maxSizeMB}MB`
      }
    }

    // 检查文件类型
    if (!this.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        message: `不支持的文件类型: ${file.type}`
      }
    }

    return { valid: true }
  }

  /**
   * 压缩图片
   * @param {string} src 源图片路径
   * @param {Object} options 压缩选项
   * @returns {Promise} Promise对象
   */
  compressImage(src, options = {}) {
    const defaultOptions = {
      quality: this.quality,
      width: 800, // 目标宽度
      height: 800 // 目标高度
    }

    const mergedOptions = { ...defaultOptions, ...options }

    return new Promise((resolve, reject) => {
      wx.compressImage({
        src: src,
        quality: mergedOptions.quality,
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
   * @param {string} src 图片路径
   * @returns {Promise} Promise对象
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
   * 预览图片
   * @param {Array} urls 图片URL数组
   * @param {number} current 当前显示图片的索引
   */
  previewImage(urls, current = 0) {
    if (!urls || urls.length === 0) {
      wx.showToast({
        title: '暂无图片可预览',
        icon: 'none'
      })
      return
    }

    wx.previewImage({
      urls: urls,
      current: urls[current] || urls[0],
      success: () => {
        console.log('图片预览成功')
      },
      fail: (error) => {
        console.error('图片预览失败:', error)
        wx.showToast({
          title: '预览失败',
          icon: 'none'
        })
      }
    })
  }

  /**
   * 保存图片到相册
   * @param {string} filePath 文件路径
   * @returns {Promise} Promise对象
   */
  saveImageToPhotosAlbum(filePath) {
    return new Promise((resolve, reject) => {
      // 先获取相册授权
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.writePhotosAlbum']) {
            // 未授权，请求授权
            wx.authorize({
              scope: 'scope.writePhotosAlbum',
              success: () => {
                this.doSaveImage(filePath, resolve, reject)
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
                            this.doSaveImage(filePath, resolve, reject)
                          } else {
                            reject(new Error('用户拒绝授权'))
                          }
                        }
                      })
                    } else {
                      reject(new Error('用户取消授权'))
                    }
                  }
                })
              }
            })
          } else {
            // 已授权，直接保存
            this.doSaveImage(filePath, resolve, reject)
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
   * @param {Function} resolve Promise resolve
   * @param {Function} reject Promise reject
   */
  doSaveImage(filePath, resolve, reject) {
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
  }

  /**
   * 生成图片URL（处理CDN、云存储等）
   * @param {string} path 图片路径
   * @param {Object} options 选项
   * @returns {string} 处理后的URL
   */
  generateImageUrl(path, options = {}) {
    if (!path) return ''

    // 如果是网络图片，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }

    // 如果是云存储图片
    if (path.startsWith('cloud://')) {
      // 这里可以添加云存储URL处理逻辑
      return path
    }

    // 本地图片，添加base路径
    const baseUrl = options.baseUrl || config.image.baseUrl || ''
    return `${baseUrl}${path}`
  }

  /**
   * 图片懒加载处理
   * @param {string} src 图片源
   * @param {string} placeholder 占位图
   * @returns {Object} 图片加载配置
   */
  lazyLoad(src, placeholder = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop&auto=format') {
    return {
      src: src,
      placeholder: placeholder,
      loading: true,
      error: false
    }
  }

  /**
   * 批量处理图片
   * @param {Array} images 图片数组
   * @param {Function} processor 处理函数
   * @returns {Promise} Promise对象
   */
  async batchProcessImages(images, processor) {
    if (!Array.isArray(images) || images.length === 0) {
      return []
    }

    const results = []
    for (let i = 0; i < images.length; i++) {
      try {
        const result = await processor(images[i], i)
        results.push(result)
      } catch (error) {
        console.error(`处理第${i + 1}张图片失败:`, error)
        results.push(null)
      }
    }

    return results
  }

  /**
   * 获取图片base64编码
   * @param {string} imagePath 图片路径
   * @returns {Promise} Promise对象，返回base64字符串
   */
  getImageBase64(imagePath) {
    return new Promise((resolve, reject) => {
      // 读取文件
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          // 添加base64前缀
          const base64 = `data:image/jpeg;base64,${res.data}`
          resolve(base64)
        },
        fail: (error) => {
          reject(new Error(`获取图片base64失败: ${error.errMsg}`))
        }
      })
    })
  }

  /**
   * 上传图片到云存储
   * @param {string} imagePath 图片路径
   * @param {string} cloudPath 云存储路径
   * @returns {Promise} Promise对象，返回fileID
   */
  uploadToCloud(imagePath, cloudPath = '') {
    return new Promise((resolve, reject) => {
      // 生成云存储路径
      const timestamp = Date.now()
      const random = Math.random().toString(36).substr(2, 8)
      const fileName = `food_${timestamp}_${random}.jpg`
      const finalCloudPath = cloudPath || `foods/${fileName}`

      // 上传到云存储
      wx.cloud.uploadFile({
        cloudPath: finalCloudPath,
        filePath: imagePath,
        success: (res) => {
          resolve({
            fileID: res.fileID,
            cloudPath: finalCloudPath,
            status: 'uploaded'
          })
        },
        fail: (error) => {
          reject(new Error(`上传图片到云存储失败: ${error.errMsg}`))
        }
      })
    })
  }

  /**
   * 压缩图片到指定大小以下（500KB）
   * @param {string} imagePath 图片路径
   * @param {number} maxSize 最大大小（字节），默认500KB
   * @returns {Promise} Promise对象，返回压缩后的图片路径
   */
  async compressImageToSize(imagePath, maxSize = 500 * 1024) {
    try {
      // 获取文件信息
      const fileInfo = await this.getFileInfo(imagePath)
      
      // 如果文件已经小于最大大小，直接返回
      if (fileInfo.size <= maxSize) {
        return imagePath
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
        return await this.compressImageToSize(compressed.path, maxSize)
      }

      return compressed.path
    } catch (error) {
      console.error('压缩图片到指定大小失败:', error)
      throw error
    }
  }

  /**
   * 获取文件信息
   * @param {string} filePath 文件路径
   * @returns {Promise} Promise对象，返回文件信息
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
}

// 创建单例实例
const imageUtils = new ImageUtils()

module.exports = {
  // 图片选择
  chooseImage: (options) => imageUtils.chooseImage(options),
  
  // 图片处理
  compressImage: (src, options) => imageUtils.compressImage(src, options),
  compressImageToSize: (imagePath, maxSize) => imageUtils.compressImageToSize(imagePath, maxSize),
  getImageInfo: (src) => imageUtils.getImageInfo(src),
  getImageBase64: (imagePath) => imageUtils.getImageBase64(imagePath),
  
  // 图片上传
  uploadToCloud: (imagePath, cloudPath) => imageUtils.uploadToCloud(imagePath, cloudPath),
  
  // 图片展示
  previewImage: (urls, current) => imageUtils.previewImage(urls, current),
  saveImageToPhotosAlbum: (filePath) => imageUtils.saveImageToPhotosAlbum(filePath),
  
  // URL处理
  generateImageUrl: (path, options) => imageUtils.generateImageUrl(path, options),
  
  // 懒加载
  lazyLoad: (src, placeholder) => imageUtils.lazyLoad(src, placeholder),
  
  // 批量处理
  batchProcessImages: (images, processor) => imageUtils.batchProcessImages(images, processor),
  
  // 验证
  validateImage: (file) => imageUtils.validateImage(file),
  
  // 文件操作
  getFileInfo: (filePath) => imageUtils.getFileInfo(filePath),
  
  // 实例
  utils: imageUtils
}
