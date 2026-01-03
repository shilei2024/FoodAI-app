// services/data-service.js
const config = require('../constants/config.js')

/**
 * 数据持久化服务
 * 支持本地存储和云端存储，实现数据同步
 */
class DataService {
  constructor() {
    this.config = config
    this.useCloud = false // 默认不使用云开发（个人认证限制）
    this.syncQueue = [] // 同步队列，存储待同步的数据
    this.init()
  }

  /**
   * 初始化
   */
  init() {
    // 检查是否支持云开发
    if (wx.cloud && this.config.cloud && this.config.cloud.env) {
      try {
        wx.cloud.init({
          env: this.config.cloud.env,
          traceUser: true
        })
        this.useCloud = true
        console.log('云开发初始化成功')
      } catch (error) {
        console.warn('云开发初始化失败，使用本地存储:', error)
        this.useCloud = false
      }
    }
    
    // 初始化同步队列
    this.loadSyncQueue()
    
    // 启动同步检查
    this.startSyncCheck()
  }

  /**
   * 保存识别记录
   * @param {Object} record 识别记录
   * @returns {Promise} Promise对象
   */
  async saveRecognitionRecord(record) {
    try {
      // 1. 保存到本地存储
      const localResult = await this.saveToLocal('recognition_records', record)
      
      // 2. 添加到同步队列（如果支持云开发）
      if (this.useCloud) {
        await this.addToSyncQueue('recognition_records', record)
      }
      
      return {
        success: true,
        data: localResult.data,
        message: '保存成功',
        synced: !this.useCloud // 如果不使用云开发，则视为已同步
      }
    } catch (error) {
      console.error('保存识别记录失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 保存到本地存储
   * @param {string} key 存储键名
   * @param {Object} data 数据
   * @returns {Promise} Promise对象
   */
  async saveToLocal(key, data) {
    return new Promise((resolve, reject) => {
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
          synced: !this.useCloud // 如果不使用云开发，则视为已同步
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
        
        resolve({
          success: true,
          data: recordWithId,
          count: existingData.length
        })
      } catch (error) {
        reject(new Error(`保存到本地存储失败: ${error.message}`))
      }
    })
  }

  /**
   * 从本地存储获取数据
   * @param {string} key 存储键名
   * @param {Object} options 选项
   * @returns {Promise} Promise对象
   */
  async getFromLocal(key, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        let data = wx.getStorageSync(key) || []
        
        // 应用过滤条件
        if (options.filter) {
          data = data.filter(options.filter)
        }
        
        // 应用排序
        if (options.sort) {
          data.sort(options.sort)
        }
        
        // 分页
        if (options.page && options.pageSize) {
          const start = (options.page - 1) * options.pageSize
          const end = start + options.pageSize
          data = data.slice(start, end)
        }
        
        // 限制数量
        if (options.limit) {
          data = data.slice(0, options.limit)
        }
        
        resolve({
          success: true,
          data: data,
          total: wx.getStorageSync(key)?.length || 0,
          count: data.length
        })
      } catch (error) {
        reject(new Error(`从本地存储获取数据失败: ${error.message}`))
      }
    })
  }

  /**
   * 从本地存储删除数据
   * @param {string} key 存储键名
   * @param {string|Function} condition 删除条件（ID或过滤函数）
   * @returns {Promise} Promise对象
   */
  async deleteFromLocal(key, condition) {
    return new Promise((resolve, reject) => {
      try {
        const data = wx.getStorageSync(key) || []
        
        let newData
        if (typeof condition === 'function') {
          newData = data.filter(item => !condition(item))
        } else {
          newData = data.filter(item => item.id !== condition && item.localId !== condition)
        }
        
        wx.setStorageSync(key, newData)
        
        resolve({
          success: true,
          deletedCount: data.length - newData.length,
          remainingCount: newData.length
        })
      } catch (error) {
        reject(new Error(`从本地存储删除数据失败: ${error.message}`))
      }
    })
  }

  /**
   * 清空本地存储
   * @param {string} key 存储键名
   * @returns {Promise} Promise对象
   */
  async clearLocal(key) {
    return new Promise((resolve, reject) => {
      try {
        const count = wx.getStorageSync(key)?.length || 0
        wx.removeStorageSync(key)
        
        resolve({
          success: true,
          deletedCount: count
        })
      } catch (error) {
        reject(new Error(`清空本地存储失败: ${error.message}`))
      }
    })
  }

  /**
   * 添加到同步队列
   * @param {string} collection 集合名称
   * @param {Object} data 数据
   */
  async addToSyncQueue(collection, data) {
    try {
      const queueItem = {
        id: this.generateId(),
        collection: collection,
        data: data,
        operation: 'add',
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending'
      }
      
      this.syncQueue.push(queueItem)
      this.saveSyncQueue()
      
      console.log('添加到同步队列:', queueItem)
    } catch (error) {
      console.error('添加到同步队列失败:', error)
    }
  }

  /**
   * 加载同步队列
   */
  loadSyncQueue() {
    try {
      const queue = wx.getStorageSync('data_sync_queue') || []
      this.syncQueue = queue
      console.log('加载同步队列，项目数:', queue.length)
    } catch (error) {
      console.error('加载同步队列失败:', error)
      this.syncQueue = []
    }
  }

  /**
   * 保存同步队列
   */
  saveSyncQueue() {
    try {
      wx.setStorageSync('data_sync_queue', this.syncQueue)
    } catch (error) {
      console.error('保存同步队列失败:', error)
    }
  }

  /**
   * 启动同步检查
   */
  startSyncCheck() {
    if (!this.useCloud) return
    
    // 每30秒检查一次同步
    setInterval(() => {
      this.processSyncQueue()
    }, 30 * 1000)
    
    // 网络状态变化时同步
    wx.onNetworkStatusChange((res) => {
      if (res.isConnected) {
        this.processSyncQueue()
      }
    })
  }

  /**
   * 处理同步队列
   */
  async processSyncQueue() {
    if (!this.useCloud || this.syncQueue.length === 0) return
    
    console.log('开始处理同步队列，项目数:', this.syncQueue.length)
    
    const pendingItems = this.syncQueue.filter(item => item.status === 'pending')
    
    for (const item of pendingItems) {
      try {
        await this.syncToCloud(item)
        item.status = 'synced'
        item.syncedAt = Date.now()
      } catch (error) {
        console.error('同步失败:', error)
        item.retryCount++
        item.lastError = error.message
        
        if (item.retryCount >= 3) {
          item.status = 'failed'
        }
      }
      
      this.saveSyncQueue()
    }
    
    // 清理已同步的项目（保留7天）
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    this.syncQueue = this.syncQueue.filter(item => 
      item.status !== 'synced' || item.syncedAt > sevenDaysAgo
    )
    
    this.saveSyncQueue()
  }

  /**
   * 同步到云端
   * @param {Object} queueItem 队列项目
   */
  async syncToCloud(queueItem) {
    if (!this.useCloud) return
    
    try {
      const { collection, data, operation } = queueItem
      
      switch (operation) {
        case 'add':
          await wx.cloud.database().collection(collection).add({
            data: {
              ...data,
              createTime: new Date(),
              updateTime: new Date(),
              synced: true
            }
          })
          break
          
        case 'update':
          await wx.cloud.database().collection(collection).doc(data._id).update({
            data: {
              ...data,
              updateTime: new Date()
            }
          })
          break
          
        case 'delete':
          await wx.cloud.database().collection(collection).doc(data._id).remove()
          break
      }
      
      console.log('同步到云端成功:', queueItem)
    } catch (error) {
      console.error('同步到云端失败:', error)
      throw error
    }
  }

  /**
   * 获取统计数据
   * @returns {Object} 统计数据
   */
  getStats() {
    try {
      const records = wx.getStorageSync('recognition_records') || []
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      const stats = {
        total: records.length,
        today: 0,
        week: 0,
        month: 0,
        byFood: {},
        byDate: {}
      }
      
      records.forEach(record => {
        const recordDate = new Date(record.createTime || record.timestamp)
        const dateStr = recordDate.toISOString().split('T')[0]
        
        // 按日期统计
        if (dateStr === today) stats.today++
        if (recordDate >= weekAgo) stats.week++
        if (recordDate >= monthAgo) stats.month++
        
        // 按食物统计
        const foodName = record.foodName || '未知'
        stats.byFood[foodName] = (stats.byFood[foodName] || 0) + 1
        
        // 按日期统计
        stats.byDate[dateStr] = (stats.byDate[dateStr] || 0) + 1
      })
      
      return stats
    } catch (error) {
      console.error('获取统计数据失败:', error)
      return {
        total: 0,
        today: 0,
        week: 0,
        month: 0,
        byFood: {},
        byDate: {}
      }
    }
  }

  /**
   * 导出数据
   * @param {string} format 格式（json, csv）
   * @returns {Promise} Promise对象
   */
  async exportData(format = 'json') {
    try {
      const records = wx.getStorageSync('recognition_records') || []
      
      if (format === 'json') {
        return {
          success: true,
          data: JSON.stringify(records, null, 2),
          format: 'json',
          count: records.length
        }
      } else if (format === 'csv') {
        // 简单的CSV转换
        if (records.length === 0) {
          return {
            success: true,
            data: '',
            format: 'csv',
            count: 0
          }
        }
        
        const headers = ['食物名称', '置信度', '热量(kcal)', '识别时间', '图片路径']
        const rows = records.map(record => [
          record.foodName || '',
          record.confidence || 0,
          record.calorie || 0,
          new Date(record.timestamp || record.createTime).toLocaleString(),
          record.imagePath || ''
        ])
        
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')
        
        return {
          success: true,
          data: csvContent,
          format: 'csv',
          count: records.length
        }
      }
      
      throw new Error(`不支持的格式: ${format}`)
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
   * @param {string} data 数据
   * @param {string} format 格式
   * @returns {Promise} Promise对象
   */
  async importData(data, format = 'json') {
    try {
      let records
      
      if (format === 'json') {
        records = JSON.parse(data)
      } else if (format === 'csv') {
        // 简单的CSV解析
        const lines = data.split('\n')
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
        records = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.replace(/"/g, '').trim())
          const record = {}
          headers.forEach((header, index) => {
            record[header] = values[index]
          })
          return record
        })
      } else {
        throw new Error(`不支持的格式: ${format}`)
      }
      
      // 验证数据格式
      if (!Array.isArray(records)) {
        throw new Error('数据格式错误，应为数组')
      }
      
      // 合并数据
      const existingRecords = wx.getStorageSync('recognition_records') || []
      const mergedRecords = [...records, ...existingRecords]
      
      // 去重（基于时间戳和食物名称）
      const uniqueRecords = []
      const seen = new Set()
      
      mergedRecords.forEach(record => {
        const key = `${record.foodName}_${record.timestamp}`
        if (!seen.has(key)) {
          seen.add(key)
          uniqueRecords.push(record)
        }
      })
      
      // 保存
      wx.setStorageSync('recognition_records', uniqueRecords)
      
      return {
        success: true,
        importedCount: records.length,
        totalCount: uniqueRecords.length,
        duplicateCount: mergedRecords.length - uniqueRecords.length
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
   * 生成ID
   * @returns {string} ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 生成本地ID
   * @returns {string} 本地ID
   */
  generateLocalId() {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }
}

// 创建单例实例
const dataService = new DataService()

module.exports = {
  // 数据操作
  saveRecognitionRecord: (record) => dataService.saveRecognitionRecord(record),
  getRecognitionRecords: (options) => dataService.getFromLocal('recognition_records', options),
  deleteRecognitionRecord: (condition) => dataService.deleteFromLocal('recognition_records', condition),
  clearRecognitionRecords: () => dataService.clearLocal('recognition_records'),
  
  // 通用存储操作
  saveToLocal: (key, data) => dataService.saveToLocal(key, data),
  getFromLocal: (key, options) => dataService.getFromLocal(key, options),
  deleteFromLocal: (key, condition) => dataService.deleteFromLocal(key, condition),
  clearLocal: (key) => dataService.clearLocal(key),
  
  // 数据管理
  getStats: () => dataService.getStats(),
  exportData: (format) => dataService.exportData(format),
  importData: (data, format) => dataService.importData(data, format),
  
  // 同步
  processSyncQueue: () => dataService.processSyncQueue(),
  
  // 实例
  service: dataService
}
