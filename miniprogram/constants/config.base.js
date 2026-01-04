// constants/config.base.js
// 基础配置文件 - 包含所有非敏感配置，可以提交到Git

/**
 * 应用基础配置
 * 注意：此文件不包含任何敏感信息，可以安全提交到Git
 */
const baseConfig = {
  // 应用信息
  app: {
    name: 'AI轻食记',
    version: '1.0.0',
    description: '基于AI的食物识别与营养分析小程序',
    author: 'FoodAI Team',
    copyright: '© 2023 FoodAI. All rights reserved.'
  },

  // API配置（非敏感部分）
  api: {
    timeout: 10000, // 请求超时时间（毫秒）
    retryCount: 3, // 重试次数
    retryDelay: 1000 // 重试延迟（毫秒）
  },

  // 百度AI配置（非敏感部分）
  baiduAI: {
    // 注意：API密钥在本地配置中设置
    // 食物识别接口配置
    recognition: {
      url: 'https://aip.baidubce.com/rest/2.0/image-classify/v2/dish',
      topNum: 5, // 返回结果数量
      filterThreshold: 0.7, // 过滤阈值
      baikeNum: 1 // 百科信息数量
    },
    
    // 通用物体识别（备用）
    generalRecognition: {
      url: 'https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general',
      topNum: 5
    }
  },

  // Deepseek AI配置（非敏感部分）
  deepseekAI: {
    // 注意：API密钥在本地配置中设置
    baseURL: 'https://api.deepseek.com/v1',
    
    // 模型配置
    models: {
      chat: 'deepseek-chat', // 聊天模型
      vision: 'deepseek-vision', // 视觉模型（如果支持）
    },
    
    // 食物识别和营养分析配置
    foodAnalysis: {
      // 系统提示词
      systemPrompt: `你是一个专业的营养师和食物识别专家。请根据用户提供的食物信息（图片描述或文字描述）进行以下分析：

1. 食物识别：识别食物名称（中文）
2. 营养分析：提供详细的营养信息
3. 健康建议：基于营养信息给出健康建议

请严格按照以下JSON格式返回结果：
{
  "foodName": "食物名称",
  "confidence": 0.95,
  "description": "食物描述",
  "calorie": 100,
  "nutrition": {
    "protein": 10.5,
    "fat": 5.2,
    "carbohydrate": 20.3,
    "fiber": 2.1,
    "vitamin": 15.0,
    "mineral": 8.5,
    "calcium": 50.0,
    "iron": 1.2,
    "zinc": 0.8
  },
  "healthScore": 85,
  "suggestions": ["建议1", "建议2", "建议3"],
  "tags": ["标签1", "标签2"]
}

注意：
1. 所有数值单位：蛋白质/脂肪/碳水/纤维 - 克(g)，维生素/矿物质/钙/铁/锌 - 毫克(mg)，热量 - 千卡(kcal)
2. confidence为置信度（0-1之间）
3. healthScore为健康评分（0-100）
4. 数值请基于真实营养数据估算`,
      
      // 温度参数
      temperature: 0.3,
      
      // 最大token数
      maxTokens: 2000,
      
      // 是否启用流式响应
      stream: false
    }
  },

  // 图片配置
  image: {
    maxSize: 5 * 1024 * 1024, // 最大文件大小：5MB
    allowedTypes: ['image'], // 允许的文件类型
    quality: 80, // 图片质量（0-100）
    baseUrl: '', // 图片基础URL
    
    // 压缩配置
    compress: {
      maxWidth: 1024,
      maxHeight: 1024,
      quality: 80
    },
    
    // 默认图片（使用网络图片）
    defaults: {
      food: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=200&h=200&fit=crop&auto=format',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&auto=format',
      placeholder: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop&auto=format'
    }
  },

  // 支付配置（非敏感部分）
  payment: {
    // 套餐价格（单位：分）
    plans: {
      monthly: 990, // 月付：9.9元
      yearly: 9900, // 年付：99元
      lifetime: 29900 // 永久：299元
    },
    
    // 支付相关配置
    settings: {
      currency: 'CNY', // 货币类型
      refundDays: 7, // 退款期限（天）
      autoRenew: true // 是否自动续费
    }
  },

  // 权限配置
  auth: {
    // 存储键名
    tokenKey: 'token',
    userInfoKey: 'userInfo',
    vipInfoKey: 'userVipInfo',
    
    // 权限范围
    scopes: {
      userInfo: 'scope.userInfo',
      userLocation: 'scope.userLocation',
      address: 'scope.address',
      invoiceTitle: 'scope.invoiceTitle',
      invoice: 'scope.invoice',
      werun: 'scope.werun',
      record: 'scope.record',
      writePhotosAlbum: 'scope.writePhotosAlbum',
      camera: 'scope.camera'
    },
    
    // 必要权限
    requiredScopes: [
      'scope.userInfo',
      'scope.writePhotosAlbum',
      'scope.camera'
    ]
  },

  // 功能开关配置
  features: {
    // AI识别功能
    aiRecognition: {
      enabled: true,
      requireVip: false, // 免费用户每日限制次数
      dailyLimit: 10, // 每日免费次数
      vipDailyLimit: 100, // VIP每日次数
      useSecureMode: false, // 默认使用直接调用模式
      // 运行模式配置
      mode: 'auto', // auto: 自动判断, direct: 直接调用, secure: 云函数安全模式
      // 开发环境配置
      development: {
        useDirectMode: true, // 开发环境使用直接调用
        requireDomainConfig: true // 需要配置服务器域名
      },
      // 生产环境配置
      production: {
        useSecureMode: true, // 生产环境使用云函数
        requireDomainConfig: false // 不需要配置服务器域名
      }
    },
    
    // 营养分析功能
    nutritionAnalysis: {
      enabled: true,
      requireVip: true, // 需要VIP
      detailLevel: 'basic' // basic, advanced, professional
    },
    
    // 历史记录功能
    history: {
      enabled: true,
      maxRecords: 1000, // 最大记录数
      syncCloud: true // 是否同步到云端
    },
    
    // 分享功能
    share: {
      enabled: true,
      rewardPoints: 10, // 分享奖励积分
      dailyShareLimit: 5 // 每日分享奖励次数
    },
    
    // 付费功能
    payment: {
      enabled: true,
      testMode: true, // 测试模式，生产环境请改为 false
      sandbox: true // 沙箱环境，生产环境请改为 false
    }
  },

  // 云开发配置（环境ID在本地配置中设置）
  cloud: {
    traceUser: true, // 是否记录用户访问
  },

  // 腾讯云函数配置（个人认证替代方案）
  tencentSCF: {
    // 超时配置
    timeout: 30000, // 30秒
    retryCount: 3, // 重试次数
    retryDelay: 1000 // 重试延迟（毫秒）
  },

  // 缓存配置
  cache: {
    // 本地存储配置
    storage: {
      prefix: 'foodai_', // 存储键名前缀
      version: '1.0', // 数据版本
      cleanupDays: 30 // 自动清理天数
    },
    
    // 内存缓存配置
    memory: {
      maxSize: 100, // 最大缓存项数
      ttl: 5 * 60 * 1000 // 缓存过期时间（5分钟）
    }
  },

  // 错误处理配置
  error: {
    // 错误报告
    report: {
      enabled: true,
      sampleRate: 0.1 // 采样率（10%）
    },
    
    // 重试配置
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000
    }
  },

  // 性能监控配置
  performance: {
    enabled: true,
    sampleRate: 0.01, // 采样率（1%）
    metrics: ['fcp', 'lcp', 'fid', 'cls'] // 监控指标
  },

  // 调试配置
  debug: {
    enabled: true, // 开发环境设为 true，生产环境设为 false
    logLevel: 'debug', // debug, info, warn, error
    console: {
      enabled: true,
      filter: [] // 过滤的日志类型
    }
  },

  // 第三方服务配置
  thirdParty: {
    // 统计服务
    analytics: {
      baidu: {
        enabled: false,
      },
      google: {
        enabled: false,
      }
    },
    
    // 地图服务
    map: {
      qq: {
        enabled: false,
      },
      amap: {
        enabled: false,
      }
    },
    
    // 推送服务
    push: {
      enabled: false,
      providers: [] // 推送服务提供商
    }
  },

  // 国际化配置
  i18n: {
    defaultLanguage: 'zh-CN',
    supportedLanguages: ['zh-CN', 'en-US'],
    fallbackLanguage: 'zh-CN'
  },

  // 主题配置
  theme: {
    primaryColor: '#07c160',
    secondaryColor: '#1989fa',
    successColor: '#07c160',
    warningColor: '#ff976a',
    dangerColor: '#ee0a24',
    textColor: '#333333',
    backgroundColor: '#ffffff',
    borderColor: '#f0f0f0'
  }
}

module.exports = baseConfig
