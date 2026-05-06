"""
Stream Converter Router
API endpoints for RTSP/RTMP to HLS/WebRTC stream conversion.
Communicates with external media servers (MediaMTX, go2rtc, SRS) to manage stream sources.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.stream_converter import StreamConverterService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/stream-converter", tags=["stream-converter"])


# ---------- Request/Response Schemas ----------


class ConvertStreamRequest(BaseModel):
    """Request to convert a camera stream by its database ID."""
    camera_stream_id: int
    media_server_url: str = "http://localhost:9997"
    hls_port: int = 8888
    webrtc_port: int = 8889
    server_type: str = "mediamtx"


class ConvertDirectRequest(BaseModel):
    """Request to convert an RTSP/RTMP URL directly (no database record needed)."""
    stream_url: str
    media_server_url: str = "http://localhost:9997"
    hls_port: int = 8888
    webrtc_port: int = 8889
    server_type: str = "mediamtx"


class BatchConvertRequest(BaseModel):
    """Request to batch-convert all camera streams."""
    media_server_url: str = "http://localhost:9997"
    hls_port: int = 8888
    webrtc_port: int = 8889
    server_type: str = "mediamtx"


class ServerHealthRequest(BaseModel):
    """Request to check media server health."""
    media_server_url: str = "http://localhost:9997"
    server_type: str = "mediamtx"


class StreamHealthRequest(BaseModel):
    """Request to check a specific stream's health."""
    stream_name: str
    media_server_url: str = "http://localhost:9997"
    server_type: str = "mediamtx"


class StreamListRequest(BaseModel):
    """Request to list streams on the media server."""
    media_server_url: str = "http://localhost:9997"
    server_type: str = "mediamtx"


# ---------- Endpoints ----------


@router.post("/convert")
async def convert_stream(
    data: ConvertStreamRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Convert a camera stream (by database ID) from RTSP/RTMP to HLS.
    Registers the stream source with the media server and updates the database record.
    """
    try:
        service = StreamConverterService(db)
        result = await service.convert_stream(
            camera_stream_id=data.camera_stream_id,
            media_server_url=data.media_server_url,
            hls_port=data.hls_port,
            webrtc_port=data.webrtc_port,
            server_type=data.server_type,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error converting stream: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to convert stream: {str(e)}")


@router.post("/convert-direct")
async def convert_stream_direct(
    data: ConvertDirectRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Convert an RTSP/RTMP URL directly to HLS without requiring a database record.
    Useful for testing stream conversion before saving to the database.
    """
    try:
        service = StreamConverterService(db)
        result = await service.convert_stream_direct(
            stream_url=data.stream_url,
            media_server_url=data.media_server_url,
            hls_port=data.hls_port,
            webrtc_port=data.webrtc_port,
            server_type=data.server_type,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in direct stream conversion: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to convert stream: {str(e)}")


@router.post("/batch-convert")
async def batch_convert_streams(
    data: BatchConvertRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Batch-convert all camera streams that have a stream_url.
    Registers all streams with the media server and updates their HLS URLs.
    """
    try:
        service = StreamConverterService(db)
        result = await service.batch_convert(
            media_server_url=data.media_server_url,
            hls_port=data.hls_port,
            webrtc_port=data.webrtc_port,
            server_type=data.server_type,
        )
        return result
    except Exception as e:
        logger.error(f"Error in batch conversion: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch conversion failed: {str(e)}")


@router.post("/server-health")
async def check_server_health(
    data: ServerHealthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Check if the media server is reachable and healthy.
    """
    try:
        service = StreamConverterService(db)
        result = await service.check_server_health(
            media_server_url=data.media_server_url,
            server_type=data.server_type,
        )
        return result
    except Exception as e:
        logger.error(f"Error checking server health: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.post("/stream-health")
async def check_stream_health(
    data: StreamHealthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Check the health/status of a specific stream on the media server.
    """
    try:
        service = StreamConverterService(db)
        result = await service.check_stream_health(
            stream_name=data.stream_name,
            media_server_url=data.media_server_url,
            server_type=data.server_type,
        )
        return result
    except Exception as e:
        logger.error(f"Error checking stream health: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Stream health check failed: {str(e)}")


@router.post("/stream-list")
async def list_streams(
    data: StreamListRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    List all active streams on the media server.
    """
    try:
        service = StreamConverterService(db)
        result = await service.get_stream_list(
            media_server_url=data.media_server_url,
            server_type=data.server_type,
        )
        return result
    except Exception as e:
        logger.error(f"Error listing streams: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list streams: {str(e)}")