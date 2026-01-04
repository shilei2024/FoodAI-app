#!/bin/bash

# AI轻食记 - 项目设置脚本
# 此脚本帮助您快速设置项目配置

echo "🎯 AI轻食记 - 项目设置向导"
echo "=============================="

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 创建本地配置文件
echo ""
echo "📝 步骤1：创建本地配置文件"
CONFIG_DIR="miniprogram/constants"
LOCAL_CONFIG="$CONFIG_DIR/config.local.js"
EXAMPLE_CONFIG="$CONFIG_DIR/config.local.example.js"

if [ -f "$LOCAL_CONFIG" ]; then
    echo "✅ 本地配置文件已存在：$LOCAL_CONFIG"
else
    if [ -f "$EXAMPLE_CONFIG" ]; then
        cp "$EXAMPLE_CONFIG" "$LOCAL_CONFIG"
        echo "✅ 已创建本地配置文件：$LOCAL_CONFIG"
        echo "   请编辑此文件并填写您的配置信息"
    else
        echo "❌ 错误：示例配置文件不存在：$EXAMPLE_CONFIG"
        exit 1
    fi
fi

# 检查 .gitignore
echo ""
echo "📝 步骤2：检查 .gitignore 配置"
if [ -f ".gitignore" ]; then
    if grep -q "config.local.js" .gitignore; then
        echo "✅ .gitignore 已包含本地配置文件"
    else
        echo "config.local.js" >> .gitignore
        echo "✅ 已将本地配置文件添加到 .gitignore"
    fi
else
    echo "⚠️  警告：.gitignore 文件不存在"
    echo "   建议创建 .gitignore 文件并添加 config.local.js"
fi

# 安装依赖
echo ""
echo "📝 步骤3：安装项目依赖"
read -p "是否安装项目依赖？(y/n): " INSTALL_DEPS
if [[ $INSTALL_DEPS =~ ^[Yy]$ ]]; then
    echo "正在安装依赖..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ 依赖安装完成"
    else
        echo "❌ 依赖安装失败"
    fi
else
    echo "⏭️  跳过依赖安装"
fi

# 显示配置指南
echo ""
echo "📝 步骤4：配置指南"
echo "=============================="
echo "请按照以下步骤配置您的项目："
echo ""
echo "1. 编辑本地配置文件："
echo "   $LOCAL_CONFIG"
echo ""
echo "2. 必需配置项："
echo "   - Deepseek AI API密钥（推荐）"
echo "   - 或百度AI API密钥和Secret Key"
echo "   - 小程序AppID"
echo ""
echo "3. 可选配置项："
echo "   - 云开发环境ID"
echo "   - 支付配置（如果需要支付功能）"
echo "   - 第三方服务密钥"
echo ""
echo "4. 测试功能："
echo "   - 在微信开发者工具中打开项目"
echo "   - 首页搜索'苹果'测试AI识别"
echo "   - 尝试拍照识别功能"
echo ""
echo "5. 详细配置说明请查看："
echo "   - CONFIGURATION_GUIDE.md"
echo "   - README.md"
echo ""
echo "🎉 设置完成！现在可以开始开发了。"

# 打开配置文件（如果支持）
if command -v code &> /dev/null; then
    read -p "是否用VSCode打开配置文件？(y/n): " OPEN_VSCODE
    if [[ $OPEN_VSCODE =~ ^[Yy]$ ]]; then
        code "$LOCAL_CONFIG"
    fi
elif command -v nano &> /dev/null; then
    read -p "是否用nano编辑配置文件？(y/n): " OPEN_NANO
    if [[ $OPEN_NANO =~ ^[Yy]$ ]]; then
        nano "$LOCAL_CONFIG"
    fi
fi

echo ""
echo "💡 提示："
echo "- 生产环境请使用云函数模式保护API密钥"
echo "- 定期检查API使用情况和费用"
echo "- 关注项目更新和文档"
