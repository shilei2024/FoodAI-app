// components/nutrition-chart/index.js
Component({
  properties: {
    // 营养数据
    data: {
      type: Object,
      value: {},
      observer: 'updateChartData'
    },
    // 图表类型：bar, pie, radar
    type: {
      type: String,
      value: 'bar'
    },
    // 是否显示标题
    showTitle: {
      type: Boolean,
      value: true
    },
    // 是否显示图例
    showLegend: {
      type: Boolean,
      value: true
    },
    // 图表高度
    height: {
      type: Number,
      value: 300
    }
  },

  data: {
    // 图表配置
    chartConfig: {
      categories: [],
      series: [],
      yAxis: {},
      xAxis: {},
      legend: {},
      extra: {
        column: {
          width: 20
        }
      }
    },
    // 是否使用canvas
    useCanvas: false,
    // 图表实例
    chartInstance: null
  },

  methods: {
    // 更新图表数据
    updateChartData(newData) {
      if (!newData || Object.keys(newData).length === 0) {
        return
      }

      const chartData = this.formatChartData(newData)
      this.setData({ chartConfig: chartData })

      // 使用canvas绘制图表
      this.initCanvasChart()
    },

    // 格式化图表数据
    formatChartData(nutritionData) {
      const categories = []
      const seriesData = []
      const colors = []
      const units = []

      // 定义营养项和对应的颜色、单位
      const nutritionItems = [
        { key: 'protein', name: '蛋白质', color: '#07c160', unit: 'g' },
        { key: 'fat', name: '脂肪', color: '#1989fa', unit: 'g' },
        { key: 'carbohydrate', name: '碳水化合物', color: '#ff976a', unit: 'g' },
        { key: 'fiber', name: '膳食纤维', color: '#ee0a24', unit: 'g' },
        { key: 'calories', name: '热量', color: '#ffd700', unit: '千卡' },
        { key: 'vitaminC', name: '维生素C', color: '#7232dd', unit: 'mg' },
        { key: 'vitaminK', name: '维生素K', color: '#00bcd4', unit: 'μg' },
        { key: 'potassium', name: '钾', color: '#ff9800', unit: 'mg' },
        { key: 'calcium', name: '钙', color: '#9c27b0', unit: 'mg' },
        { key: 'iron', name: '铁', color: '#f44336', unit: 'mg' },
        { key: 'sodium', name: '钠', color: '#2196f3', unit: 'mg' },
        { key: 'zinc', name: '锌', color: '#ff9800', unit: 'mg' }
      ]

      // 过滤出有数据的营养项
      nutritionItems.forEach(item => {
        let value = nutritionData[item.key]
        
        // 支持不同的键名变体
        if (value === undefined) {
          // 尝试其他可能的键名
          if (item.key === 'calories') {
            value = nutritionData.calorie || nutritionData.calories
          } else if (item.key === 'carbohydrate') {
            value = nutritionData.carbohydrate || nutritionData.carb
          } else if (item.key === 'vitaminC') {
            value = nutritionData.vitaminC || nutritionData.vitc
          }
        }
        
        if (value !== undefined && value > 0) {
          categories.push(item.name)
          seriesData.push(value)
          colors.push(item.color)
          units.push(item.unit)
        }
      })

      // 如果没有数据，返回空配置
      if (categories.length === 0) {
        return {
          categories: [],
          series: [],
          colors: [],
          units: [],
          yAxis: {},
          xAxis: {},
          legend: {},
          extra: {}
        }
      }

      return {
        categories: categories,
        series: [{
          name: '营养成分',
          data: seriesData,
          color: this.data.type === 'bar' ? '#07c160' : colors
        }],
        colors: colors,
        units: units,
        yAxis: {
          format: (val) => {
            return val.toFixed(1)
          },
          min: 0,
          title: '含量',
          gridType: 'dash',
          dashLength: 4
        },
        xAxis: {
          disableGrid: true
        },
        legend: {
          show: this.data.showLegend,
          position: 'top',
          float: 'center'
        },
        extra: {
          column: {
            width: 20,
            activeOpacity: 0.5
          },
          pie: {
            offsetAngle: 0,
            label: true,
            labelLine: true
          },
          radar: {
            gridType: 'polygon',
            gridColor: '#e0e0e0',
            gridCount: 3
          }
        }
      }
    },

    // 初始化canvas图表
    initCanvasChart() {
      if (!this.data.useCanvas) return

      // 使用微信小程序的canvas API
      const query = this.createSelectorQuery()
      query.select('.chart-container').boundingClientRect()
      query.exec((res) => {
        if (!res[0]) return

        const container = res[0]
        const width = container.width
        const height = container.height
        
        // 创建canvas上下文
        const ctx = wx.createCanvasContext('nutrition-canvas', this)
        
        // 清空画布
        ctx.clearRect(0, 0, width, height)
        
        // 根据图表类型调用不同的绘制函数
        switch (this.data.type) {
          case 'pie':
            this.drawPieChart(ctx, width, height)
            break
          case 'radar':
            this.drawRadarChart(ctx, width, height)
            break
          case 'bar':
          default:
            this.drawBarChart(ctx, width, height)
            break
        }
        
        // 绘制到canvas
        ctx.draw()
      })
    },

    // 绘制柱状图（微信小程序版本）
    drawBarChart(ctx, width, height) {
      const { categories, series, colors } = this.data.chartConfig
      if (!categories || categories.length === 0) return

      const padding = 40
      const chartWidth = width - padding * 2
      const chartHeight = height - padding * 2
      const barWidth = chartWidth / categories.length * 0.6
      const maxValue = Math.max(...series[0].data)

      // 绘制坐标轴
      ctx.setStrokeStyle('#ccc')
      ctx.setLineWidth(1)
      ctx.moveTo(padding, padding)
      ctx.lineTo(padding, height - padding)
      ctx.lineTo(width - padding, height - padding)
      ctx.stroke()

      // 绘制刻度
      const ySteps = 5
      for (let i = 0; i <= ySteps; i++) {
        const y = padding + (chartHeight / ySteps) * i
        const value = (maxValue / ySteps) * (ySteps - i)
        
        ctx.setStrokeStyle('#ccc')
        ctx.setLineWidth(1)
        ctx.moveTo(padding - 5, y)
        ctx.lineTo(padding, y)
        ctx.stroke()

        // 微信小程序canvas文本绘制
        ctx.setFontSize(12)
        ctx.setFillStyle('#666')
        ctx.setTextAlign('right')
        ctx.setTextBaseline('middle')
        ctx.fillText(value.toFixed(1), padding - 10, y)
      }

      // 绘制柱状图
      categories.forEach((category, index) => {
        const x = padding + (chartWidth / categories.length) * index + (chartWidth / categories.length - barWidth) / 2
        const value = series[0].data[index]
        const barHeight = (value / maxValue) * chartHeight
        
        // 绘制柱状
        ctx.setFillStyle(colors[index] || '#07c160')
        ctx.fillRect(x, height - padding - barHeight, barWidth, barHeight)

        // 绘制数值
        ctx.setFontSize(12)
        ctx.setFillStyle('#333')
        ctx.setTextAlign('center')
        ctx.setTextBaseline('bottom')
        ctx.fillText(value.toFixed(1), x + barWidth / 2, height - padding - barHeight - 5)

        // 绘制标签
        ctx.setFontSize(12)
        ctx.setFillStyle('#666')
        ctx.setTextAlign('center')
        ctx.setTextBaseline('top')
        
        // 处理长标签换行
        const maxChars = 4
        if (category.length > maxChars) {
          const part1 = category.substring(0, maxChars)
          const part2 = category.substring(maxChars)
          ctx.fillText(part1, x + barWidth / 2, height - padding + 5)
          ctx.fillText(part2, x + barWidth / 2, height - padding + 20)
        } else {
          ctx.fillText(category, x + barWidth / 2, height - padding + 5)
        }
      })
    },

    // 绘制饼图（微信小程序版本）
    drawPieChart(ctx, width, height) {
      const { categories, series, colors } = this.data.chartConfig
      if (!categories || categories.length === 0) return

      const centerX = width / 2
      const centerY = height / 2
      const radius = Math.min(width, height) * 0.35
      const total = series[0].data.reduce((sum, value) => sum + value, 0)

      // 绘制饼图
      let startAngle = -Math.PI / 2 // 从12点方向开始
      categories.forEach((category, index) => {
        const value = series[0].data[index]
        const sliceAngle = (value / total) * 2 * Math.PI

        // 绘制扇形（微信小程序使用arc方法）
        ctx.setFillStyle(colors[index] || '#07c160')
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
        ctx.closePath()
        ctx.fill()
        
        // 绘制扇形边框
        ctx.setStrokeStyle('#fff')
        ctx.setLineWidth(2)
        ctx.stroke()

        // 计算标签位置
        const midAngle = startAngle + sliceAngle / 2
        const labelRadius = radius * 1.2
        const labelX = centerX + Math.cos(midAngle) * labelRadius
        const labelY = centerY + Math.sin(midAngle) * labelRadius

        // 绘制百分比标签
        const percentage = ((value / total) * 100).toFixed(1)
        ctx.setFontSize(12)
        ctx.setFillStyle('#333')
        ctx.setTextAlign('center')
        ctx.setTextBaseline('middle')
        ctx.fillText(`${percentage}%`, labelX, labelY)

        // 绘制名称标签（在外圈）
        const nameRadius = radius * 1.4
        const nameX = centerX + Math.cos(midAngle) * nameRadius
        const nameY = centerY + Math.sin(midAngle) * nameRadius

        ctx.setFontSize(10)
        ctx.setFillStyle('#666')
        ctx.setTextAlign('center')
        ctx.setTextBaseline('middle')
        
        // 处理长标签
        if (category.length > 4) {
          const part1 = category.substring(0, 4)
          const part2 = category.substring(4)
          ctx.fillText(part1, nameX, nameY - 6)
          ctx.fillText(part2, nameX, nameY + 6)
        } else {
          ctx.fillText(category, nameX, nameY)
        }

        startAngle += sliceAngle
      })

      // 绘制中心圆
      ctx.setFillStyle('#fff')
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 0.3, 0, 2 * Math.PI)
      ctx.closePath()
      ctx.fill()
      
      ctx.setStrokeStyle('#e0e0e0')
      ctx.setLineWidth(1)
      ctx.stroke()

      // 绘制总数值
      ctx.setFontSize(14)
      ctx.setFillStyle('#333')
      ctx.setTextAlign('center')
      ctx.setTextBaseline('middle')
      ctx.fillText('总含量', centerX, centerY - 10)
      
      ctx.setFontSize(16)
      ctx.setFillStyle('#07c160')
      ctx.fillText(total.toFixed(1), centerX, centerY + 10)
    },

    // 绘制雷达图（微信小程序版本）
    drawRadarChart(ctx, width, height) {
      const { categories, series, colors } = this.data.chartConfig
      if (!categories || categories.length === 0) return

      const centerX = width / 2
      const centerY = height / 2
      const maxRadius = Math.min(width, height) * 0.35
      const numPoints = categories.length
      const maxValue = Math.max(...series[0].data)

      // 绘制雷达网格
      const gridCount = 3
      for (let i = 1; i <= gridCount; i++) {
        const radius = maxRadius * (i / gridCount)
        
        ctx.beginPath()
        for (let j = 0; j < numPoints; j++) {
          const angle = (j / numPoints) * 2 * Math.PI - Math.PI / 2
          const x = centerX + Math.cos(angle) * radius
          const y = centerY + Math.sin(angle) * radius
          
          if (j === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.closePath()
        ctx.setStrokeStyle('#e0e0e0')
        ctx.setLineWidth(0.5)
        ctx.stroke()
      }

      // 绘制轴线
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI - Math.PI / 2
        const x = centerX + Math.cos(angle) * maxRadius
        const y = centerY + Math.sin(angle) * maxRadius
        
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(x, y)
        ctx.setStrokeStyle('#ccc')
        ctx.setLineWidth(1)
        ctx.stroke()

        // 绘制标签
        const labelRadius = maxRadius * 1.1
        const labelX = centerX + Math.cos(angle) * labelRadius
        const labelY = centerY + Math.sin(angle) * labelRadius
        
        ctx.setFontSize(12)
        ctx.setFillStyle('#666')
        ctx.setTextAlign('center')
        ctx.setTextBaseline('middle')
        
        // 调整标签位置
        let textAlign = 'center'
        let textBaseline = 'middle'
        
        if (Math.abs(Math.cos(angle)) > 0.7) {
          textAlign = Math.cos(angle) > 0 ? 'left' : 'right'
        }
        if (Math.abs(Math.sin(angle)) > 0.7) {
          textBaseline = Math.sin(angle) > 0 ? 'top' : 'bottom'
        }
        
        ctx.setTextAlign(textAlign)
        ctx.setTextBaseline(textBaseline)
        ctx.fillText(categories[i], labelX, labelY)
      }

      // 绘制数据多边形
      ctx.beginPath()
      for (let i = 0; i < numPoints; i++) {
        const value = series[0].data[i]
        const angle = (i / numPoints) * 2 * Math.PI - Math.PI / 2
        const radius = (value / maxValue) * maxRadius
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()
      ctx.setFillStyle('rgba(7, 193, 96, 0.3)')
      ctx.fill()
      ctx.setStrokeStyle('#07c160')
      ctx.setLineWidth(2)
      ctx.stroke()

      // 绘制数据点
      for (let i = 0; i < numPoints; i++) {
        const value = series[0].data[i]
        const angle = (i / numPoints) * 2 * Math.PI - Math.PI / 2
        const radius = (value / maxValue) * maxRadius
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        
        // 绘制圆形数据点
        ctx.setFillStyle(colors[i] || '#07c160')
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.closePath()
        ctx.fill()
        
        ctx.setStrokeStyle('#fff')
        ctx.setLineWidth(1)
        ctx.stroke()

        // 绘制数值标签
        ctx.setFontSize(10)
        ctx.setFillStyle('#333')
        ctx.setTextAlign('center')
        ctx.setTextBaseline('bottom')
        ctx.fillText(value.toFixed(1), x, y - 6)
      }
    },

    // 切换图表类型
    switchChartType(e) {
      const type = e.currentTarget.dataset.type
      if (type !== this.data.type) {
        this.setData({ type: type })
        this.updateChartData(this.data.data)
      }
    },

    // 图例点击事件
    onLegendClick(e) {
      const index = e.currentTarget.dataset.index
      const { categories, series, colors } = this.data.chartConfig
      
      if (index >= 0 && index < categories.length) {
        const category = categories[index]
        const value = series[0].data[index]
        const color = colors ? colors[index] : '#07c160'
        const unit = this.data.chartConfig.units ? this.data.chartConfig.units[index] : '单位'
        
        // 显示选中效果
        wx.showToast({
          title: `${category}: ${value.toFixed(1)}${unit}`,
          icon: 'none',
          duration: 1500
        })
        
        // 可以在这里添加高亮效果
        console.log(`选中图例: ${category}, 值: ${value}${unit}`)
      }
    },

    // 图表点击事件（简化版，canvas点击需要额外处理）
    onChartClick(e) {
      // 由于使用原生canvas，点击事件需要额外处理
      // 这里暂时不实现，需要时可以添加canvas点击检测
      console.log('图表点击事件，需要实现canvas点击检测')
    },

    // 图表触摸事件（用于移动端交互）
    onChartTouchStart(e) {
      this.touchStartX = e.touches[0].clientX
      this.touchStartY = e.touches[0].clientY
    },

    onChartTouchMove(e) {
      // 可以在这里实现图表拖动或缩放
      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      
      // 计算移动距离
      const deltaX = currentX - this.touchStartX
      const deltaY = currentY - this.touchStartY
      
      // 这里可以添加拖动逻辑
      console.log(`图表拖动: deltaX=${deltaX}, deltaY=${deltaY}`)
    },

    onChartTouchEnd(e) {
      // 触摸结束，可以在这里处理点击或拖动结束
      console.log('图表触摸结束')
    }
  },

  // 组件生命周期
  lifetimes: {
    attached() {
      // 强制使用canvas绘制
      this.setData({
        useCanvas: true
      })
    },
    
    ready() {
      // 确保组件渲染完成后再初始化图表
      setTimeout(() => {
        if (this.data.data && Object.keys(this.data.data).length > 0) {
          this.updateChartData(this.data.data)
        }
      }, 100)
    },
    
    detached() {
      // 清理canvas资源
      if (this.data.chartInstance) {
        this.data.chartInstance = null
      }
    }
  }
})
