// utils/imagePaths.js
/**
 * 图片路径配置工具
 * 统一管理所有图片资源路径，避免硬编码
 */

const ImagePaths = {
  // 默认图片（使用网络图片作为临时解决方案）
  defaults: {
    // 默认食物图片 - 使用unsplash的免费食物图片
    food: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=200&h=200&fit=crop&auto=format',
    
    // 默认头像 - 使用unsplash的免费头像
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&auto=format',
    
    // 占位图
    placeholder: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop&auto=format',
    
    // 分享封面
    shareCover: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=200&fit=crop&auto=format'
  },
  
  // 食物图片（使用unsplash的免费食物图片）
  foods: {
    apple: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=200&h=200&fit=crop&auto=format',
    banana: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200&h=200&fit=crop&auto=format',
    broccoli: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=200&h=200&fit=crop&auto=format',
    chicken: 'https://images.unsplash.com/photo-1604503468505-6ff2c5fdab2d?w=200&h=200&fit=crop&auto=format',
    egg: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&h=200&fit=crop&auto=format',
    rice: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=200&h=200&fit=crop&auto=format',
    fish: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=200&h=200&fit=crop&auto=format',
    beef: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=200&h=200&fit=crop&auto=format',
    milk: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop&auto=format',
    bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop&auto=format'
  },
  
  // 图标
  icons: {
    ai: 'https://img.icons8.com/color/96/000000/artificial-intelligence.png',
    camera: 'https://img.icons8.com/color/96/000000/camera.png',
    share: 'https://img.icons8.com/color/96/000000/share.png',
    vip: 'https://img.icons8.com/color/96/000000/vip.png'
  },
  
  // 食谱分享图片
  recipeShare: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=300&fit=crop&auto=format',
  
  /**
   * 获取图片路径
   * @param {string} category - 图片类别
   * @param {string} name - 图片名称
   * @returns {string} 图片URL
   */
  get(category, name = '') {
    if (!category) return ''
    
    if (category === 'defaults') {
      return this.defaults[name] || this.defaults.food
    }
    
    if (category === 'foods') {
      return this.foods[name] || this.defaults.food
    }
    
    if (category === 'icons') {
      return this.icons[name] || ''
    }
    
    // 直接返回类别（如果是完整URL）
    return category
  },
  
  /**
   * 获取默认食物图片
   */
  getDefaultFood() {
    return this.defaults.food
  },
  
  /**
   * 获取默认头像
   */
  getDefaultAvatar() {
    return this.defaults.avatar
  },
  
  /**
   * 获取占位图
   */
  getPlaceholder() {
    return this.defaults.placeholder
  },
  
  /**
   * 获取分享封面
   */
  getShareCover() {
    return this.defaults.shareCover
  },
  
  /**
   * 获取食物图片
   * @param {string} foodName - 食物名称
   */
  getFoodImage(foodName) {
    const foodMap = {
      '苹果': 'apple',
      '香蕉': 'banana',
      '西兰花': 'broccoli',
      '鸡肉': 'chicken',
      '鸡胸肉': 'chicken',
      '鸡蛋': 'egg',
      '米饭': 'rice',
      '鱼肉': 'fish',
      '牛肉': 'beef',
      '牛奶': 'milk',
      '面包': 'bread'
    }
    
    const key = foodMap[foodName] || 'apple'
    return this.foods[key] || this.defaults.food
  }
}

module.exports = ImagePaths
