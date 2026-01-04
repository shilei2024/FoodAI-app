// constants/config.js
// 主配置文件 - 合并基础配置和本地配置

const baseConfig = require('./config.base.js')

/**
 * 加载本地配置
 * 如果存在本地配置文件，则合并到基础配置中
 */
function loadLocalConfig() {
  try {
    // 尝试加载本地配置文件
    const localConfig = require('./config.local.js')
    console.log('✅ 本地配置加载成功')
    return localConfig
  } catch (error) {
    // 如果本地配置文件不存在，检查是否有示例配置
    try {
      const exampleConfig = require('./config.local.example.js')
      console.warn('⚠️ 未找到本地配置文件，请复制 config.local.example.js 为 config.local.js 并填写您的配置')
      console.warn('⚠️ 当前使用示例配置，部分功能可能无法正常工作')
      return exampleConfig
    } catch (exampleError) {
      console.warn('⚠️ 未找到本地配置文件，使用空配置')
      return {}
    }
  }
}

/**
 * 环境特定配置
 */
const envConfig = {
  // 开发环境
  development: {
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
  },

  // 测试环境
  testing: {
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
 * 深度合并配置对象
 */
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {}
      deepMerge(target[key], source[key])
    } else {
      target[key] = source[key]
    }
  }
  return target
}

/**
 * 合并多个配置
 */
function mergeConfigs(...configs) {
  let result = {}
  for (const config of configs) {
    result = deepMerge(result, config)
  }
  return result
}

// 加载所有配置
const localConfig = loadLocalConfig()
const envSpecificConfig = getEnvConfig()

// 合并配置：基础配置 + 本地配置 + 环境配置
const finalConfig = mergeConfigs(baseConfig, localConfig, envSpecificConfig)

// 冻结配置对象，防止意外修改
Object.freeze(finalConfig)

// 导出最终配置
module.exports = finalConfig