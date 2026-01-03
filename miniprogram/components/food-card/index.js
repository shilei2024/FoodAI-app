// components/food-card/index.js
Component({
  properties: {
    // 食物数据
    food: {
      type: Object,
      value: {}
    },
    // 是否显示操作按钮
    showActions: {
      type: Boolean,
      value: false
    },
    // 是否显示标签
    showTags: {
      type: Boolean,
      value: true
    },
    // 卡片样式
    cardStyle: {
      type: String,
      value: ''
    }
  },

  data: {
    // 组件内部数据
    isFavorite: false
  },

  methods: {
    // 点击卡片
    onCardTap() {
      this.triggerEvent('tap', { food: this.data.food })
    },

    // 点击收藏
    onFavoriteTap() {
      const newStatus = !this.data.isFavorite
      this.setData({ isFavorite: newStatus })
      this.triggerEvent('favorite', { 
        food: this.data.food, 
        isFavorite: newStatus 
      })
    },

    // 点击分享
    onShareTap() {
      this.triggerEvent('share', { food: this.data.food })
    },

    // 点击删除
    onDeleteTap() {
      this.triggerEvent('delete', { food: this.data.food })
    }
  },

  // 组件生命周期
  lifetimes: {
    attached() {
      // 组件挂载时执行
      if (this.data.food) {
        // 初始化收藏状态
        const isFavorite = wx.getStorageSync(`food_favorite_${this.data.food.id}`) || false
        this.setData({ isFavorite })
      }
    }
  }
})
