"""
Stream Converter Service
Handles RTSP/RTMP to HLS conversion via external media server (MediaMTX/go2rtc/SRS).
Communicates with the media server's REST API to manage stream sources and generate HLS URLs.
"""

import logging
import re
from typing import Any, Dict, Optional
from urllib.parse import urlparse

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.camera_streams import Camera_streams

logger = logging.getLogger(__name__)

# Default media server configuration
DEFAULT_MEDIA_SERVER_URL = "http://localhost:9997"
DEFAULT_HLS_PORT = 8888
DEFAULT_WEBRTC_PORT = 8889

# Timeout for external HTTP calls (seconds)
HTTP_TIMEOUT = 10.0


def sanitize_stream_name(stream_url: str) -> str:
    """Generate a safe stream name from an RTSP/RTMP URL."""
    try:
        # Remove credentials from URL for name generation
        cleaned = re.sub(r"://[^@]+@", "://", stream_url)
        parsed = urlparse(cleaned.replace("rtsp://", "http://").replace("rtmp://", "http://"))
        host = parsed.hostname or "unknown"
        port = parsed.port or 554
        path = parsed.path.strip("/").replace("/", "_") if parsed.path else "stream"
        # Create a clean name
        name = f"cam_{host.replace('.', '_')}_{port}_{path}"
        # Remove any non-alphanumeric characters except underscore
        name = re.sub(r"[^a-zA-Z0-9_]", "", name)
        return name[:64]  # Limit length
    except Exception:
        return "cam_unknown"


def build_hls_url(
    stream_name: str,
    server_url: str,
    hls_port: int = DEFAULT_HLS_PORT,
    server_type: str = "mediamtx",
) -> str:
    """Build the HLS URL based on the media server type."""
    try:
        parsed = urlparse(server_url)
        hostname = parsed.hostname or "localhost"
        scheme = parsed.scheme or "http"

        if server_type == "mediamtx":
            return f"{scheme}://{hostname}:{hls_port}/{stream_name}/index.m3u8"
        elif server_type == "go2rtc":
            return f"{scheme}://{hostname}:{hls_port}/api/stream.m3u8?src={stream_name}"
        elif server_type == "srs":
            return f"{scheme}://{hostname}:{hls_port}/live/{stream_name}.m3u8"
        else:
            return f"{scheme}://{hostname}:{hls_port}/{stream_name}/index.m3u8"
    except Exception:
        return ""


def build_webrtc_url(
    stream_name: str,
    server_url: str,
    webrtc_port: int = DEFAULT_WEBRTC_PORT,
    server_type: str = "mediamtx",
) -> str:
    """Build the WebRTC URL based on the media server type."""
    try:
        parsed = urlparse(server_url)
        hostname = parsed.hostname or "localhost"
        scheme = parsed.scheme or "http"

        if server_type == "mediamtx":
            # MediaMTX exposes a browser-ready WebRTC page at /<stream_name>/.
            return f"{scheme}://{hostname}:{webrtc_port}/{stream_name}/"
        elif server_type == "go2rtc":
            return f"{scheme}://{hostname}:{webrtc_port}/api/webrtc?src={stream_name}"
        else:
            return f"{scheme}://{hostname}:{webrtc_port}/{stream_name}/whep"
    except Exception:
        return ""


class StreamConverterService:
    """Service for managing RTSP/RTMP to HLS/WebRTC stream conversion."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def convert_stream(
        self,
        camera_stream_id: int,
        media_server_url: str = DEFAULT_MEDIA_SERVER_URL,
        hls_port: int = DEFAULT_HLS_PORT,
        webrtc_port: int = DEFAULT_WEBRTC_PORT,
        server_type: str = "mediamtx",
    ) -> Dict[str, Any]:
        """
        Convert an RTSP/RTMP stream to HLS by registering it with the media server.
        Updates the camera_streams record with the generated HLS URL.
        """
        # Fetch the camera stream record
        query = select(Camera_streams).where(Camera_streams.id == camera_stream_id)
        result = await self.db.execute(query)
        camera = result.scalar_one_or_none()

        if not camera:
            raise ValueError(f"Camera stream with id {camera_stream_id} not found")

        stream_url = camera.stream_url
        if not stream_url:
            raise ValueError("Camera stream has no stream_url configured")

        # Generate stream name and URLs
        stream_name = sanitize_stream_name(stream_url)
        hls_url = build_hls_url(stream_name, media_server_url, hls_port, server_type)
        webrtc_url = build_webrtc_url(stream_name, media_server_url, webrtc_port, server_type)

        # Register the stream source with the media server
        registration_result = await self._register_stream_source(
            stream_name=stream_name,
            stream_url=stream_url,
            media_server_url=media_server_url,
            server_type=server_type,
        )

        # Update the camera_streams record with the HLS URL
        camera.hls_url = hls_url
        camera.status = "online"
        await self.db.commit()
        await self.db.refresh(camera)

        logger.info(
            f"Stream conversion configured: camera_id={camera_stream_id}, "
            f"stream_name={stream_name}, hls_url={hls_url}"
        )

        return {
            "camera_stream_id": camera_stream_id,
            "stream_name": stream_name,
            "stream_url": stream_url,
            "hls_url": hls_url,
            "webrtc_url": webrtc_url,
            "server_type": server_type,
            "registration": registration_result,
            "status": "configured",
        }

    async def convert_stream_direct(
        self,
        stream_url: str,
        media_server_url: str = DEFAULT_MEDIA_SERVER_URL,
        hls_port: int = DEFAULT_HLS_PORT,
        webrtc_port: int = DEFAULT_WEBRTC_PORT,
        server_type: str = "mediamtx",
    ) -> Dict[str, Any]:
        """
        Convert an RTSP/RTMP stream URL directly (without a database record).
        Useful for testing or ad-hoc conversion.
        """
        if not stream_url:
            raise ValueError("stream_url is required")

        stream_name = sanitize_stream_name(stream_url)
        hls_url = build_hls_url(stream_name, media_server_url, hls_port, server_type)
        webrtc_url = build_webrtc_url(stream_name, media_server_url, webrtc_port, server_type)

        registration_result = await self._register_stream_source(
            stream_name=stream_name,
            stream_url=stream_url,
            media_server_url=media_server_url,
            server_type=server_type,
        )

        return {
            "stream_name": stream_name,
            "stream_url": stream_url,
            "hls_url": hls_url,
            "webrtc_url": webrtc_url,
            "server_type": server_type,
            "registration": registration_result,
            "status": "configured",
        }

    async def batch_convert(
        self,
        media_server_url: str = DEFAULT_MEDIA_SERVER_URL,
        hls_port: int = DEFAULT_HLS_PORT,
        webrtc_port: int = DEFAULT_WEBRTC_PORT,
        server_type: str = "mediamtx",
    ) -> Dict[str, Any]:
        """
        Convert all camera streams that have a stream_url but no hls_url.
        """
        query = select(Camera_streams).where(
            Camera_streams.stream_url.isnot(None),
            Camera_streams.stream_url != "",
        )
        result = await self.db.execute(query)
        cameras = result.scalars().all()

        results = []
        errors = []

        for camera in cameras:
            try:
                conversion = await self.convert_stream(
                    camera_stream_id=camera.id,
                    media_server_url=media_server_url,
                    hls_port=hls_port,
                    webrtc_port=webrtc_port,
                    server_type=server_type,
                )
                results.append(conversion)
            except Exception as e:
                errors.append({
                    "camera_stream_id": camera.id,
                    "error": str(e),
                })
                logger.error(f"Error converting stream for camera {camera.id}: {e}")

        return {
            "total_cameras": len(cameras),
            "converted": len(results),
            "errors": len(errors),
            "results": results,
            "error_details": errors,
        }

    async def check_stream_health(
        self,
        stream_name: str,
        media_server_url: str = DEFAULT_MEDIA_SERVER_URL,
        server_type: str = "mediamtx",
    ) -> Dict[str, Any]:
        """Check the health/status of a stream on the media server."""
        if server_type == "mediamtx":
            return await self._check_mediamtx_stream(stream_name, media_server_url)
        elif server_type == "go2rtc":
            return await self._check_go2rtc_stream(stream_name, media_server_url)
        else:
            return {"status": "unknown", "message": f"Health check not supported for {server_type}"}

    async def check_server_health(
        self,
        media_server_url: str = DEFAULT_MEDIA_SERVER_URL,
        server_type: str = "mediamtx",
    ) -> Dict[str, Any]:
        """Check if the media server is reachable and healthy."""
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as http_client:
                if server_type == "mediamtx":
                    url = f"{media_server_url}/v3/config/global/get"
                    response = await http_client.get(url)
                    if response.status_code == 200:
                        return {"status": "healthy", "server_type": server_type, "details": response.json()}
                    return {"status": "unhealthy", "server_type": server_type, "http_status": response.status_code}

                elif server_type == "go2rtc":
                    url = f"{media_server_url}/api/config"
                    response = await http_client.get(url)
                    if response.status_code == 200:
                        return {"status": "healthy", "server_type": server_type, "details": response.json()}
                    return {"status": "unhealthy", "server_type": server_type, "http_status": response.status_code}

                else:
                    return {"status": "unknown", "message": f"Health check not implemented for {server_type}"}

        except httpx.ConnectError:
            return {"status": "unreachable", "server_type": server_type, "message": "Cannot connect to media server"}
        except httpx.TimeoutException:
            return {"status": "timeout", "server_type": server_type, "message": "Connection timed out"}
        except Exception as e:
            return {"status": "error", "server_type": server_type, "message": str(e)}

    async def get_stream_list(
        self,
        media_server_url: str = DEFAULT_MEDIA_SERVER_URL,
        server_type: str = "mediamtx",
    ) -> Dict[str, Any]:
        """List all active streams on the media server."""
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as http_client:
                if server_type == "mediamtx":
                    url = f"{media_server_url}/v3/paths/list"
                    response = await http_client.get(url)
                    if response.status_code == 200:
                        data = response.json()
                        return {"status": "ok", "streams": data.get("items", []), "total": len(data.get("items", []))}
                    return {"status": "error", "http_status": response.status_code}

                elif server_type == "go2rtc":
                    url = f"{media_server_url}/api/streams"
                    response = await http_client.get(url)
                    if response.status_code == 200:
                        data = response.json()
                        streams = [{"name": k, "producers": v.get("producers", [])} for k, v in data.items()]
                        return {"status": "ok", "streams": streams, "total": len(streams)}
                    return {"status": "error", "http_status": response.status_code}

                else:
                    return {"status": "unknown", "message": f"Stream listing not supported for {server_type}"}

        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ---- Private methods for media server communication ----

    async def _register_stream_source(
        self,
        stream_name: str,
        stream_url: str,
        media_server_url: str,
        server_type: str,
    ) -> Dict[str, Any]:
        """Register an RTSP/RTMP source with the media server."""
        try:
            if server_type == "mediamtx":
                return await self._register_mediamtx(stream_name, stream_url, media_server_url)
            elif server_type == "go2rtc":
                return await self._register_go2rtc(stream_name, stream_url, media_server_url)
            else:
                # For other server types, just return the generated URLs
                return {
                    "registered": False,
                    "message": f"Auto-registration not supported for {server_type}. "
                    "Please configure the stream source manually on the media server.",
                }
        except Exception as e:
            logger.warning(f"Failed to register stream with media server: {e}")
            return {
                "registered": False,
                "message": f"Could not register with media server: {str(e)}. "
                "The HLS URL has been generated but the media server may need manual configuration.",
            }

    async def _register_mediamtx(
        self,
        stream_name: str,
        stream_url: str,
        media_server_url: str,
    ) -> Dict[str, Any]:
        """Register a stream source with MediaMTX via its REST API."""
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as http_client:
            # First, try to add a new path configuration
            config_url = f"{media_server_url}/v3/config/paths/add/{stream_name}"
            payload = {
                "source": stream_url,
                "sourceOnDemand": True,
            }

            response = await http_client.post(config_url, json=payload)

            if response.status_code in (200, 201):
                return {"registered": True, "message": "Stream registered successfully with MediaMTX"}

            # If path already exists, try to update it
            if response.status_code == 409:
                edit_url = f"{media_server_url}/v3/config/paths/edit/{stream_name}"
                response = await http_client.patch(edit_url, json=payload)
                if response.status_code == 200:
                    return {"registered": True, "message": "Stream configuration updated on MediaMTX"}

            return {
                "registered": False,
                "message": f"MediaMTX returned status {response.status_code}: {response.text}",
            }

    async def _register_go2rtc(
        self,
        stream_name: str,
        stream_url: str,
        media_server_url: str,
    ) -> Dict[str, Any]:
        """Register a stream source with go2rtc via its REST API."""
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as http_client:
            url = f"{media_server_url}/api/streams"
            payload = {stream_name: {"name": stream_name, "url": stream_url}}

            response = await http_client.put(url, json=payload)

            if response.status_code in (200, 201):
                return {"registered": True, "message": "Stream registered successfully with go2rtc"}

            return {
                "registered": False,
                "message": f"go2rtc returned status {response.status_code}: {response.text}",
            }

    async def _check_mediamtx_stream(
        self,
        stream_name: str,
        media_server_url: str,
    ) -> Dict[str, Any]:
        """Check stream health on MediaMTX."""
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as http_client:
                url = f"{media_server_url}/v3/paths/get/{stream_name}"
                response = await http_client.get(url)

                if response.status_code == 200:
                    data = response.json()
                    source_ready = data.get("sourceReady", False)
                    readers = data.get("readers", [])
                    return {
                        "status": "active" if source_ready else "inactive",
                        "source_ready": source_ready,
                        "reader_count": len(readers),
                        "details": data,
                    }
                elif response.status_code == 404:
                    return {"status": "not_found", "message": f"Stream '{stream_name}' not found on MediaMTX"}
                else:
                    return {"status": "error", "http_status": response.status_code}

        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def _check_go2rtc_stream(
        self,
        stream_name: str,
        media_server_url: str,
    ) -> Dict[str, Any]:
        """Check stream health on go2rtc."""
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as http_client:
                url = f"{media_server_url}/api/streams"
                response = await http_client.get(url)

                if response.status_code == 200:
                    data = response.json()
                    if stream_name in data:
                        stream_info = data[stream_name]
                        producers = stream_info.get("producers", [])
                        return {
                            "status": "active" if producers else "inactive",
                            "producer_count": len(producers),
                            "details": stream_info,
                        }
                    return {"status": "not_found", "message": f"Stream '{stream_name}' not found on go2rtc"}
                else:
                    return {"status": "error", "http_status": response.status_code}

        except Exception as e:
            return {"status": "error", "message": str(e)}