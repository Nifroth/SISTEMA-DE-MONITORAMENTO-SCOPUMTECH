from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Monitoring_zones(Base):
    __tablename__ = "monitoring_zones"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    zone_type = Column(String, nullable=False)
    camera_id = Column(String, nullable=False)
    status = Column(String, nullable=False)
    location = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)