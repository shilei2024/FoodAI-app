# Deepseek API集成配置指南

## 概述

本文档指导如何配置和使用Deepseek API进行食物识别和营养分析。由于暂时无法使用云函数环境变量，API密钥将直接配置在小程序代码中。

## 安全警告

⚠️ **重要安全提示**：
- API密钥会暴露在小程序代码中
- 任何人都可以通过反编译小程序获取API密钥
- 建议在生产环境中使用云函数保护API密钥
- 定期轮换API密钥以减少风险

## 配置步骤

### 1. 获取Deepseek API密钥

1. 访问 [Deepseek平台](https://platform.deepseek.com/)
2. 注册并登录账号
3. 进入API密钥管理页面
4. 创建新的API密钥
5. 复制生成的API密钥（格式：`sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）

### 2. 配置API密钥

打开 `miniprogram/constants/config.js` 文件，找到以下配置部分：

```javascript
// Deepseek AI配置
deepseekAI: {
  // 注意：API密钥会暴露在小程序代码中，建议在生产环境使用云函数保护密钥
  // 请访问 https://platform.deepseek.com/ 获取您的API Key
  apiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // 请替换为您的Deepseek API Key
  baseURL: 'https://api.deepseek.com/v1',
  // ... 其他配置
}
```

将 `apiKey` 的值替换为您实际的Deepseek API密钥。

### 3. 验证配置

配置完成后，可以通过以下方式验证：

1. **检查配置语法**：确保JSON格式正确
2. **测试API调用**：使用测试页面验证API连接
3. **查看控制台日志**：检查是否有配置错误

## 功能说明

### 1. 食物识别（拍照）

**流程**：
1. 用户拍照或选择图片
2. 系统生成图片描述（模拟）
3. 调用Deepseek API分析食物
4. 返回结构化营养数据

**API调用**：
- 使用 `deepseek-service.js` 中的 `analyzeFoodFromImage` 方法
- 系统提示词已优化为食物识别和营养分析

### 2. 食物搜索（文字）

**流程**：
1. 用户输入食物名称（可包含重量）
2. 调用Deepseek API搜索食物信息
3. 返回结构化营养数据

**API调用**：
- 使用 `deepseek-service.js` 中的 `searchFoodInfo` 方法
- 支持重量提取功能

### 3. 营养分析

**返回的数据结构**：
```json
{
  "foodName": "食物名称",
  "confidence": 0.95,
  "description": "食物描述",
  "calorie": 100,
  "nutrition": {
    "protein": 10.5,
    "fat": 5.2,
    "carbohydrate": 20.3,
    "fiber": 2.1,
    "vitamin": 15.0,
    "mineral": 8.5,
    "calcium": 50.0,
    "iron": 1.2,
    "zinc": 0.8
  },
  "healthScore": 85,
  "suggestions": ["建议1", "建议2", "建议3"],
  "tags": ["标签1", "标签2"]
}
```

## 错误处理

### 常见错误及解决方案

1. **API密钥错误**
   - 症状：`401 Unauthorized` 错误
   - 解决：检查API密钥是否正确配置

2. **网络连接错误**
   - 症状：`Network request failed` 错误
   - 解决：检查网络连接，确保可以访问Deepseek API

3. **API限制错误**
   - 症状：`429 Too Many Requests` 错误
   - 解决：降低请求频率，检查API使用限额

4. **JSON解析错误**
   - 症状：`JSON parse error` 错误
   - 解决：检查API响应格式，系统有备用解析方案

### 降级策略

当Deepseek API不可用时，系统会自动降级：
1. 首先尝试使用内置食物数据库
2. 最后使用模拟数据

## 性能优化

### 1. 缓存策略
- API响应缓存5分钟
- 减少重复请求

### 2. 请求优化
- 合并营养信息请求
- 使用合适的超时设置（默认30秒）

### 3. 数据压缩
- 图片压缩后再处理
- 减少传输数据量

## 测试方法

### 1. 单元测试
运行测试页面验证功能：
1. 在首页开启调试模式
2. 点击"功能测试"按钮
3. 运行重量提取测试

### 2. 集成测试
1. 拍照识别测试
2. 文字搜索测试
3. 营养数据显示测试

### 3. 性能测试
1. API响应时间测试
2. 图片处理性能测试
3. 内存使用测试

## 监控和日志

### 1. 错误监控
- API调用错误记录
- 网络错误记录
- 解析错误记录

### 2. 性能监控
- API响应时间
- 图片处理时间
- 内存使用情况

### 3. 使用统计
- API调用次数
- 识别成功率
- 用户使用模式

## 升级和维护

### 1. API密钥轮换
- 建议每月轮换API密钥
- 旧密钥保留一段时间用于平滑过渡

### 2. 系统提示词优化
- 根据使用反馈优化提示词
- 定期更新营养数据标准

### 3. 功能扩展
- 支持更多食物类型
- 添加更多营养元素
- 优化健康评分算法

## 故障排除

### 1. API无法连接
1. 检查网络连接
2. 验证API密钥
3. 检查Deepseek服务状态

### 2. 识别准确率低
1. 优化图片质量
2. 调整系统提示词
3. 添加更多训练数据

### 3. 性能问题
1. 优化图片压缩参数
2. 增加缓存策略
3. 减少不必要的API调用

## 联系支持

如有问题，请联系：
- 技术支持：tech-support@foodai.com
- API问题：api-support@deepseek.com
- 紧急问题：emergency@foodai.com

## 版本历史

### v1.0.0 (2024-01-01)
- 初始版本
- Deepseek API集成
- 食物识别和搜索功能
- 营养分析功能

### v1.1.0 (计划中)
- 图片识别API集成
- 更多营养元素支持
- 性能优化
