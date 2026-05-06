import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.camera_streams import Camera_streams

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Camera_streamsService:
    """Service layer for Camera_streams operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Camera_streams]:
        """Create a new camera_streams"""
        try:
            obj = Camera_streams(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created camera_streams with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating camera_streams: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Camera_streams]:
        """Get camera_streams by ID"""
        try:
            query = select(Camera_streams).where(Camera_streams.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching camera_streams {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of camera_streamss"""
        try:
            query = select(Camera_streams)
            count_query = select(func.count(Camera_streams.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Camera_streams, field):
                        query = query.where(getattr(Camera_streams, field) == value)
                        count_query = count_query.where(getattr(Camera_streams, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Camera_streams, field_name):
                        query = query.order_by(getattr(Camera_streams, field_name).desc())
                else:
                    if hasattr(Camera_streams, sort):
                        query = query.order_by(getattr(Camera_streams, sort))
            else:
                query = query.order_by(Camera_streams.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching camera_streams list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Camera_streams]:
        """Update camera_streams"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Camera_streams {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated camera_streams {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating camera_streams {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete camera_streams"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Camera_streams {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted camera_streams {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting camera_streams {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Camera_streams]:
        """Get camera_streams by any field"""
        try:
            if not hasattr(Camera_streams, field_name):
                raise ValueError(f"Field {field_name} does not exist on Camera_streams")
            result = await self.db.execute(
                select(Camera_streams).where(getattr(Camera_streams, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching camera_streams by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Camera_streams]:
        """Get list of camera_streamss filtered by field"""
        try:
            if not hasattr(Camera_streams, field_name):
                raise ValueError(f"Field {field_name} does not exist on Camera_streams")
            result = await self.db.execute(
                select(Camera_streams)
                .where(getattr(Camera_streams, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Camera_streams.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching camera_streamss by {field_name}: {str(e)}")
            raise