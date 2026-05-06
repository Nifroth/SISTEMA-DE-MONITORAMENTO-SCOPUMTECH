from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Monitoring_events(Base):
    __tablename__ = "monitoring_events"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    zone_id = Column(Integer, nullable=False)
    event_type = Column(String, nullable=False)
    person_type = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)