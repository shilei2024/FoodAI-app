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
    // 图表高度
    height: {
      type: Number,
      value: 400
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

      // 定义营养项和对应的颜色、单位（扩展列表）
      const nutritionItems = [
        // 基础营养素
        { key: 'protein', name: '蛋白质', color: '#07c160', unit: 'g' },
        { key: 'fat', name: '脂肪', color: '#1989fa', unit: 'g' },
        { key: 'carbohydrate', name: '碳水化合物', color: '#ff976a', unit: 'g' },
        { key: 'fiber', name: '膳食纤维', color: '#ee0a24', unit: 'g' },
        { key: 'water', name: '水分', color: '#00bcd4', unit: 'g' },
        // 维生素
        { key: 'vitaminA', name: '维生素A', color: '#ff5722', unit: 'μg' },
        { key: 'vitaminC', name: '维生素C', color: '#ffc107', unit: 'mg' },
        { key: 'vitaminD', name: '维生素D', color: '#9c27b0', unit: 'μg' },
        { key: 'vitaminE', name: '维生素E', color: '#4caf50', unit: 'mg' },
        { key: 'vitaminK', name: '维生素K', color: '#795548', unit: 'μg' },
        { key: 'vitaminB1', name: '维生素B1', color: '#e91e63', unit: 'mg' },
        { key: 'vitaminB2', name: '维生素B2', color: '#3f51b5', unit: 'mg' },
        { key: 'vitaminB6', name: '维生素B6', color: '#009688', unit: 'mg' },
        { key: 'vitaminB12', name: '维生素B12', color: '#673ab7', unit: 'μg' },
        { key: 'niacin', name: '烟酸', color: '#ff9800', unit: 'mg' },
        { key: 'folate', name: '叶酸', color: '#8bc34a', unit: 'μg' },
        // 矿物质
        { key: 'calcium', name: '钙', color: '#9c27b0', unit: 'mg' },
        { key: 'iron', name: '铁', color: '#f44336', unit: 'mg' },
        { key: 'zinc', name: '锌', color: '#607d8b', unit: 'mg' },
        { key: 'potassium', name: '钾', color: '#ff9800', unit: 'mg' },
        { key: 'sodium', name: '钠', color: '#2196f3', unit: 'mg' },
        { key: 'magnesium', name: '镁', color: '#00bcd4', unit: 'mg' },
        { key: 'phosphorus', name: '磷', color: '#cddc39', unit: 'mg' },
        { key: 'selenium', name: '硒', color: '#ff5722', unit: 'μg' },
        { key: 'copper', name: '铜', color: '#795548', unit: 'mg' },
        { key: 'manganese', name: '锰', color: '#9e9e9e', unit: 'mg' }
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
            value = nutritionData.carbohydrate || nutritionData.carb || nutritionData.carbs
          } else if (item.key === 'vitaminB1') {
            value = nutritionData.vitaminB1 || nutritionData.thiamin
          } else if (item.key === 'vitaminB2') {
            value = nutritionData.vitaminB2 || nutritionData.riboflavin
          } else if (item.key === 'niacin') {
            value = nutritionData.niacin || nutritionData.vitaminB3
          } else if (item.key === 'folate') {
            value = nutritionData.folate || nutritionData.folicAcid || nutritionData.vitaminB9
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
          show: false,
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

      const paddingLeft = 45
      const paddingRight = 15
      const paddingTop = 20
      const paddingBottom = 65 // 增加底部空间用于倾斜标签
      const chartWidth = width - paddingLeft - paddingRight
      const chartHeight = height - paddingTop - paddingBottom
      const barWidth = Math.min(chartWidth / categories.length * 0.65, 35)
      const maxValue = Math.max(...series[0].data) * 1.15 // 增加15%的空间

      // 绘制坐标轴
      ctx.setStrokeStyle('#ccc')
      ctx.setLineWidth(1)
      ctx.beginPath()
      ctx.moveTo(paddingLeft, paddingTop)
      ctx.lineTo(paddingLeft, height - paddingBottom)
      ctx.lineTo(width - paddingRight, height - paddingBottom)
      ctx.stroke()

      // 绘制Y轴刻度和网格线
      const ySteps = 4
      for (let i = 0; i <= ySteps; i++) {
        const y = paddingTop + (chartHeight / ySteps) * i
        const value = (maxValue / ySteps) * (ySteps - i)
        
        // 绘制网格线
        ctx.setStrokeStyle('#f0f0f0')
        ctx.setLineWidth(0.5)
        ctx.beginPath()
        ctx.moveTo(paddingLeft, y)
        ctx.lineTo(width - paddingRight, y)
        ctx.stroke()
        
        // 绘制Y轴刻度值
        ctx.setFontSize(9)
        ctx.setFillStyle('#999')
        ctx.setTextAlign('right')
        ctx.setTextBaseline('middle')
        // 格式化数值显示
        let displayValue = value
        if (value >= 100) {
          displayValue = Math.round(value)
        } else if (value >= 10) {
          displayValue = value.toFixed(1)
        } else {
          displayValue = value.toFixed(1)
        }
        ctx.fillText(displayValue, paddingLeft - 5, y)
      }

      // 绘制柱状图
      categories.forEach((category, index) => {
        const x = paddingLeft + (chartWidth / categories.length) * index + (chartWidth / categories.length - barWidth) / 2
        const value = series[0].data[index]
        const barHeight = Math.max((value / maxValue) * chartHeight, 2) // 最小高度2px
        
        // 绘制柱状（带圆角效果）
        ctx.setFillStyle(colors[index] || '#07c160')
        ctx.beginPath()
        const cornerRadius = Math.min(3, barWidth / 4)
        ctx.moveTo(x, height - paddingBottom)
        ctx.lineTo(x, height - paddingBottom - barHeight + cornerRadius)
        ctx.arcTo(x, height - paddingBottom - barHeight, x + cornerRadius, height - paddingBottom - barHeight, cornerRadius)
        ctx.lineTo(x + barWidth - cornerRadius, height - paddingBottom - barHeight)
        ctx.arcTo(x + barWidth, height - paddingBottom - barHeight, x + barWidth, height - paddingBottom - barHeight + cornerRadius, cornerRadius)
        ctx.lineTo(x + barWidth, height - paddingBottom)
        ctx.closePath()
        ctx.fill()

        // 绘制完整标签（倾斜45度显示）
        ctx.save()
        ctx.setFontSize(9)
        ctx.setFillStyle('#666')
        
        // 移动到标签位置并旋转
        const labelX = x + barWidth / 2
        const labelY = height - paddingBottom + 8
        ctx.translate(labelX, labelY)
        ctx.rotate(-Math.PI / 4) // 倾斜45度
        ctx.setTextAlign('right')
        ctx.setTextBaseline('middle')
        ctx.fillText(category, 0, 0) // 显示完整名称
        ctx.restore()
      })
    },

    // 绘制饼图（微信小程序版本）
    drawPieChart(ctx, width, height) {
      const { categories, series, colors } = this.data.chartConfig
      if (!categories || categories.length === 0) return

      const centerX = width / 2
      const centerY = height / 2
      const radius = Math.min(width, height) * 0.25
      const total = series[0].data.reduce((sum, value) => sum + value, 0)

      // 计算每个扇形的数据和角度
      const sliceData = []
      let startAngle = -Math.PI / 2 // 从12点方向开始
      
      categories.forEach((category, index) => {
        const value = series[0].data[index]
        const percentage = (value / total) * 100
        const sliceAngle = (value / total) * 2 * Math.PI
        const midAngle = startAngle + sliceAngle / 2
        
        sliceData.push({
          category,
          value,
          percentage,
          color: colors[index] || '#07c160',
          startAngle,
          sliceAngle,
          midAngle
        })
        
        startAngle += sliceAngle
      })
      
      // 只显示占比>=8%的标签
      const labelThreshold = 8
      
      // 绘制所有扇形
      sliceData.forEach((slice) => {
        const { color, startAngle, sliceAngle } = slice

        // 绘制扇形
        ctx.setFillStyle(color)
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
        ctx.closePath()
        ctx.fill()
        
        // 绘制扇形边框
        ctx.setStrokeStyle('#fff')
        ctx.setLineWidth(2)
        ctx.stroke()
      })

      // 绘制中心圆（甜甜圈效果）
      ctx.setFillStyle('#fff')
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI)
      ctx.closePath()
      ctx.fill()
      
      ctx.setStrokeStyle('#f0f0f0')
      ctx.setLineWidth(1)
      ctx.stroke()

      // 计算标签位置，避免重叠
      const labelRadius = radius * 1.15
      const labels = sliceData
        .filter(slice => slice.percentage >= labelThreshold)
        .map(slice => {
          const { category, percentage, midAngle, color } = slice
          const isRightSide = Math.cos(midAngle) >= 0
          
          // 标签基础位置
          let labelX = centerX + Math.cos(midAngle) * labelRadius
          let labelY = centerY + Math.sin(midAngle) * labelRadius
          
          return {
            category,
            percentage,
            midAngle,
            color,
            labelX,
            labelY,
            isRightSide
          }
        })
      
      // 调整标签位置避免重叠
      const minVerticalGap = 16 // 最小垂直间距
      labels.sort((a, b) => a.labelY - b.labelY) // 按Y坐标排序
      
      for (let i = 1; i < labels.length; i++) {
        const prev = labels[i - 1]
        const curr = labels[i]
        
        // 如果两个标签在同一侧且垂直距离太近
        if (prev.isRightSide === curr.isRightSide) {
          const gap = curr.labelY - prev.labelY
          if (gap < minVerticalGap) {
            curr.labelY = prev.labelY + minVerticalGap
          }
        }
      }
      
      // 绘制标签（在扇形边上）
      labels.forEach((label) => {
        const { category, percentage, labelX, labelY, isRightSide } = label
        
        // 绘制标签文字（完整名称 + 百分比）
        ctx.setFontSize(11)
        ctx.setFillStyle('#333')
        ctx.setTextAlign(isRightSide ? 'left' : 'right')
        ctx.setTextBaseline('middle')
        
        const displayText = `${category} ${percentage.toFixed(0)}%`
        ctx.fillText(displayText, labelX, labelY)
      })

      // 绘制中心标题
      ctx.setFontSize(11)
      ctx.setFillStyle('#666')
      ctx.setTextAlign('center')
      ctx.setTextBaseline('middle')
      ctx.fillText('营养', centerX, centerY - 6)
      
      ctx.setFontSize(9)
      ctx.setFillStyle('#07c160')
      ctx.fillText('成分', centerX, centerY + 6)
    },

    // 绘制雷达图（微信小程序版本）
    drawRadarChart(ctx, width, height) {
      const { categories, series, colors } = this.data.chartConfig
      if (!categories || categories.length === 0) return

      const centerX = width / 2
      const centerY = height / 2
      const maxRadius = Math.min(width, height) * 0.26
      const numPoints = categories.length
      const maxValue = Math.max(...series[0].data) * 1.15

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
        ctx.setStrokeStyle('#e8e8e8')
        ctx.setLineWidth(0.5)
        ctx.stroke()
      }

      // 绘制轴线和标签
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI - Math.PI / 2
        const x = centerX + Math.cos(angle) * maxRadius
        const y = centerY + Math.sin(angle) * maxRadius
        
        ctx.beginPath()
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(x, y)
        ctx.setStrokeStyle('#ddd')
        ctx.setLineWidth(0.5)
        ctx.stroke()

        // 绘制完整标签（更大字体，更清晰）
        const labelRadius = maxRadius * 1.25
        let labelX = centerX + Math.cos(angle) * labelRadius
        let labelY = centerY + Math.sin(angle) * labelRadius
        
        // 设置更大的字体
        ctx.setFontSize(11)
        ctx.setFillStyle('#333')
        
        // 根据角度调整标签位置和对齐方式
        const cosAngle = Math.cos(angle)
        const sinAngle = Math.sin(angle)
        
        let textAlign = 'center'
        let textBaseline = 'middle'
        
        // 根据位置精确调整对齐和偏移
        if (cosAngle > 0.5) {
          textAlign = 'left'
          labelX += 5
        } else if (cosAngle < -0.5) {
          textAlign = 'right'
          labelX -= 5
        }
        
        if (sinAngle > 0.5) {
          textBaseline = 'top'
          labelY += 3
        } else if (sinAngle < -0.5) {
          textBaseline = 'bottom'
          labelY -= 3
        }
        
        ctx.setTextAlign(textAlign)
        ctx.setTextBaseline(textBaseline)
        // 显示完整标签名称
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
      ctx.setFillStyle('rgba(7, 193, 96, 0.25)')
      ctx.fill()
      ctx.setStrokeStyle('#07c160')
      ctx.setLineWidth(2)
      ctx.stroke()

      // 绘制数据点（不显示数值）
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
        ctx.setLineWidth(1.5)
        ctx.stroke()
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
