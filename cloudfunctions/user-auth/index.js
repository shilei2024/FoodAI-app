// cloudfunctions/user-auth/index.js
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 数据库引用
const db = cloud.database()
const usersCollection = db.collection('users')
const userStatsCollection = db.collection('user_stats')
const userUsageCollection = db.collection('user_usage')

/**
 * 微信登录认证
 */
async function wechatLogin(event) {
  try {
    const { code, userInfo } = event
    
    if (!code) {
      return {
        success: false,
        error: '缺少登录凭证code',
        code: 400
      }
    }
    
    // 1. 获取微信openid和session_key
    const wxContext = cloud.getWXContext()
    const { OPENID, UNIONID } = wxContext
    
    if (!OPENID) {
      return {
        success: false,
        error: '获取用户标识失败',
        code: 500
      }
    }
    
    // 2. 检查用户是否已存在
    const userQuery = await usersCollection.where({
      openid: OPENID
    }).get()
    
    let userData = null
    const now = new Date()
    
    if (userQuery.data.length === 0) {
      // 新用户注册
      userData = {
        openid: OPENID,
        unionid: UNIONID || '',
        userInfo: userInfo || {},
        registerTime: now,
        lastLoginTime: now,
        loginCount: 1,
        isActive: true,
        vipInfo: {
          isVip: false,
          vipType: null,
          startTime: null,
          expireTime: null
        },
        settings: {
          theme: 'light',
          language: 'zh-CN',
          notifications: true
        }
      }
      
      // 创建用户
      const addResult = await usersCollection.add({
        data: userData
      })
      
      userData._id = addResult._id
      
      // 创建用户统计记录
      await userStatsCollection.add({
        data: {
          userId: OPENID,
          totalRecords: 0,
          aiRecords: 0,
          favoriteFoods: 0,
          continuousDays: 0,
          firstUseDate: now,
          lastUseDate: now,
          totalLoginDays: 1,
          lastLoginDate: now
        }
      })
      
      // 创建用户使用记录
      await userUsageCollection.add({
        data: {
          userId: OPENID,
          date: now.toISOString().split('T')[0],
          photoCount: 0,
          searchCount: 0,
          shareCount: 0,
          lastUpdate: now
        }
      })
      
    } else {
      // 老用户登录
      userData = userQuery.data[0]
      
      // 更新登录信息
      await usersCollection.doc(userData._id).update({
        data: {
          lastLoginTime: now,
          loginCount: (userData.loginCount || 0) + 1,
          isActive: true,
          userInfo: userInfo || userData.userInfo
        }
      })
      
      // 更新统计信息
      const statsQuery = await userStatsCollection.where({
        userId: OPENID
      }).get()
      
      if (statsQuery.data.length > 0) {
        const stats = statsQuery.data[0]
        const lastLoginDate = new Date(stats.lastLoginDate)
        const today = new Date()
        
        // 检查是否是新的一天登录
        if (lastLoginDate.toDateString() !== today.toDateString()) {
          await userStatsCollection.doc(stats._id).update({
            data: {
              lastLoginDate: now,
              totalLoginDays: (stats.totalLoginDays || 0) + 1
            }
          })
        }
      }
    }
    
    // 3. 生成自定义登录态
    const token = generateToken(OPENID)
    
    // 4. 返回登录结果
    return {
      success: true,
      data: {
        token: token,
        userInfo: {
          openid: OPENID,
          unionid: UNIONID || '',
          nickName: userInfo?.nickName || userData.userInfo?.nickName || '轻食记用户',
          avatarUrl: userInfo?.avatarUrl || userData.userInfo?.avatarUrl || '',
          isVip: userData.vipInfo?.isVip || false,
          vipExpireDate: userData.vipInfo?.expireTime || null
        },
        isNewUser: userQuery.data.length === 0
      },
      message: '登录成功'
    }
    
  } catch (error) {
    console.error('微信登录失败:', error)
    return {
      success: false,
      error: error.message || '登录失败',
      code: 500
    }
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(event) {
  try {
    const { userId } = event
    
    if (!userId) {
      return {
        success: false,
        error: '缺少用户ID',
        code: 400
      }
    }
    
    // 获取用户信息
    const userQuery = await usersCollection.where({
      openid: userId
    }).get()
    
    if (userQuery.data.length === 0) {
      return {
        success: false,
        error: '用户不存在',
        code: 404
      }
    }
    
    const userData = userQuery.data[0]
    
    // 获取用户统计信息
    const statsQuery = await userStatsCollection.where({
      userId: userId
    }).get()
    
    const stats = statsQuery.data.length > 0 ? statsQuery.data[0] : null
    
    // 获取今日使用情况
    const today = new Date().toISOString().split('T')[0]
    const usageQuery = await userUsageCollection.where({
      userId: userId,
      date: today
    }).get()
    
    const usage = usageQuery.data.length > 0 ? usageQuery.data[0] : null
    
    return {
      success: true,
      data: {
        userInfo: {
          openid: userData.openid,
          nickName: userData.userInfo?.nickName || '轻食记用户',
          avatarUrl: userData.userInfo?.avatarUrl || '',
          registerTime: userData.registerTime,
          lastLoginTime: userData.lastLoginTime,
          loginCount: userData.loginCount || 0
        },
        vipInfo: userData.vipInfo || {
          isVip: false,
          vipType: null,
          startTime: null,
          expireTime: null
        },
        stats: stats ? {
          totalRecords: stats.totalRecords || 0,
          aiRecords: stats.aiRecords || 0,
          favoriteFoods: stats.favoriteFoods || 0,
          continuousDays: stats.continuousDays || 0,
          totalLoginDays: stats.totalLoginDays || 0
        } : null,
        todayUsage: usage ? {
          photoCount: usage.photoCount || 0,
          searchCount: usage.searchCount || 0,
          shareCount: usage.shareCount || 0
        } : {
          photoCount: 0,
          searchCount: 0,
          shareCount: 0
        }
      }
    }
    
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      error: error.message || '获取用户信息失败',
      code: 500
    }
  }
}

/**
 * 更新用户信息
 */
async function updateUserInfo(event) {
  try {
    const { userId, userInfo } = event
    
    if (!userId || !userInfo) {
      return {
        success: false,
        error: '缺少必要参数',
        code: 400
      }
    }
    
    // 查找用户
    const userQuery = await usersCollection.where({
      openid: userId
    }).get()
    
    if (userQuery.data.length === 0) {
      return {
        success: false,
        error: '用户不存在',
        code: 404
      }
    }
    
    const userData = userQuery.data[0]
    
    // 更新用户信息
    await usersCollection.doc(userData._id).update({
      data: {
        userInfo: {
          ...userData.userInfo,
          ...userInfo,
          updateTime: new Date()
        }
      }
    })
    
    return {
      success: true,
      message: '用户信息更新成功'
    }
    
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return {
      success: false,
      error: error.message || '更新用户信息失败',
      code: 500
    }
  }
}

/**
 * 更新用户使用次数
 */
async function updateUserUsage(event) {
  try {
    const { userId, type, count = 1 } = event
    
    if (!userId || !type) {
      return {
        success: false,
        error: '缺少必要参数',
        code: 400
      }
    }
    
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    
    // 查找今日使用记录
    const usageQuery = await userUsageCollection.where({
      userId: userId,
      date: today
    }).get()
    
    if (usageQuery.data.length === 0) {
      // 创建今日使用记录
      const usageData = {
        userId: userId,
        date: today,
        photoCount: type === 'photo' ? count : 0,
        searchCount: type === 'search' ? count : 0,
        shareCount: type === 'share' ? count : 0,
        lastUpdate: now
      }
      
      await userUsageCollection.add({
        data: usageData
      })
    } else {
      // 更新使用记录
      const usageData = usageQuery.data[0]
      const updateData = {
        lastUpdate: now
      }
      
      if (type === 'photo') {
        updateData.photoCount = (usageData.photoCount || 0) + count
      } else if (type === 'search') {
        updateData.searchCount = (usageData.searchCount || 0) + count
      } else if (type === 'share') {
        updateData.shareCount = (usageData.shareCount || 0) + count
      }
      
      await userUsageCollection.doc(usageData._id).update({
        data: updateData
      })
    }
    
    // 更新用户统计
    const statsQuery = await userStatsCollection.where({
      userId: userId
    }).get()
    
    if (statsQuery.data.length > 0) {
      const stats = statsQuery.data[0]
      const updateStats = {
        lastUseDate: now
      }
      
      if (type === 'photo' || type === 'search') {
        updateStats.aiRecords = (stats.aiRecords || 0) + count
      }
      
      await userStatsCollection.doc(stats._id).update({
        data: updateStats
      })
    }
    
    return {
      success: true,
      message: '使用次数更新成功'
    }
    
  } catch (error) {
    console.error('更新使用次数失败:', error)
    return {
      success: false,
      error: error.message || '更新使用次数失败',
      code: 500
    }
  }
}

/**
 * 获取用户使用限制
 */
async function getUserLimits(event) {
  try {
    const { userId } = event
    
    if (!userId) {
      return {
        success: false,
        error: '缺少用户ID',
        code: 400
      }
    }
    
    // 获取用户VIP信息
    const userQuery = await usersCollection.where({
      openid: userId
    }).get()
    
    if (userQuery.data.length === 0) {
      return {
        success: false,
        error: '用户不存在',
        code: 404
      }
    }
    
    const userData = userQuery.data[0]
    const isVip = userData.vipInfo?.isVip || false
    
    // 获取今日使用情况
    const today = new Date().toISOString().split('T')[0]
    const usageQuery = await userUsageCollection.where({
      userId: userId,
      date: today
    }).get()
    
    const usage = usageQuery.data.length > 0 ? usageQuery.data[0] : {
      photoCount: 0,
      searchCount: 0,
      shareCount: 0
    }
    
    // 设置限制
    const limits = {
      photo: {
        dailyLimit: isVip ? 999 : 5, // VIP无限次
        used: usage.photoCount || 0,
        remaining: isVip ? 999 - (usage.photoCount || 0) : 5 - (usage.photoCount || 0)
      },
      search: {
        dailyLimit: isVip ? 999 : 10, // VIP无限次
        used: usage.searchCount || 0,
        remaining: isVip ? 999 - (usage.searchCount || 0) : 10 - (usage.searchCount || 0)
      },
      share: {
        dailyLimit: 5, // 每日分享奖励次数
        used: usage.shareCount || 0,
        remaining: 5 - (usage.shareCount || 0)
      }
    }
    
    return {
      success: true,
      data: {
        limits: limits,
        isVip: isVip,
        vipInfo: userData.vipInfo
      }
    }
    
  } catch (error) {
    console.error('获取用户限制失败:', error)
    return {
      success: false,
      error: error.message || '获取用户限制失败',
      code: 500
    }
  }
}

/**
 * 生成token
 */
function generateToken(userId) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2)
  return `${userId}_${timestamp}_${random}`
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action } = event
  
  switch (action) {
    case 'wechatLogin':
      return await wechatLogin(event)
    case 'getUserInfo':
      return await getUserInfo(event)
    case 'updateUserInfo':
      return await updateUserInfo(event)
    case 'updateUserUsage':
      return await updateUserUsage(event)
    case 'getUserLimits':
      return await getUserLimits(event)
    default:
      return {
        success: false,
        error: '未知的操作类型',
        code: 400
      }
  }
}
