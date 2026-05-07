import re
import socket
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class CameraProbeInput:
    ip: str
    port: int
    username: str
    password: str
    channel: int = 1
    vendor_hint: Optional[str] = None


@dataclass
class CameraProbeResult:
    vendor: str
    rtsp_candidates: List[str]
    reachable: bool


class CameraDetector:
    """Build likely RTSP URLs from common camera vendors."""

    _VENDOR_PATH_PATTERNS = {
        "hikvision": [
            "/h264/ch{ch}/main/av_stream",
            "/Streaming/Channels/{ch:03d}",
        ],
        "intelbras": [
            "/cam/realmonitor?channel={ch}&subtype=0",
            "/cam/realmonitor?channel={ch}&subtype=1",
        ],
        "dahua": [
            "/cam/realmonitor?channel={ch}&subtype=0",
            "/cam/realmonitor?channel={ch}&subtype=1",
        ],
        "generic": [
            "/h264/ch{ch}/main/av_stream",
            "/Streaming/Channels/{ch:03d}",
            "/cam/realmonitor?channel={ch}&subtype=0",
            "/live/ch{ch}",
            "/stream{ch}",
        ],
    }

    @staticmethod
    def _normalize_vendor(vendor_hint: Optional[str]) -> str:
        if not vendor_hint:
            return "generic"
        hint = vendor_hint.strip().lower()
        if "hik" in hint:
            return "hikvision"
        if "intel" in hint:
            return "intelbras"
        if "dahua" in hint:
            return "dahua"
        return "generic"

    @staticmethod
    def _is_reachable(ip: str, port: int, timeout_sec: float = 2.0) -> bool:
        try:
            with socket.create_connection((ip, port), timeout=timeout_sec):
                return True
        except OSError:
            return False

    @staticmethod
    def _build_rtsp(auth_user: str, auth_pass: str, ip: str, port: int, path: str) -> str:
        safe_user = re.sub(r"\s+", "", auth_user or "")
        safe_pass = auth_pass or ""
        auth = f"{safe_user}:{safe_pass}@" if safe_user else ""
        return f"rtsp://{auth}{ip}:{port}{path}"

    def probe(self, payload: CameraProbeInput) -> CameraProbeResult:
        vendor = self._normalize_vendor(payload.vendor_hint)
        channel = max(payload.channel, 1)
        reachable = self._is_reachable(payload.ip, payload.port)
        patterns = self._VENDOR_PATH_PATTERNS.get(vendor, self._VENDOR_PATH_PATTERNS["generic"])
        generic_patterns = self._VENDOR_PATH_PATTERNS["generic"]

        ordered_patterns = patterns + [p for p in generic_patterns if p not in patterns]
        candidates = []
        for pattern in ordered_patterns:
            path = pattern.format(ch=channel)
            candidates.append(
                self._build_rtsp(
                    auth_user=payload.username,
                    auth_pass=payload.password,
                    ip=payload.ip,
                    port=payload.port,
                    path=path,
                )
            )

        return CameraProbeResult(vendor=vendor, rtsp_candidates=candidates, reachable=reachable)
