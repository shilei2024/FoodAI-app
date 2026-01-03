# 百度AI服务集成配置指南

## 概述

本文档指导如何配置和部署百度AI菜品识别云函数，包括API密钥获取、环境变量配置、数据库设置等。

## 第一步：获取百度AI API密钥

### 1. 注册百度AI开放平台
1. 访问 [百度AI开放平台](https://ai.baidu.com/)
2. 使用百度账号登录
3. 完成实名认证（个人或企业）

### 2. 创建应用
1. 进入「控制台」→「应用列表」
2. 点击「创建应用」
3. 填写应用信息：
   - 应用名称：`AI轻食记`
   - 应用类型：`工具类`
   - 应用描述：`基于AI的食物识别与营养分析小程序`
   - 接口选择：勾选「图像识别」→「菜品识别」

### 3. 获取API密钥
创建应用后，在应用详情页获取：
- **API Key**：`xxxxxxxxxxxxxxxxxxxxxxxx`
- **Secret Key**：`xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**重要**：妥善保管这些密钥，不要泄露给他人。

## 第二步：配置云函数环境变量

### 方法一：通过微信开发者工具配置
1. 在微信开发者工具中部署云函数
2. 右键点击 `cloudfunctions/baidu-ai-analyze`
3. 选择「云端函数」→「配置环境变量」
4. 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `BAIDU_AI_API_KEY` | 你的API Key | 百度AI API Key |
| `BAIDU_AI_SECRET_KEY` | 你的Secret Key | 百度AI Secret Key |

### 方法二：通过云开发控制台配置
1. 访问微信云开发控制台
2. 进入「云函数」→「函数管理」
3. 找到 `baidu-ai-analyze` 函数
4. 点击「配置」→「环境变量」
5. 添加上述环境变量

## 第三步：创建数据库集合

### 1. 进入云开发控制台
1. 在微信开发者工具中点击「云开发」
2. 或访问 [云开发控制台](https://console.cloud.tencent.com/tcb)

### 2. 创建集合
需要创建以下两个集合：

#### 集合1：`food_history`（食物识别历史）
**用途**：存储用户的食物识别记录

**索引配置：**
```json
{
  "userId": 1,          // 用户ID索引
  "createTime": -1,     // 时间倒序索引
  "dishName": 1,        // 菜品名称索引
  "date": 1            // 日期索引
}
```

**字段说明：**
- `userId`: 用户标识
- `openid`: 微信openid（自动添加）
- `dishName`: 识别出的菜品名称
- `confidence`: 识别置信度（0-1）
- `calories`: 估算卡路里
- `nutrition`: 营养成分对象
- `imageInfo`: 图片信息
- `createTime`: 创建时间戳
- `status`: 记录状态
- `source`: 数据来源

#### 集合2：`baidu_ai_cache`（百度AI缓存）
**用途**：缓存百度AI access_token，减少API调用

**索引配置：**
```json
{
  "key": 1,            // 缓存键索引
  "expire_time": 1     // 过期时间索引
}
```

**字段说明：**
- `key`: 缓存键（固定为"access_token"）
- `value`: 缓存的值（access_token）
- `expire_time`: 过期时间戳
- `create_time`: 创建时间
- `update_time`: 更新时间

## 第四步：部署云函数

### 1. 本地部署
```bash
# 进入项目目录
cd d:\qinshiji\FoodAI

# 安装依赖（可选，云端会自动安装）
cd cloudfunctions\baidu-ai-analyze
npm install
```

### 2. 通过微信开发者工具部署
1. 在微信开发者工具中
2. 右键点击 `cloudfunctions/baidu-ai-analyze` 文件夹
3. 选择「上传并部署：云端安装依赖」
4. 等待部署完成（首次部署需要几分钟）

### 3. 验证部署
部署完成后，可以通过以下方式验证：

**方法一：健康检查**
```javascript
// 在小程序控制台测试
wx.cloud.callFunction({
  name: 'baidu-ai-analyze',
  data: {
    action: 'healthCheck'
  }
}).then(console.log).catch(console.error)
```

**方法二：获取Token测试**
```javascript
wx.cloud.callFunction({
  name: 'baidu-ai-analyze',
  data: {
    action: 'getToken'
  }
}).then(console.log).catch(console.error)
```

## 第五步：集成到小程序

### 1. 更新AI服务
修改 `miniprogram/services/ai-service.js`，使用新的云函数：

```javascript
// 使用百度AI云函数进行食物识别
async function recognizeFoodWithBaiduAI(imageBase64, options = {}) {
  try {
    const result = await wx.cloud.callFunction({
      name: 'baidu-ai-analyze',
      data: {
        action: 'analyzeFood',
        data: {
          image: imageBase64,
          userId: options.userId,
          imageInfo: options.imageInfo
        }
      }
    })
    
    return result
  } catch (error) {
    console.error('百度AI识别失败:', error)
    throw error
  }
}
```

### 2. 更新首页调用
修改 `miniprogram/pages/index/index.js` 中的图片处理逻辑：

```javascript
// 处理图片识别
async function processImageForRecognition(imagePath) {
  try {
    // 1. 获取图片Base64
    const base64 = await imageProcessor.getImageBase64(imagePath)
    
    // 2. 调用百度AI识别
    const result = await recognizeFoodWithBaiduAI(base64, {
      imageInfo: {
        width: 800,
        height: 600,
        size: fileSize,
        format: 'jpg'
      }
    })
    
    // 3. 处理识别结果
    if (result.success) {
      this.showRecognitionResult(imagePath, result.data)
    } else {
      throw new Error(result.message)
    }
    
  } catch (error) {
    console.error('图片识别处理失败:', error)
    throw error
  }
}
```

## 第六步：测试与验证

### 1. 功能测试
测试以下场景：
- ✅ 正常图片识别
- ✅ 多种食物识别
- ✅ 识别结果解析
- ✅ 数据库保存
- ✅ 错误处理

### 2. 性能测试
- 响应时间：应在3秒内完成
- 并发处理：测试同时多个请求
- 内存使用：监控云函数内存使用

### 3. 错误测试
- 无效图片数据
- 网络超时
- API密钥错误
- 数据库连接失败

## 常见问题排查

### Q1: 云函数部署失败
**可能原因：**
1. 依赖安装失败
2. 代码语法错误
3. 权限不足

**解决方案：**
1. 检查 `package.json` 配置
2. 查看部署日志
3. 确保有云开发环境权限

### Q2: API调用返回权限错误
**可能原因：**
1. API密钥未配置
2. 密钥格式错误
3. 百度AI服务未开通

**解决方案：**
1. 检查环境变量配置
2. 验证API密钥是否正确
3. 确认百度AI服务已开通

### Q3: 数据库保存失败
**可能原因：**
1. 集合未创建
2. 权限设置问题
3. 网络连接问题

**解决方案：**
1. 确认集合已创建
2. 检查数据库权限
3. 查看云函数日志

### Q4: 识别准确率低
**可能原因：**
1. 图片质量差
2. 食物不常见
3. 光线条件不好

**解决方案：**
1. 优化图片质量
2. 提供多角度图片
3. 改善拍摄条件

## 安全建议

### 1. API密钥安全
- 定期轮换API密钥
- 使用环境变量存储
- 不在客户端代码中暴露

### 2. 访问控制
- 限制API调用频率
- 验证用户身份
- 记录操作日志

### 3. 数据保护
- 加密敏感数据
- 定期备份数据库
- 遵守隐私政策

## 监控与维护

### 1. 监控指标
- API调用成功率
- 平均响应时间
- 错误率统计
- 数据库性能

### 2. 日志管理
- 启用云函数日志
- 定期清理旧日志
- 设置日志告警

### 3. 定期维护
- 每月检查API密钥
- 季度性数据库优化
- 半年一次安全审计

## 成本估算

### 1. 百度AI服务
- 免费额度：每日500次调用
- 超出部分：按量计费，价格低廉
- 详细计费：参考百度AI定价页面

### 2. 微信云开发
- 免费额度：每月一定量的调用和存储
- 资源包：可根据需求购买
- 详细计费：参考微信云开发定价

## 支持与联系

### 技术支持
- 微信云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- 百度AI文档：https://ai.baidu.com/ai-doc
- 项目GitHub：如有问题可提交Issue

### 联系方式
- 项目维护团队：FoodAI Team
- 问题反馈：通过GitHub Issues
- 紧急支持：根据实际项目情况确定

---

**配置完成提示**：完成以上所有步骤后，您的百度AI菜品识别服务应该可以正常工作了。建议进行全面的测试，确保所有功能正常运行。
