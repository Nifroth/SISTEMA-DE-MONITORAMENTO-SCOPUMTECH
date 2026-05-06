import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.monitoring_zones import Monitoring_zones

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Monitoring_zonesService:
    """Service layer for Monitoring_zones operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Monitoring_zones]:
        """Create a new monitoring_zones"""
        try:
            obj = Monitoring_zones(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created monitoring_zones with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating monitoring_zones: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Monitoring_zones]:
        """Get monitoring_zones by ID"""
        try:
            query = select(Monitoring_zones).where(Monitoring_zones.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching monitoring_zones {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of monitoring_zoness"""
        try:
            query = select(Monitoring_zones)
            count_query = select(func.count(Monitoring_zones.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Monitoring_zones, field):
                        query = query.where(getattr(Monitoring_zones, field) == value)
                        count_query = count_query.where(getattr(Monitoring_zones, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Monitoring_zones, field_name):
                        query = query.order_by(getattr(Monitoring_zones, field_name).desc())
                else:
                    if hasattr(Monitoring_zones, sort):
                        query = query.order_by(getattr(Monitoring_zones, sort))
            else:
                query = query.order_by(Monitoring_zones.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching monitoring_zones list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Monitoring_zones]:
        """Update monitoring_zones"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Monitoring_zones {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated monitoring_zones {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating monitoring_zones {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete monitoring_zones"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Monitoring_zones {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted monitoring_zones {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting monitoring_zones {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Monitoring_zones]:
        """Get monitoring_zones by any field"""
        try:
            if not hasattr(Monitoring_zones, field_name):
                raise ValueError(f"Field {field_name} does not exist on Monitoring_zones")
            result = await self.db.execute(
                select(Monitoring_zones).where(getattr(Monitoring_zones, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching monitoring_zones by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Monitoring_zones]:
        """Get list of monitoring_zoness filtered by field"""
        try:
            if not hasattr(Monitoring_zones, field_name):
                raise ValueError(f"Field {field_name} does not exist on Monitoring_zones")
            result = await self.db.execute(
                select(Monitoring_zones)
                .where(getattr(Monitoring_zones, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Monitoring_zones.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching monitoring_zoness by {field_name}: {str(e)}")
            raise