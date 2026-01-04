# API密钥配置指南

## 问题分析

您遇到了手机预览无法使用的问题，主要原因是：

1. **API密钥暴露问题**：您将API密钥从代码中移除是正确的安全考虑
2. **运行模式问题**：代码默认使用"直接调用模式"，但您配置了云函数环境变量
3. **域名白名单问题**：手机预览需要配置服务器域名

## 三种配置方案

### 方案一：开发环境配置（快速测试）

**适用场景**：开发测试、个人项目

**步骤：**

1. **在 config.js 中配置API密钥**：
   ```javascript
   // miniprogram/constants/config.js
   baiduAI: {
     apiKey: '您的百度AI API Key',
     secretKey: '您的百度AI Secret Key',
   },
   deepseekAI: {
     apiKey: '您的Deepseek API Key',
   }
   ```

2. **配置运行模式为直接调用**：
   ```javascript
   features: {
     aiRecognition: {
       mode: 'direct', // 使用直接调用模式
       // ...
     }
   }
   ```

3. **在微信公众平台配置服务器域名**：
   - `https://aip.baidubce.com`
   - `https://api.deepseek.com`

**优点**：配置简单，快速测试
**缺点**：API密钥暴露在前端代码中

### 方案二：生产环境配置（推荐）

**适用场景**：正式上线、商业项目

**步骤：**

1. **配置云函数环境变量**（您已经做了）：
   - `BAIDU_AI_API_KEY`
   - `BAIDU_AI_SECRET_KEY`
   - `DEEPSEEK_API_KEY`

2. **修改运行模式为安全模式**：
   ```javascript
   features: {
     aiRecognition: {
       mode: 'secure', // 使用云函数安全模式
       // ...
     }
   }
   ```

3. **确保云函数已部署**：
   ```bash
   # 部署百度AI云函数
   cd cloudfunctions/baidu-ai
   npm install
   # 在微信开发者工具中上传云函数
   ```

4. **配置云环境ID**：
   ```javascript
   cloud: {
     env: '您的云环境ID',
   }
   ```

**优点**：API密钥安全，符合生产环境要求
**缺点**：需要配置云函数

### 方案三：混合模式（灵活配置）

**适用场景**：需要灵活切换环境

**步骤：**

1. **根据环境自动切换**：
   ```javascript
   features: {
     aiRecognition: {
       mode: 'auto', // 自动判断
       development: {
         useDirectMode: true, // 开发环境用直接调用
       },
       production: {
         useSecureMode: true, // 生产环境用云函数
       }
     }
   }
   ```

2. **配置环境变量**：
   ```javascript
   debug: {
     enabled: true, // true: 开发环境, false: 生产环境
   }
   ```

## 具体操作步骤

### 第一步：检查当前配置

1. 打开 `miniprogram/constants/config.js`
2. 检查以下配置：
   - `baiduAI.apiKey` 和 `baiduAI.secretKey`（如果使用百度AI）
   - `deepseekAI.apiKey`（如果使用Deepseek）
   - `features.aiRecognition.mode`
   - `cloud.env`

### 第二步：选择配置方案

根据您的需求选择：

- **只想快速测试**：使用方案一
- **准备正式上线**：使用方案二
- **需要灵活切换**：使用方案三

### 第三步：修改配置

根据选择的方案修改 `config.js`：

```javascript
// 方案一：开发环境
features: {
  aiRecognition: {
    mode: 'direct',
    // ...
  }
}

// 方案二：生产环境  
features: {
  aiRecognition: {
    mode: 'secure',
    // ...
  }
}

// 方案三：混合模式
features: {
  aiRecognition: {
    mode: 'auto',
    development: {
      useDirectMode: true,
    },
    production: {
      useSecureMode: true,
    }
  }
}
```

### 第四步：测试验证

1. **开发环境测试**：
   ```bash
   # 修改为开发环境
   debug: {
     enabled: true,
   }
   ```

2. **生产环境测试**：
   ```bash
   # 修改为生产环境
   debug: {
     enabled: false,
   }
   ```

## 常见问题解决

### Q1: 手机预览提示"request:fail url not in domain list"
**原因**：未配置服务器域名
**解决**：在微信公众平台配置 `https://aip.baidubce.com` 和 `https://api.deepseek.com`

### Q2: 云函数调用失败
**原因**：云函数未部署或环境变量未配置
**解决**：
1. 部署云函数：`cloudfunctions/baidu-ai`
2. 配置环境变量：`BAIDU_AI_API_KEY` 和 `BAIDU_AI_SECRET_KEY`

### Q3: API密钥应该放在哪里？
**安全建议**：
- 开发环境：可以放在 `config.js` 中（需要配置服务器域名）
- 生产环境：必须放在云函数环境变量中

### Q4: 如何切换运行模式？
**方法**：
1. 修改 `config.js` 中的 `features.aiRecognition.mode`
2. 可选值：`direct`、`secure`、`auto`

## 最佳实践建议

1. **开发阶段**：
   - 使用方案一（直接调用+配置域名）
   - 快速测试功能

2. **测试阶段**：
   - 使用方案三（混合模式）
   - 测试不同环境的兼容性

3. **生产环境**：
   - 必须使用方案二（云函数安全模式）
   - 确保API密钥安全

4. **安全注意事项**：
   - 不要将API密钥提交到Git仓库
   - 生产环境必须使用云函数保护密钥
   - 定期更换API密钥

## 配置检查清单

- [ ] 选择了合适的配置方案
- [ ] 修改了 `config.js` 中的运行模式
- [ ] 配置了服务器域名（如果使用直接调用模式）
- [ ] 部署了云函数（如果使用安全模式）
- [ ] 配置了云函数环境变量
- [ ] 测试了开发环境功能
- [ ] 测试了生产环境功能

通过以上配置，您应该能解决手机预览无法使用的问题，并确保API密钥的安全性。
