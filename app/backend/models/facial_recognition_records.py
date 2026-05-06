from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Facial_recognition_records(Base):
    __tablename__ = "facial_recognition_records"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    person_name = Column(String, nullable=False)
    person_id = Column(String, nullable=True)
    sector_id = Column(Integer, nullable=False)
    group_id = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    event_type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)