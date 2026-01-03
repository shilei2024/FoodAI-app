// cloudfunctions/data-analytics/index.js
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 数据库引用
const db = cloud.database()
const analyticsCollection = db.collection('analytics_data')

/**
 * 记录用户行为
 */
async function recordUserAction(event) {
  try {
    const { userId, action, data = {}, timestamp = new Date() } = event
    
    if (!userId || !action) {
      return {
        success: false,
        error: '缺少必要参数',
        code: 400
      }
    }
    
    const record = {
      userId: userId,
      action: action,
      data: data,
      timestamp: timestamp,
      date: new Date(timestamp).toISOString().split('T')[0],
      hour: new Date(timestamp).getHours(),
      userAgent: '', // 可以从context获取
      ip: '' // 可以从context获取
    }
    
    await analyticsCollection.add({
      data: record
    })
    
    return {
      success: true,
      message: '行为记录成功'
    }
    
  } catch (error) {
    console.error('记录用户行为失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 获取用户行为统计
 */
async function getUserAnalytics(event) {
  try {
    const { userId, startDate, endDate } = event
    
    if (!userId) {
      return {
        success: false,
        error: '缺少用户ID',
        code: 400
      }
    }
    
    const query = {
      userId: userId
    }
    
    if (startDate) {
      query.date = query.date || {}
      query.date.$gte = startDate
    }
    
    if (endDate) {
      query.date = query.date || {}
      query.date.$lte = endDate
    }
    
    const records = await analyticsCollection.where(query).get()
    
    // 按行为类型统计
    const actionStats = {}
    records.data.forEach(record => {
      if (!actionStats[record.action]) {
        actionStats[record.action] = {
          count: 0,
          lastTime: record.timestamp
        }
      }
      actionStats[record.action].count++
      if (new Date(record.timestamp) > new Date(actionStats[record.action].lastTime)) {
        actionStats[record.action].lastTime = record.timestamp
      }
    })
    
    // 按日期统计
    const dateStats = {}
    records.data.forEach(record => {
      if (!dateStats[record.date]) {
        dateStats[record.date] = 0
      }
      dateStats[record.date]++
    })
    
    // 按小时统计活跃度
    const hourStats = new Array(24).fill(0)
    records.data.forEach(record => {
      if (record.hour >= 0 && record.hour < 24) {
        hourStats[record.hour]++
      }
    })
    
    return {
      success: true,
      data: {
        totalRecords: records.data.length,
        actionStats: actionStats,
        dateStats: dateStats,
        hourStats: hourStats,
        period: {
          startDate: startDate,
          endDate: endDate
        }
      }
    }
    
  } catch (error) {
    console.error('获取用户分析失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 获取系统整体统计
 */
async function getSystemAnalytics(event) {
  try {
    const { period = 'day' } = event // day, week, month
    
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 1)
    }
    
    const startDateStr = startDate.toISOString().split('T')[0]
    
    // 获取活跃用户数
    const activeUsers = await analyticsCollection
      .where({
        date: db.command.gte(startDateStr)
      })
      .field({
        userId: true
      })
      .get()
    
    const uniqueUsers = new Set(activeUsers.data.map(item => item.userId))
    
    // 获取行为统计
    const actions = await analyticsCollection
      .where({
        date: db.command.gte(startDateStr)
      })
      .get()
    
    const actionCounts = {}
    actions.data.forEach(record => {
      actionCounts[record.action] = (actionCounts[record.action] || 0) + 1
    })
    
    return {
      success: true,
      data: {
        period: period,
        activeUsers: uniqueUsers.size,
        totalActions: actions.data.length,
        actionDistribution: actionCounts,
        timeRange: {
          start: startDateStr,
          end: now.toISOString().split('T')[0]
        }
      }
    }
    
  } catch (error) {
    console.error('获取系统分析失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 导出用户数据
 */
async function exportUserData(event) {
  try {
    const { userId, format = 'json' } = event
    
    if (!userId) {
      return {
        success: false,
        error: '缺少用户ID',
        code: 400
      }
    }
    
    // 获取用户所有行为记录
    const records = await analyticsCollection.where({
      userId: userId
    }).get()
    
    if (format === 'csv') {
      // 生成CSV格式
      const csvHeaders = ['时间', '行为', '数据', '日期', '小时']
      const csvRows = records.data.map(record => [
        record.timestamp,
        record.action,
        JSON.stringify(record.data),
        record.date,
        record.hour
      ])
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n')
      
      return {
        success: true,
        data: {
          format: 'csv',
          content: csvContent,
          recordCount: records.data.length,
          exportTime: new Date()
        }
      }
      
    } else {
      // 默认JSON格式
      return {
        success: true,
        data: {
          format: 'json',
          records: records.data,
          recordCount: records.data.length,
          exportTime: new Date()
        }
      }
    }
    
  } catch (error) {
    console.error('导出用户数据失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event
  
  switch (action) {
    case 'recordUserAction':
      return await recordUserAction(event)
    case 'getUserAnalytics':
      return await getUserAnalytics(event)
    case 'getSystemAnalytics':
      return await getSystemAnalytics(event)
    case 'exportUserData':
      return await exportUserData(event)
    default:
      return {
        success: false,
        error: '未知的操作类型',
        code: 400
      }
  }
}
