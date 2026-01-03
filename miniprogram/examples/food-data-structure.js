// examples/food-data-structure.js
// 食物数据结构示例

/**
 * 标准食物数据结构
 * 按照强化README.md中Step 2.3的要求设计
 */
const standardFoodData = {
  // 基础信息
  id: 'food_20241227_123456', // 唯一ID
  foodName: '宫保鸡丁', // 菜品名称
  imageUrl: 'https://example.com/foods/kungpao_chicken.jpg', // 图片URL
  
  // 热量数据
  calorie: {
    value: 350, // 热量值
    unit: 'kcal', // 单位
    hasData: true, // 是否有数据
    source: 'ai' // 数据来源：ai, manual, database
  },
  
  // 营养成分
  nutrition: {
    protein: {
      value: 20, // 蛋白质含量
      unit: 'g', // 单位
      percent: 25, // 占每日推荐摄入量的百分比
      hasData: true
    },
    fat: {
      value: 15,
      unit: 'g',
      percent: 30,
      hasData: true
    },
    carbohydrate: {
      value: 40,
      unit: 'g',
      percent: 45,
      hasData: true
    },
    fiber: {
      value: 2,
      unit: 'g',
      percent: 0, // 纤维不计算百分比
      hasData: true
    },
    sodium: {
      value: 800,
      unit: 'mg',
      percent: 35,
      hasData: true
    }
  },
  
  // 健康评分
  score: 85, // 健康评分（0-100）
  scoreDetails: {
    calorieScore: 80, // 热量评分
    balanceScore: 85, // 营养平衡评分
    foodTypeScore: 90 // 食物类型评分
  },
  
  // 健康建议
  suggestions: [
    '蛋白质含量适中，适合增肌期食用',
    '脂肪含量偏高，建议减少食用油用量',
    '搭配蔬菜食用更健康'
  ],
  
  // 时间信息
  timestamp: '2024-12-27 12:00:00', // 识别时间
  date: '2024-12-27', // 日期
  
  // 用户信息
  userId: 'user_123456', // 用户ID
  userName: '张三', // 用户名
  
  // 权限信息
  isFree: true, // 是否免费
  accessLevel: 'basic', // 访问级别：basic, premium, vip
  
  // 标签和分类
  tags: ['川菜', '鸡肉', '辣味', '中餐'],
  category: '主菜',
  mealType: '午餐', // 早餐、午餐、晚餐、加餐
  
  // 分量信息
  servingSize: {
    value: 200,
    unit: 'g',
    description: '一份'
  },
  
  // 烹饪信息
  cookingMethod: '炒',
  difficulty: '中等',
  prepTime: '20分钟',
  cookTime: '10分钟',
  
  // 食材清单
  ingredients: [
    { name: '鸡胸肉', amount: '150g', unit: '克' },
    { name: '花生', amount: '50g', unit: '克' },
    { name: '干辣椒', amount: '10g', unit: '克' },
    { name: '葱姜蒜', amount: '适量', unit: '' }
  ],
  
  // 烹饪步骤
  cookingSteps: [
    '鸡胸肉切丁，用料酒、淀粉腌制',
    '花生炒香备用',
    '爆香干辣椒和花椒',
    '加入鸡丁翻炒至变色',
    '加入调味料和花生翻炒均匀'
  ],
  
  // 营养分析详情
  nutritionAnalysis: {
    // 宏量营养素比例
    macroRatio: {
      protein: 25, // 蛋白质占比
      fat: 30, // 脂肪占比
      carbohydrate: 45 // 碳水化合物占比
    },
    
    // 微量营养素
    microNutrients: {
      vitaminC: { value: 5, unit: 'mg', percent: 8 },
      iron: { value: 2, unit: 'mg', percent: 15 },
      calcium: { value: 50, unit: 'mg', percent: 5 }
    },
    
    // 健康指标
    healthIndicators: {
      glycemicIndex: 45, // 血糖指数
      cholesterol: 85, // 胆固醇含量（mg）
      saturatedFat: 3 // 饱和脂肪含量（g）
    }
  },
  
  // 相似菜品推荐
  similarFoods: [
    {
      id: 'food_20241227_123457',
      name: '鱼香肉丝',
      imageUrl: 'https://example.com/foods/fish_pork.jpg',
      similarity: 85 // 相似度百分比
    },
    {
      id: 'food_20241227_123458',
      name: '麻婆豆腐',
      imageUrl: 'https://example.com/foods/mapo_tofu.jpg',
      similarity: 78
    }
  ],
  
  // 用户互动
  userInteraction: {
    isFavorite: false, // 是否收藏
    rating: 4.5, // 评分（1-5）
    reviewCount: 128, // 评价数量
    shareCount: 56, // 分享次数
    viewCount: 1024 // 查看次数
  },
  
  // 元数据
  metadata: {
    createdAt: '2024-12-27T12:00:00Z', // 创建时间
    updatedAt: '2024-12-27T12:05:00Z', // 更新时间
    source: 'baidu_ai', // 数据来源
    version: '1.0', // 数据结构版本
    confidence: 0.92 // AI识别置信度
  }
}

/**
 * 简化版食物数据结构（用于列表展示）
 */
const simplifiedFoodData = {
  id: 'food_20241227_123456',
  foodName: '宫保鸡丁',
  imageUrl: 'https://example.com/foods/kungpao_chicken.jpg',
  calorie: 350,
  score: 85,
  timestamp: '2024-12-27 12:00:00',
  tags: ['川菜', '鸡肉'],
  isFree: true
}

/**
 * 历史记录数据结构
 */
const historyRecordData = {
  id: 'record_20241227_123456',
  userId: 'user_123456',
  foodId: 'food_20241227_123456',
  foodName: '宫保鸡丁',
  imageUrl: 'https://example.com/foods/kungpao_chicken.jpg',
  
  // 营养摘要
  nutritionSummary: {
    calorie: 350,
    protein: 20,
    fat: 15,
    carbohydrate: 40
  },
  
  // 时间信息
  timestamp: '2024-12-27 12:00:00',
  date: '2024-12-27',
  mealType: '午餐',
  
  // 用户操作
  action: '识别', // 识别、手动添加、编辑
  source: 'ai', // ai, manual
  
  // 状态
  isDeleted: false,
  isSynced: true // 是否已同步到云端
}

/**
 * 营养图表数据
 */
const chartData = {
  // 环形进度条数据（健康评分）
  scoreChart: {
    value: 85, // 当前值
    max: 100, // 最大值
    color: '#07c160', // 颜色
    label: '健康评分',
    unit: '分'
  },
  
  // 营养成分子弹图数据
  nutritionBulletChart: {
    categories: ['蛋白质', '脂肪', '碳水', '纤维'],
    values: [20, 15, 40, 2], // 实际值
    targets: [25, 20, 45, 3], // 目标值
    units: ['g', 'g', 'g', 'g'],
    colors: ['#07c160', '#1989fa', '#ff976a', '#ee0a24']
  },
  
  // 热量展示数据
  calorieCard: {
    value: 350,
    unit: 'kcal',
    dailyPercent: 18, // 占每日推荐热量的百分比
    recommendation: '适中', // 评价：偏低、适中、偏高
    color: '#ffd700'
  },
  
  // 营养比例饼图数据
  nutritionPieChart: {
    series: [
      { value: 25, name: '蛋白质', color: '#07c160' },
      { value: 30, name: '脂肪', color: '#1989fa' },
      { value: 45, name: '碳水', color: '#ff976a' }
    ],
    total: 100,
    unit: '%'
  }
}

/**
 * 导出数据结构
 */
module.exports = {
  standardFoodData,
  simplifiedFoodData,
  historyRecordData,
  chartData,
  
  // 工具函数
  createFoodData: (overrides = {}) => ({
    ...standardFoodData,
    id: `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString().replace('T', ' ').substr(0, 19),
    date: new Date().toISOString().split('T')[0],
    ...overrides
  }),
  
  createHistoryRecord: (foodData, userId) => ({
    ...historyRecordData,
    id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: userId || 'anonymous',
    foodId: foodData.id,
    foodName: foodData.foodName,
    imageUrl: foodData.imageUrl,
    nutritionSummary: {
      calorie: foodData.calorie.value,
      protein: foodData.nutrition.protein.value,
      fat: foodData.nutrition.fat.value,
      carbohydrate: foodData.nutrition.carbohydrate.value
    },
    timestamp: new Date().toISOString().replace('T', ' ').substr(0, 19),
    date: new Date().toISOString().split('T')[0]
  })
}
