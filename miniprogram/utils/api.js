// utils/api.js
const config = require('../constants/config.js')

/**
 * API请求封装
 */
class ApiClient {
  constructor() {
    this.baseURL = config.api.baseURL
    this.timeout = config.api.timeout
    this.headers = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  }

  /**
   * 设置请求头
   * @param {Object} headers 请求头
   */
  setHeaders(headers) {
    this.headers = { ...this.headers, ...headers }
  }

  /**
   * 获取请求头
   * @returns {Object} 请求头
   */
  getHeaders() {
    const token = wx.getStorageSync('token')
    if (token) {
      return { ...this.headers, 'Authorization': `Bearer ${token}` }
    }
    return this.headers
  }

  /**
   * 请求拦截器
   * @param {Object} options 请求选项
   * @returns {Object} 处理后的选项
   */
  requestInterceptor(options) {
    // 添加时间戳防止缓存
    if (options.method === 'GET') {
      options.url = this.addTimestamp(options.url)
    }

    // 添加公共参数
    options.data = {
      ...options.data,
      _platform: 'miniprogram',
      _version: config.app.version
    }

    return options
  }

  /**
   * 响应拦截器
   * @param {Object} response 响应数据
   * @returns {Object} 处理后的响应
   */
  responseInterceptor(response) {
    const { statusCode, data } = response
    
    if (statusCode === 200) {
      // 业务成功
      if (data.code === 0 || data.success) {
        return data.data || data
      } else {
        // 业务错误
        throw this.createError(data.message || '业务错误', data.code)
      }
    } else if (statusCode === 401) {
      // 未授权
      this.handleUnauthorized()
      throw this.createError('登录已过期，请重新登录', 401)
    } else if (statusCode === 403) {
      // 禁止访问
      throw this.createError('权限不足', 403)
    } else if (statusCode >= 500) {
      // 服务器错误
      throw this.createError('服务器错误，请稍后重试', statusCode)
    } else {
      // 其他错误
      throw this.createError(`请求失败: ${statusCode}`, statusCode)
    }
  }

  /**
   * 创建错误对象
   * @param {string} message 错误信息
   * @param {number} code 错误码
   * @returns {Error} 错误对象
   */
  createError(message, code = -1) {
    const error = new Error(message)
    error.code = code
    error.isApiError = true
    return error
  }

  /**
   * 处理未授权
   */
  handleUnauthorized() {
    // 清除登录状态
    wx.removeStorageSync('token')
    wx.removeStorageSync('userInfo')
    
    // 跳转到登录页
    wx.showToast({
      title: '登录已过期',
      icon: 'none',
      duration: 2000,
      complete: () => {
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          })
        }, 2000)
      }
    })
  }

  /**
   * 添加时间戳
   * @param {string} url URL
   * @returns {string} 添加时间戳后的URL
   */
  addTimestamp(url) {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}_t=${Date.now()}`
  }

  /**
   * 发起请求
   * @param {string} url 请求URL
   * @param {string} method 请求方法
   * @param {Object} data 请求数据
   * @param {Object} options 其他选项
   * @returns {Promise} Promise对象
   */
  async request(url, method = 'GET', data = null, options = {}) {
    // 显示加载提示
    if (options.showLoading !== false) {
      wx.showLoading({ title: '加载中...', mask: true })
    }

    try {
      // 准备请求选项
      const requestOptions = {
        url: url.startsWith('http') ? url : `${this.baseURL}${url}`,
        method: method,
        data: data,
        header: { ...this.getHeaders(), ...options.headers },
        timeout: options.timeout || this.timeout
      }

      // 请求拦截
      const processedOptions = this.requestInterceptor(requestOptions)

      // 发起请求
      const response = await new Promise((resolve, reject) => {
        wx.request({
          ...processedOptions,
          success: resolve,
          fail: (error) => {
            reject(this.createError(`网络错误: ${error.errMsg}`, -2))
          }
        })
      })

      // 响应拦截
      const result = this.responseInterceptor(response)
      return result

    } catch (error) {
      // 错误处理
      this.handleError(error, options)
      throw error
    } finally {
      // 隐藏加载提示
      if (options.showLoading !== false) {
        wx.hideLoading()
      }
    }
  }

  /**
   * 错误处理
   * @param {Error} error 错误对象
   * @param {Object} options 请求选项
   */
  handleError(error, options) {
    // 不显示错误提示
    if (options.silent) return

    // 显示错误提示
    let errorMessage = error.message
    if (error.code === -2) {
      errorMessage = '网络连接失败，请检查网络设置'
    }

    wx.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 3000
    })

    // 记录错误日志
    console.error('API请求错误:', {
      url: options.url,
      method: options.method,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * GET请求
   * @param {string} url 请求URL
   * @param {Object} params 查询参数
   * @param {Object} options 其他选项
   * @returns {Promise} Promise对象
   */
  get(url, params = {}, options = {}) {
    return this.request(url, 'GET', params, options)
  }

  /**
   * POST请求
   * @param {string} url 请求URL
   * @param {Object} data 请求数据
   * @param {Object} options 其他选项
   * @returns {Promise} Promise对象
   */
  post(url, data = {}, options = {}) {
    return this.request(url, 'POST', data, options)
  }

  /**
   * PUT请求
   * @param {string} url 请求URL
   * @param {Object} data 请求数据
   * @param {Object} options 其他选项
   * @returns {Promise} Promise对象
   */
  put(url, data = {}, options = {}) {
    return this.request(url, 'PUT', data, options)
  }

  /**
   * DELETE请求
   * @param {string} url 请求URL
   * @param {Object} data 请求数据
   * @param {Object} options 其他选项
   * @returns {Promise} Promise对象
   */
  delete(url, data = {}, options = {}) {
    return this.request(url, 'DELETE', data, options)
  }

  /**
   * 上传文件
   * @param {string} url 上传URL
   * @ {string} filePath 文件路径
   * @param {string} name 文件字段名
   * @param {Object} formData 其他表单数据
   * @param {Object} options 其他选项
   * @returns {Promise} Promise对象
   */
  upload(url, filePath, name = 'file', formData = {}, options = {}) {
    return new Promise((resolve, reject) => {
      wx.showLoading({ title: '上传中...', mask: true })

      wx.uploadFile({
        url: url.startsWith('http') ? url : `${this.baseURL}${url}`,
        filePath: filePath,
        name: name,
        formData: {
          ...formData,
          _platform: 'miniprogram',
          _version: config.app.version
        },
        header: this.getHeaders(),
        success: (res) => {
          try {
            const data = JSON.parse(res.data)
            if (res.statusCode === 200 && (data.code === 0 || data.success)) {
              resolve(data.data || data)
            } else {
              reject(this.createError(data.message || '上传失败', data.code))
            }
          } catch (error) {
            reject(this.createError('上传响应解析失败', -3))
          }
        },
        fail: (error) => {
          reject(this.createError(`上传失败: ${error.errMsg}`, -2))
        },
        complete: () => {
          wx.hideLoading()
        }
      })
    })
  }
}

// 创建单例实例
const apiClient = new ApiClient()

// 导出常用方法
module.exports = {
  // 实例方法
  request: (url, method, data, options) => apiClient.request(url, method, data, options),
  get: (url, params, options) => apiClient.get(url, params, options),
  post: (url, data, options) => apiClient.post(url, data, options),
  put: (url, data, options) => apiClient.put(url, data, options),
  delete: (url, data, options) => apiClient.delete(url, data, options),
  upload: (url, filePath, name, formData, options) => apiClient.upload(url, filePath, name, formData, options),
  
  // 工具方法
  setHeaders: (headers) => apiClient.setHeaders(headers),
  getHeaders: () => apiClient.getHeaders(),
  
  // 实例
  client: apiClient
}
