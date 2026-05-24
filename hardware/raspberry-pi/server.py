#!/usr/bin/env python3
"""HTTP service for Capapply Raspberry Pi speaker + motor."""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
HOST = os.environ.get("CAPAPPLY_PI_HOST", "0.0.0.0")
PORT = int(os.environ.get("CAPAPPLY_PI_PORT", "8765"))
MOTOR_GPIO_PIN = int(os.environ.get("CAPAPPLY_MOTOR_GPIO_PIN", "17"))
MOTOR_MOVE_MS = int(os.environ.get("CAPAPPLY_MOTOR_MOVE_MS", "2000"))
SPEAKER_DEVICE = os.environ.get("CAPAPPLY_SPEAKER_DEVICE", "default")


def _gpio_output():
    try:
        from gpiozero import OutputDevice

        return OutputDevice(MOTOR_GPIO_PIN)
    except Exception:
        return None


_motor_lock = threading.Lock()
_motor_line = _gpio_output()


def move_motor(duration_ms: int = MOTOR_MOVE_MS) -> None:
    if _motor_line is None:
        print(f"[mock motor] pulse {duration_ms}ms on GPIO {MOTOR_GPIO_PIN}")
        return

    with _motor_lock:
        _motor_line.on()
        threading.Event().wait(duration_ms / 1000)
        _motor_line.off()


def play_audio_file(file_path: Path) -> None:
    suffix = file_path.suffix.lower()
    env = os.environ.copy()
    if SPEAKER_DEVICE and SPEAKER_DEVICE != "default":
        env["AUDIODEV"] = SPEAKER_DEVICE

    if suffix in {".wav"}:
        command = ["aplay", "-q", str(file_path)]
    else:
        command = [
            "ffplay",
            "-nodisp",
            "-autoexit",
            "-loglevel",
            "quiet",
            str(file_path),
        ]

    subprocess.run(command, check=True, env=env)


class CapapplyHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A003
        print(f"[capapply-pi] {self.address_string()} - {format % args}")

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", "0"))
        return self.rfile.read(length) if length else b""

    def _json_response(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._json_response(200, {"ok": True})
            return
        self._json_response(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path == "/motor/move":
            try:
                payload = json.loads(self._read_body() or b"{}")
            except json.JSONDecodeError:
                self._json_response(400, {"error": "invalid json"})
                return

            duration_ms = int(payload.get("durationMs", MOTOR_MOVE_MS))
            move_motor(duration_ms)
            self._json_response(200, {"ok": True, "durationMs": duration_ms})
            return

        if self.path == "/play":
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in content_type:
                self._json_response(400, {"error": "expected multipart audio upload"})
                return

            boundary = content_type.split("boundary=", 1)[-1].strip()
            body = self._read_body()
            audio_bytes, filename = _extract_multipart_file(body, boundary)
            if not audio_bytes:
                self._json_response(400, {"error": "missing audio file"})
                return

            suffix = Path(filename or "song.m4a").suffix or ".m4a"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = Path(tmp.name)

            try:
                play_audio_file(tmp_path)
            finally:
                tmp_path.unlink(missing_ok=True)

            self._json_response(200, {"ok": True, "played": filename})
            return

        self._json_response(404, {"error": "not found"})


def _extract_multipart_file(body: bytes, boundary: str) -> tuple[bytes | None, str | None]:
    delimiter = f"--{boundary}".encode("utf-8")
    parts = body.split(delimiter)
    for part in parts:
        if b"filename=" not in part:
            continue
        header_block, _, content = part.partition(b"\r\n\r\n")
        if not content:
            continue
        content = content.rstrip(b"\r\n-")
        header_text = header_block.decode("utf-8", errors="ignore")
        filename = None
        for line in header_text.splitlines():
            if "filename=" in line:
                filename = line.split("filename=", 1)[1].strip().strip('"')
                break
        return content, filename
    return None, None


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), CapapplyHandler)
    print(f"Capapply Pi hardware server listening on http://{HOST}:{PORT}")
    print(f"Motor GPIO pin {MOTOR_GPIO_PIN}, default move {MOTOR_MOVE_MS}ms")
    server.serve_forever()


if __name__ == "__main__":
    main()
