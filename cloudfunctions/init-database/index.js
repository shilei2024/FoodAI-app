// cloudfunctions/init-database/index.js
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 数据库集合配置
const COLLECTIONS = [
  {
    name: 'api_usage',
    description: 'API使用记录',
    indexes: [
      { fields: { openid: 1, date: 1 }, options: { name: 'openid_date' } },
      { fields: { timestamp: -1 }, options: { name: 'timestamp_desc' } },
      { fields: { endpoint: 1 }, options: { name: 'endpoint' } }
    ],
    permissions: {
      read: 'auth.openid == doc.openid', // 用户只能读取自己的记录
      write: 'auth.openid == doc.openid' // 用户只能写入自己的记录
    }
  },
  {
    name: 'error_logs',
    description: '错误日志',
    indexes: [
      { fields: { timestamp: -1 }, options: { name: 'timestamp_desc' } },
      { fields: { openid: 1 }, options: { name: 'openid' } },
      { fields: { error: 1 }, options: { name: 'error' } }
    ],
    permissions: {
      read: true, // 管理员可读
      write: true // 系统可写
    }
  },
  {
    name: 'http_proxy_logs',
    description: 'HTTP代理日志',
    indexes: [
      { fields: { timestamp: -1 }, options: { name: 'timestamp_desc' } },
      { fields: { url: 1 }, options: { name: 'url' } },
      { fields: { status: 1 }, options: { name: 'status' } }
    ],
    permissions: {
      read: true, // 管理员可读
      write: true // 系统可写
    }
  },
  {
    name: 'http_proxy_errors',
    description: 'HTTP代理错误日志',
    indexes: [
      { fields: { timestamp: -1 }, options: { name: 'timestamp_desc' } },
      { fields: { code: 1 }, options: { name: 'code' } }
    ],
    permissions: {
      read: true, // 管理员可读
      write: true // 系统可写
    }
  },
  {
    name: 'rate_limit_cache',
    description: '频率限制缓存',
    indexes: [
      { fields: { key: 1 }, options: { name: 'key', unique: true } },
      { fields: { expireAt: 1 }, options: { name: 'expireAt', expireAfterSeconds: 0 } }
    ],
    permissions: {
      read: true, // 系统可读
      write: true // 系统可写
    }
  }
]

/**
 * 创建集合
 * @param {string} name 集合名称
 * @param {Object} config 集合配置
 */
async function createCollection(name, config) {
  const db = cloud.database()
  
  try {
    // 检查集合是否存在
    const collections = await db.listCollections()
    const exists = collections.collections.some(col => col.name === name)
    
    if (exists) {
      console.log(`集合 ${name} 已存在，跳过创建`)
      return { success: true, exists: true }
    }
    
    // 创建集合
    await db.createCollection(name)
    console.log(`集合 ${name} 创建成功`)
    
    // 创建索引
    if (config.indexes && config.indexes.length > 0) {
      for (const index of config.indexes) {
        try {
          await db.collection(name).createIndex(index.fields, index.options)
          console.log(`集合 ${name} 索引创建成功: ${index.options.name}`)
        } catch (indexError) {
          console.warn(`集合 ${name} 索引创建失败:`, indexError)
        }
      }
    }
    
    return { success: true, exists: false }
    
  } catch (error) {
    console.error(`创建集合 ${name} 失败:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * 设置集合权限
 * @param {string} name 集合名称
 * @param {Object} permissions 权限配置
 */
async function setCollectionPermissions(name, permissions) {
  try {
    // 注意：云开发控制台中设置权限更直观
    // 这里只是记录建议的权限设置
    console.log(`集合 ${name} 建议权限设置:`)
    console.log(`  读取权限: ${permissions.read}`)
    console.log(`  写入权限: ${permissions.write}`)
    
    return { success: true }
    
  } catch (error) {
    console.error(`设置集合 ${name} 权限失败:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * 主函数 - 云函数入口
 */
exports.main = async (event, context) => {
  const { action = 'init', collections = COLLECTIONS } = event
  
  try {
    const results = []
    
    switch (action) {
      case 'init':
        // 初始化所有集合
        console.log('开始初始化数据库集合...')
        
        for (const collection of collections) {
          console.log(`处理集合: ${collection.name} - ${collection.description}`)
          
          // 创建集合
          const createResult = await createCollection(collection.name, collection)
          
          // 设置权限
          if (createResult.success && collection.permissions) {
            await setCollectionPermissions(collection.name, collection.permissions)
          }
          
          results.push({
            collection: collection.name,
            ...createResult
          })
        }
        
        console.log('数据库集合初始化完成')
        break
        
      case 'check':
        // 检查集合状态
        console.log('检查数据库集合状态...')
        
        const db = cloud.database()
        const existingCollections = await db.listCollections()
        const existingNames = existingCollections.collections.map(col => col.name)
        
        for (const collection of collections) {
          const exists = existingNames.includes(collection.name)
          results.push({
            collection: collection.name,
            exists: exists,
            status: exists ? '已存在' : '不存在'
          })
        }
        break
        
      case 'cleanup':
        // 清理测试数据（谨慎使用）
        const { days = 30 } = event
        
        if (days < 7) {
          return {
            success: false,
            error: '清理天数不能少于7天',
            code: 'INVALID_DAYS'
          }
        }
        
        console.log(`清理 ${days} 天前的测试数据...`)
        
        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000)
        
        // 清理api_usage
        const usageResult = await cloud.database()
          .collection('api_usage')
          .where({
            timestamp: cloud.database.command.lt(cutoffTime),
            test: true // 只清理测试数据
          })
          .remove()
        
        // 清理error_logs
        const errorResult = await cloud.database()
          .collection('error_logs')
          .where({
            timestamp: cloud.database.command.lt(cutoffTime),
            test: true
          })
          .remove()
        
        results.push({
          collection: 'api_usage',
          deleted: usageResult.deleted,
          status: 'cleaned'
        })
        
        results.push({
          collection: 'error_logs',
          deleted: errorResult.deleted,
          status: 'cleaned'
        })
        
        console.log('测试数据清理完成')
        break
        
      default:
        return {
          success: false,
          error: `不支持的action: ${action}`,
          code: 'UNSUPPORTED_ACTION'
        }
    }
    
    return {
      success: true,
      action: action,
      results: results,
      timestamp: Date.now()
    }
    
  } catch (error) {
    console.error('数据库初始化失败:', error)
    
    // 记录错误
    try {
      await cloud.database().collection('error_logs').add({
        data: {
          error: error.message,
          stack: error.stack,
          timestamp: Date.now(),
          action: 'init-database',
          event: JSON.stringify(event)
        }
      })
    } catch (logError) {
      console.error('记录错误日志失败:', logError)
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code || 'INIT_FAILED',
      timestamp: Date.now()
    }
  }
}
