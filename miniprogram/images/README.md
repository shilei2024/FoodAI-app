# 图片资源目录

本目录存放小程序使用的所有图片资源。

## 目录结构

```
images/
├── tabbar/                    # 底部标签栏图标
│   ├── home.png              # 首页图标
│   ├── home-active.png       # 首页激活图标
│   ├── history.png           # 历史图标
│   ├── history-active.png    # 历史激活图标
│   ├── profile.png           # 我的图标
│   └── profile-active.png    # 我的激活图标
├── foods/                    # 食物图片
│   ├── apple.png            # 苹果
│   ├── banana.png           # 香蕉
│   ├── broccoli.png         # 西兰花
│   ├── chicken.png          # 鸡胸肉
│   ├── egg.png              # 鸡蛋
│   └── rice.png             # 米饭
├── icons/                    # 图标
│   ├── ai.png               # AI图标
│   ├── camera.png           # 相机图标
│   ├── share.png            # 分享图标
│   └── vip.png              # VIP图标
├── default-food.png         # 默认食物图片
├── default-avatar.png       # 默认头像
├── placeholder.png          # 图片占位符
└── share.png               # 分享卡片图片
```

## 图片规范

1. **尺寸要求**：
   - 图标：建议 60x60px 或 120x120px（@2x）
   - 食物图片：建议 200x200px 或 400x400px（@2x）
   - 头像：建议 100x100px 或 200x200px（@2x）

2. **格式要求**：
   - 使用 PNG 格式，支持透明背景
   - 压缩优化，减少文件大小
   - 命名使用小写字母、数字和连字符

3. **颜色模式**：
   - 使用 RGB 颜色模式
   - 考虑暗色模式适配

## 使用说明

1. 在 WXML 中使用：
   ```xml
   <image src="/images/foods/apple.png" mode="aspectFill" />
   ```

2. 在 JS 中使用：
   ```javascript
   const imageUrl = '/images/foods/apple.png'
   ```

3. 在 CSS 中使用：
   ```css
   .food-image {
     background-image: url('/images/foods/apple.png');
   }
   ```

## 注意事项

1. 所有图片资源需经过压缩处理
2. 保持图片命名规范一致
3. 定期清理未使用的图片
4. 考虑图片懒加载优化性能
