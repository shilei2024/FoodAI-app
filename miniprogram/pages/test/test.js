// pages/test/test.js - 图片功能测试页面
const imageProcessor = require('../../utils/imageProcessor.js')

Page({
  data: {
    testResults: [],
    loading: false
  },

  onLoad() {
    console.log('图片功能测试页面加载')
  },

  // 测试拍照功能
  async testTakePhoto() {
    try {
      this.setData({ loading: true })
      this.addTestResult('开始测试拍照功能...', 'info')
      
      const result = await imageProcessor.takePhoto({
        compress: true,
        maxSize: 500 * 1024
      })
      
      if (result.success) {
        this.addTestResult('拍照功能测试成功！', 'success')
        this.addTestResult(`图片路径: ${result.data.path}`, 'info')
        this.addTestResult(`图片大小: ${imageProcessor.formatFileSize(result.data.size)}`, 'info')
        this.addTestResult(`图片尺寸: ${result.data.width}x${result.data.height}`, 'info')
        this.addTestResult(`是否压缩: ${result.data.processed ? '是' : '否'}`, 'info')
        
        // 预览图片
        setTimeout(() => {
          imageProcessor.previewImage([result.data.path])
        }, 500)
      } else {
        this.addTestResult(`拍照功能测试失败: ${result.error}`, 'error')
      }
    } catch (error) {
      this.addTestResult(`拍照功能测试异常: ${error.message}`, 'error')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 测试相册选择功能
  async testChooseFromAlbum() {
    try {
      this.setData({ loading: true })
      this.addTestResult('开始测试相册选择功能...', 'info')
      
      const result = await imageProcessor.chooseFromAlbum({
        compress: true,
        maxSize: 500 * 1024
      })
      
      if (result.success) {
        this.addTestResult('相册选择功能测试成功！', 'success')
        this.addTestResult(`图片路径: ${result.data.path}`, 'info')
        this.addTestResult(`图片大小: ${imageProcessor.formatFileSize(result.data.size)}`, 'info')
        this.addTestResult(`图片尺寸: ${result.data.width}x${result.data.height}`, 'info')
        this.addTestResult(`是否压缩: ${result.data.processed ? '是' : '否'}`, 'info')
        
        // 预览图片
        setTimeout(() => {
          imageProcessor.previewImage([result.data.path])
        }, 500)
      } else {
        this.addTestResult(`相册选择功能测试失败: ${result.error}`, 'error')
      }
    } catch (error) {
      this.addTestResult(`相册选择功能测试异常: ${error.message}`, 'error')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 测试图片压缩功能
  async testCompressImage() {
    try {
      this.setData({ loading: true })
      this.addTestResult('开始测试图片压缩功能...', 'info')
      
      // 先选择一张图片
      const selectResult = await imageProcessor.chooseFromAlbum({
        compress: false, // 不压缩
        maxSize: 10 * 1024 * 1024 // 允许大图片
      })
      
      if (!selectResult.success) {
        this.addTestResult(`选择图片失败: ${selectResult.error}`, 'error')
        return
      }
      
      this.addTestResult(`原始图片大小: ${imageProcessor.formatFileSize(selectResult.data.size)}`, 'info')
      
      // 压缩图片到500KB
      const compressResult = await imageProcessor.compressToSize(selectResult.data.path, 500 * 1024)
      
      this.addTestResult('图片压缩功能测试成功！', 'success')
      this.addTestResult(`压缩后大小: ${imageProcessor.formatFileSize(compressResult.size)}`, 'info')
      this.addTestResult(`压缩比例: ${((selectResult.data.size - compressResult.size) / selectResult.data.size * 100).toFixed(1)}%`, 'info')
      
      // 预览压缩前后的图片
      setTimeout(() => {
        imageProcessor.previewImage([selectResult.data.path, compressResult.path])
      }, 500)
      
    } catch (error) {
      this.addTestResult(`图片压缩功能测试异常: ${error.message}`, 'error')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 测试权限检查功能
  async testPermissionCheck() {
    try {
      this.setData({ loading: true })
      this.addTestResult('开始测试权限检查功能...', 'info')
      
      const cameraPermission = await imageProcessor.checkCameraPermission()
      const albumPermission = await imageProcessor.checkPhotoAlbumPermission()
      
      this.addTestResult('权限检查功能测试完成！', 'success')
      this.addTestResult(`相机权限: ${cameraPermission ? '已授权' : '未授权'}`, cameraPermission ? 'success' : 'warning')
      this.addTestResult(`相册权限: ${albumPermission ? '已授权' : '未授权'}`, albumPermission ? 'success' : 'warning')
      
    } catch (error) {
      this.addTestResult(`权限检查功能测试异常: ${error.message}`, 'error')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 测试图片保存功能
  async testSaveImage() {
    try {
      this.setData({ loading: true })
      this.addTestResult('开始测试图片保存功能...', 'info')
      
      // 先选择一张图片
      const selectResult = await imageProcessor.chooseFromAlbum({
        compress: true,
        maxSize: 500 * 1024
      })
      
      if (!selectResult.success) {
        this.addTestResult(`选择图片失败: ${selectResult.error}`, 'error')
        return
      }
      
      // 保存图片到相册
      const saveResult = await imageProcessor.saveToPhotosAlbum(selectResult.data.path)
      
      if (saveResult.success) {
        this.addTestResult('图片保存功能测试成功！', 'success')
        this.addTestResult('图片已保存到相册', 'info')
      } else {
        this.addTestResult(`图片保存功能测试失败: ${saveResult.error}`, 'error')
      }
      
    } catch (error) {
      this.addTestResult(`图片保存功能测试异常: ${error.message}`, 'error')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 添加测试结果
  addTestResult(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    const result = {
      time: timestamp,
      message: message,
      type: type
    }
    
    const testResults = [result, ...this.data.testResults.slice(0, 9)]
    this.setData({ testResults })
    
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`)
  },

  // 清空测试结果
  clearTestResults() {
    this.setData({ testResults: [] })
  },

  // 返回首页
  goBack() {
    wx.navigateBack()
  }
})
