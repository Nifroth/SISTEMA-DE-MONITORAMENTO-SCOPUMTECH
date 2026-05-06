import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.monitoring_events import Monitoring_eventsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/monitoring_events", tags=["monitoring_events"])


# ---------- Pydantic Schemas ----------
class Monitoring_eventsData(BaseModel):
    """Entity data schema (for create/update)"""
    zone_id: int
    event_type: str
    person_type: str
    timestamp: datetime
    confidence: float = None


class Monitoring_eventsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    zone_id: Optional[int] = None
    event_type: Optional[str] = None
    person_type: Optional[str] = None
    timestamp: Optional[datetime] = None
    confidence: Optional[float] = None


class Monitoring_eventsResponse(BaseModel):
    """Entity response schema"""
    id: int
    zone_id: int
    event_type: str
    person_type: str
    timestamp: datetime
    confidence: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Monitoring_eventsListResponse(BaseModel):
    """List response schema"""
    items: List[Monitoring_eventsResponse]
    total: int
    skip: int
    limit: int


class Monitoring_eventsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Monitoring_eventsData]


class Monitoring_eventsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Monitoring_eventsUpdateData


class Monitoring_eventsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Monitoring_eventsBatchUpdateItem]


class Monitoring_eventsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Monitoring_eventsListResponse)
async def query_monitoring_eventss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query monitoring_eventss with filtering, sorting, and pagination"""
    logger.debug(f"Querying monitoring_eventss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Monitoring_eventsService(db)
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
        logger.debug(f"Found {result['total']} monitoring_eventss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying monitoring_eventss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Monitoring_eventsListResponse)
async def query_monitoring_eventss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query monitoring_eventss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying monitoring_eventss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Monitoring_eventsService(db)
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
        logger.debug(f"Found {result['total']} monitoring_eventss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying monitoring_eventss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Monitoring_eventsResponse)
async def get_monitoring_events(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single monitoring_events by ID"""
    logger.debug(f"Fetching monitoring_events with id: {id}, fields={fields}")
    
    service = Monitoring_eventsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Monitoring_events with id {id} not found")
            raise HTTPException(status_code=404, detail="Monitoring_events not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching monitoring_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Monitoring_eventsResponse, status_code=201)
async def create_monitoring_events(
    data: Monitoring_eventsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new monitoring_events"""
    logger.debug(f"Creating new monitoring_events with data: {data}")
    
    service = Monitoring_eventsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create monitoring_events")
        
        logger.info(f"Monitoring_events created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating monitoring_events: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating monitoring_events: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Monitoring_eventsResponse], status_code=201)
async def create_monitoring_eventss_batch(
    request: Monitoring_eventsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple monitoring_eventss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} monitoring_eventss")
    
    service = Monitoring_eventsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} monitoring_eventss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Monitoring_eventsResponse])
async def update_monitoring_eventss_batch(
    request: Monitoring_eventsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple monitoring_eventss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} monitoring_eventss")
    
    service = Monitoring_eventsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} monitoring_eventss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Monitoring_eventsResponse)
async def update_monitoring_events(
    id: int,
    data: Monitoring_eventsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing monitoring_events"""
    logger.debug(f"Updating monitoring_events {id} with data: {data}")

    service = Monitoring_eventsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Monitoring_events with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Monitoring_events not found")
        
        logger.info(f"Monitoring_events {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating monitoring_events {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating monitoring_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_monitoring_eventss_batch(
    request: Monitoring_eventsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple monitoring_eventss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} monitoring_eventss")
    
    service = Monitoring_eventsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} monitoring_eventss successfully")
        return {"message": f"Successfully deleted {deleted_count} monitoring_eventss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_monitoring_events(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single monitoring_events by ID"""
    logger.debug(f"Deleting monitoring_events with id: {id}")
    
    service = Monitoring_eventsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Monitoring_events with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Monitoring_events not found")
        
        logger.info(f"Monitoring_events {id} deleted successfully")
        return {"message": "Monitoring_events deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting monitoring_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")