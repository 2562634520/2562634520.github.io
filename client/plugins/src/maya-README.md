# 萌梦 3D Bridge for Maya

版本 1.0.0，Maya 2022+。

## 安装

1. 解压 ZIP。
2. 在 Maya Script Editor 的 Python 标签执行 `install.py`（按脚本内提示的路径执行）。
3. 从 Maya 顶部 **萌梦** 菜单选择 **3D Bridge**。

## 能力

- 动画：以默认灰色材质 Playblast，用 ffmpeg 输出标准 MP4。
- 当前帧：渲染当前帧为 PNG。
- 本地视频：标准化为 24fps H.264 MP4。
- COS 地址：直接发送已有的 RunningHub 或腾讯 COS HTTPS MP4 地址。
- 自动打开萌梦接收页：素材进入当前打开的画布；没有打开画布时新建一个画布。

动画和本地视频处理需要 `ffmpeg`（PATH 中，或通过 `EMENG_FFMPEG` 指定路径）。
默认接收站点为 `https://emeng-ai-studio.docile-luck-8545.chatgpt.site`。
可通过环境变量 `EMENG_WEB_ORIGIN` 覆盖接收站点（例如本地调试 `http://localhost:5199`）。
