// cloudfunctions/share-reward/index.js
const cloud = require('wx-server-sdk')

// 初始化云开发
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 数据库引用
const db = cloud.database()
const shareRecordsCollection = db.collection('share_records')
const userUsageCollection = db.collection('user_usage')
const rewardLogsCollection = db.collection('reward_logs')

// 分享奖励配置
const SHARE_REWARD_CONFIG = {
  dailyLimit: 5, // 每日最多奖励次数
  rewardPoints: 10, // 每次分享奖励积分
  extraPhotoCount: 1, // 每次分享额外拍照次数
  extraSearchCount: 2, // 每次分享额外搜索次数
  firstShareBonus: 50, // 首次分享额外奖励积分
  inviteReward: 100, // 邀请新用户奖励积分
  levels: [
    { shares: 5, reward: '专属勋章', description: '分享达人' },
    { shares: 20, reward: '额外10次拍照', description: '分享专家' },
    { shares: 50, reward: 'VIP体验卡3天', description: '分享大师' },
    { shares: 100, reward: '月卡会员', description: '分享传奇' }
  ]
}

/**
 * 记录分享行为
 */
async function recordShare(event) {
  try {
    const { userId, shareType, target, extraInfo = {} } = event
    
    if (!userId || !shareType) {
      return {
        success: false,
        error: '缺少必要参数',
        code: 400
      }
    }
    
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    // 检查今日分享次数
    const todaySharesQuery = await shareRecordsCollection.where({
      userId: userId,
      shareDate: today,
      shareType: shareType
    }).get()
    
    const todayShareCount = todaySharesQuery.data.length
    
    if (todayShareCount >= SHARE_REWARD_CONFIG.dailyLimit) {
      return {
        success: false,
        error: '今日分享奖励次数已用完',
        code: 429,
        data: {
          dailyLimit: SHARE_REWARD_CONFIG.dailyLimit,
          used: todayShareCount,
          remaining: 0
        }
      }
    }
    
    // 检查是否是首次分享
    const totalSharesQuery = await shareRecordsCollection.where({
      userId: userId
    }).get()
    
    const isFirstShare = totalSharesQuery.data.length === 0
    const totalShares = totalSharesQuery.data.length
    
    // 记录分享
    const shareRecord = {
      userId: userId,
      shareType: shareType,
      target: target,
      extraInfo: extraInfo,
      shareDate: today,
      shareTime: now,
      ipAddress: '', // 可以从context中获取
      userAgent: '', // 可以从context中获取
      isRewarded: false,
      rewardAmount: 0
    }
    
    const addResult = await shareRecordsCollection.add({
      data: shareRecord
    })
    
    // 计算奖励
    let rewardPoints = SHARE_REWARD_CONFIG.rewardPoints
    let extraPhoto = SHARE_REWARD_CONFIG.extraPhotoCount
    let extraSearch = SHARE_REWARD_CONFIG.extraSearchCount
    
    if (isFirstShare) {
      rewardPoints += SHARE_REWARD_CONFIG.firstShareBonus
    }
    
    // 检查等级奖励
    const nextLevel = SHARE_REWARD_CONFIG.levels.find(level => level.shares > totalShares)
    let levelReward = null
    
    if (nextLevel && totalShares + 1 === nextLevel.shares) {
      levelReward = {
        level: nextLevel.shares,
        reward: nextLevel.reward,
        description: nextLevel.description
      }
    }
    
    // 更新用户使用次数
    const usageQuery = await userUsageCollection.where({
      userId: userId,
      date: today
    }).get()
    
    if (usageQuery.data.length > 0) {
      const usage = usageQuery.data[0]
      await userUsageCollection.doc(usage._id).update({
        data: {
          shareCount: (usage.shareCount || 0) + 1,
          lastUpdate: now
        }
      })
    }
    
    // 记录奖励日志
    const rewardLog = {
      userId: userId,
      shareRecordId: addResult._id,
      rewardType: 'share',
      rewardPoints: rewardPoints,
      extraPhoto: extraPhoto,
      extraSearch: extraSearch,
      isFirstShare: isFirstShare,
      levelReward: levelReward,
      rewardTime: now,
      status: 'pending' // pending, claimed, expired
    }
    
    await rewardLogsCollection.add({
      data: rewardLog
    })
    
    // 更新分享记录为已奖励
    await shareRecordsCollection.doc(addResult._id).update({
      data: {
        isRewarded: true,
        rewardAmount: rewardPoints,
        rewardTime: now
      }
    })
    
    return {
      success: true,
      data: {
        shareId: addResult._id,
        reward: {
          points: rewardPoints,
          extraPhoto: extraPhoto,
          extraSearch: extraSearch,
          isFirstShare: isFirstShare,
          levelReward: levelReward
        },
        limits: {
          dailyLimit: SHARE_REWARD_CONFIG.dailyLimit,
          used: todayShareCount + 1,
          remaining: SHARE_REWARD_CONFIG.dailyLimit - (todayShareCount + 1)
        },
        totalShares: totalShares + 1
      },
      message: isFirstShare ? '首次分享成功！获得额外奖励' : '分享成功'
    }
    
  } catch (error) {
    console.error('记录分享失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 领取分享奖励
 */
async function claimShareReward(event) {
  try {
    const { userId, rewardId } = event
    
    if (!userId || !rewardId) {
      return {
        success: false,
        error: '缺少必要参数',
        code: 400
      }
    }
    
    // 查找奖励记录
    const rewardQuery = await rewardLogsCollection.where({
      _id: rewardId,
      userId: userId
    }).get()
    
    if (rewardQuery.data.length === 0) {
      return {
        success: false,
        error: '奖励记录不存在',
        code: 404
      }
    }
    
    const reward = rewardQuery.data[0]
    const now = new Date()
    
    // 检查奖励状态
    if (reward.status === 'claimed') {
      return {
        success: false,
        error: '奖励已领取',
        code: 400
      }
    }
    
    if (reward.status === 'expired') {
      return {
        success: false,
        error: '奖励已过期',
        code: 400
      }
    }
    
    // 更新奖励状态
    await rewardLogsCollection.doc(reward._id).update({
      data: {
        status: 'claimed',
        claimTime: now
      }
    })
    
    // 这里可以添加实际发放奖励的逻辑
    // 例如：增加用户积分、增加使用次数等
    
    return {
      success: true,
      data: {
        rewardId: rewardId,
        rewardType: reward.rewardType,
        rewardPoints: reward.rewardPoints,
        extraPhoto: reward.extraPhoto,
        extraSearch: reward.extraSearch,
        claimTime: now
      },
      message: '奖励领取成功'
    }
    
  } catch (error) {
    console.error('领取奖励失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 获取用户分享统计
 */
async function getUserShareStats(event) {
  try {
    const { userId } = event
    
    if (!userId) {
      return {
        success: false,
        error: '缺少用户ID',
        code: 400
      }
    }
    
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    // 获取今日分享记录
    const todaySharesQuery = await shareRecordsCollection.where({
      userId: userId,
      shareDate: today
    }).get()
    
    // 获取总分享记录
    const totalSharesQuery = await shareRecordsCollection.where({
      userId: userId
    }).get()
    
    // 获取未领取的奖励
    const pendingRewardsQuery = await rewardLogsCollection.where({
      userId: userId,
      status: 'pending'
    }).get()
    
    // 计算等级进度
    const totalShares = totalSharesQuery.data.length
    const currentLevel = SHARE_REWARD_CONFIG.levels
      .filter(level => level.shares <= totalShares)
      .pop()
    
    const nextLevel = SHARE_REWARD_CONFIG.levels.find(level => level.shares > totalShares)
    
    const levelProgress = nextLevel ? {
      current: totalShares,
      next: nextLevel.shares,
      progress: Math.min(100, (totalShares / nextLevel.shares) * 100),
      nextReward: nextLevel.reward,
      description: nextLevel.description
    } : null
    
    // 计算奖励统计
    const claimedRewardsQuery = await rewardLogsCollection.where({
      userId: userId,
      status: 'claimed'
    }).get()
    
    let totalPoints = 0
    let totalExtraPhoto = 0
    let totalExtraSearch = 0
    
    claimedRewardsQuery.data.forEach(reward => {
      totalPoints += reward.rewardPoints || 0
      totalExtraPhoto += reward.extraPhoto || 0
      totalExtraSearch += reward.extraSearch || 0
    })
    
    return {
      success: true,
      data: {
        today: {
          count: todaySharesQuery.data.length,
          limit: SHARE_REWARD_CONFIG.dailyLimit,
          remaining: SHARE_REWARD_CONFIG.dailyLimit - todaySharesQuery.data.length
        },
        total: {
          count: totalShares,
          points: totalPoints,
          extraPhoto: totalExtraPhoto,
          extraSearch: totalExtraSearch
        },
        level: {
          current: currentLevel ? {
            shares: currentLevel.shares,
            reward: currentLevel.reward,
            description: currentLevel.description
          } : null,
          next: levelProgress,
          progress: levelProgress ? levelProgress.progress : 100
        },
        pendingRewards: pendingRewardsQuery.data.length,
        config: SHARE_REWARD_CONFIG
      }
    }
    
  } catch (error) {
    console.error('获取分享统计失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 邀请新用户
 */
async function inviteNewUser(event) {
  try {
    const { inviterId, inviteeId, inviteCode } = event
    
    if (!inviterId || !inviteeId) {
      return {
        success: false,
        error: '缺少必要参数',
        code: 400
      }
    }
    
    // 检查邀请人是否存在
    const inviterQuery = await shareRecordsCollection.where({
      userId: inviterId,
      shareType: 'invite',
      'extraInfo.inviteeId': inviteeId
    }).get()
    
    if (inviterQuery.data.length > 0) {
      return {
        success: false,
        error: '该用户已被邀请过',
        code: 400
      }
    }
    
    const now = new Date()
    
    // 记录邀请
    const inviteRecord = {
      userId: inviterId,
      shareType: 'invite',
      target: 'new_user',
      extraInfo: {
        inviteeId: inviteeId,
        inviteCode: inviteCode,
        isNewUser: true
      },
      shareDate: now.toISOString().split('T')[0],
      shareTime: now,
      isRewarded: false
    }
    
    const addResult = await shareRecordsCollection.add({
      data: inviteRecord
    })
    
    // 发放邀请奖励
    const rewardLog = {
      userId: inviterId,
      shareRecordId: addResult._id,
      rewardType: 'invite',
      rewardPoints: SHARE_REWARD_CONFIG.inviteReward,
      extraPhoto: 5, // 邀请奖励额外拍照次数
      extraSearch: 10, // 邀请奖励额外搜索次数
      rewardTime: now,
      status: 'pending',
      extraInfo: {
        inviteeId: inviteeId,
        inviteCode: inviteCode
      }
    }
    
    await rewardLogsCollection.add({
      data: rewardLog
    })
    
    // 更新邀请记录
    await shareRecordsCollection.doc(addResult._id).update({
      data: {
        isRewarded: true,
        rewardAmount: SHARE_REWARD_CONFIG.inviteReward,
        rewardTime: now
      }
    })
    
    return {
      success: true,
      data: {
        inviteId: addResult._id,
        reward: {
          points: SHARE_REWARD_CONFIG.inviteReward,
          extraPhoto: 5,
          extraSearch: 10
        }
      },
      message: '邀请成功，奖励已发放'
    }
    
  } catch (error) {
    console.error('邀请新用户失败:', error)
    return {
      success: false,
      error: error.message,
      code: 500
    }
  }
}

/**
 * 获取分享排行榜
 */
async function getShareLeaderboard(event) {
  try {
    const { limit = 20, period = 'all' } = event // all, week, month
    
    let startDate = null
    const now = new Date()
    
    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    
    // 聚合查询分享排行榜
    const pipeline = []
    
    if (startDate) {
      pipeline.push({
        $match: {
          shareTime: { $gte: startDate }
        }
      })
    }
    
    pipeline.push(
      {
        $group: {
          _id: '$userId',
          shareCount: { $sum: 1 },
          lastShare: { $max: '$shareTime' }
        }
      },
      {
        $sort: { shareCount: -1 }
      },
      {
        $limit: limit
      }
    )
    
    // 注意：云开发数据库的聚合操作可能需要使用aggregate方法
    // 这里简化处理，实际项目中需要根据云开发文档调整
    
    // 由于云开发数据库的限制，这里使用分组查询的替代方案
    const allShares = await shareRecordsCollection
      .where(startDate ? { shareTime: db.command.gte(startDate) } : {})
      .get()
    
    // 手动分组统计
    const userStats = {}
    allShares.data.forEach(share => {
      const userId = share.userId
      if (!userStats[userId]) {
        userStats[userId] = {
          userId: userId,
          shareCount: 0,
          lastShare: share.shareTime
        }
      }
      userStats[userId].shareCount++
      if (new Date(share.shareTime) > new Date(userStats[userId].lastShare)) {
        userStats[userId].lastShare = share.shareTime
      }
    })
    
    // 转换为数组并排序
    const leaderboard = Object.values(userStats)
      .sort((a, b) => b.shareCount - a.shareCount)
      .slice(0, limit)
    
    // 获取用户信息（这里简化处理，实际项目中需要关联用户表）
    const enrichedLeaderboard = leaderboard.map((item, index) => ({
      rank: index + 1,
      userId: item.userId,
      shareCount: item.shareCount,
      lastShare: item.lastShare,
      // 这里可以添加用户昵称、头像等信息
      userInfo: {
        nickName: `用户${item.userId.substr(0, 8)}`,
        avatarUrl: ''
      }
    }))
    
    return {
      success: true,
      data: {
        leaderboard: enrichedLeaderboard,
        period: period,
        updateTime: now
      }
    }
    
  } catch (error) {
    console.error('获取分享排行榜失败:', error)
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
    case 'recordShare':
      return await recordShare(event)
    case 'claimShareReward':
      return await claimShareReward(event)
    case 'getUserShareStats':
      return await getUserShareStats(event)
    case 'inviteNewUser':
      return await inviteNewUser(event)
    case 'getShareLeaderboard':
      return await getShareLeaderboard(event)
    default:
      return {
        success: false,
        error: '未知的操作类型',
        code: 400
      }
  }
}
