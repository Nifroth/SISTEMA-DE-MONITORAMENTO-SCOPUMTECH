import re
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx


@dataclass
class MediaMTXConfig:
    media_server_url: str = "http://localhost:9997"
    hls_port: int = 8888
    webrtc_port: int = 8889


class MediaMTXService:
    def __init__(self, config: MediaMTXConfig):
        self.config = config

    @staticmethod
    def sanitize_stream_name(value: str) -> str:
        clean = re.sub(r"[^a-zA-Z0-9_]+", "_", value.strip().lower())
        return clean[:64] if clean else "camera_auto"

    async def register_rtsp_source(self, stream_name: str, rtsp_url: str) -> None:
        url = f"{self.config.media_server_url}/v3/config/paths/add/{stream_name}"
        payload = {"source": rtsp_url, "sourceOnDemand": True}
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code in (200, 201):
                return
            if response.status_code == 409:
                patch = await client.patch(
                    f"{self.config.media_server_url}/v3/config/paths/edit/{stream_name}",
                    json=payload,
                )
                patch.raise_for_status()
                return
            response.raise_for_status()

    async def remove_path(self, stream_name: str) -> None:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(f"{self.config.media_server_url}/v3/config/paths/remove/{stream_name}")

    def build_hls_url(self, stream_name: str) -> str:
        host = urlparse(self.config.media_server_url).hostname or "localhost"
        scheme = urlparse(self.config.media_server_url).scheme or "http"
        return f"{scheme}://{host}:{self.config.hls_port}/{stream_name}/index.m3u8"

    def build_webrtc_url(self, stream_name: str) -> str:
        host = urlparse(self.config.media_server_url).hostname or "localhost"
        scheme = urlparse(self.config.media_server_url).scheme or "http"
        return f"{scheme}://{host}:{self.config.webrtc_port}/{stream_name}/"
