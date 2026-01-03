# AI轻食记 - 配置指南

本文档提供简明的配置步骤，让您快速启动FoodAI小程序。

## 快速开始（5分钟）

### 1. 基础配置
```javascript
// miniprogram/constants/config.js
payment: {
  wechatPay: {
    appId: 'your-appid', // 替换为您的小程序AppID
  }
}
```

### 2. AI服务配置（必需）
**推荐使用Deepseek AI：**

1. 访问 [Deepseek平台](https://platform.deepseek.com/) 获取API密钥
2. 在 `config.js` 中配置：
```javascript
deepseekAI: {
  apiKey: 'sk-your-actual-api-key-here', // 替换为您的密钥
  baseURL: 'https://api.deepseek.com/v1',
}
```

### 3. 测试功能
1. 在微信开发者工具中打开项目
2. 首页搜索"苹果"测试AI识别
3. 尝试拍照识别功能

## 完整配置

### 可选功能配置

#### 支付功能（需企业认证）
```javascript
payment: {
  wechatPay: {
    appId: 'your-appid',
    mchId: 'your-mch-id',
    apiKey: 'your-api-key',
  }
}
```

#### 云开发配置
```javascript
cloud: {
  env: 'your-cloud-env-id',
  traceUser: true
}
```

## 常见问题

### Q1: API密钥未配置？
**A:** 需要在 `config.js` 中配置Deepseek API密钥。

### Q2: 支付功能无法使用？
**A:** 支付需要企业认证小程序和微信支付商户号。

### Q3: 如何保护API密钥？
**A:** 生产环境建议使用云函数保护密钥。

## 安全性加固（生产环境必需）

### 为什么需要安全性加固？
当前配置中，API密钥直接暴露在小程序代码中，存在安全风险。生产环境必须部署安全性加固。

### 安全部署步骤
1. **部署云函数**：参考 `SECURITY_DEPLOYMENT.md`
2. **配置环境变量**：在云函数中设置API密钥
3. **启用安全模式**：在 `config.js` 中设置 `useSecureMode: true`

### 安全功能包括：
- ✅ API密钥保护（不再暴露在前端）
- ✅ 请求频率限制（防止滥用）
- ✅ 错误监控和日志
- ✅ 降级策略（AI服务不可用时使用本地数据）

## 安全提示
⚠️ **生产环境必需**：
1. 必须部署云函数保护API密钥
2. 定期更换API密钥（每季度）
3. 监控API使用情况和费用
4. 设置异常请求告警

## 技术支持
- 项目文档：README.md
- 安全部署：SECURITY_DEPLOYMENT.md
- Deepseek文档：https://platform.deepseek.com/docs
- 微信云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html

配置完成后即可体验完整且安全的AI食物识别和营养分析功能！
