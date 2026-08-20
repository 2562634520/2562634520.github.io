# 萌梦 3D Bridge 插件（Blender / Maya）

本目录是「萌梦 AI Studio」自研的 3D 白模渲染桥接插件，基于公开可下载的 RunningHub DCC 插件二次开发：

- 协议从 `runninghub-dcc-import` 改为自有协议 `emeng-dcc-import`（v1）
- 默认接收站点改为本站 `https://emeng-ai-studio.docile-luck-8545.chatgpt.site`
- 接收地址改为 `/?canvas&dccImport=1#v=1&...`（本站画布页）
- UI 全部中文化，品牌为「萌梦 3D Bridge」

## 文件

- `emeng-3d-bridge-blender-v1.0.0.zip` —— Blender 3.6+ 插件（Edit > Preferences > Add-ons > Install from Disk）
- `emeng-3d-bridge-maya-v1.0.0.zip` —— Maya 2022+ 插件（Script Editor 执行 install.py）
- `src/` —— 插件源码（改完需重新打包 zip）

## 打包命令

```
cd src && zip -r ../emeng-3d-bridge-blender-v1.0.0.zip emeng_blender_bridge
cd src && zip -r ../emeng-3d-bridge-maya-v1.0.0.zip install.py maya-README.md emeng_maya_bridge
```

> Maya 包内文件名需为 `README.md`，打包前把 `maya-README.md` 改名为 `README.md`。

## 协议说明

插件渲染白模素材后，启动 127.0.0.1 随机端口本地桥（30 分钟令牌），打开浏览器访问
`https://emeng-ai-studio.docile-luck-8545.chatgpt.site/?canvas&dccImport=1#v=1&resource=<base64url>`。
本站画布页解析该链接：校验桥资源信息 → 拉取媒体文件 → 以媒体节点导入画布 → 通知桥完成。

开发调试：`EMENG_WEB_ORIGIN=http://localhost:5199` 可指向本地 dev server。
