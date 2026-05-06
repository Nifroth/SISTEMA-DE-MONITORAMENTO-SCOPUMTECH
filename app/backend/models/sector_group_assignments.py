from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer


class Sector_group_assignments(Base):
    __tablename__ = "sector_group_assignments"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    sector_id = Column(Integer, nullable=False)
    group_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)