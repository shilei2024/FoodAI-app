# AI轻食记 - 智能食物识别与营养分析小程序

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)
![Status](https://img.shields.io/badge/status-production--ready-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

**基于AI的智能食物识别与营养分析微信小程序**

[快速开始](#快速开始) • [功能特性](#功能特性) • [配置指南](#配置指南) • [文档](#文档)

</div>

---

## 📖 项目简介

AI轻食记是一款基于人工智能的食物识别与营养分析小程序，帮助用户：
- 🍎 **智能识别**：拍照识别食物，获取营养信息
- 📊 **营养分析**：详细的营养成分分析和健康建议
- 📝 **历史记录**：记录饮食历史，追踪营养摄入
- 🍳 **食谱推荐**：AI生成个性化健康食谱
- 💾 **数据同步**：支持云端同步，多设备共享

---

## ✨ 功能特性

### 核心功能
- ✅ **AI食物识别** - 基于Deepseek AI的智能识别
- ✅ **文字搜索** - 快速搜索食物营养信息
- ✅ **营养分析** - 详细的营养成分展示
- ✅ **历史记录** - 完整的饮食记录管理
- ✅ **食谱生成** - AI生成个性化食谱
- ✅ **数据导出** - 支持JSON/CSV格式导出

### 技术特点
- 🚀 **高性能** - 智能图片压缩，快速响应
- 🎨 **美观UI** - 现代化设计，流畅动画
- 🔒 **安全可靠** - 完善的错误处理和数据保护
- 📱 **响应式** - 适配各种屏幕尺寸
- 🌐 **离线支持** - 本地存储，离线可用

---

## 🚀 快速开始

### 环境要求
- 微信开发者工具（最新版本）
- Node.js 14+
- 微信小程序账号

### 安装步骤

1. **克隆项目**
```bash
git clone <your-repo-url>
cd FoodAI
```

2. **安装依赖**
```bash
npm install
```

3. **配置API密钥**

在 `miniprogram/constants/config.js` 中配置：

```javascript
deepseekAI: {
  apiKey: 'sk-your-api-key-here', // 替换为您的Deepseek API Key
}
```

4. **配置小程序AppID**

```javascript
payment: {
  wechatPay: {
    appId: 'your-appid', // 替换为您的小程序AppID
  }
}
```

5. **打开项目**

在微信开发者工具中打开项目目录。

6. **开始使用**

- 首页搜索"苹果"测试功能
- 尝试拍照识别
- 查看历史记录

---

## 📋 配置指南

### 必需配置（5分钟）

1. **获取Deepseek API密钥**
   - 访问 [Deepseek开放平台](https://platform.deepseek.com/)
   - 注册并获取API密钥
   - 在 `config.js` 中配置

2. **配置小程序AppID**
   - 在微信公众平台获取AppID
   - 在 `config.js` 中配置

### 可选配置

1. **支付功能**（需企业认证）
   - 开通微信支付商户号
   - 配置支付参数
   - 部署支付云函数

2. **云数据库**（数据同步）
   - 开通微信云开发
   - 配置环境ID
   - 初始化数据库

详细配置请参考 [配置指南.md](./配置指南.md)

---

## 📚 文档

### 核心文档
- 📖 [配置指南](./CONFIGURATION.md) - 简明的配置步骤
- 📖 [功能完成度报告](./未完成功能.md) - 功能状态和计划

### 快速参考
- 📖 项目结构：见下方项目结构图
- 📖 API配置：在 `miniprogram/constants/config.js` 中配置
- 📖 功能测试：配置API密钥后即可测试

---

## 🏗️ 项目结构

```
FoodAI/
├── miniprogram/              # 小程序主目录
│   ├── pages/               # 页面
│   │   ├── index/          # 首页（拍照识别、搜索）
│   │   ├── history/        # 历史记录
│   │   ├── detail/         # 详情页
│   │   ├── profile/        # 个人中心
│   │   └── recipe/         # 食谱页
│   ├── services/           # 服务层
│   │   ├── ai-service.js   # AI识别服务（主入口）
│   │   ├── deepseek-service.js  # Deepseek AI服务
│   │   ├── data-service.js # 数据服务
│   │   ├── pay-service.js  # 支付服务
│   │   └── recipe-service.js    # 食谱服务
│   ├── components/         # 组件
│   │   ├── food-card/      # 食物卡片
│   │   ├── nutrition-chart/# 营养图表
│   │   └── pay-wall/       # 付费墙
│   ├── utils/              # 工具函数
│   │   ├── api.js          # API请求
│   │   ├── auth.js         # 认证工具
│   │   └── image.js        # 图片处理
│   └── constants/          # 配置文件
├── CONFIGURATION.md        # 简化配置指南
└── 未完成功能.md           # 功能完成度报告
```

---

## 🔧 技术栈

### 前端
- 微信小程序原生框架
- Vant Weapp UI组件库
- ECharts图表库

### 后端/服务
- Deepseek AI（食物识别和营养分析）
- 百度AI（备选方案）
- 微信云开发（数据存储和云函数）
- 腾讯云函数（个人认证替代方案）

### 工具
- 微信开发者工具
- Node.js
- npm/yarn

---

## 📊 功能完成度

| 功能模块 | 完成度 | 状态 |
|---------|--------|------|
| AI识别 | 90% | ✅ 需配置 |
| 数据服务 | 95% | ✅ 完成 |
| 用户系统 | 70% | ⚠️ 基础 |
| 支付功能 | 85% | ⚠️ 需配置 |
| UI/UX | 95% | ✅ 完成 |

详细信息请查看 [功能完成度报告](./未完成功能.md)

---

## 🎯 使用场景

### 个人用户
- 📱 日常饮食记录
- 📊 营养摄入追踪
- 🍳 健康食谱推荐
- 💪 健身饮食管理

### 健身爱好者
- 🏋️ 精确的营养计算
- 📈 饮食数据分析
- 🎯 目标导向的食谱
- 📝 训练期饮食记录

### 营养师
- 👥 客户饮食记录
- 📊 营养数据分析
- 📋 食谱方案制定
- 📈 效果追踪评估

---

## 🔐 安全说明

### API密钥保护
⚠️ **重要提示**：
- API密钥配置在前端代码中会被暴露
- **生产环境强烈建议使用云函数保护密钥**
- 定期更换API密钥
- 监控API使用情况

### 最佳实践
1. 使用云函数代理API调用
2. 配置请求频率限制
3. 实施用户权限控制
4. 定期备份数据

详细安全配置请参考 [配置指南.md](./配置指南.md)

---

## 🐛 常见问题

### Q: 为什么搜索食物显示"API密钥未配置"？
**A:** 需要在 `config.js` 中配置Deepseek或百度AI的API密钥。

### Q: 支付功能无法使用？
**A:** 支付功能需要：
1. 企业认证小程序
2. 开通微信支付商户号
3. 配置支付参数
4. 部署支付云函数

### Q: 如何切换开发/生产环境？
**A:** 在 `config.js` 中修改 `getEnvConfig()` 函数的返回值。

更多问题请查看 [配置指南.md](./配置指南.md) 的常见问题章节。

---

## 🗺️ 开发路线图

### v1.0.x（当前版本）
- ✅ 核心AI识别功能
- ✅ 基础数据管理
- ✅ 用户界面完善
- ⏳ API密钥配置

### v1.1.0（计划中）
- ⏳ 完善用户认证系统
- ⏳ 高级设置功能
- ⏳ 数据统计分析
- ⏳ 性能优化

### v1.2.0（未来）
- ⏳ 社交分享功能
- ⏳ 多语言支持
- ⏳ 更多AI模型支持
- ⏳ 高级数据可视化

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 贡献方式
1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范
- 遵循项目现有代码风格
- 添加必要的注释
- 更新相关文档
- 确保代码通过测试

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 👥 团队

- **开发团队** - FoodAI Team
- **项目维护** - [您的名字]

---

## 📞 联系我们

- 📧 Email: your-email@example.com
- 💬 微信: your-wechat-id
- 🌐 网站: https://your-website.com

---

## 🙏 致谢

感谢以下开源项目和服务：
- [Deepseek AI](https://platform.deepseek.com/) - AI服务支持
- [百度AI开放平台](https://ai.baidu.com/) - 备选AI服务
- [Vant Weapp](https://vant-contrib.gitee.io/vant-weapp/) - UI组件库
- [微信小程序](https://developers.weixin.qq.com/miniprogram/dev/framework/) - 小程序框架

---

## ⭐ Star History

如果这个项目对您有帮助，请给我们一个 Star ⭐

---

<div align="center">

**[⬆ 回到顶部](#ai轻食记---智能食物识别与营养分析小程序)**

Made with ❤️ by FoodAI Team

</div>
