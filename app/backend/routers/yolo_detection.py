"""
YOLOv8 Detection Router
API endpoints for real-time object detection on camera streams.
"""
import logging

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from services.rtsp_snapshot import capture_snapshot
from services.yolo_detection import detect_objects, get_model_info

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/yolo-detection", tags=["yolo-detection"])


class DetectionRequest(BaseModel):
    stream_url: str
    confidence: float = 0.5


class DetectionMetadata(BaseModel):
    person_count: int
    total_objects: int
    detections: list


@router.post("/detect")
async def detect_from_stream(request: DetectionRequest):
    """
    Capture a snapshot from RTSP stream and run YOLOv8 detection.
    Returns annotated JPEG image with bounding boxes.
    """
    try:
        # Step 1: Capture snapshot from RTSP (sync function, FastAPI runs in threadpool)
        jpeg_bytes = capture_snapshot(request.stream_url)

        # Step 2: Run YOLOv8 detection
        result = detect_objects(jpeg_bytes, confidence_threshold=request.confidence)

        # Return annotated image with detection metadata in headers
        return Response(
            content=result["annotated_jpeg"],
            media_type="image/jpeg",
            headers={
                "X-Person-Count": str(result["person_count"]),
                "X-Total-Objects": str(result["total_objects"]),
                "X-Detection-Count": str(len(result["detections"])),
            },
        )
    except Exception as e:
        logger.error(f"Detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


@router.post("/detect-json")
async def detect_from_stream_json(request: DetectionRequest):
    """
    Capture a snapshot from RTSP stream and run YOLOv8 detection.
    Returns detection metadata as JSON (without the image).
    """
    try:
        jpeg_bytes = capture_snapshot(request.stream_url)
        result = detect_objects(jpeg_bytes, confidence_threshold=request.confidence)

        return {
            "person_count": result["person_count"],
            "total_objects": result["total_objects"],
            "detections": result["detections"],
        }
    except Exception as e:
        logger.error(f"Detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Check YOLOv8 model status."""
    model_info = get_model_info()
    return {
        "status": "ok" if model_info["loaded"] else "loading",
        "model": model_info,
    }