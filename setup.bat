@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo 🎯 AI轻食记 - 项目设置向导
echo ==============================

REM 检查是否在项目根目录
if not exist "package.json" (
    echo ❌ 错误：请在项目根目录运行此脚本
    pause
    exit /b 1
)

echo.
echo 📝 步骤1：创建本地配置文件
set "CONFIG_DIR=miniprogram\constants"
set "LOCAL_CONFIG=%CONFIG_DIR%\config.local.js"
set "EXAMPLE_CONFIG=%CONFIG_DIR%\config.local.example.js"

if exist "%LOCAL_CONFIG%" (
    echo ✅ 本地配置文件已存在：%LOCAL_CONFIG%
) else (
    if exist "%EXAMPLE_CONFIG%" (
        copy "%EXAMPLE_CONFIG%" "%LOCAL_CONFIG%" >nul
        echo ✅ 已创建本地配置文件：%LOCAL_CONFIG%
        echo    请编辑此文件并填写您的配置信息
    ) else (
        echo ❌ 错误：示例配置文件不存在：%EXAMPLE_CONFIG%
        pause
        exit /b 1
    )
)

echo.
echo 📝 步骤2：检查 .gitignore 配置
if exist ".gitignore" (
    findstr /C:"config.local.js" ".gitignore" >nul
    if errorlevel 1 (
        echo config.local.js>>.gitignore
        echo ✅ 已将本地配置文件添加到 .gitignore
    ) else (
        echo ✅ .gitignore 已包含本地配置文件
    )
) else (
    echo ⚠️  警告：.gitignore 文件不存在
    echo    建议创建 .gitignore 文件并添加 config.local.js
)

echo.
echo 📝 步骤3：安装项目依赖
set /p INSTALL_DEPS="是否安装项目依赖？(y/n): "
if /i "!INSTALL_DEPS!"=="y" (
    echo 正在安装依赖...
    call npm install
    if !errorlevel! equ 0 (
        echo ✅ 依赖安装完成
    ) else (
        echo ❌ 依赖安装失败
    )
) else (
    echo ⏭️  跳过依赖安装
)

echo.
echo 📝 步骤4：配置指南
echo ==============================
echo 请按照以下步骤配置您的项目：
echo.
echo 1. 编辑本地配置文件：
echo    %LOCAL_CONFIG%
echo.
echo 2. 必需配置项：
echo    - Deepseek AI API密钥（推荐）
echo    - 或百度AI API密钥和Secret Key
echo    - 小程序AppID
echo.
echo 3. 可选配置项：
echo    - 云开发环境ID
echo    - 支付配置（如果需要支付功能）
echo    - 第三方服务密钥
echo.
echo 4. 测试功能：
echo    - 在微信开发者工具中打开项目
echo    - 首页搜索"苹果"测试AI识别
echo    - 尝试拍照识别功能
echo.
echo 5. 详细配置说明请查看：
echo    - CONFIGURATION_GUIDE.md
echo    - README.md
echo.
echo 🎉 设置完成！现在可以开始开发了。

echo.
set /p OPEN_EDITOR="是否用默认编辑器打开配置文件？(y/n): "
if /i "!OPEN_EDITOR!"=="y" (
    start "" "%LOCAL_CONFIG%"
)

echo.
echo 💡 提示：
echo - 生产环境请使用云函数模式保护API密钥
echo - 定期检查API使用情况和费用
echo - 关注项目更新和文档

pause
