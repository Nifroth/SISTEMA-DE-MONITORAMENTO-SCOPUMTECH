import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.sectors import Sectors

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class SectorsService:
    """Service layer for Sectors operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Sectors]:
        """Create a new sectors"""
        try:
            obj = Sectors(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created sectors with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating sectors: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Sectors]:
        """Get sectors by ID"""
        try:
            query = select(Sectors).where(Sectors.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching sectors {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of sectorss"""
        try:
            query = select(Sectors)
            count_query = select(func.count(Sectors.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Sectors, field):
                        query = query.where(getattr(Sectors, field) == value)
                        count_query = count_query.where(getattr(Sectors, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Sectors, field_name):
                        query = query.order_by(getattr(Sectors, field_name).desc())
                else:
                    if hasattr(Sectors, sort):
                        query = query.order_by(getattr(Sectors, sort))
            else:
                query = query.order_by(Sectors.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching sectors list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Sectors]:
        """Update sectors"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Sectors {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated sectors {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating sectors {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete sectors"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Sectors {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted sectors {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting sectors {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Sectors]:
        """Get sectors by any field"""
        try:
            if not hasattr(Sectors, field_name):
                raise ValueError(f"Field {field_name} does not exist on Sectors")
            result = await self.db.execute(
                select(Sectors).where(getattr(Sectors, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching sectors by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Sectors]:
        """Get list of sectorss filtered by field"""
        try:
            if not hasattr(Sectors, field_name):
                raise ValueError(f"Field {field_name} does not exist on Sectors")
            result = await self.db.execute(
                select(Sectors)
                .where(getattr(Sectors, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Sectors.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching sectorss by {field_name}: {str(e)}")
            raise