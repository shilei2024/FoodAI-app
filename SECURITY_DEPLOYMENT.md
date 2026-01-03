# 安全性加固部署指南

本文档指导如何部署安全性加固功能，保护API密钥并提供完整的请求频率限制。

## 概述

通过部署云函数代理，您可以：
1. **保护API密钥**：不再暴露在小程序代码中
2. **实现频率限制**：防止API滥用
3. **完善错误处理**：统一的错误日志和监控
4. **支持降级策略**：AI服务不可用时使用本地数据

## 部署步骤

### 1. 环境准备

#### 1.1 开通微信云开发
1. 在微信开发者工具中，点击"云开发"
2. 开通云开发服务（需要已认证小程序）
3. 创建云环境，获取环境ID
4. 记录环境ID：`cloud1-xxxxxxxx`

#### 1.2 获取Deepseek API密钥
1. 访问 [Deepseek平台](https://platform.deepseek.com/)
2. 注册/登录账号
3. 创建API密钥
4. 复制密钥：`sk-xxxxxxxxxxxxxxxx`

### 2. 部署云函数

#### 2.1 部署 http-proxy 云函数
```bash
# 在微信开发者工具中：
# 1. 右键 cloudfunctions/http-proxy 目录
# 2. 选择"上传并部署：云端安装依赖"
# 3. 等待部署完成
```

#### 2.2 部署 deepseek-proxy 云函数
```bash
# 同样方式部署 deepseek-proxy 云函数
```

#### 2.3 部署 init-database 云函数
```bash
# 部署 init-database 云函数
```

### 3. 配置环境变量

在云开发控制台中配置环境变量：

#### 3.1 deepseek-proxy 云函数
- `DEEPSEEK_API_KEY`: `sk-xxxxxxxxxxxxxxxx` (您的Deepseek API密钥)

#### 3.2 http-proxy 云函数
- `NODE_ENV`: `production` (生产环境)

### 4. 初始化数据库

#### 4.1 运行初始化脚本
```javascript
// 在小程序控制台运行
wx.cloud.callFunction({
  name: 'init-database',
  data: {
    action: 'init'
  }
}).then(console.log).catch(console.error)
```

#### 4.2 验证集合创建
检查以下集合是否创建成功：
- `api_usage` - API使用记录
- `error_logs` - 错误日志
- `http_proxy_logs` - HTTP代理日志
- `rate_limit_cache` - 频率限制缓存

### 5. 配置小程序

#### 5.1 更新 config.js
```javascript
// miniprogram/constants/config.js
cloud: {
  env: 'cloud1-xxxxxxxx', // 替换为您的环境ID
  traceUser: true
},

features: {
  aiRecognition: {
    useSecureMode: true, // 启用安全模式
    // ... 其他配置
  }
}
```

#### 5.2 测试安全模式
```javascript
// 测试健康检查
const aiService = require('./services/ai-service.js')
aiService.healthCheck().then(console.log)

// 测试食物识别（安全模式）
aiService.recognizeFood('图片路径').then(console.log)
```

### 6. 监控和维护

#### 6.1 监控指标
- **API使用量**：查看 `api_usage` 集合
- **错误率**：查看 `error_logs` 集合
- **响应时间**：监控云函数执行时间

#### 6.2 定期维护
1. **清理旧数据**（每月）：
```javascript
wx.cloud.callFunction({
  name: 'init-database',
  data: {
    action: 'cleanup',
    days: 30
  }
})
```

2. **检查API密钥**（每季度）：
   - 轮换Deepseek API密钥
   - 更新云函数环境变量

3. **优化频率限制**（根据使用情况调整）：
   - 调整免费用户每日限制
   - 优化VIP用户权益

### 7. 故障排除

#### 7.1 常见问题

**Q: 云函数调用失败**
```
错误：云函数调用失败
```
**解决方案：**
1. 检查云环境ID是否正确配置
2. 确认云函数已部署成功
3. 查看云函数日志

**Q: API密钥无效**
```
错误：Deepseek API密钥未配置
```
**解决方案：**
1. 检查云函数环境变量 `DEEPSEEK_API_KEY`
2. 确认API密钥格式正确
3. 验证API密钥是否有余额

**Q: 频率限制过严**
```
错误：今日使用次数已达上限
```
**解决方案：**
1. 调整 `cloudfunctions/deepseek-proxy/index.js` 中的频率限制配置
2. 考虑用户反馈和使用情况

#### 7.2 日志查看
1. **云函数日志**：在云开发控制台查看
2. **数据库日志**：查看 `error_logs` 集合
3. **前端日志**：小程序控制台

### 8. 安全建议

#### 8.1 生产环境最佳实践
1. **启用HTTPS**：确保所有请求使用HTTPS
2. **限制域名**：在http-proxy中配置域名白名单
3. **监控异常**：设置异常请求告警
4. **定期审计**：审查API使用情况和费用

#### 8.2 数据保护
1. **用户数据隔离**：确保用户只能访问自己的数据
2. **敏感信息加密**：加密存储敏感信息
3. **访问日志记录**：记录所有API访问

#### 8.3 性能优化
1. **缓存策略**：合理使用缓存减少API调用
2. **连接池管理**：优化数据库连接
3. **异步处理**：耗时操作使用异步处理

### 9. 回滚方案

如果安全模式出现问题，可以回退到直接调用模式：

#### 9.1 临时切换
```javascript
// 切换到直接调用模式
const aiService = require('./services/ai-service.js')
aiService.setMode(false)
```

#### 9.2 配置回退
```javascript
// config.js 中关闭安全模式
features: {
  aiRecognition: {
    useSecureMode: false,
    // ...
  }
}
```

### 10. 联系支持

如有问题，请参考：
1. **微信云开发文档**：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
2. **Deepseek API文档**：https://platform.deepseek.com/docs
3. **项目GitHub**：提交Issue获取支持

## 总结

完成以上部署后，您的AI轻食记小程序将具备：
- ✅ API密钥安全保护
- ✅ 请求频率限制
- ✅ 完善的错误处理
- ✅ 监控和日志系统
- ✅ 降级策略保障可用性

建议在生产环境全面启用安全模式，确保服务稳定和数据安全。
