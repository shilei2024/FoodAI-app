// 腾讯云函数服务
const config = require('../constants/config.js');

class TencentSCFService {
  constructor() {
    // 腾讯云函数地址（部署后需要修改）
    this.scfBaseUrl = config.tencentSCF?.baseUrl || 'https://service-xxxxx-xxxxx.gz.apigw.tencentcs.com/release/baidu-ai-proxy';
  }

  /**
   * 调用腾讯云函数
   */
  async callSCF(action, data = {}, options = {}) {
    try {
      const response = await wx.request({
        url: this.scfBaseUrl,
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: {
          action,
          data,
          options
        },
        dataType: 'json'
      });

      if (response.statusCode === 200) {
        return response.data;
      } else {
        throw new Error(`云函数调用失败: ${response.statusCode}`);
      }
    } catch (error) {
      console.error('调用腾讯云函数失败:', error);
      throw error;
    }
  }

  /**
   * 食物识别
   */
  async recognizeFood(imagePath, options = {}) {
    try {
      // 将图片转换为base64
      const imageBase64 = await this.imageToBase64(imagePath);
      
      const result = await this.callSCF('recognizeFood', {
        image: imageBase64
      }, options);

      if (result.success) {
        return this.formatFoodResult(result.data);
      } else {
        throw new Error(result.message || '食物识别失败');
      }
    } catch (error) {
      console.error('食物识别失败:', error);
      throw error;
    }
  }

  /**
   * 通用物体识别
   */
  async recognizeGeneral(imagePath, options = {}) {
    try {
      // 将图片转换为base64
      const imageBase64 = await this.imageToBase64(imagePath);
      
      const result = await this.callSCF('recognizeGeneral', {
        image: imageBase64
      }, options);

      if (result.success) {
        return this.formatGeneralResult(result.data);
      } else {
        throw new Error(result.message || '通用识别失败');
      }
    } catch (error) {
      console.error('通用识别失败:', error);
      throw error;
    }
  }

  /**
   * 获取百度AI access_token
   */
  async getBaiduAIAccessToken() {
    try {
      const result = await this.callSCF('getToken');
      
      if (result.success) {
        return result.data.access_token;
      } else {
        throw new Error(result.message || '获取token失败');
      }
    } catch (error) {
      console.error('获取百度AI token失败:', error);
      throw error;
    }
  }

  /**
   * 将图片转换为base64
   */
  async imageToBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          resolve(res.data);
        },
        fail: (error) => {
          reject(new Error('图片读取失败: ' + error.errMsg));
        }
      });
    });
  }

  /**
   * 格式化食物识别结果
   */
  formatFoodResult(data) {
    if (!data || !data.result) {
      return {
        success: false,
        message: '识别结果为空',
        foods: []
      };
    }

    const foods = data.result.map(item => ({
      name: item.name,
      probability: item.probability,
      calorie: item.calorie || 0,
      hasCalorie: item.has_calorie || false,
      baikeInfo: item.baike_info || null
    }));

    return {
      success: true,
      message: `识别到${foods.length}种食物`,
      foods,
      rawData: data
    };
  }

  /**
   * 格式化通用识别结果
   */
  formatGeneralResult(data) {
    if (!data || !data.result) {
      return {
        success: false,
        message: '识别结果为空',
        objects: []
      };
    }

    const objects = data.result.map(item => ({
      keyword: item.keyword,
      score: item.score,
      root: item.root || '',
      baikeInfo: item.baike_info || null
    }));

    return {
      success: true,
      message: `识别到${objects.length}个物体`,
      objects,
      rawData: data
    };
  }

  /**
   * 测试云函数连接
   */
  async testConnection() {
    try {
      const result = await this.callSCF('getToken');
      return {
        success: result.success,
        message: result.success ? '云函数连接正常' : '云函数连接失败',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: '云函数连接失败: ' + error.message
      };
    }
  }
}

module.exports = new TencentSCFService();
