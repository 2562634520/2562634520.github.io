"""Secure loopback bridge shared by the Emeng Blender add-on."""

from __future__ import annotations

import base64
import http.server
import json
import mimetypes
import os
import secrets
import shutil
import threading
import time
import urllib.parse


PROTOCOL = "emeng-dcc-import"
PROTOCOL_VERSION = 1
DEFAULT_TTL_SECONDS = 30 * 60
TRUSTED_HOST_SUFFIXES = ("docile-luck-8545.chatgpt.site",)
TRUSTED_COS_HOST_SUFFIXES = ("myqcloud.com",)
_SERVERS = []


class BridgeError(RuntimeError):
    """Raised when a bridge cannot be created safely."""


def _normalize_web_origin(value: str) -> str:
    parsed = urllib.parse.urlparse((value or "").strip())
    host = (parsed.hostname or "").lower().rstrip(".")
    is_loopback = host in ("127.0.0.1", "localhost")
    is_emeng = any(host == suffix or host.endswith("." + suffix) for suffix in TRUSTED_HOST_SUFFIXES)
    if (
        parsed.scheme not in (("http",) if is_loopback else ("https",))
        or not (is_loopback or is_emeng)
        or parsed.username
        or parsed.password
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
    ):
        raise BridgeError("Web origin must be an HTTPS Emeng origin or a loopback development origin.")
    port = "" if parsed.port is None else ":{0}".format(parsed.port)
    return "{0}://{1}{2}".format(parsed.scheme, host, port)


def _base64_url(value: str) -> str:
    return base64.urlsafe_b64encode(value.encode("utf-8")).decode("ascii").rstrip("=")


def _mime_type(path: str) -> str:
    extension = os.path.splitext(path)[1].lower()
    allowed = {
        ".mp4": "video/mp4",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    mime = allowed.get(extension) or mimetypes.guess_type(path)[0]
    if mime not in allowed.values():
        raise BridgeError("Unsupported bridge media type: {0}".format(extension or "unknown"))
    return mime


def _normalize_cos_video_url(value: str) -> tuple[str, str]:
    raw = (value or "").strip()
    if len(raw) > 4096:
        raise BridgeError("COS video URL is too long.")
    parsed = urllib.parse.urlparse(raw)
    host = (parsed.hostname or "").lower().rstrip(".")
    trusted = any(host == suffix or host.endswith("." + suffix) for suffix in TRUSTED_HOST_SUFFIXES + TRUSTED_COS_HOST_SUFFIXES)
    filename = os.path.basename(urllib.parse.unquote(parsed.path or ""))
    if (
        parsed.scheme != "https"
        or not trusted
        or parsed.username
        or parsed.password
        or parsed.fragment
        or not filename.lower().endswith(".mp4")
    ):
        raise BridgeError("COS video must be an HTTPS MP4 URL from Emeng or Tencent COS.")
    return urllib.parse.urlunparse(parsed), filename


def build_cos_import_url(cos_url: str, web_origin: str, source_app: str = "blender") -> str:
    """Return a fragment-only receiver URL for an existing COS MP4 object."""

    if source_app not in ("blender", "maya"):
        raise BridgeError("Unsupported DCC source app.")
    origin = _normalize_web_origin(web_origin)
    normalized_url, filename = _normalize_cos_video_url(cos_url)
    return "{0}/?canvas&dccImport=1#v={1}&source=cos&url={2}&filename={3}&app={4}".format(
        origin,
        PROTOCOL_VERSION,
        _base64_url(normalized_url),
        _base64_url(filename),
        source_app,
    )


def _content_disposition(path: str) -> str:
    filename = os.path.basename(path).replace("\r", "_").replace("\n", "_")
    fallback = "".join(character if 0x20 <= ord(character) <= 0x7E and character != '"' else "_" for character in filename)
    return "inline; filename=\"{0}\"; filename*=UTF-8''{1}".format(
        fallback,
        urllib.parse.quote(filename),
    )


def start_bridge(media_path: str, web_origin: str, media_kind: str):
    """Start one token-scoped bridge and return its fragment-only import URL."""

    media_path = os.path.abspath(media_path)
    if not os.path.isfile(media_path):
        raise BridgeError("Media file does not exist: {0}".format(media_path))
    origin = _normalize_web_origin(web_origin)
    token = secrets.token_urlsafe(32)
    import_id = secrets.token_urlsafe(18)
    expires_at = time.time() + DEFAULT_TTL_SECONDS
    file_size = os.path.getsize(media_path)
    mime_type = _mime_type(media_path)

    class Handler(http.server.BaseHTTPRequestHandler):
        server_version = "EmengDccBridge/1"
        sys_version = ""

        def log_message(self, _format, *args):
            return

        def _origin_allowed(self):
            return self.headers.get("Origin", "") == self.server.allowed_origin

        def _write_cors(self):
            if self._origin_allowed():
                self.send_header("Access-Control-Allow-Origin", self.server.allowed_origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Private-Network", "true")

        def _json(self, status, payload):
            body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            self.send_response(status)
            self._write_cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _validate(self, paths):
            parsed = urllib.parse.urlparse(self.path or "")
            params = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
            if parsed.path not in paths or parsed.fragment or params != [("token", token)]:
                self._json(403, {"status": "failed", "code": "INVALID_REQUEST"})
                return None
            if time.time() > expires_at:
                self._json(410, {"status": "failed", "code": "TOKEN_EXPIRED"})
                self.server.stop_soon()
                return None
            return parsed

        def do_OPTIONS(self):
            if not self._origin_allowed():
                self._json(403, {"status": "failed", "code": "INVALID_ORIGIN"})
                return
            if self._validate(("/resource_info", "/file", "/complete")) is None:
                return
            self.send_response(204)
            self._write_cors()
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

        def do_GET(self):
            parsed = self._validate(("/resource_info", "/file"))
            if parsed is None:
                return
            if not self._origin_allowed():
                self._json(403, {"status": "failed", "code": "INVALID_ORIGIN"})
                return
            port = self.server.server_port
            quoted_token = urllib.parse.quote(token, safe="")
            if parsed.path == "/resource_info":
                self._json(
                    200,
                    {
                        "protocol": PROTOCOL,
                        "version": PROTOCOL_VERSION,
                        "import_id": import_id,
                        "source_app": "blender",
                        "media_kind": media_kind,
                        "file_url": "http://127.0.0.1:{0}/file?token={1}".format(port, quoted_token),
                        "complete_url": "http://127.0.0.1:{0}/complete?token={1}".format(port, quoted_token),
                        "filename": os.path.basename(media_path),
                        "mime_type": mime_type,
                        "file_size": file_size,
                        "expires_at": int(expires_at * 1000),
                    },
                )
                return
            if not os.path.isfile(media_path):
                self._json(404, {"status": "failed", "code": "FILE_NOT_FOUND"})
                return
            self.send_response(200)
            self._write_cors()
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(file_size))
            self.send_header("Content-Disposition", _content_disposition(media_path))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            try:
                with open(media_path, "rb") as stream:
                    shutil.copyfileobj(stream, self.wfile)
            except (BrokenPipeError, ConnectionResetError):
                return

        def do_POST(self):
            if self._validate(("/complete",)) is None:
                return
            if not self._origin_allowed():
                self._json(403, {"status": "failed", "code": "INVALID_ORIGIN"})
                return
            self._json(200, {"status": "completed", "import_id": import_id})
            self.server.stop_soon()

    class Server(http.server.ThreadingHTTPServer):
        daemon_threads = True
        allow_reuse_address = True

        def stop_soon(self):
            threading.Thread(target=self.shutdown, daemon=True).start()

    server = Server(("127.0.0.1", 0), Handler)
    server.allowed_origin = origin
    _SERVERS.append(server)
    thread = threading.Thread(target=server.serve_forever, name="EmengBlenderBridge", daemon=True)
    thread.start()
    timer = threading.Timer(DEFAULT_TTL_SECONDS, server.stop_soon)
    timer.daemon = True
    timer.start()

    resource_url = "http://127.0.0.1:{0}/resource_info?token={1}".format(
        server.server_port,
        urllib.parse.quote(token, safe=""),
    )
    import_url = "{0}/?canvas&dccImport=1#v={1}&resource={2}".format(
        origin,
        PROTOCOL_VERSION,
        _base64_url(resource_url),
    )
    return import_url, server


def shutdown_all():
    """Stop every live bridge when the add-on is disabled."""

    for server in list(_SERVERS):
        try:
            server.shutdown()
            server.server_close()
        except Exception:
            pass
    _SERVERS[:] = []
