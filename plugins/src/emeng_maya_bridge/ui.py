"""Maya dockable interface for Emeng 3D Bridge."""

from __future__ import annotations

import os
import traceback
import webbrowser

from maya import cmds

from . import bridge, media


CONTROL = "Emeng3DBridgeWorkspaceControl"
UI = {}


def _default_origin():
    language = str(cmds.about(uiLanguage=True) or "").lower()
    return "https://emeng-ai-studio.docile-luck-8545.chatgpt.site"


def _cameras():
    shapes = cmds.ls(type="camera", long=True) or []
    return [cmds.listRelatives(shape, parent=True, fullPath=True)[0] for shape in shapes if cmds.listRelatives(shape, parent=True, fullPath=True)]


def _set_status(text):
    if UI.get("status") and cmds.control(UI["status"], exists=True):
        cmds.text(UI["status"], edit=True, label=text)
    cmds.refresh()


def _mode():
    return ("ANIMATION", "SNAPSHOT", "LOCAL_VIDEO", "COS_URL")[cmds.radioButtonGrp(UI["mode"], query=True, select=True) - 1]


def _sync_mode(*_args):
    local = _mode() == "LOCAL_VIDEO"
    cos_url = _mode() == "COS_URL"
    cmds.textFieldButtonGrp(UI["localVideo"], edit=True, enable=local)
    cmds.textFieldGrp(UI["cosUrl"], edit=True, enable=cos_url)
    for name in ("camera", "resolution", "start", "end"):
        cmds.control(UI[name], edit=True, enable=not local and not cos_url)
    cmds.control(UI["start"], edit=True, enable=not local and not cos_url and _mode() == "ANIMATION")
    cmds.control(UI["end"], edit=True, enable=not local and not cos_url and _mode() == "ANIMATION")


def _browse_video(*_args):
    files = cmds.fileDialog2(fileMode=1, caption="Choose local video", fileFilter="Video (*.mp4 *.mov *.webm *.avi *.mkv *.m4v)")
    if files:
        cmds.textFieldButtonGrp(UI["localVideo"], edit=True, text=files[0])


def _send(*_args):
    try:
        _set_status("Preparing media…")
        mode = _mode()
        origin = cmds.textFieldGrp(UI["origin"], query=True, text=True).strip() or _default_origin()
        origin = os.environ.get("EMENG_WEB_ORIGIN", "").strip() or origin
        if mode == "COS_URL":
            cos_url = cmds.textFieldGrp(UI["cosUrl"], query=True, text=True).strip()
            url = bridge.build_cos_import_url(cos_url, origin, "maya")
        elif mode == "LOCAL_VIDEO":
            path = media.normalize_local_video(cmds.textFieldButtonGrp(UI["localVideo"], query=True, text=True))
            media_kind = "local-video"
            url, _server = bridge.start_bridge(path, origin, media_kind)
        else:
            camera = cmds.optionMenu(UI["camera"], query=True, value=True)
            if not camera:
                raise RuntimeError("Choose a Maya camera.")
            resolution = cmds.optionMenu(UI["resolution"], query=True, value=True)
            if mode == "SNAPSHOT":
                path = media.render_snapshot(camera, resolution)
                media_kind = "snapshot"
            else:
                start = cmds.intFieldGrp(UI["start"], query=True, value1=True)
                end = cmds.intFieldGrp(UI["end"], query=True, value1=True)
                path = media.render_animation(camera, resolution, start, end)
                media_kind = "animation"
            url, _server = bridge.start_bridge(path, origin, media_kind)
        webbrowser.open(url, new=2)
        _set_status("Receiver opened in your browser.")
    except Exception as error:
        traceback.print_exc()
        _set_status("Failed: {0}".format(error))
        cmds.warning(str(error))


def build():
    UI.clear()
    root = cmds.columnLayout(adjustableColumn=True, rowSpacing=8)
    cmds.separator(height=6, style="none")
    cmds.text(label="萌梦 3D Bridge", align="left", font="boldLabelFont", height=24)
    cmds.text(label="白模素材 → 萌梦无限画布 · 24fps · 最长30秒", align="left")
    cmds.separator(height=10)
    UI["mode"] = cmds.radioButtonGrp(
        label="Source",
        labelArray4=("动画", "当前帧", "本地视频", "COS 视频地址"),
        numberOfRadioButtons=4,
        select=1,
        changeCommand=_sync_mode,
    )
    UI["camera"] = cmds.optionMenu(label="相机")
    for camera in _cameras():
        cmds.menuItem(label=camera)
    UI["resolution"] = cmds.optionMenu(label="分辨率")
    for value in ("480P", "720P", "1080P", "Original"):
        cmds.menuItem(label=value)
    cmds.optionMenu(UI["resolution"], edit=True, value="720P")
    start = int(cmds.playbackOptions(query=True, minTime=True))
    end = min(int(cmds.playbackOptions(query=True, maxTime=True)), start + media.FPS * media.MAX_DURATION_SECONDS - 1)
    UI["start"] = cmds.intFieldGrp(label="起始帧", numberOfFields=1, value1=start)
    UI["end"] = cmds.intFieldGrp(label="结束帧", numberOfFields=1, value1=end)
    UI["localVideo"] = cmds.textFieldButtonGrp(label="本地视频", buttonLabel="浏览…", buttonCommand=_browse_video, enable=False)
    UI["cosUrl"] = cmds.textFieldGrp(label="COS 视频地址", text="", enable=False)
    cmds.separator(height=4)
    UI["origin"] = cmds.textFieldGrp(label="萌梦 Web Origin", text=_default_origin())
    cmds.button(label="渲染并发送", height=40, command=_send, backgroundColor=(0.24, 0.5, 0.19))
    UI["status"] = cmds.text(label="就绪", align="left", wordWrap=True, height=38)
    cmds.separator(height=6, style="none")
    _sync_mode()
    return root


def show():
    if cmds.workspaceControl(CONTROL, exists=True):
        cmds.deleteUI(CONTROL)
    cmds.workspaceControl(CONTROL, label="萌梦 3D Bridge", retain=False, initialWidth=390, minimumWidth=330)
    cmds.setParent(CONTROL)
    build()
    cmds.workspaceControl(CONTROL, edit=True, restore=True)
