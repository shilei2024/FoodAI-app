# AI轻食记 - 配置指南

## 概述

本文档提供完整的配置指南，帮助您快速设置和运行AI轻食记小程序。

## 快速开始（5分钟配置）

### 1. 复制本地配置文件

```bash
# 进入项目目录
cd miniprogram/constants/

# 复制示例配置文件
cp config.local.example.js config.local.js
```

### 2. 配置AI服务（必需）

#### 方案A：使用Deepseek AI（推荐）
1. 访问 [Deepseek平台](https://platform.deepseek.com/) 注册并获取API密钥
2. 在 `config.local.js` 中配置：
```javascript
deepseekAI: {
  apiKey: 'sk-your-actual-api-key-here', // 替换为您的Deepseek API密钥
}
```

#### 方案B：使用百度AI（备选）
1. 访问 [百度AI开放平台](https://ai.baidu.com/) 注册并创建应用
2. 在 `config.local.js` 中配置：
```javascript
baiduAI: {
  apiKey: 'your-baidu-api-key',
  secretKey: 'your-baidu-secret-key',
}
```

### 3. 配置小程序AppID

在 `config.local.js` 中配置您的小程序AppID：
```javascript
payment: {
  wechatPay: {
    appId: 'your-appid', // 替换为您的小程序AppID
  }
}
```

### 4. 测试功能

1. 在微信开发者工具中打开项目
2. 首页搜索"苹果"测试AI识别
3. 尝试拍照识别功能

## 完整配置说明

### 配置文件结构

项目采用三层配置结构：

1. **`config.base.js`** - 基础配置（可提交到Git）
   - 包含所有非敏感配置
   - 功能开关、UI设置、默认值等

2. **`config.local.js`** - 本地配置（不提交到Git）
   - 包含所有敏感信息
   - API密钥、AppID、环境ID等
   - 从 `config.local.example.js` 复制创建

3. **`config.js`** - 主配置文件
   - 自动合并基础配置和本地配置
   - 提供环境特定配置

### 敏感信息管理

#### 为什么需要本地配置文件？

1. **安全性**：API密钥等敏感信息不提交到版本控制
2. **团队协作**：每个开发者使用自己的配置
3. **环境隔离**：开发、测试、生产环境使用不同配置

#### 如何管理本地配置？

```bash
# 首次设置
cp config.local.example.js config.local.js
# 编辑 config.local.js 填写您的配置

# 确保本地配置不被提交
echo "miniprogram/constants/config.local.js" >> .gitignore
```

### 环境配置

#### 切换环境

在 `config.js` 中修改 `getEnvConfig()` 函数：

```javascript
function getEnvConfig() {
  // 可选值: 'development', 'testing', 'production'
  const env = 'development' // 修改这里切换环境
  return envConfig[env] || envConfig.development
}
```

#### 环境差异

| 环境 | 调试模式 | 日志级别 | 支付测试模式 |
|------|----------|----------|--------------|
| 开发环境 | 启用 | debug | 启用 |
| 测试环境 | 启用 | info | 启用 |
| 生产环境 | 禁用 | error | 禁用 |

### 运行模式

#### 直接调用模式（开发环境）
- API密钥配置在 `config.local.js` 中
- 需要在小程序后台配置服务器域名
- 适合快速开发和测试

#### 云函数模式（生产环境）
- API密钥配置在云函数环境变量中
- 不需要配置服务器域名
- 适合正式上线

#### 自动模式
- 根据环境自动选择运行模式
- 开发环境使用直接调用
- 生产环境使用云函数

## 常见问题

### Q1: 配置完成后功能仍无法使用？
**检查步骤：**
1. 确认 `config.local.js` 文件已创建并正确配置
2. 检查控制台是否有错误信息
3. 确认API密钥是否有余额或权限

### Q2: 如何切换AI服务？
**方法：**
1. 在 `config.local.js` 中配置相应的API密钥
2. 系统会自动检测可用的AI服务
3. 优先使用百度AI，其次使用Deepseek

### Q3: 支付功能无法使用？
**原因：**
1. 需要企业认证的小程序
2. 需要开通微信支付商户号
3. 需要配置支付参数

### Q4: 如何保护API密钥？
**安全建议：**
1. 开发环境：使用直接调用模式，定期更换密钥
2. 生产环境：必须使用云函数模式保护密钥
3. 监控API使用情况，设置使用限额

## 高级配置

### 云开发配置

如果需要使用微信云开发：

1. 在微信开发者工具中开通云开发
2. 获取云环境ID
3. 在 `config.local.js` 中配置：
```javascript
cloud: {
  env: 'your-cloud-env-id',
}
```

### 第三方服务集成

#### 统计服务
```javascript
thirdParty: {
  analytics: {
    baidu: {
      enabled: true,
      key: 'your-baidu-analytics-key'
    }
  }
}
```

#### 地图服务
```javascript
map: {
  qq: {
    enabled: true,
    key: 'your-qq-map-key'
  }
}
```

## 配置检查清单

- [ ] 复制 `config.local.example.js` 为 `config.local.js`
- [ ] 配置至少一个AI服务的API密钥
- [ ] 配置小程序AppID
- [ ] 测试基础功能（搜索、拍照识别）
- [ ] 确认 `.gitignore` 包含 `config.local.js`
- [ ] 根据需求配置云开发环境
- [ ] 根据环境设置调试模式

## 技术支持

- 项目文档：README.md
- 问题反馈：GitHub Issues
- Deepseek文档：https://platform.deepseek.com/docs
- 百度AI文档：https://ai.baidu.com/docs
- 微信小程序文档：https://developers.weixin.qq.com/miniprogram/dev/framework/

配置完成后即可开始开发和测试AI轻食记小程序！
