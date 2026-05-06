import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.environment_groups import Environment_groupsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/environment_groups", tags=["environment_groups"])


# ---------- Pydantic Schemas ----------
class Environment_groupsData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    description: str = None
    color: str = None


class Environment_groupsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class Environment_groupsResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Environment_groupsListResponse(BaseModel):
    """List response schema"""
    items: List[Environment_groupsResponse]
    total: int
    skip: int
    limit: int


class Environment_groupsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Environment_groupsData]


class Environment_groupsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Environment_groupsUpdateData


class Environment_groupsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Environment_groupsBatchUpdateItem]


class Environment_groupsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Environment_groupsListResponse)
async def query_environment_groupss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query environment_groupss with filtering, sorting, and pagination"""
    logger.debug(f"Querying environment_groupss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Environment_groupsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
        )
        logger.debug(f"Found {result['total']} environment_groupss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying environment_groupss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Environment_groupsListResponse)
async def query_environment_groupss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query environment_groupss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying environment_groupss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Environment_groupsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} environment_groupss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying environment_groupss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Environment_groupsResponse)
async def get_environment_groups(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single environment_groups by ID"""
    logger.debug(f"Fetching environment_groups with id: {id}, fields={fields}")
    
    service = Environment_groupsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Environment_groups with id {id} not found")
            raise HTTPException(status_code=404, detail="Environment_groups not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching environment_groups {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Environment_groupsResponse, status_code=201)
async def create_environment_groups(
    data: Environment_groupsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new environment_groups"""
    logger.debug(f"Creating new environment_groups with data: {data}")
    
    service = Environment_groupsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create environment_groups")
        
        logger.info(f"Environment_groups created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating environment_groups: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating environment_groups: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Environment_groupsResponse], status_code=201)
async def create_environment_groupss_batch(
    request: Environment_groupsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple environment_groupss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} environment_groupss")
    
    service = Environment_groupsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} environment_groupss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Environment_groupsResponse])
async def update_environment_groupss_batch(
    request: Environment_groupsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple environment_groupss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} environment_groupss")
    
    service = Environment_groupsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} environment_groupss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Environment_groupsResponse)
async def update_environment_groups(
    id: int,
    data: Environment_groupsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing environment_groups"""
    logger.debug(f"Updating environment_groups {id} with data: {data}")

    service = Environment_groupsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Environment_groups with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Environment_groups not found")
        
        logger.info(f"Environment_groups {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating environment_groups {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating environment_groups {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_environment_groupss_batch(
    request: Environment_groupsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple environment_groupss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} environment_groupss")
    
    service = Environment_groupsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} environment_groupss successfully")
        return {"message": f"Successfully deleted {deleted_count} environment_groupss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_environment_groups(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single environment_groups by ID"""
    logger.debug(f"Deleting environment_groups with id: {id}")
    
    service = Environment_groupsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Environment_groups with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Environment_groups not found")
        
        logger.info(f"Environment_groups {id} deleted successfully")
        return {"message": "Environment_groups deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting environment_groups {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")