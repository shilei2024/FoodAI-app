// constants/config.js

/**
 * 应用配置
 */
const config = {
  // 应用信息
  app: {
    name: 'AI轻食记',
    version: '1.0.0',
    description: '基于AI的食物识别与营养分析小程序',
    author: 'FoodAI Team',
    copyright: '© 2023 FoodAI. All rights reserved.'
  },

  // API配置
  api: {
    baseURL: 'https://aip.baidubce.com/oauth/2.0/token', // API基础地址
    timeout: 10000, // 请求超时时间（毫秒）
    retryCount: 3, // 重试次数
    retryDelay: 1000 // 重试延迟（毫秒）
  },

  // 百度AI配置
  baiduAI: {
    // 注意：由于不使用云函数，API密钥需要配置在这里
    // 请访问 https://ai.baidu.com/ 获取您的API Key和Secret Key
    // 重要：API密钥会暴露在小程序代码中，建议在生产环境使用云函数保护密钥
    // 获取方式：登录百度AI开放平台 -> 控制台 -> 应用列表 -> 创建应用 -> 获取密钥
    apiKey: '', // TODO: 请在此处配置您的百度AI API Key
    secretKey: '', // TODO: 请在此处配置您的百度AI Secret Key
    
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

  // Deepseek AI配置
  deepseekAI: {
    // 注意：API密钥会暴露在小程序代码中，建议在生产环境使用云函数保护密钥
    // 请访问 https://platform.deepseek.com/ 获取您的API Key
    apiKey: '', // TODO: 请在此处配置您的Deepseek API Key（推荐使用此AI服务）
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

  // 支付配置
  payment: {
    // 微信支付配置
    wechatPay: {
      appId: 'wx38dee0ea03214271', // 小程序AppID
      mchId: '', // 商户号
      apiKey: '', // API密钥
      notifyUrl: '' // 支付回调地址
    },
    
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
      vipDailyLimit: 100 // VIP每日次数
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

  // 云开发配置
  cloud: {
    env: 'foodai-prod-xxx', // 云环境ID，请替换为您的实际环境ID
    traceUser: true, // 是否记录用户访问
    resourceEnv: 'foodai-prod-xxx' // 资源环境ID
  },

  // 腾讯云函数配置（个人认证替代方案）
  tencentSCF: {
    // 部署腾讯云函数后，将此处替换为实际的API网关地址
    baseUrl: 'https://service-xxxxx-xxxxx.gz.apigw.tencentcs.com/release/baidu-ai-proxy',
    
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
      url: 'https://error.foodai.com/report',
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
        key: ''
      },
      google: {
        enabled: false,
        key: ''
      }
    },
    
    // 地图服务
    map: {
      qq: {
        enabled: false,
        key: ''
      },
      amap: {
        enabled: false,
        key: ''
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

/**
 * 环境特定配置
 */
const envConfig = {
  // 开发环境
  development: {
    api: {
      baseURL: 'https://aip.baidubce.com/oauth/2.0/token'
    },
    debug: {
      enabled: true,
      logLevel: 'debug'
    },
    features: {
      payment: {
        testMode: true,
        sandbox: true
      }
    }
    // 注意：baiduAI 配置使用 baseConfig 中的值，不在此处覆盖
    // 这样可以确保使用用户配置的真实密钥
  },

  // 测试环境
  testing: {
    api: {
      baseURL: 'https://aip.baidubce.com/oauth/2.0/token'
    },
    debug: {
      enabled: true,
      logLevel: 'info'
    },
    features: {
      payment: {
        testMode: true,
        sandbox: true
      }
    }
  },

  // 生产环境
  production: {
    api: {
      baseURL: 'https://aip.baidubce.com/oauth/2.0/token'
    },
    debug: {
      enabled: false,
      logLevel: 'error'
    },
    features: {
      payment: {
        testMode: false,
        sandbox: false
      }
    }
  }
}

/**
 * 获取当前环境配置
 * 注意：小程序中不支持 process.env，默认使用 development 配置
 * 如需切换环境，可以手动修改这里的返回值
 */
function getEnvConfig() {
  // 小程序中无法使用 process.env，默认使用开发环境配置
  // 如需切换到生产环境，将 'development' 改为 'production'
  const env = 'development' // 可选值: 'development', 'testing', 'production'
  return envConfig[env] || envConfig.development
}

/**
 * 合并配置
 */
function mergeConfig(baseConfig, envConfig) {
  const result = JSON.parse(JSON.stringify(baseConfig))
  
  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {}
        deepMerge(target[key], source[key])
      } else {
        target[key] = source[key]
      }
    }
  }
  
  deepMerge(result, envConfig)
  return result
}

// 导出最终配置
const finalConfig = mergeConfig(config, getEnvConfig())

// 冻结配置对象，防止意外修改
Object.freeze(finalConfig)

module.exports = finalConfig
