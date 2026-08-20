"""Blender white-model rendering and local-video normalization."""

from __future__ import annotations

import datetime
import os
import re
import shutil
import subprocess
import tempfile

import bpy


FPS = 24
MAX_DURATION_SECONDS = 30
MAX_VIDEO_BYTES = 200 * 1024 * 1024
MAX_IMAGE_BYTES = 20 * 1024 * 1024
MIN_ANIMATION_FRAMES = 1
VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v"}
_DURATION_PATTERN = re.compile(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)")


class MediaError(RuntimeError):
    """Raised when media preparation cannot complete."""


def _output_dir() -> str:
    root = os.path.join(tempfile.gettempdir(), "emeng_dcc")
    os.makedirs(root, exist_ok=True)
    return root


def _timestamp() -> str:
    return datetime.datetime.now().strftime("%Y%m%d_%H%M%S")


def _even(value: int) -> int:
    return max(2, int(value) // 2 * 2)


def resolution(scene, key: str):
    source_width = max(2, int(scene.render.resolution_x * scene.render.resolution_percentage / 100))
    source_height = max(2, int(scene.render.resolution_y * scene.render.resolution_percentage / 100))
    if key == "ORIGINAL":
        return _even(source_width), _even(source_height)
    short_edge = int(key.replace("P", ""))
    scale = short_edge / float(min(source_width, source_height))
    return _even(source_width * scale), _even(source_height * scale)


def ffmpeg_executable() -> str:
    configured = os.environ.get("EMENG_FFMPEG", "").strip()
    if configured and os.path.isfile(configured):
        return configured
    return shutil.which("ffmpeg") or ""


def _subprocess_flags():
    return int(getattr(subprocess, "CREATE_NO_WINDOW", 0) or 0) if os.name == "nt" else 0


def probe_duration(path: str) -> float:
    ffmpeg = ffmpeg_executable()
    if not ffmpeg:
        raise MediaError("ffmpeg is required for local video. Install it or set EMENG_FFMPEG.")
    process = subprocess.run(
        [ffmpeg, "-hide_banner", "-i", path],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
        creationflags=_subprocess_flags(),
    )
    output = process.stdout.decode("utf-8", "replace")
    match = _DURATION_PATTERN.search(output)
    if not match:
        raise MediaError("Unable to read video duration.")
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def normalize_local_video(source_path: str) -> str:
    source_path = bpy.path.abspath(source_path)
    extension = os.path.splitext(source_path)[1].lower()
    if extension not in VIDEO_EXTENSIONS or not os.path.isfile(source_path):
        raise MediaError("Choose an MP4, MOV, WebM, AVI, MKV, or M4V video.")
    duration = probe_duration(source_path)
    if duration > MAX_DURATION_SECONDS + 0.01:
        raise MediaError("Video exceeds the 30 second limit ({0:.2f}s).".format(duration))
    ffmpeg = ffmpeg_executable()
    target = os.path.join(_output_dir(), "emeng_local_{0}.mp4".format(_timestamp()))
    command = [
        ffmpeg,
        "-y",
        "-i", source_path,
        "-map", "0:v:0",
        "-map", "0:a?",
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p",
        "-r", str(FPS),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-tag:v", "avc1",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        target,
    ]
    try:
        subprocess.check_output(command, stderr=subprocess.STDOUT, creationflags=_subprocess_flags())
    except subprocess.CalledProcessError as error:
        detail = error.output.decode("utf-8", "replace")[-1200:]
        raise MediaError("ffmpeg conversion failed:\n{0}".format(detail))
    validate_output(target, "video/mp4")
    return target


def _render_snapshot(scene, camera, width, height) -> str:
    output = os.path.join(_output_dir(), "emeng_snapshot_{0}.png".format(_timestamp()))
    previous = _capture_render_state(scene)
    try:
        _configure_white_model(scene, camera, width, height)
        scene.render.image_settings.file_format = "PNG"
        scene.render.filepath = output
        bpy.ops.render.render(write_still=True)
    finally:
        _restore_render_state(scene, previous)
    validate_output(output, "image/png")
    return output


def _render_animation(scene, camera, width, height, frame_start, frame_end) -> str:
    frame_count = int(frame_end) - int(frame_start) + 1
    if frame_count < MIN_ANIMATION_FRAMES:
        raise MediaError("Frame range is empty.")
    if frame_count > MAX_DURATION_SECONDS * FPS:
        raise MediaError("Frame range exceeds {0} frames at {1}fps.".format(MAX_DURATION_SECONDS * FPS, FPS))
    output = os.path.join(_output_dir(), "emeng_animation_{0}.mp4".format(_timestamp()))
    previous = _capture_render_state(scene)
    try:
        _configure_white_model(scene, camera, width, height)
        scene.frame_start = int(frame_start)
        scene.frame_end = int(frame_end)
        scene.render.fps = FPS
        scene.render.image_settings.file_format = "FFMPEG"
        scene.render.ffmpeg.format = "MPEG4"
        scene.render.ffmpeg.codec = "H264"
        scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
        if hasattr(scene.render.ffmpeg, "ffmpeg_preset"):
            scene.render.ffmpeg.ffmpeg_preset = "REALTIME"
        scene.render.ffmpeg.audio_codec = "AAC"
        scene.render.filepath = output
        bpy.ops.render.render(animation=True)
    finally:
        _restore_render_state(scene, previous)
    candidates = (output, output + ".mp4")
    actual = next((path for path in candidates if os.path.isfile(path)), output)
    validate_output(actual, "video/mp4")
    return actual


def render_white_model(scene, camera, mode: str, resolution_key: str, frame_start: int, frame_end: int) -> str:
    if camera is None or getattr(camera, "type", None) != "CAMERA":
        raise MediaError("Choose a Blender camera.")
    width, height = resolution(scene, resolution_key)
    if mode == "SNAPSHOT":
        return _render_snapshot(scene, camera, width, height)
    return _render_animation(scene, camera, width, height, frame_start, frame_end)


def validate_output(path: str, mime_type: str):
    if not os.path.isfile(path):
        raise MediaError("Media output was not created.")
    size = os.path.getsize(path)
    limit = MAX_VIDEO_BYTES if mime_type == "video/mp4" else MAX_IMAGE_BYTES
    if size <= 0 or size > limit:
        raise MediaError("Media size is outside the supported limit.")


def _capture_render_state(scene):
    shading = scene.display.shading
    ffmpeg = scene.render.ffmpeg
    return {
        "camera": scene.camera,
        "engine": scene.render.engine,
        "filepath": scene.render.filepath,
        "resolution_x": scene.render.resolution_x,
        "resolution_y": scene.render.resolution_y,
        "resolution_percentage": scene.render.resolution_percentage,
        "frame_start": scene.frame_start,
        "frame_end": scene.frame_end,
        "fps": scene.render.fps,
        "file_format": scene.render.image_settings.file_format,
        "ffmpeg_format": ffmpeg.format,
        "ffmpeg_codec": ffmpeg.codec,
        "ffmpeg_constant_rate_factor": ffmpeg.constant_rate_factor,
        "ffmpeg_preset": getattr(ffmpeg, "ffmpeg_preset", None),
        "ffmpeg_audio_codec": ffmpeg.audio_codec,
        "color_type": shading.color_type,
        "single_color": tuple(shading.single_color),
        "light": shading.light,
        "show_shadows": shading.show_shadows,
        "show_cavity": shading.show_cavity,
    }


def _configure_white_model(scene, camera, width, height):
    scene.camera = camera
    try:
        scene.render.engine = "BLENDER_WORKBENCH"
    except TypeError:
        scene.render.engine = "BLENDER_WORKBENCH_NEXT"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.color_type = "SINGLE"
    shading.single_color = (0.72, 0.72, 0.72)
    shading.show_shadows = True
    shading.show_cavity = True


def _restore_render_state(scene, previous):
    scene.camera = previous["camera"]
    scene.render.engine = previous["engine"]
    scene.render.filepath = previous["filepath"]
    scene.render.resolution_x = previous["resolution_x"]
    scene.render.resolution_y = previous["resolution_y"]
    scene.render.resolution_percentage = previous["resolution_percentage"]
    scene.frame_start = previous["frame_start"]
    scene.frame_end = previous["frame_end"]
    scene.render.fps = previous["fps"]
    scene.render.image_settings.file_format = previous["file_format"]
    ffmpeg = scene.render.ffmpeg
    ffmpeg.format = previous["ffmpeg_format"]
    ffmpeg.codec = previous["ffmpeg_codec"]
    ffmpeg.constant_rate_factor = previous["ffmpeg_constant_rate_factor"]
    if previous["ffmpeg_preset"] is not None and hasattr(ffmpeg, "ffmpeg_preset"):
        ffmpeg.ffmpeg_preset = previous["ffmpeg_preset"]
    ffmpeg.audio_codec = previous["ffmpeg_audio_codec"]
    shading = scene.display.shading
    shading.color_type = previous["color_type"]
    shading.single_color = previous["single_color"]
    shading.light = previous["light"]
    shading.show_shadows = previous["show_shadows"]
    shading.show_cavity = previous["show_cavity"]
