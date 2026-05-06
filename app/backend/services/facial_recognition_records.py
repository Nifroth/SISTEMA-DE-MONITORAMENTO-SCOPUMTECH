import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.facial_recognition_records import Facial_recognition_records

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Facial_recognition_recordsService:
    """Service layer for Facial_recognition_records operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Facial_recognition_records]:
        """Create a new facial_recognition_records"""
        try:
            obj = Facial_recognition_records(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created facial_recognition_records with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating facial_recognition_records: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Facial_recognition_records]:
        """Get facial_recognition_records by ID"""
        try:
            query = select(Facial_recognition_records).where(Facial_recognition_records.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching facial_recognition_records {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of facial_recognition_recordss"""
        try:
            query = select(Facial_recognition_records)
            count_query = select(func.count(Facial_recognition_records.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Facial_recognition_records, field):
                        query = query.where(getattr(Facial_recognition_records, field) == value)
                        count_query = count_query.where(getattr(Facial_recognition_records, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Facial_recognition_records, field_name):
                        query = query.order_by(getattr(Facial_recognition_records, field_name).desc())
                else:
                    if hasattr(Facial_recognition_records, sort):
                        query = query.order_by(getattr(Facial_recognition_records, sort))
            else:
                query = query.order_by(Facial_recognition_records.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching facial_recognition_records list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Facial_recognition_records]:
        """Update facial_recognition_records"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Facial_recognition_records {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated facial_recognition_records {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating facial_recognition_records {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete facial_recognition_records"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Facial_recognition_records {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted facial_recognition_records {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting facial_recognition_records {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Facial_recognition_records]:
        """Get facial_recognition_records by any field"""
        try:
            if not hasattr(Facial_recognition_records, field_name):
                raise ValueError(f"Field {field_name} does not exist on Facial_recognition_records")
            result = await self.db.execute(
                select(Facial_recognition_records).where(getattr(Facial_recognition_records, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching facial_recognition_records by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Facial_recognition_records]:
        """Get list of facial_recognition_recordss filtered by field"""
        try:
            if not hasattr(Facial_recognition_records, field_name):
                raise ValueError(f"Field {field_name} does not exist on Facial_recognition_records")
            result = await self.db.execute(
                select(Facial_recognition_records)
                .where(getattr(Facial_recognition_records, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Facial_recognition_records.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching facial_recognition_recordss by {field_name}: {str(e)}")
            raise