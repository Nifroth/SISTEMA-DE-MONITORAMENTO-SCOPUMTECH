"""
YOLOv8 Detection Service
Processes camera frames using YOLOv8n for real-time object detection.
"""
import io
import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Global model instance (lazy-loaded singleton)
_model = None
_model_loading = False


def _get_model():
    """Lazy-load the YOLOv8n model (singleton pattern)."""
    global _model, _model_loading
    if _model is not None:
        return _model
    if _model_loading:
        return None
    try:
        _model_loading = True
        from ultralytics import YOLO
        logger.info("Loading YOLOv8n model...")
        _model = YOLO("yolov8n.pt")
        logger.info("YOLOv8n model loaded successfully")
        _model_loading = False
        return _model
    except Exception as e:
        _model_loading = False
        logger.error(f"Failed to load YOLOv8n model: {e}")
        return None


def detect_objects(jpeg_bytes: bytes, confidence_threshold: float = 0.5) -> dict:
    """
    Run YOLOv8 detection on JPEG image bytes.

    Args:
        jpeg_bytes: Raw JPEG image bytes
        confidence_threshold: Minimum confidence for detections (0.0-1.0)

    Returns:
        dict with keys:
            - annotated_jpeg: bytes of the annotated image
            - detections: list of detection dicts with class, confidence, bbox
            - person_count: number of persons detected
            - total_objects: total number of objects detected
    """
    model = _get_model()

    # Decode JPEG to numpy array
    nparr = np.frombuffer(jpeg_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise ValueError("Failed to decode JPEG image")

    detections = []
    person_count = 0
    total_objects = 0

    if model is not None:
        # Run YOLOv8 inference
        results = model(frame, conf=confidence_threshold, verbose=False)

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue

            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                class_name = model.names.get(cls_id, f"class_{cls_id}")

                # Count persons (class 0 in COCO)
                if cls_id == 0:
                    person_count += 1

                total_objects += 1

                detections.append({
                    "class": class_name,
                    "confidence": round(conf, 3),
                    "bbox": [x1, y1, x2, y2],
                })

                # Draw bounding box
                color = (0, 255, 0) if cls_id == 0 else (0, 165, 255)
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                # Draw corner accents
                corner_len = 12
                cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, 3)
                cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, 3)
                cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, 3)
                cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, 3)
                cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, 3)
                cv2.line(frame, (x1, y2), (x1, y2 - corner_len), color, 3)
                cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, 3)
                cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, 3)

                # Draw label background and text
                label = f"{class_name} {conf:.0%}"
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 0.5
                thickness = 1
                (tw, th), _ = cv2.getTextSize(label, font, font_scale, thickness)
                cv2.rectangle(frame, (x1, y1 - th - 8), (x1 + tw + 6, y1), color, -1)
                cv2.putText(frame, label, (x1 + 3, y1 - 5), font, font_scale,
                            (0, 0, 0), thickness, cv2.LINE_AA)

        # Draw detection summary overlay at top-left
        overlay = frame.copy()
        cv2.rectangle(overlay, (8, 8), (220, 70), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        cv2.putText(frame, f"YOLOv8n | Objetos: {total_objects}", (14, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1, cv2.LINE_AA)
        cv2.putText(frame, f"Pessoas: {person_count}", (14, 52),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1, cv2.LINE_AA)
    else:
        # Model not available - add warning overlay
        overlay = frame.copy()
        cv2.rectangle(overlay, (8, 8), (280, 40), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        cv2.putText(frame, "YOLOv8 carregando...", (14, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 255), 1, cv2.LINE_AA)

    # Encode annotated frame back to JPEG
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, 85]
    success, annotated_jpeg = cv2.imencode(".jpg", frame, encode_params)

    if not success:
        raise ValueError("Failed to encode annotated frame to JPEG")

    return {
        "annotated_jpeg": annotated_jpeg.tobytes(),
        "detections": detections,
        "person_count": person_count,
        "total_objects": total_objects,
    }


def is_model_loaded() -> bool:
    """Check if the YOLOv8 model is loaded and ready."""
    return _model is not None


def get_model_info() -> dict:
    """Get information about the loaded model."""
    if _model is None:
        return {"loaded": False, "name": "yolov8n.pt", "status": "not_loaded"}
    return {
        "loaded": True,
        "name": "yolov8n.pt",
        "status": "ready",
        "classes": len(_model.names),
    }