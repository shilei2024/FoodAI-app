// pages/history/history.js
const dataService = require('../../services/data-service.js')

Page({
  data: {
    // 历史记录数据
    historyList: [],
    // 筛选条件
    filterType: 'all', // all, today, week, month
    // 加载状态
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    // 统计数据
    stats: {
      total: 0,
      today: 0,
      week: 0,
      month: 0
    }
  },

  onLoad(options) {
    // 页面加载时执行
    this.loadHistoryData()
  },

  onShow() {
    // 页面显示时执行
    this.refreshData()
  },

  onPullDownRefresh() {
    // 下拉刷新
    this.refreshData()
  },

  onReachBottom() {
    // 上拉加载更多
    this.loadMoreData()
  },

  // 刷新数据
  refreshData() {
    this.setData({
      page: 1,
      historyList: [],
      hasMore: true
    })
    this.loadHistoryData()
  },

  // 加载历史数据
  async loadHistoryData() {
    if (this.data.loading || !this.data.hasMore) return

    this.setData({ loading: true })

    try {
      // 构建过滤条件
      const filter = this.buildFilter()
      
      // 获取数据
      const result = await dataService.getRecognitionRecords({
        filter: filter,
        page: this.data.page,
        pageSize: this.data.pageSize,
        sort: (a, b) => new Date(b.createTime || b.timestamp) - new Date(a.createTime || a.timestamp)
      })

      if (result.success) {
        const newList = this.data.historyList.concat(this.formatHistoryData(result.data))
        
        // 获取统计数据
        const stats = dataService.getStats()
        
        this.setData({
          historyList: newList,
          loading: false,
          page: this.data.page + 1,
          hasMore: result.data.length === this.data.pageSize,
          stats: {
            total: stats.total || 0,
            today: stats.today || 0,
            week: stats.week || 0,
            month: stats.month || 0
          }
        })
      } else {
        throw new Error(result.error || '加载数据失败')
      }
    } catch (error) {
      console.error('加载历史数据失败:', error)
      this.setData({ loading: false })
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none',
        duration: 2000
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 加载更多数据
  loadMoreData() {
    if (this.data.hasMore) {
      this.loadHistoryData()
    }
  },

  // 构建过滤条件
  buildFilter() {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    switch (this.data.filterType) {
      case 'today':
        return (record) => {
          const recordDate = new Date(record.createTime || record.timestamp).toISOString().split('T')[0]
          return recordDate === today
        }
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return (record) => new Date(record.createTime || record.timestamp) >= weekAgo
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return (record) => new Date(record.createTime || record.timestamp) >= monthAgo
      default:
        return null // 全部数据
    }
  },

  // 格式化历史数据
  formatHistoryData(records) {
    return records.map(record => {
      const time = new Date(record.createTime || record.timestamp)
      const now = new Date()
      const diff = now - time
      
      let timeText
      if (diff < 60 * 1000) {
        timeText = '刚刚'
      } else if (diff < 60 * 60 * 1000) {
        timeText = Math.floor(diff / (60 * 1000)) + '分钟前'
      } else if (diff < 24 * 60 * 60 * 1000) {
        timeText = Math.floor(diff / (60 * 60 * 1000)) + '小时前'
      } else if (diff < 7 * 24 * 60 * 60 * 1000) {
        timeText = Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前'
      } else {
        const month = time.getMonth() + 1
        const day = time.getDate()
        const hours = time.getHours().toString().padStart(2, '0')
        const minutes = time.getMinutes().toString().padStart(2, '0')
        timeText = `${month}-${day} ${hours}:${minutes}`
      }
      
      return {
        id: record.id || record.localId,
        foodName: record.foodName || '未知食物',
        calories: record.calorie || 0,
        image: record.imagePath || '',
        time: timeText,
        type: record.source === 'ai' ? 'ai' : 'manual',
        tags: record.tags || [],
        confidence: record.confidence || 0,
        nutrition: record.nutrition || {},
        rawData: record
      }
    })
  },

  // 切换筛选类型
  switchFilter(e) {
    const type = e.currentTarget.dataset.type
    if (type !== this.data.filterType) {
      this.setData({ filterType: type })
      this.refreshData()
    }
  },

  // 查看详情
  viewDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}&from=history`
    })
  },

  // 删除记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteRecordById(id)
        }
      }
    })
  },

  // 根据ID删除记录
  async deleteRecordById(id) {
    try {
      const result = await dataService.deleteRecognitionRecord(id)
      
      if (result.success) {
        // 更新本地列表
        const newList = this.data.historyList.filter(item => item.id !== id)
        this.setData({ historyList: newList })
        
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 2000
        })
      } else {
        throw new Error(result.error || '删除失败')
      }
    } catch (error) {
      console.error('删除记录失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 清空历史
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？此操作不可恢复',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await dataService.clearRecognitionRecords()
            
            if (result.success) {
              this.setData({ 
                historyList: [],
                page: 1,
                hasMore: false
              })
              
              wx.showToast({
                title: `已清空 ${result.deletedCount} 条记录`,
                icon: 'success',
                duration: 2000
              })
            } else {
              throw new Error(result.error || '清空失败')
            }
          } catch (error) {
            console.error('清空历史失败:', error)
            wx.showToast({
              title: '清空失败',
              icon: 'none',
              duration: 2000
            })
          }
        }
      }
    })
  },

  // 导出数据
  async exportData() {
    try {
      wx.showLoading({
        title: '准备导出...',
        mask: true
      })
      
      const result = await dataService.exportData('json')
      
      if (result.success) {
        // 保存到文件
        const filePath = `${wx.env.USER_DATA_PATH}/foodai_history_${Date.now()}.json`
        const fs = wx.getFileSystemManager()
        
        fs.writeFileSync(filePath, result.data, 'utf8')
        
        // 分享或保存到相册
        wx.saveFile({
          tempFilePath: filePath,
          success: (res) => {
            wx.hideLoading()
            wx.showModal({
              title: '导出成功',
              content: `已导出 ${result.count} 条记录\n文件已保存到: ${res.savedFilePath}`,
              showCancel: false,
              confirmText: '确定'
            })
          },
          fail: (error) => {
            wx.hideLoading()
            wx.showToast({
              title: '保存文件失败',
              icon: 'none',
              duration: 3000
            })
          }
        })
      } else {
        throw new Error(result.error || '导出失败')
      }
    } catch (error) {
      console.error('导出数据失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '导出失败: ' + error.message,
        icon: 'none',
        duration: 3000
      })
    }
  }
})
