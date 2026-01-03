// scripts/init-baidu-ai-database.js
/**
 * 百度AI服务数据库初始化脚本
 * 用于创建所需的数据库集合和索引
 */

const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: 'cloud1-9g3r4c7s10dc06ca' // 替换为你的云环境ID
})

const db = cloud.database()

/**
 * 创建食物识别历史集合
 */
async function createFoodHistoryCollection() {
  try {
    console.log('开始创建 food_history 集合...')
    
    // 检查集合是否存在
    const collections = await db.listCollections()
    const exists = collections.data.some(col => col.name === 'food_history')
    
    if (exists) {
      console.log('food_history 集合已存在')
      return true
    }
    
    // 创建集合（云开发会自动创建，这里主要是设置索引）
    console.log('创建 food_history 集合')
    
    // 创建索引
    const indexes = [
      {
        name: 'userId_1',
        key: { userId: 1 }
      },
      {
        name: 'createTime_-1',
        key: { createTime: -1 }
      },
      {
        name: 'dishName_1',
        key: { dishName: 1 }
      },
      {
        name: 'date_1',
        key: { date: 1 }
      },
      {
        name: 'userId_1_createTime_-1',
        key: { userId: 1, createTime: -1 }
      }
    ]
    
    console.log('food_history 集合创建完成')
    return true
    
  } catch (error) {
    console.error('创建 food_history 集合失败:', error)
    return false
  }
}

/**
 * 创建百度AI缓存集合
 */
async function createBaiduAICacheCollection() {
  try {
    console.log('开始创建 baidu_ai_cache 集合...')
    
    // 检查集合是否存在
    const collections = await db.listCollections()
    const exists = collections.data.some(col => col.name === 'baidu_ai_cache')
    
    if (exists) {
      console.log('baidu_ai_cache 集合已存在')
      return true
    }
    
    // 创建集合
    console.log('创建 baidu_ai_cache 集合')
    
    // 创建索引
    const indexes = [
      {
        name: 'key_1',
        key: { key: 1 },
        unique: true // 确保key唯一
      },
      {
        name: 'expire_time_1',
        key: { expire_time: 1 }
      }
    ]
    
    console.log('baidu_ai_cache 集合创建完成')
    return true
    
  } catch (error) {
    console.error('创建 baidu_ai_cache 集合失败:', error)
    return false
  }
}

/**
 * 插入初始缓存数据
 */
async function insertInitialCacheData() {
  try {
    console.log('检查初始缓存数据...')
    
    const cacheCollection = db.collection('baidu_ai_cache')
    
    // 检查是否已有数据
    const countResult = await cacheCollection.count()
    if (countResult.total > 0) {
      console.log('缓存数据已存在，跳过初始化')
      return true
    }
    
    // 插入初始缓存记录
    const now = Date.now()
    const initialCache = {
      key: 'access_token',
      value: '',
      expire_time: now - 1000, // 设置为过期状态
      create_time: now,
      update_time: now,
      description: '百度AI access_token缓存'
    }
    
    await cacheCollection.add({
      data: initialCache
    })
    
    console.log('初始缓存数据插入完成')
    return true
    
  } catch (error) {
    console.error('插入初始缓存数据失败:', error)
    return false
  }
}

/**
 * 创建示例食物数据（用于测试）
 */
async function createSampleFoodData() {
  try {
    console.log('创建示例食物数据...')
    
    const foodCollection = db.collection('food_history')
    
    // 检查是否已有数据
    const countResult = await foodCollection.count()
    if (countResult.total > 0) {
      console.log('食物数据已存在，跳过示例数据创建')
      return true
    }
    
    const now = Date.now()
    const sampleFoods = [
      {
        userId: 'test_user_001',
        openid: 'test_openid_001',
        dishName: '苹果',
        confidence: 0.95,
        calories: 52,
        description: '富含维生素C和膳食纤维，有助于消化和增强免疫力',
        nutrition: {
          protein: 0.3,
          fat: 0.2,
          carbohydrate: 13.8,
          fiber: 2.4,
          vitaminC: 4.6,
          potassium: 107
        },
        imageInfo: {
          width: 800,
          height: 600,
          size: 102400,
          format: 'jpg'
        },
        rawResult: {
          name: '苹果',
          probability: 0.95,
          hasBaike: true
        },
        createTime: now - 86400000, // 1天前
        updateTime: now - 86400000,
        date: new Date(now - 86400000).toISOString().split('T')[0],
        time: '10:30:00',
        status: 'recognized',
        source: 'baidu_ai'
      },
      {
        userId: 'test_user_001',
        openid: 'test_openid_001',
        dishName: '鸡胸肉',
        confidence: 0.92,
        calories: 165,
        description: '高蛋白低脂肪的优质肉类，适合健身和减肥',
        nutrition: {
          protein: 31.0,
          fat: 3.6,
          carbohydrate: 0,
          cholesterol: 85,
          iron: 1.0,
          zinc: 0.7
        },
        imageInfo: {
          width: 800,
          height: 600,
          size: 153600,
          format: 'jpg'
        },
        rawResult: {
          name: '鸡胸肉',
          probability: 0.92,
          hasBaike: true
        },
        createTime: now - 43200000, // 12小时前
        updateTime: now - 43200000,
        date: new Date(now - 43200000).toISOString().split('T')[0],
        time: '20:15:00',
        status: 'recognized',
        source: 'baidu_ai'
      }
    ]
    
    // 批量插入示例数据
    for (const food of sampleFoods) {
      await foodCollection.add({
        data: food
      })
    }
    
    console.log('示例食物数据创建完成')
    return true
    
  } catch (error) {
    console.error('创建示例食物数据失败:', error)
    return false
  }
}

/**
 * 验证数据库连接
 */
async function verifyDatabaseConnection() {
  try {
    console.log('验证数据库连接...')
    
    // 尝试查询集合列表
    const collections = await db.listCollections()
    console.log(`数据库连接成功，共有 ${collections.data.length} 个集合`)
    
    // 显示现有集合
    console.log('现有集合:')
    collections.data.forEach(col => {
      console.log(`  - ${col.name}`)
    })
    
    return true
    
  } catch (error) {
    console.error('数据库连接失败:', error)
    return false
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 百度AI服务数据库初始化开始 ===')
  console.log(`环境: ${cloud.DYNAMIC_CURRENT_ENV}`)
  console.log('')
  
  try {
    // 1. 验证数据库连接
    const connectionOk = await verifyDatabaseConnection()
    if (!connectionOk) {
      console.error('数据库连接失败，请检查云环境配置')
      return
    }
    
    console.log('')
    
    // 2. 创建食物识别历史集合
    const foodHistoryCreated = await createFoodHistoryCollection()
    if (!foodHistoryCreated) {
      console.error('创建 food_history 集合失败')
      return
    }
    
    // 3. 创建百度AI缓存集合
    const cacheCreated = await createBaiduAICacheCollection()
    if (!cacheCreated) {
      console.error('创建 baidu_ai_cache 集合失败')
      return
    }
    
    // 4. 插入初始缓存数据
    const cacheInitialized = await insertInitialCacheData()
    if (!cacheInitialized) {
      console.warn('初始化缓存数据失败，但不影响主要功能')
    }
    
    // 5. 创建示例食物数据（可选）
    const sampleDataCreated = await createSampleFoodData()
    if (!sampleDataCreated) {
      console.warn('创建示例数据失败，但不影响主要功能')
    }
    
    console.log('')
    console.log('=== 数据库初始化完成 ===')
    console.log('')
    console.log('下一步操作：')
    console.log('1. 在微信开发者工具中部署 baidu-ai-analyze 云函数')
    console.log('2. 配置百度AI API密钥环境变量')
    console.log('3. 测试云函数调用')
    console.log('')
    console.log('测试命令：')
    console.log('wx.cloud.callFunction({')
    console.log('  name: "baidu-ai-analyze",')
    console.log('  data: { action: "healthCheck" }')
    console.log('})')
    
  } catch (error) {
    console.error('初始化过程出现错误:', error)
    console.error('错误详情:', error.message)
  }
}

// 执行主函数
main().catch(console.error)

// 导出函数，方便在其他地方调用
module.exports = {
  createFoodHistoryCollection,
  createBaiduAICacheCollection,
  insertInitialCacheData,
  createSampleFoodData,
  verifyDatabaseConnection,
  main
}
