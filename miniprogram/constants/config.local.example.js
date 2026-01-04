// constants/config.local.example.js
// 本地配置文件示例 - 复制此文件为 config.local.js 并填写您的敏感信息
// 注意：此文件应添加到 .gitignore，不提交到版本控制

/**
 * 本地配置文件
 * 包含所有敏感信息，如API密钥、AppID等
 * 
 * 使用方法：
 * 1. 复制此文件为 config.local.js
 * 2. 填写您的实际配置信息
 * 3. 确保 config.local.js 在 .gitignore 中
 */

const localConfig = {
  // 百度AI配置（敏感信息）
  baiduAI: {
    // 请访问 https://ai.baidu.com/ 获取您的API Key和Secret Key
    apiKey: 'YOUR_BAIDU_AI_API_KEY_HERE', // 替换为您的百度AI API Key
    secretKey: 'YOUR_BAIDU_AI_SECRET_KEY_HERE', // 替换为您的百度AI Secret Key
  },

  // Deepseek AI配置（敏感信息）
  deepseekAI: {
    // 请访问 https://platform.deepseek.com/ 获取您的API Key
    apiKey: 'YOUR_DEEPSEEK_API_KEY_HERE', // 替换为您的Deepseek API Key
  },

  // 支付配置（敏感信息）
  payment: {
    wechatPay: {
      appId: 'YOUR_WECHAT_APPID_HERE', // 替换为您的小程序AppID
      mchId: 'YOUR_MCH_ID_HERE', // 商户号（如果需要支付功能）
      apiKey: 'YOUR_API_KEY_HERE', // API密钥（如果需要支付功能）
      notifyUrl: 'YOUR_NOTIFY_URL_HERE' // 支付回调地址
    }
  },

  // 云开发配置（敏感信息）
  cloud: {
    env: 'YOUR_CLOUD_ENV_ID_HERE', // 替换为您的云环境ID
    resourceEnv: 'YOUR_CLOUD_ENV_ID_HERE' // 资源环境ID
  },

  // 腾讯云函数配置（如果需要）
  tencentSCF: {
    // 部署腾讯云函数后，将此处替换为实际的API网关地址
    baseUrl: 'YOUR_TENCENT_SCF_BASE_URL_HERE',
  },

  // 第三方服务配置（敏感信息）
  thirdParty: {
    // 统计服务
    analytics: {
      baidu: {
        key: 'YOUR_BAIDU_ANALYTICS_KEY_HERE'
      },
      google: {
        key: 'YOUR_GOOGLE_ANALYTICS_KEY_HERE'
      }
    },
    
    // 地图服务
    map: {
      qq: {
        key: 'YOUR_QQ_MAP_KEY_HERE'
      },
      amap: {
        key: 'YOUR_AMAP_KEY_HERE'
      }
    }
  },

  // 错误报告配置
  error: {
    report: {
      url: 'YOUR_ERROR_REPORT_URL_HERE'
    }
  }
}

module.exports = localConfig
