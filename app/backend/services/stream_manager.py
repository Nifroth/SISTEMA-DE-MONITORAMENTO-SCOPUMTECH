from dataclasses import dataclass
from typing import Optional

from services.camera_detector import CameraDetector, CameraProbeInput
from services.mediamtx_service import MediaMTXConfig, MediaMTXService


@dataclass
class AutoStreamRequest:
    zone_id: int
    camera_ip: str
    camera_port: int
    username: str
    password: str
    channel: int
    vendor_hint: Optional[str] = None
    stream_name: Optional[str] = None
    media_server_url: str = "http://localhost:9997"
    hls_port: int = 8888
    webrtc_port: int = 8889
    resolution: str = "1920x1080"
    fps: int = 30
    bitrate: str = "4Mbps"


class StreamManager:
    def __init__(self):
        self.detector = CameraDetector()

    async def onboard_camera(self, req: AutoStreamRequest) -> dict:
        probe = self.detector.probe(
            CameraProbeInput(
                ip=req.camera_ip,
                port=req.camera_port,
                username=req.username,
                password=req.password,
                channel=req.channel,
                vendor_hint=req.vendor_hint,
            )
        )

        if not probe.reachable:
            raise ValueError("Camera IP/porta não estão acessíveis a partir do servidor.")

        stream_name_seed = req.stream_name or f"camera_{req.zone_id}_{req.camera_ip}_{req.channel}"
        mediamtx = MediaMTXService(
            MediaMTXConfig(
                media_server_url=req.media_server_url,
                hls_port=req.hls_port,
                webrtc_port=req.webrtc_port,
            )
        )
        stream_name = mediamtx.sanitize_stream_name(stream_name_seed)

        last_error = None
        selected_rtsp = None
        for candidate in probe.rtsp_candidates:
            try:
                await mediamtx.register_rtsp_source(stream_name, candidate)
                selected_rtsp = candidate
                break
            except Exception as err:
                last_error = str(err)
                continue

        if not selected_rtsp:
            raise ValueError(f"Não foi possível registrar stream RTSP no MediaMTX. {last_error or ''}".strip())

        return {
            "stream_name": stream_name,
            "vendor": probe.vendor,
            "rtsp_url": selected_rtsp,
            "hls_url": mediamtx.build_hls_url(stream_name),
            "webrtc_url": mediamtx.build_webrtc_url(stream_name),
            "status": "online",
            "resolution": req.resolution,
            "fps": req.fps,
            "bitrate": req.bitrate,
            "protocol": "rtsp",
        }
