from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Camera_streams(Base):
    __tablename__ = "camera_streams"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    zone_id = Column(Integer, nullable=False)
    stream_url = Column(String, nullable=False)
    protocol = Column(String, nullable=False)
    hls_url = Column(String, nullable=True)
    status = Column(String, nullable=False)
    resolution = Column(String, nullable=True)
    fps = Column(Integer, nullable=True)
    bitrate = Column(String, nullable=True)
    last_connected = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)