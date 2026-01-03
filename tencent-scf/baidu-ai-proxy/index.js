// 腾讯云函数 - 百度AI代理服务
const axios = require('axios');

// 百度AI配置
const BAIDU_AI_CONFIG = {
  DISH_RECOGNITION_URL: 'https://aip.baidubce.com/rest/2.0/image-classify/v2/dish',
  GENERAL_RECOGNITION_URL: 'https://aip.baidubce.com/rest/2.0/image-classify/v2/advanced_general',
  TOKEN_URL: 'https://aip.baidubce.com/oauth/2.0/token'
};

// 从环境变量读取密钥
const API_KEY = process.env.BAIDU_AI_API_KEY;
const SECRET_KEY = process.env.BAIDU_AI_SECRET_KEY;

// 缓存access_token
let tokenCache = {
  token: null,
  expireTime: 0
};

/**
 * 获取百度AI access_token
 */
async function getBaiduAIAccessToken() {
  try {
    const now = Date.now();
    
    // 检查缓存是否有效（提前5分钟过期）
    if (tokenCache.token && tokenCache.expireTime > now + 5 * 60 * 1000) {
      return tokenCache.token;
    }
    
    // 获取新token
    const tokenUrl = `${BAIDU_AI_CONFIG.TOKEN_URL}?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`;
    
    const response = await axios.get(tokenUrl);
    
    if (response.data && response.data.access_token) {
      const token = response.data.access_token;
      const expireTime = now + (response.data.expires_in - 300) * 1000;
      
      // 更新缓存
      tokenCache = {
        token,
        expireTime
      };
      
      return token;
    } else {
      throw new Error('获取access_token失败');
    }
  } catch (error) {
    console.error('获取百度AI token失败:', error);
    throw error;
  }
}

/**
 * 食物识别
 */
async function recognizeFood(imageBase64, options = {}) {
  try {
    const accessToken = await getBaiduAIAccessToken();
    
    const params = new URLSearchParams();
    params.append('image', imageBase64);
    params.append('top_num', options.top_num || 5);
    params.append('filter_threshold', options.filter_threshold || 0.7);
    params.append('baike_num', options.baike_num || 1);
    
    const response = await axios.post(
      `${BAIDU_AI_CONFIG.DISH_RECOGNITION_URL}?access_token=${accessToken}`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('食物识别失败:', error);
    throw error;
  }
}

/**
 * 通用物体识别
 */
async function recognizeGeneral(imageBase64, options = {}) {
  try {
    const accessToken = await getBaiduAIAccessToken();
    
    const params = new URLSearchParams();
    params.append('image', imageBase64);
    params.append('baike_num', options.baike_num || 1);
    
    const response = await axios.post(
      `${BAIDU_AI_CONFIG.GENERAL_RECOGNITION_URL}?access_token=${accessToken}`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('通用物体识别失败:', error);
    throw error;
  }
}

/**
 * 腾讯云函数主入口
 */
exports.main_handler = async (event, context) => {
  try {
    // 解析请求数据
    const { action, data, options } = JSON.parse(event.body || '{}');
    
    switch (action) {
      case 'recognizeFood':
        const foodResult = await recognizeFood(data.image, options);
        return {
          success: true,
          data: foodResult,
          message: '食物识别成功'
        };
        
      case 'recognizeGeneral':
        const generalResult = await recognizeGeneral(data.image, options);
        return {
          success: true,
          data: generalResult,
          message: '通用识别成功'
        };
        
      case 'getToken':
        const token = await getBaiduAIAccessToken();
        return {
          success: true,
          data: { access_token: token },
          message: '获取token成功'
        };
        
      default:
        return {
          success: false,
          message: '未知的操作类型',
          code: 400
        };
    }
  } catch (error) {
    console.error('云函数执行失败:', error);
    
    return {
      success: false,
      message: error.message || '服务器内部错误',
      code: 500,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};
