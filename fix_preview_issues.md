# 解决手机预览无法使用的问题

## 问题分析
模拟器可以使用但手机预览无法使用，主要原因是：

### 1. 域名白名单限制（最主要原因）
微信小程序在真机环境中对网络请求有严格的域名白名单限制。模拟器中开发者工具会放宽限制，但真机预览必须配置合法域名。

**需要配置的域名：**
- `aip.baidubce.com` - 百度AI API
- `api.deepseek.com` - Deepseek API
- 其他第三方API域名

### 2. 云开发环境配置
云环境 `cloud1-9g3r4c7s10dc06ca` 可能：
- 不存在
- 未开通云开发
- 云函数未部署

### 3. 权限配置
某些功能需要特定的权限配置才能在真机中使用。

## 解决方案

### 方案一：配置服务器域名（推荐）
在微信公众平台配置服务器域名：

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入「开发」->「开发管理」->「开发设置」
3. 在「服务器域名」中配置：

**request合法域名：**
```
https://aip.baidubce.com
https://api.deepseek.com
```

**uploadFile合法域名：**
```
https://aip.baidubce.com
```

**downloadFile合法域名：**
```
https://aip.baidubce.com
```

### 方案二：使用云函数代理（更安全）
将API调用改为通过云函数代理，避免域名白名单限制：

1. **部署云函数**：
   ```bash
   # 部署百度AI代理云函数
   cd cloudfunctions/baidu-ai
   npm install
   # 在微信开发者工具中上传云函数
   ```

2. **修改AI服务配置**：
   在 `miniprogram/constants/config.js` 中：
   ```javascript
   features: {
     aiRecognition: {
       useSecureMode: true, // 启用安全模式（使用云函数）
       // ...
     }
   }
   ```

### 方案三：临时解决方案（开发测试）
在开发阶段，可以临时修改配置：

1. **禁用云开发初始化**：
   在 `miniprogram/app.js` 中注释云开发初始化：
   ```javascript
   initCloud() {
     try {
       // 临时注释云开发初始化
       /*
       if (wx.cloud) {
         wx.cloud.init({
           env: 'cloud1-9g3r4c7s10dc06ca',
           traceUser: true
         })
         console.log('云开发初始化成功')
         this.cloud = wx.cloud
         this.initCloudDatabase()
       } else {
         console.warn('当前版本不支持云开发')
       }
       */
       console.log('云开发已禁用（开发模式）')
     } catch (error) {
       console.error('云开发初始化失败:', error)
     }
   }
   ```

2. **使用直接调用模式**：
   确保 `miniprogram/constants/config.js` 中：
   ```javascript
   features: {
     aiRecognition: {
       useSecureMode: false, // 使用直接调用模式
       // ...
     }
   }
   ```

### 方案四：检查并修复权限配置
在 `miniprogram/app.json` 中确保必要的权限：

```json
{
  "requiredPrivateInfos": [
    "getLocation",
    "chooseLocation",
    "chooseAddress"
  ],
  "permission": {
    "scope.userLocation": {
      "desc": "您的位置信息将用于获取附近的美食推荐"
    }
  }
}
```

## 实施步骤

### 第一步：立即修复（快速测试）
1. 禁用云开发初始化（方案三）
2. 确保使用直接调用模式
3. 重新编译并预览

### 第二步：长期解决方案
1. 在微信公众平台配置服务器域名（方案一）
2. 或者部署云函数代理（方案二）
3. 重新启用云开发功能

### 第三步：验证修复
1. 在模拟器中测试功能
2. 使用手机预览测试
3. 检查控制台错误信息

## 常见错误及解决方法

### 错误1：`request:fail url not in domain list`
**原因**：请求的域名不在白名单中
**解决**：配置服务器域名（方案一）

### 错误2：`cloud init error`
**原因**：云环境配置错误
**解决**：
1. 检查云环境ID是否正确
2. 确保已开通云开发
3. 或者暂时禁用云开发（方案三）

### 错误3：`permission denied`
**原因**：缺少必要的权限
**解决**：在app.json中配置权限（方案四）

### 错误4：`network timeout`
**原因**：网络请求超时
**解决**：
1. 检查网络连接
2. 增加超时时间配置
3. 使用更稳定的API服务

## 测试建议

1. **分步测试**：
   - 先测试基础功能（如页面加载）
   - 再测试网络请求功能
   - 最后测试AI识别功能

2. **错误收集**：
   - 在手机上开启调试模式
   - 查看控制台错误信息
   - 根据具体错误针对性解决

3. **渐进式修复**：
   - 先让基础功能正常工作
   - 再逐步启用高级功能
   - 最后优化性能和体验

## 注意事项

1. **生产环境**：必须配置服务器域名或使用云函数
2. **API密钥安全**：生产环境建议使用云函数保护API密钥
3. **用户体验**：真机环境要考虑网络状况和性能
4. **兼容性**：测试不同手机型号和微信版本

通过以上方案，应该能解决手机预览无法使用的问题。建议从方案三开始（临时禁用云开发），快速验证功能是否正常，然后再实施长期解决方案。

