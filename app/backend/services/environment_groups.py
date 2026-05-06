import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.environment_groups import Environment_groups

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Environment_groupsService:
    """Service layer for Environment_groups operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Environment_groups]:
        """Create a new environment_groups"""
        try:
            obj = Environment_groups(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created environment_groups with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating environment_groups: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Environment_groups]:
        """Get environment_groups by ID"""
        try:
            query = select(Environment_groups).where(Environment_groups.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching environment_groups {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of environment_groupss"""
        try:
            query = select(Environment_groups)
            count_query = select(func.count(Environment_groups.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Environment_groups, field):
                        query = query.where(getattr(Environment_groups, field) == value)
                        count_query = count_query.where(getattr(Environment_groups, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Environment_groups, field_name):
                        query = query.order_by(getattr(Environment_groups, field_name).desc())
                else:
                    if hasattr(Environment_groups, sort):
                        query = query.order_by(getattr(Environment_groups, sort))
            else:
                query = query.order_by(Environment_groups.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching environment_groups list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Environment_groups]:
        """Update environment_groups"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Environment_groups {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated environment_groups {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating environment_groups {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete environment_groups"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Environment_groups {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted environment_groups {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting environment_groups {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Environment_groups]:
        """Get environment_groups by any field"""
        try:
            if not hasattr(Environment_groups, field_name):
                raise ValueError(f"Field {field_name} does not exist on Environment_groups")
            result = await self.db.execute(
                select(Environment_groups).where(getattr(Environment_groups, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching environment_groups by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Environment_groups]:
        """Get list of environment_groupss filtered by field"""
        try:
            if not hasattr(Environment_groups, field_name):
                raise ValueError(f"Field {field_name} does not exist on Environment_groups")
            result = await self.db.execute(
                select(Environment_groups)
                .where(getattr(Environment_groups, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Environment_groups.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching environment_groupss by {field_name}: {str(e)}")
            raise