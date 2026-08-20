"""Maya default-material playblast and video normalization helpers."""

from __future__ import annotations

import datetime
import glob
import os
import re
import shutil
import subprocess
import tempfile

from maya import cmds


FPS = 24
MAX_DURATION_SECONDS = 30
MAX_VIDEO_BYTES = 200 * 1024 * 1024
MAX_IMAGE_BYTES = 20 * 1024 * 1024
VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v"}
_DURATION_PATTERN = re.compile(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)")


class MediaError(RuntimeError):
    pass


def _output_dir():
    root = os.path.join(tempfile.gettempdir(), "emeng_dcc")
    if not os.path.isdir(root):
        os.makedirs(root)
    return root


def _timestamp():
    return datetime.datetime.now().strftime("%Y%m%d_%H%M%S")


def _even(value):
    return max(2, int(value) // 2 * 2)


def resolution(key):
    width = int(cmds.getAttr("defaultResolution.width"))
    height = int(cmds.getAttr("defaultResolution.height"))
    if key == "Original":
        return _even(width), _even(height)
    short_edge = int(key.replace("P", ""))
    scale = short_edge / float(min(width, height))
    return _even(width * scale), _even(height * scale)


def ffmpeg_executable():
    configured = os.environ.get("EMENG_FFMPEG", "").strip()
    if configured and os.path.isfile(configured):
        return configured
    return shutil.which("ffmpeg") or ""


def _flags():
    return int(getattr(subprocess, "CREATE_NO_WINDOW", 0) or 0) if os.name == "nt" else 0


def probe_duration(path):
    ffmpeg = ffmpeg_executable()
    if not ffmpeg:
        raise MediaError("ffmpeg is required. Install it or set EMENG_FFMPEG.")
    process = subprocess.run([ffmpeg, "-hide_banner", "-i", path], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False, creationflags=_flags())
    output = process.stdout.decode("utf-8", "replace")
    match = _DURATION_PATTERN.search(output)
    if not match:
        raise MediaError("Unable to read video duration.")
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def normalize_local_video(source):
    source = os.path.abspath(source)
    if os.path.splitext(source)[1].lower() not in VIDEO_EXTENSIONS or not os.path.isfile(source):
        raise MediaError("Choose an MP4, MOV, WebM, AVI, MKV, or M4V video.")
    duration = probe_duration(source)
    if duration > MAX_DURATION_SECONDS + 0.01:
        raise MediaError("Video exceeds the 30 second limit ({0:.2f}s).".format(duration))
    target = os.path.join(_output_dir(), "emeng_local_{0}.mp4".format(_timestamp()))
    command = [
        ffmpeg_executable(), "-y", "-i", source,
        "-map", "0:v:0", "-map", "0:a?",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
        "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p", "-tag:v", "avc1", "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart", target,
    ]
    try:
        subprocess.check_output(command, stderr=subprocess.STDOUT, creationflags=_flags())
    except subprocess.CalledProcessError as error:
        raise MediaError("ffmpeg conversion failed:\n{0}".format(error.output.decode("utf-8", "replace")[-1200:]))
    validate_output(target, "video/mp4")
    return target


def _model_panel():
    focused = cmds.getPanel(withFocus=True)
    if focused and cmds.getPanel(typeOf=focused) == "modelPanel":
        return focused
    panels = cmds.getPanel(type="modelPanel") or []
    if not panels:
        raise MediaError("Open a Maya model panel before rendering.")
    return panels[0]


def _capture_panel(panel):
    return {
        "camera": cmds.modelPanel(panel, query=True, camera=True),
        "displayTextures": cmds.modelEditor(panel, query=True, displayTextures=True),
        "useDefaultMaterial": cmds.modelEditor(panel, query=True, useDefaultMaterial=True),
        "grid": cmds.modelEditor(panel, query=True, grid=True),
        "hud": cmds.modelEditor(panel, query=True, hud=True),
    }


def _configure_panel(panel, camera):
    cmds.lookThru(panel, camera)
    cmds.modelEditor(panel, edit=True, displayTextures=False, useDefaultMaterial=True, grid=False, hud=False)


def _restore_panel(panel, previous):
    try:
        cmds.lookThru(panel, previous["camera"])
        cmds.modelEditor(
            panel,
            edit=True,
            displayTextures=previous["displayTextures"],
            useDefaultMaterial=previous["useDefaultMaterial"],
            grid=previous["grid"],
            hud=previous["hud"],
        )
    except Exception:
        pass


def render_snapshot(camera, resolution_key):
    panel = _model_panel()
    width, height = resolution(resolution_key)
    target = os.path.join(_output_dir(), "emeng_snapshot_{0}.png".format(_timestamp()))
    previous = _capture_panel(panel)
    try:
        _configure_panel(panel, camera)
        cmds.playblast(
            frame=[cmds.currentTime(query=True)],
            format="image",
            compression="png",
            completeFilename=target,
            forceOverwrite=True,
            viewer=False,
            showOrnaments=False,
            offScreen=True,
            percent=100,
            quality=100,
            widthHeight=(width, height),
        )
    finally:
        _restore_panel(panel, previous)
    validate_output(target, "image/png")
    return target


def render_animation(camera, resolution_key, start_frame, end_frame):
    frame_count = int(end_frame) - int(start_frame) + 1
    if frame_count <= 0 or frame_count > FPS * MAX_DURATION_SECONDS:
        raise MediaError("Animation must contain 1-{0} frames.".format(FPS * MAX_DURATION_SECONDS))
    if not ffmpeg_executable():
        raise MediaError("ffmpeg is required. Install it or set EMENG_FFMPEG.")
    panel = _model_panel()
    width, height = resolution(resolution_key)
    frames_dir = tempfile.mkdtemp(prefix="emeng_maya_frames_")
    prefix = os.path.join(frames_dir, "capture")
    previous = _capture_panel(panel)
    try:
        _configure_panel(panel, camera)
        cmds.playblast(
            startTime=int(start_frame),
            endTime=int(end_frame),
            format="image",
            compression="png",
            filename=prefix,
            framePadding=4,
            forceOverwrite=True,
            viewer=False,
            showOrnaments=False,
            offScreen=True,
            percent=100,
            quality=100,
            widthHeight=(width, height),
        )
    finally:
        _restore_panel(panel, previous)
    frames = sorted(glob.glob(prefix + "*.png"))
    if not frames:
        raise MediaError("Maya did not create playblast frames.")
    for index, source in enumerate(frames):
        target_frame = os.path.join(frames_dir, "frame_{0:04d}.png".format(index))
        if source != target_frame:
            os.replace(source, target_frame)
    target = os.path.join(_output_dir(), "emeng_animation_{0}.mp4".format(_timestamp()))
    command = [
        ffmpeg_executable(), "-y", "-framerate", str(FPS), "-i", os.path.join(frames_dir, "frame_%04d.png"),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-tag:v", "avc1", "-movflags", "+faststart", target,
    ]
    try:
        subprocess.check_output(command, stderr=subprocess.STDOUT, creationflags=_flags())
    except subprocess.CalledProcessError as error:
        raise MediaError("ffmpeg encoding failed:\n{0}".format(error.output.decode("utf-8", "replace")[-1200:]))
    finally:
        shutil.rmtree(frames_dir, ignore_errors=True)
    validate_output(target, "video/mp4")
    return target


def validate_output(path, mime_type):
    if not os.path.isfile(path):
        raise MediaError("Media output was not created.")
    size = os.path.getsize(path)
    limit = MAX_VIDEO_BYTES if mime_type == "video/mp4" else MAX_IMAGE_BYTES
    if size <= 0 or size > limit:
        raise MediaError("Media size is outside the supported limit.")
