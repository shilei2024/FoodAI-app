// scripts/init-database.js
// 云数据库初始化脚本

const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 创建 foods 集合 - 存储识别的食物数据
 */
async function createFoodsCollection() {
  try {
    // 检查集合是否存在
    const collections = await db.listCollections()
    const exists = collections.data.some(col => col.name === 'foods')
    
    if (exists) {
      console.log('foods 集合已存在')
      return
    }
    
    // 创建集合
    await db.createCollection('foods')
    console.log('foods 集合创建成功')
    
    // 创建索引
    await db.collection('foods').createIndex({
      name: 'food_name_index',
      unique: false,
      keys: {
        food_name: 1
      }
    })
    
    await db.collection('foods').createIndex({
      name: 'user_timestamp_index',
      unique: false,
      keys: {
        user_id: 1,
        timestamp: -1
      }
    })
    
    console.log('foods 集合索引创建成功')
    
  } catch (error) {
    console.error('创建 foods 集合失败:', error)
  }
}

/**
 * 创建 users 集合 - 用户数据
 */
async function createUsersCollection() {
  try {
    const collections = await db.listCollections()
    const exists = collections.data.some(col => col.name === 'users')
    
    if (exists) {
      console.log('users 集合已存在')
      return
    }
    
    await db.createCollection('users')
    console.log('users 集合创建成功')
    
    // 创建索引
    await db.collection('users').createIndex({
      name: 'openid_index',
      unique: true,
      keys: {
        openid: 1
      }
    })
    
    await db.collection('users').createIndex({
      name: 'phone_index',
      unique: false,
      keys: {
        phone: 1
      }
    })
    
    console.log('users 集合索引创建成功')
    
  } catch (error) {
    console.error('创建 users 集合失败:', error)
  }
}

/**
 * 创建 orders 集合 - 订单数据
 */
async function createOrdersCollection() {
  try {
    const collections = await db.listCollections()
    const exists = collections.data.some(col => col.name === 'orders')
    
    if (exists) {
      console.log('orders 集合已存在')
      return
    }
    
    await db.createCollection('orders')
    console.log('orders 集合创建成功')
    
    // 创建索引
    await db.collection('orders').createIndex({
      name: 'order_no_index',
      unique: true,
      keys: {
        order_no: 1
      }
    })
    
    await db.collection('orders').createIndex({
      name: 'user_status_index',
      unique: false,
      keys: {
        user_id: 1,
        status: 1
      }
    })
    
    await db.collection('orders').createIndex({
      name: 'create_time_index',
      unique: false,
      keys: {
        create_time: -1
      }
    })
    
    console.log('orders 集合索引创建成功')
    
  } catch (error) {
    console.error('创建 orders 集合失败:', error)
  }
}

/**
 * 创建 analysis_history 集合 - 分析历史
 */
async function createAnalysisHistoryCollection() {
  try {
    const collections = await db.listCollections()
    const exists = collections.data.some(col => col.name === 'analysis_history')
    
    if (exists) {
      console.log('analysis_history 集合已存在')
      return
    }
    
    await db.createCollection('analysis_history')
    console.log('analysis_history 集合创建成功')
    
    // 创建索引
    await db.collection('analysis_history').createIndex({
      name: 'user_food_index',
      unique: false,
      keys: {
        user_id: 1,
        food_id: 1
      }
    })
    
    await db.collection('analysis_history').createIndex({
      name: 'timestamp_index',
      unique: false,
      keys: {
        timestamp: -1
      }
    })
    
    await db.collection('analysis_history').createIndex({
      name: 'score_index',
      unique: false,
      keys: {
        health_score: -1
      }
    })
    
    console.log('analysis_history 集合索引创建成功')
    
  } catch (error) {
    console.error('创建 analysis_history 集合失败:', error)
  }
}

/**
 * 创建云存储规则
 */
async function createStorageRules() {
  console.log('云存储规则需要在云控制台手动配置：')
  console.log('1. 用户上传的图片存储在 cloud://xxx/foods/ 目录下')
  console.log('2. 设置访问权限：')
  console.log('   - 公开读：所有用户可读取')
  console.log('   - 仅创建者可读写：用户只能访问自己上传的文件')
  console.log('3. 设置文件大小限制：最大 5MB')
  console.log('4. 设置文件类型限制：仅允许图片文件')
}

/**
 * 初始化示例数据
 */
async function initSampleData() {
  try {
    // 示例食物数据
    const sampleFoods = [
      {
        food_name: '宫保鸡丁',
        category: '川菜',
        calorie: 350,
        protein: 25,
        fat: 15,
        carbohydrate: 20,
        fiber: 2,
        sodium: 800,
        health_score: 75,
        description: '经典川菜，鸡肉嫩滑，花生香脆',
        tags: ['鸡肉', '川菜', '辣味'],
        image_url: 'https://example.com/foods/kungpao_chicken.jpg',
        create_time: new Date(),
        update_time: new Date()
      },
      {
        food_name: '清炒西兰花',
        category: '蔬菜',
        calorie: 50,
        protein: 4,
        fat: 1,
        carbohydrate: 8,
        fiber: 3,
        sodium: 50,
        health_score: 95,
        description: '健康蔬菜，富含维生素C和纤维',
        tags: ['蔬菜', '健康', '低卡'],
        image_url: 'https://example.com/foods/broccoli.jpg',
        create_time: new Date(),
        update_time: new Date()
      }
    ]
    
    // 插入示例数据
    for (const food of sampleFoods) {
      await db.collection('foods').add({
        data: food
      })
    }
    
    console.log('示例食物数据插入成功')
    
  } catch (error) {
    console.error('初始化示例数据失败:', error)
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('开始初始化云数据库...')
  
  try {
    // 创建集合
    await createFoodsCollection()
    await createUsersCollection()
    await createOrdersCollection()
    await createAnalysisHistoryCollection()
    
    // 创建云存储规则（需要手动配置）
    await createStorageRules()
    
    // 初始化示例数据
    await initSampleData()
    
    console.log('云数据库初始化完成！')
    console.log('\n下一步操作：')
    console.log('1. 在微信开发者工具中上传并部署云函数')
    console.log('2. 在云控制台配置云存储规则')
    console.log('3. 在云控制台配置环境变量：')
    console.log('   - BAIDU_AI_API_KEY: 百度AI API Key')
    console.log('   - BAIDU_AI_SECRET_KEY: 百度AI Secret Key')
    
  } catch (error) {
    console.error('初始化失败:', error)
  }
}

// 执行初始化
main()
