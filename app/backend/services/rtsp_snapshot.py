"""Service for capturing JPEG snapshots from RTSP streams via ffmpeg."""

import subprocess
from typing import Optional


def check_ffmpeg_available() -> bool:
    """Check if ffmpeg is available on the system."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            timeout=5,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def capture_snapshot(rtsp_url: str, timeout: int = 10) -> bytes:
    """
    Capture a single JPEG frame from an RTSP stream using ffmpeg.

    Args:
        rtsp_url: The RTSP URL to capture from.
        timeout: Maximum time in seconds to wait for the capture.

    Returns:
        JPEG image bytes.

    Raises:
        RuntimeError: If ffmpeg fails or times out.
        ValueError: If the RTSP URL is invalid.
    """
    if not rtsp_url or not rtsp_url.strip().startswith("rtsp://"):
        raise ValueError(f"Invalid RTSP URL: {rtsp_url}")

    cmd = [
        "ffmpeg",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-frames:v", "1",
        "-f", "image2",
        "-vcodec", "mjpeg",
        "pipe:1",
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(
            f"Timeout capturing snapshot from {rtsp_url} after {timeout}s"
        ) from e
    except FileNotFoundError as e:
        raise RuntimeError(
            "ffmpeg not found. Please install ffmpeg to use RTSP snapshot capture."
        ) from e

    if result.returncode != 0:
        stderr_msg = result.stderr.decode("utf-8", errors="replace")[:500]
        raise RuntimeError(
            f"ffmpeg failed with exit code {result.returncode}: {stderr_msg}"
        )

    jpeg_bytes: Optional[bytes] = result.stdout
    if not jpeg_bytes or len(jpeg_bytes) == 0:
        raise RuntimeError("ffmpeg produced no output data")

    return jpeg_bytes