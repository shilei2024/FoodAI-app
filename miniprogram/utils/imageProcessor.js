// utils/imageProcessor.js
// 兼容层，将旧的 imageProcessor API 映射到新的 imageUtils API

const imageUtils = require('./image.js')

/**
 * 图片处理管道
 * @param {Object} options 处理选项
 * @returns {Promise} 处理结果
 */
async function processImagePipeline(options = {}) {
  const {
    capture = true,
    compress = true,
    upload = false,
    maxSize = 500 * 1024,
    showActionSheet = true,
    sourceType = ['album', 'camera']
  } = options

  try {
    // 选择图片
    const result = await imageUtils.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: sourceType,
      camera: 'back'
    })

    if (!result.files || result.files.length === 0) {
      throw new Error('未选择图片')
    }

    const file = result.files[0]
    let finalPath = file.path
    let finalSize = file.size

    // 如果需要压缩
    if (compress && finalSize > maxSize) {
      const compressResult = await imageUtils.compressImage(finalPath, {
        maxSize: maxSize
      })
      finalPath = compressResult.path || finalPath
      finalSize = compressResult.size || finalSize
    }

    return {
      originalPath: file.path,
      originalSize: file.size,
      width: file.width,
      height: file.height,
      type: file.type,
      processed: compress,
      finalPath: finalPath,
      finalSize: finalSize,
      info: {
        width: file.width,
        height: file.height
      }
    }
  } catch (error) {
    console.error('图片处理管道失败:', error)
    throw error
  }
}

/**
 * 拍照
 * @param {Object} options 拍照选项
 * @returns {Promise} 拍照结果
 */
async function captureImage(options = {}) {
  return processImagePipeline({
    ...options,
    sourceType: ['camera']
  })
}

/**
 * 压缩图片到指定大小
 * @param {string} imagePath 图片路径
 * @param {number} maxSize 最大大小（字节）
 * @returns {Promise} 压缩结果
 */
async function compressImageToSize(imagePath, maxSize) {
  try {
    const result = await imageUtils.compressImage(imagePath, {
      maxSize: maxSize
    })
    return {
      path: result.path || imagePath,
      size: result.size || 0
    }
  } catch (error) {
    console.error('压缩图片失败:', error)
    return {
      path: imagePath,
      size: 0
    }
  }
}

module.exports = {
  processImagePipeline,
  captureImage,
  compressImageToSize
}
