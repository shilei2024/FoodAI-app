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

2. **运行设置脚本**
```bash
# Windows 用户
setup.bat

# Linux/Mac 用户
chmod +x setup.sh
./setup.sh
```

3. **配置本地文件**
   - 按照脚本提示创建 `config.local.js`
   - 配置您的API密钥和小程序AppID

4. **安装依赖**
```bash
npm install
```

5. **打开项目**
   在微信开发者工具中打开项目目录。

6. **开始使用**
   - 首页搜索"苹果"测试功能
   - 尝试拍照识别
   - 查看历史记录

---

## 📋 配置指南

### 快速配置（推荐）
使用项目提供的设置脚本，5分钟完成配置：

```bash
# Windows
setup.bat

# Linux/Mac
./setup.sh
```

### 手动配置
1. **复制配置文件**
```bash
cd miniprogram/constants
cp config.local.example.js config.local.js
```

2. **配置AI服务**
   - Deepseek AI：获取API密钥并配置
   - 或百度AI：获取API Key和Secret Key

3. **配置小程序AppID**
   在 `config.local.js` 中配置您的小程序AppID

详细配置请参考 [配置指南](./CONFIGURATION_GUIDE.md)

---

## 📚 文档

### 核心文档
- 📖 [配置指南](./CONFIGURATION_GUIDE.md) - 完整的配置步骤和说明
- 📖 [功能完成度报告](./未完成功能.md) - 功能状态和计划

### 快速参考
- 📖 项目结构：见下方项目结构图
- 📖 配置文件：三层配置结构（基础+本地+环境）
- 📖 功能测试：配置API密钥后即可测试

---

## 🏗️ 项目结构

```
FoodAI/
├── miniprogram/              # 小程序主目录
│   ├── constants/           # 配置文件
│   │   ├── config.base.js   # 基础配置（可提交Git）
│   │   ├── config.local.example.js  # 本地配置示例
│   │   ├── config.js        # 主配置文件（自动合并）
│   │   └── config.local.js  # 本地配置（不提交Git）
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
├── cloudfunctions/         # 云函数目录
├── CONFIGURATION_GUIDE.md  # 完整配置指南
├── setup.sh               # 设置脚本（Linux/Mac）
├── setup.bat              # 设置脚本（Windows）
└── .gitignore             # Git忽略配置
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

### 配置安全
✅ **三层配置结构**：
1. `config.base.js` - 基础配置（可提交Git）
2. `config.local.js` - 本地配置（不提交Git）
3. `config.js` - 自动合并配置

### API密钥保护
⚠️ **重要提示**：
- 本地配置文件已添加到 `.gitignore`
- 生产环境建议使用云函数保护密钥
- 定期更换API密钥
- 监控API使用情况

### 最佳实践
1. 使用设置脚本快速配置
2. 开发环境使用直接调用模式
3. 生产环境使用云函数模式
4. 定期备份数据

---

## 🐛 常见问题

### Q: 如何快速开始？
**A:** 运行设置脚本：`setup.bat`（Windows）或 `./setup.sh`（Linux/Mac）

### Q: API密钥应该放在哪里？
**A:** 放在 `miniprogram/constants/config.local.js` 中，此文件不提交到Git

### Q: 如何切换开发/生产环境？
**A:** 在 `config.js` 中修改 `getEnvConfig()` 函数的返回值

### Q: 支付功能无法使用？
**A:** 支付功能需要：
1. 企业认证小程序
2. 开通微信支付商户号
3. 配置支付参数
4. 部署支付云函数

更多问题请查看 [配置指南](./CONFIGURATION_GUIDE.md) 的常见问题章节。

---

## 🗺️ 开发路线图

### v1.0.x（当前版本）
- ✅ 核心AI识别功能
- ✅ 基础数据管理
- ✅ 用户界面完善
- ✅ 配置系统优化

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