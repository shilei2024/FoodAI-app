// services/index.js
const config = require('../constants/config.js')

/**
 * 服务工厂
 * 根据配置自动选择使用云开发版本还是本地版本
 */
class ServiceFactory {
  constructor() {
    this.config = config
    this.useCloud = this.shouldUseCloud()
    this.services = {}
    this.init()
  }

  /**
   * 判断是否应该使用云开发
   * @returns {boolean} 是否使用云开发
   */
  shouldUseCloud() {
    // 检查配置中是否启用了云开发
    if (!this.config.cloud || !this.config.cloud.env) {
      console.log('云开发配置未启用，使用本地版本')
      return false
    }

    // 检查是否支持云开发API
    if (!wx.cloud) {
      console.log('当前版本不支持云开发，使用本地版本')
      return false
    }

    console.log('使用云开发版本')
    return true
  }

  /**
   * 初始化服务
   */
  async init() {
    try {
      if (this.useCloud) {
        // 初始化云开发
        await this.initCloud()
      }
      
      // 加载服务
      await this.loadServices()
    } catch (error) {
      console.error('服务初始化失败:', error)
      // 降级到本地版本
      this.useCloud = false
      await this.loadServices()
    }
  }

  /**
   * 初始化云开发
   */
  async initCloud() {
    try {
      wx.cloud.init({
        env: this.config.cloud.env,
        traceUser: true
      })
      console.log('云开发初始化成功')
    } catch (error) {
      console.error('云开发初始化失败:', error)
      throw error
    }
  }

  /**
   * 加载服务
   */
  async loadServices() {
    try {
      if (this.useCloud) {
        // 加载云开发版本的服务
        const aiServiceCloud = require('./ai-service-cloud.js')
        const dataServiceCloud = require('./data-service-cloud.js')
        
        this.services.aiService = aiServiceCloud
        this.services.dataService = dataServiceCloud
        
        console.log('已加载云开发版本服务')
      } else {
        // 加载本地版本的服务
        const aiService = require('./ai-service.js')
        const dataService = require('./data-service.js')
        
        this.services.aiService = aiService
        this.services.dataService = dataService
        
        console.log('已加载本地版本服务')
      }
      
      // 加载其他服务（云开发和本地版本相同）
      const userService = require('./user-service.js')
      const payService = require('./pay-service.js')
      const recipeService = require('./recipe-service.js')
      
      this.services.userService = userService
      this.services.payService = payService
      this.services.recipeService = recipeService
      
    } catch (error) {
      console.error('加载服务失败:', error)
      throw error
    }
  }

  /**
   * 获取AI服务
   * @returns {Object} AI服务
   */
  getAIService() {
    return this.services.aiService
  }

  /**
   * 获取数据服务
   * @returns {Object} 数据服务
   */
  getDataService() {
    return this.services.dataService
  }

  /**
   * 获取用户服务
   * @returns {Object} 用户服务
   */
  getUserService() {
    return this.services.userService
  }

  /**
   * 获取支付服务
   * @returns {Object} 支付服务
   */
  getPayService() {
    return this.services.payService
  }

  /**
   * 获取食谱服务
   * @returns {Object} 食谱服务
   */
  getRecipeService() {
    return this.services.recipeService
  }

  /**
   * 获取所有服务
   * @returns {Object} 所有服务
   */
  getAllServices() {
    return this.services
  }

  /**
   * 检查是否使用云开发
   * @returns {boolean} 是否使用云开发
   */
  isUsingCloud() {
    return this.useCloud
  }

  /**
   * 切换服务版本
   * @param {boolean} useCloud 是否使用云开发
   */
  async switchVersion(useCloud) {
    if (this.useCloud !== useCloud) {
      this.useCloud = useCloud
      await this.loadServices()
      console.log(`已切换到${useCloud ? '云开发' : '本地'}版本`)
    }
  }
}

// 创建单例实例
let serviceFactoryInstance = null

function getServiceFactory() {
  if (!serviceFactoryInstance) {
    serviceFactoryInstance = new ServiceFactory()
  }
  return serviceFactoryInstance
}

// 导出便捷方法
module.exports = {
  // 获取服务工厂实例
  getServiceFactory,
  
  // 便捷方法：获取各个服务
  getAIService: () => getServiceFactory().getAIService(),
  getDataService: () => getServiceFactory().getDataService(),
  getUserService: () => getServiceFactory().getUserService(),
  getPayService: () => getServiceFactory().getPayService(),
  getRecipeService: () => getServiceFactory().getRecipeService(),
  
  // 获取所有服务
  getAllServices: () => getServiceFactory().getAllServices(),
  
  // 检查是否使用云开发
  isUsingCloud: () => getServiceFactory().isUsingCloud(),
  
  // 切换版本
  switchVersion: (useCloud) => getServiceFactory().switchVersion(useCloud),
  
  // 初始化（可选）
  init: async () => {
    const factory = getServiceFactory()
    await factory.init()
    return factory
  }
}
