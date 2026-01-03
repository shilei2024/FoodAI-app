// components/food-card/index.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    food: {
      type: Object,
      value: {
        id: '',
        foodName: '',
        calories: 0,
        image: '',
        time: '',
        type: 'manual',
        tags: [],
        confidence: 0,
        nutrition: {}
      },
      observer: function(newVal) {
        // 当 food 属性变化时，计算置信度文本
        this.updateConfidenceText(newVal)
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    defaultImage: '/images/default-food.png',
    confidenceText: ''
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件挂载时计算置信度
      this.updateConfidenceText(this.data.food)
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 更新置信度文本
    updateConfidenceText(food) {
      if (!food || !food.confidence || food.confidence <= 0) {
        this.setData({ confidenceText: '' })
        return
      }
      
      const confidence = food.confidence
      let text = ''
      
      if (confidence > 1) {
        // 已经是百分比形式
        text = Math.round(confidence) + '%'
      } else {
        // 小数形式，转换为百分比
        text = Math.round(confidence * 100) + '%'
      }
      
      this.setData({ confidenceText: text })
    },
    
    // 点击卡片
    onTap() {
      this.triggerEvent('tap', { food: this.data.food })
    },
    
    // 图片加载错误时使用默认图片
    onImageError() {
      this.setData({
        'food.image': this.data.defaultImage
      })
    }
  }
})
