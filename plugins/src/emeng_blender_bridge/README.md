# 萌梦 3D Bridge for Blender

版本 1.0.0，Blender 3.6+。

## 安装

1. 打开 Blender `Edit > Preferences > Add-ons`。
2. 选择 `Install from Disk...`，直接选择 ZIP 文件，无需解压。
3. 启用 **萌梦 3D Bridge**。
4. 打开 `3D View > Sidebar > 萌梦` 面板。

## 能力

- 动画：用 Blender Workbench 渲染所选相机和帧范围。
- 当前帧：将所选相机当前帧渲染为 PNG。
- 本地视频：接受 MP4/MOV/WebM/AVI/MKV/M4V 并转换为 24fps H.264 MP4。
- COS 地址：直接发送已有的 RunningHub 或腾讯 COS HTTPS MP4 地址，无需重复上传。
- 自动打开萌梦接收页：素材进入当前打开的画布；没有打开画布时新建一个画布。

本地视频转换需要 `ffmpeg`（PATH 中，或通过 `EMENG_FFMPEG` 指定路径）。
默认接收站点为 `https://emeng-ai-studio.docile-luck-8545.chatgpt.site`。
可通过环境变量 `EMENG_WEB_ORIGIN` 覆盖接收站点（例如本地调试 `http://localhost:5199`）。
