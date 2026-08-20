"""萌梦 3D Bridge for Blender."""

from __future__ import annotations

bl_info = {
    "name": "萌梦 3D Bridge",
    "author": "萌梦 AI Studio",
    "version": (1, 0, 0),
    "blender": (3, 6, 0),
    "location": "View3D > Sidebar > 萌梦",
    "description": "渲染白模媒体并一键发送到萌梦无限画布，继续二次创作。",
    "category": "Import-Export",
}

import os
import traceback
import webbrowser

import bpy
from bpy_extras.io_utils import ImportHelper

from . import bridge, media


def _default_origin() -> str:
    language = str(getattr(bpy.context.preferences.view, "language", "") or "").lower()
    return "https://emeng-ai-studio.docile-luck-8545.chatgpt.site"


def _addon_preferences(context):
    addon = context.preferences.addons.get(__package__)
    return addon.preferences if addon else None


class EMENG_Preferences(bpy.types.AddonPreferences):
    bl_idname = __package__

    web_origin: bpy.props.StringProperty(
        name="萌梦 Web Origin",
        description="萌梦站点 Origin，本地安全桥接只信任该来源",
        default="",
    )

    def draw(self, _context):
        layout = self.layout
        layout.prop(self, "web_origin", text="Web Origin")
        layout.label(text="留空时默认使用萌梦 AI Studio 站点（也可填本地开发地址）。")
        layout.label(text="本地视频导入需要 ffmpeg（PATH 或 EMENG_FFMPEG）。")


class EMENG_OT_pick_video(bpy.types.Operator, ImportHelper):
    bl_idname = "emeng.pick_video"
    bl_label = "选择本地视频"
    bl_description = "选择本地视频，标准化后发送到萌梦画布"

    filename_ext = ".mp4"
    filter_glob: bpy.props.StringProperty(default="*.mp4;*.mov;*.webm;*.avi;*.mkv;*.m4v", options={"HIDDEN"})

    def execute(self, context):
        context.scene.emeng_local_video = self.filepath
        return {"FINISHED"}


class EMENG_OT_send(bpy.types.Operator):
    bl_idname = "emeng.render_and_send"
    bl_label = "渲染并发送"
    bl_description = "准备白模媒体并打开萌梦接收页"

    @classmethod
    def poll(cls, context):
        scene = context.scene
        if scene.emeng_task_running:
            return False
        if scene.emeng_source_mode == "LOCAL_VIDEO":
            return bool(scene.emeng_local_video)
        if scene.emeng_source_mode == "COS_URL":
            return bool(scene.emeng_cos_url.strip())
        return bool(scene.emeng_camera)

    def execute(self, context):
        scene = context.scene
        scene.emeng_task_running = True
        scene.emeng_status = "正在准备素材…"
        try:
            mode = scene.emeng_source_mode
            preferences = _addon_preferences(context)
            origin = os.environ.get("EMENG_WEB_ORIGIN", "").strip()
            if not origin and preferences:
                origin = preferences.web_origin.strip()
            origin = origin or _default_origin()
            if mode == "COS_URL":
                url = bridge.build_cos_import_url(scene.emeng_cos_url, origin, "blender")
            elif mode == "LOCAL_VIDEO":
                media_path = media.normalize_local_video(scene.emeng_local_video)
                media_kind = "local-video"
                url, _server = bridge.start_bridge(media_path, origin, media_kind)
            else:
                media_path = media.render_white_model(
                    scene,
                    scene.emeng_camera,
                    mode,
                    scene.emeng_resolution,
                    scene.emeng_frame_start,
                    scene.emeng_frame_end,
                )
                media_kind = "snapshot" if mode == "SNAPSHOT" else "animation"
                url, _server = bridge.start_bridge(media_path, origin, media_kind)
            if not webbrowser.open(url, new=2):
                raise RuntimeError("Default browser could not be opened.")
            scene.emeng_status = "已在浏览器打开接收页。"
            self.report({"INFO"}, scene.emeng_status)
            return {"FINISHED"}
        except Exception as error:
            traceback.print_exc()
            scene.emeng_status = "Failed: {0}".format(error)
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        finally:
            scene.emeng_task_running = False


class VIEW3D_PT_emeng_bridge(bpy.types.Panel):
    bl_idname = "VIEW3D_PT_emeng_bridge"
    bl_label = "萌梦 3D Bridge"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "萌梦"

    def draw(self, context):
        scene = context.scene
        layout = self.layout
        layout.use_property_split = True

        header = layout.column(align=True)
        header.label(text="白模素材 → 萌梦无限画布", icon="WORLD")
        header.label(text="24fps · H.264 · up to 30s")
        layout.separator()

        layout.prop(scene, "emeng_source_mode", expand=True)
        layout.separator()
        if scene.emeng_source_mode == "LOCAL_VIDEO":
            row = layout.row(align=True)
            row.prop(scene, "emeng_local_video", text="视频")
            row.operator("emeng.pick_video", text="", icon="FILE_FOLDER")
        elif scene.emeng_source_mode == "COS_URL":
            layout.prop(scene, "emeng_cos_url", text="COS 视频地址")
        else:
            layout.prop(scene, "emeng_camera", text="相机")
            layout.prop(scene, "emeng_resolution", text="分辨率")
            if scene.emeng_source_mode == "ANIMATION":
                range_row = layout.row(align=True)
                range_row.prop(scene, "emeng_frame_start", text="起始帧")
                range_row.prop(scene, "emeng_frame_end", text="结束帧")
            else:
                row = layout.row()
                row.enabled = False
                row.prop(scene, "frame_current", text="当前帧")

        layout.separator()
        action = layout.row()
        action.scale_y = 1.35
        action.operator(
            "emeng.render_and_send",
            text="Working…" if scene.emeng_task_running else (
                "发送 COS 视频" if scene.emeng_source_mode == "COS_URL" else (
                    "发送本地视频" if scene.emeng_source_mode == "LOCAL_VIDEO" else "渲染并发送"
                )
            ),
            icon="EXPORT",
        )
        if scene.emeng_status:
            box = layout.box()
            box.label(text=scene.emeng_status, icon="INFO")


CLASSES = (
    EMENG_Preferences,
    EMENG_OT_pick_video,
    EMENG_OT_send,
    VIEW3D_PT_emeng_bridge,
)


def _camera_poll(_self, obj):
    return obj is not None and obj.type == "CAMERA"


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    bpy.types.Scene.emeng_source_mode = bpy.props.EnumProperty(
        name="素材来源",
        items=(
            ("ANIMATION", "动画", "渲染所选相机的帧范围"),
            ("SNAPSHOT", "当前帧", "渲染所选相机当前帧"),
            ("LOCAL_VIDEO", "本地视频", "标准化本地视频"),
            ("COS_URL", "COS 视频地址", "发送已有的 RunningHub 或腾讯 COS MP4 地址"),
        ),
        default="ANIMATION",
    )
    bpy.types.Scene.emeng_camera = bpy.props.PointerProperty(type=bpy.types.Object, poll=_camera_poll)
    bpy.types.Scene.emeng_resolution = bpy.props.EnumProperty(
        name="分辨率",
        items=(("480P", "480P", ""), ("720P", "720P", ""), ("1080P", "1080P", ""), ("ORIGINAL", "Original", "")),
        default="720P",
    )
    bpy.types.Scene.emeng_frame_start = bpy.props.IntProperty(name="起始帧", default=1, min=-100000, max=100000)
    bpy.types.Scene.emeng_frame_end = bpy.props.IntProperty(name="结束帧", default=120, min=-100000, max=100000)
    bpy.types.Scene.emeng_local_video = bpy.props.StringProperty(name="本地视频", subtype="FILE_PATH")
    bpy.types.Scene.emeng_cos_url = bpy.props.StringProperty(name="COS 视频地址", default="")
    bpy.types.Scene.emeng_status = bpy.props.StringProperty(name="状态", default="就绪")
    bpy.types.Scene.emeng_task_running = bpy.props.BoolProperty(name="任务运行中", default=False, options={"SKIP_SAVE"})
    scene = getattr(bpy.context, "scene", None)
    if scene:
        scene.emeng_camera = scene.camera
        scene.emeng_frame_start = scene.frame_start
        scene.emeng_frame_end = min(scene.frame_end, scene.frame_start + media.MAX_DURATION_SECONDS * media.FPS - 1)


def unregister():
    bridge.shutdown_all()
    for name in (
        "emeng_source_mode",
        "emeng_camera",
        "emeng_resolution",
        "emeng_frame_start",
        "emeng_frame_end",
        "emeng_local_video",
        "emeng_cos_url",
        "emeng_status",
        "emeng_task_running",
    ):
        if hasattr(bpy.types.Scene, name):
            delattr(bpy.types.Scene, name)
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)
