# 腾讯云函数 - 百度AI代理服务

## 功能说明
此云函数作为百度AI服务的代理，用于个人认证小程序无法使用微信云开发的情况。

## 部署步骤

### 1. 创建腾讯云函数
1. 登录腾讯云控制台：https://console.cloud.tencent.com/scf
2. 点击「新建」创建函数
3. 选择「从头开始」
4. 配置信息：
   - 函数名称：`baidu-ai-proxy`
   - 运行环境：Node.js 16.13
   - 创建方式：空白函数

### 2. 上传代码
1. 在函数代码编辑器中，选择「本地上传文件夹」
2. 上传 `tencent-scf/baidu-ai-proxy/` 文件夹
3. 等待上传完成

### 3. 配置环境变量
1. 在函数配置页面，找到「环境变量」
2. 添加以下环境变量：
   - `BAIDU_AI_API_KEY`: 你的百度AI API Key
   - `BAIDU_AI_SECRET_KEY`: 你的百度AI Secret Key

### 4. 配置触发器
1. 在「触发管理」中，点击「创建触发器」
2. 选择「API网关触发器」
3. 配置：
   - 触发方式：API网关触发
   - 请求方法：POST
   - 集成响应：启用
   - 鉴权方法：免鉴权（测试时可选，生产环境建议使用密钥）

### 5. 获取访问地址
部署完成后，在「触发管理」中获取API网关访问地址，格式如：
```
https://service-xxxxx-xxxxx.gz.apigw.tencentcs.com/release/baidu-ai-proxy
```

## 调用方式

### 请求格式
```json
POST https://你的云函数地址
Content-Type: application/json

{
  "action": "recognizeFood",
  "data": {
    "image": "base64编码的图片数据"
  },
  "options": {
    "top_num": 5,
    "filter_threshold": 0.7,
    "baike_num": 1
  }
}
```

### 可用操作
- `recognizeFood`: 食物识别
- `recognizeGeneral`: 通用物体识别
- `getToken`: 获取access_token

## 费用说明
- 腾讯云函数每月有免费额度：100万次调用
- 超出部分按量计费，价格低廉
- 详细计费：https://cloud.tencent.com/product/scf/pricing

## 注意事项
1. 生产环境建议启用API网关鉴权
2. 定期检查函数日志，监控调用情况
3. 建议设置函数超时时间：30秒
4. 内存配置：128MB足够使用
