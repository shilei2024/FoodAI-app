// services/data-service-cloud.js
const config = require('../constants/config.js')

/**
 * 数据持久化服务（云开发版本）
 * 使用云数据库进行数据存储和同步
 */
class DataServiceCloud {
  constructor() {
    this.config = config
    this.db = null
    this.init()
  }

  /**
   * 初始化云数据库
   */
  async init() {
    try {
      // 检查是否支持云开发
      if (wx.cloud) {
        // 初始化云开发
        wx.cloud.init({
          env: this.config.cloud.env,
          traceUser: true
        })
        
        // 获取数据库实例
        this.db = wx.cloud.database()
        console.log('云数据库初始化成功')
        
        // 创建集合（如果不存在）
        await this.createCollections()
      } else {
        throw new Error('当前版本不支持云开发')
      }
    } catch (error) {
      console.error('云数据库初始化失败:', error)
      throw error
    }
  }

  /**
   * 创建必要的集合
   */
  async createCollections() {
    try {
      // 这里可以添加创建集合的逻辑
      // 注意：云开发会自动创建集合，这里主要是确保集合存在
      console.log('云数据库集合检查完成')
    } catch (error) {
      console.error('创建集合失败:', error)
    }
  }

  /**
   * 保存识别记录到云数据库
   * @param {Object} record 识别记录
   * @returns {Promise} Promise对象
   */
  async saveRecognitionRecord(record) {
    try {
      if (!this.db) {
        throw new Error('云数据库未初始化')
      }

      // 准备数据
      const recordData = {
        ...record,
        _openid: wx.getStorageSync('openid') || 'anonymous',
        createTime: this.db.serverDate(),
        updateTime: this.db.serverDate(),
        synced: true
      }

      // 保存到云数据库
      const result = await this.db.collection('recognition_records').add({
        data: recordData
      })

      console.log('识别记录保存到云数据库成功:', result)

      return {
        success: true,
        data: {
          ...recordData,
          _id: result._id
        },
        message: '保存成功',
        synced: true
      }
    } catch (error) {
      console.error('保存识别记录到云数据库失败:', error)
      
      // 降级到本地存储
      return this.saveToLocalFallback('recognition_records', record)
    }
  }

  /**
   * 获取识别记录列表
   * @param {Object} options 查询选项
   * @returns {Promise} Promise对象
   */
  async getRecognitionRecords(options = {}) {
    try {
      if (!this.db) {
        throw new Error('云数据库未初始化')
      }

      const { page = 1, pageSize = 20, searchType, startDate, endDate } = options
      const skip = (page - 1) * pageSize

      // 构建查询条件
      let query = this.db.collection('recognition_records')
      
      // 添加搜索类型过滤
      if (searchType) {
        query = query.where({
          searchType: searchType
        })
      }
      
      // 添加日期范围过滤
      if (startDate || endDate) {
        const dateFilter = {}
        if (startDate) {
          dateFilter.$gte = new Date(startDate)
        }
        if (endDate) {
          dateFilter.$lte = new Date(endDate)
        }
        query = query.where({
          createTime: dateFilter
        })
      }
      
      // 按时间倒序排序
      query = query.orderBy('createTime', 'desc')
      
      // 分页查询
      const result = await query.skip(skip).limit(pageSize).get()

      return {
        success: true,
        data: result.data,
        total: result.data.length,
        page: page,
        pageSize: pageSize,
        hasMore: result.data.length === pageSize
      }
    } catch (error) {
      console.error('获取识别记录失败:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * 删除识别记录
   * @param {string} recordId 记录ID
   * @returns {Promise} Promise对象
   */
  async deleteRecognitionRecord(recordId) {
    try {
      if (!this.db) {
        throw new Error('云数据库未初始化')
      }

      await this.db.collection('recognition_records').doc(recordId).remove()

      return {
        success: true,
        message: '删除成功'
      }
    } catch (error) {
      console.error('删除识别记录失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取统计数据
   * @returns {Promise} Promise对象
   */
  async getStatistics() {
    try {
      if (!this.db) {
        throw new Error('云数据库未初始化')
      }

      // 获取总记录数
      const totalResult = await this.db.collection('recognition_records').count()
      
      // 获取今日记录数
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayResult = await this.db.collection('recognition_records')
        .where({
          createTime: this.db.command.gte(today)
        })
        .count()
      
      // 获取按类型统计
      const photoResult = await this.db.collection('recognition_records')
        .where({
          searchType: 'photo'
        })
        .count()
      
      const textResult = await this.db.collection('recognition_records')
        .where({
          searchType: 'text'
        })
        .count()

      return {
        success: true,
        data: {
          total: totalResult.total,
          today: todayResult.total,
          photo: photoResult.total,
          text: textResult.total,
          lastSyncTime: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
      return {
        success: false,
        error: error.message,
        data: {
          total: 0,
          today: 0,
          photo: 0,
          text: 0,
          lastSyncTime: null
        }
      }
    }
  }

  /**
   * 导出数据
   * @param {Object} options 导出选项
   * @returns {Promise} Promise对象
   */
  async exportData(options = {}) {
    try {
      if (!this.db) {
        throw new Error('云数据库未初始化')
      }

      const { format = 'json', startDate, endDate } = options

      // 构建查询条件
      let query = this.db.collection('recognition_records')
      
      // 添加日期范围过滤
      if (startDate || endDate) {
        const dateFilter = {}
        if (startDate) {
          dateFilter.$gte = new Date(startDate)
        }
        if (endDate) {
          dateFilter.$lte = new Date(endDate)
        }
        query = query.where({
          createTime: dateFilter
        })
      }
      
      // 获取所有数据
      const result = await query.get()
      
      let exportData
      if (format === 'json') {
        exportData = JSON.stringify(result.data, null, 2)
      } else if (format === 'csv') {
        exportData = this.convertToCSV(result.data)
      }

      return {
        success: true,
        data: exportData,
        format: format,
        count: result.data.length
      }
    } catch (error) {
      console.error('导出数据失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 导入数据
   * @param {string} data 导入数据
   * @param {string} format 数据格式
   * @returns {Promise} Promise对象
   */
  async importData(data, format = 'json') {
    try {
      if (!this.db) {
        throw new Error('云数据库未初始化')
      }

      let records
      if (format === 'json') {
        records = JSON.parse(data)
      } else if (format === 'csv') {
        records = this.parseCSV(data)
      }

      if (!Array.isArray(records)) {
        throw new Error('导入数据格式错误')
      }

      // 批量导入数据
      const batchSize = 100
      const batches = []
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize)
        const batchPromises = batch.map(record => {
          const recordData = {
            ...record,
            _openid: wx.getStorageSync('openid') || 'anonymous',
            createTime: this.db.serverDate(),
            updateTime: this.db.serverDate(),
            synced: true
          }
          return this.db.collection('recognition_records').add({
            data: recordData
          })
        })
        
        batches.push(Promise.all(batchPromises))
      }

      await Promise.all(batches)

      return {
        success: true,
        message: `成功导入 ${records.length} 条记录`,
        count: records.length
      }
    } catch (error) {
      console.error('导入数据失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 降级到本地存储
   * @param {string} key 存储键名
   * @param {Object} data 数据
   * @returns {Promise} Promise对象
   */
  async saveToLocalFallback(key, data) {
    try {
      // 获取现有数据
      const existingData = wx.getStorageSync(key) || []
      
      // 添加新数据
      const recordWithId = {
        ...data,
        id: this.generateId(),
        localId: this.generateLocalId(),
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        synced: false // 标记为未同步
      }
      
      // 添加到数组开头
      existingData.unshift(recordWithId)
      
      // 限制记录数量
      const maxRecords = this.config.features.history?.maxRecords || 1000
      if (existingData.length > maxRecords) {
        existingData.splice(maxRecords)
      }
      
      // 保存到本地存储
      wx.setStorageSync(key, existingData)
      
      return {
        success: true,
        data: recordWithId,
        message: '保存到本地成功',
        synced: false
      }
    } catch (error) {
      console.error('本地存储失败:', error)
      throw error
    }
  }

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 生成本地ID
   * @returns {string} 本地ID
   */
  generateLocalId() {
    return 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 将数据转换为CSV格式
   * @param {Array} data 数据数组
   * @returns {string} CSV字符串
   */
  convertToCSV(data) {
    if (!data || data.length === 0) {
      return ''
    }
    
    // 获取所有字段
    const fields = new Set()
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        fields.add(key)
      })
    })
    
    const fieldArray = Array.from(fields)
    
    // 创建CSV头部
    let csv = fieldArray.join(',') + '\n'
    
    // 添加数据行
    data.forEach(item => {
      const row = fieldArray.map(field => {
        const value = item[field]
        if (value === null || value === undefined) {
          return ''
        }
        // 处理包含逗号、引号或换行符的值
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return '"' + stringValue.replace(/"/g, '""') + '"'
        }
        return stringValue
      })
      csv += row.join(',') + '\n'
    })
    
    return csv
  }

  /**
   * 解析CSV数据
   * @param {string} csv CSV字符串
   * @returns {Array} 数据数组
   */
  parseCSV(csv) {
    const lines = csv.split('\n')
    if (lines.length < 2) {
      return []
    }
    
    const headers = lines[0].split(',').map(header => header.trim())
    const result = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const values = []
      let inQuotes = false
      let currentValue = ''
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            // 转义的双引号
            currentValue += '"'
            j++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue)
          currentValue = ''
        } else {
          currentValue += char
        }
      }
      
      values.push(currentValue)
      
      if (values.length === headers.length) {
        const record = {}
        headers.forEach((header, index) => {
          record[header] = values[index]
        })
        result.push(record)
      }
    }
    
    return result
  }
}

// 创建实例
const dataServiceCloud = new DataServiceCloud()

// 导出模块
module.exports = {
  // 识别记录管理
  saveRecognitionRecord: (record) => dataServiceCloud.saveRecognitionRecord(record),
  getRecognitionRecords: (options) => dataServiceCloud.getRecognitionRecords(options),
  deleteRecognitionRecord: (recordId) => dataServiceCloud.deleteRecognitionRecord(recordId),
  
  // 数据统计
  getStatistics: () => dataServiceCloud.getStatistics(),
  
  // 数据导入导出
  exportData: (options) => dataServiceCloud.exportData(options),
  importData: (data, format) => dataServiceCloud.importData(data, format),
  
  // 实例
  service: dataServiceCloud
}
