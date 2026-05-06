import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.sector_group_assignments import Sector_group_assignmentsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/sector_group_assignments", tags=["sector_group_assignments"])


# ---------- Pydantic Schemas ----------
class Sector_group_assignmentsData(BaseModel):
    """Entity data schema (for create/update)"""
    sector_id: int
    group_id: int


class Sector_group_assignmentsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    sector_id: Optional[int] = None
    group_id: Optional[int] = None


class Sector_group_assignmentsResponse(BaseModel):
    """Entity response schema"""
    id: int
    sector_id: int
    group_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Sector_group_assignmentsListResponse(BaseModel):
    """List response schema"""
    items: List[Sector_group_assignmentsResponse]
    total: int
    skip: int
    limit: int


class Sector_group_assignmentsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Sector_group_assignmentsData]


class Sector_group_assignmentsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Sector_group_assignmentsUpdateData


class Sector_group_assignmentsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Sector_group_assignmentsBatchUpdateItem]


class Sector_group_assignmentsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Sector_group_assignmentsListResponse)
async def query_sector_group_assignmentss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query sector_group_assignmentss with filtering, sorting, and pagination"""
    logger.debug(f"Querying sector_group_assignmentss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Sector_group_assignmentsService(db)
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
        logger.debug(f"Found {result['total']} sector_group_assignmentss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying sector_group_assignmentss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Sector_group_assignmentsListResponse)
async def query_sector_group_assignmentss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query sector_group_assignmentss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying sector_group_assignmentss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Sector_group_assignmentsService(db)
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
        logger.debug(f"Found {result['total']} sector_group_assignmentss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying sector_group_assignmentss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Sector_group_assignmentsResponse)
async def get_sector_group_assignments(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single sector_group_assignments by ID"""
    logger.debug(f"Fetching sector_group_assignments with id: {id}, fields={fields}")
    
    service = Sector_group_assignmentsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Sector_group_assignments with id {id} not found")
            raise HTTPException(status_code=404, detail="Sector_group_assignments not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sector_group_assignments {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Sector_group_assignmentsResponse, status_code=201)
async def create_sector_group_assignments(
    data: Sector_group_assignmentsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new sector_group_assignments"""
    logger.debug(f"Creating new sector_group_assignments with data: {data}")
    
    service = Sector_group_assignmentsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create sector_group_assignments")
        
        logger.info(f"Sector_group_assignments created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating sector_group_assignments: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating sector_group_assignments: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Sector_group_assignmentsResponse], status_code=201)
async def create_sector_group_assignmentss_batch(
    request: Sector_group_assignmentsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple sector_group_assignmentss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} sector_group_assignmentss")
    
    service = Sector_group_assignmentsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} sector_group_assignmentss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Sector_group_assignmentsResponse])
async def update_sector_group_assignmentss_batch(
    request: Sector_group_assignmentsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple sector_group_assignmentss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} sector_group_assignmentss")
    
    service = Sector_group_assignmentsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} sector_group_assignmentss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Sector_group_assignmentsResponse)
async def update_sector_group_assignments(
    id: int,
    data: Sector_group_assignmentsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing sector_group_assignments"""
    logger.debug(f"Updating sector_group_assignments {id} with data: {data}")

    service = Sector_group_assignmentsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Sector_group_assignments with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Sector_group_assignments not found")
        
        logger.info(f"Sector_group_assignments {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating sector_group_assignments {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating sector_group_assignments {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_sector_group_assignmentss_batch(
    request: Sector_group_assignmentsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple sector_group_assignmentss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} sector_group_assignmentss")
    
    service = Sector_group_assignmentsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} sector_group_assignmentss successfully")
        return {"message": f"Successfully deleted {deleted_count} sector_group_assignmentss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_sector_group_assignments(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single sector_group_assignments by ID"""
    logger.debug(f"Deleting sector_group_assignments with id: {id}")
    
    service = Sector_group_assignmentsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Sector_group_assignments with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Sector_group_assignments not found")
        
        logger.info(f"Sector_group_assignments {id} deleted successfully")
        return {"message": "Sector_group_assignments deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting sector_group_assignments {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")