"""Router for RTSP snapshot capture API."""

import logging

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from services.rtsp_snapshot import capture_snapshot, check_ffmpeg_available

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rtsp-snapshot", tags=["rtsp-snapshot"])


class CaptureRequest(BaseModel):
    stream_url: str


class HealthResponse(BaseModel):
    ffmpeg_available: bool


@router.post("/capture")
async def capture(data: CaptureRequest) -> Response:
    """Capture a single JPEG frame from an RTSP stream."""
    try:
        jpeg_bytes = capture_snapshot(data.stream_url)
        return Response(content=jpeg_bytes, media_type="image/jpeg")
    except ValueError as e:
        logger.warning(f"Invalid RTSP URL: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Snapshot capture failed: {e}")
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Check if ffmpeg is available for RTSP snapshot capture."""
    available = check_ffmpeg_available()
    return HealthResponse(ffmpeg_available=available)