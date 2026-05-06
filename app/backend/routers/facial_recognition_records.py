import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.facial_recognition_records import Facial_recognition_recordsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/facial_recognition_records", tags=["facial_recognition_records"])


# ---------- Pydantic Schemas ----------
class Facial_recognition_recordsData(BaseModel):
    """Entity data schema (for create/update)"""
    person_name: str
    person_id: str = None
    sector_id: int
    group_id: int = None
    confidence: float
    timestamp: datetime
    event_type: str


class Facial_recognition_recordsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    person_name: Optional[str] = None
    person_id: Optional[str] = None
    sector_id: Optional[int] = None
    group_id: Optional[int] = None
    confidence: Optional[float] = None
    timestamp: Optional[datetime] = None
    event_type: Optional[str] = None


class Facial_recognition_recordsResponse(BaseModel):
    """Entity response schema"""
    id: int
    person_name: str
    person_id: Optional[str] = None
    sector_id: int
    group_id: Optional[int] = None
    confidence: float
    timestamp: datetime
    event_type: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Facial_recognition_recordsListResponse(BaseModel):
    """List response schema"""
    items: List[Facial_recognition_recordsResponse]
    total: int
    skip: int
    limit: int


class Facial_recognition_recordsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Facial_recognition_recordsData]


class Facial_recognition_recordsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Facial_recognition_recordsUpdateData


class Facial_recognition_recordsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Facial_recognition_recordsBatchUpdateItem]


class Facial_recognition_recordsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Facial_recognition_recordsListResponse)
async def query_facial_recognition_recordss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query facial_recognition_recordss with filtering, sorting, and pagination"""
    logger.debug(f"Querying facial_recognition_recordss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Facial_recognition_recordsService(db)
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
        logger.debug(f"Found {result['total']} facial_recognition_recordss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying facial_recognition_recordss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Facial_recognition_recordsListResponse)
async def query_facial_recognition_recordss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query facial_recognition_recordss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying facial_recognition_recordss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Facial_recognition_recordsService(db)
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
        logger.debug(f"Found {result['total']} facial_recognition_recordss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying facial_recognition_recordss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Facial_recognition_recordsResponse)
async def get_facial_recognition_records(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single facial_recognition_records by ID"""
    logger.debug(f"Fetching facial_recognition_records with id: {id}, fields={fields}")
    
    service = Facial_recognition_recordsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Facial_recognition_records with id {id} not found")
            raise HTTPException(status_code=404, detail="Facial_recognition_records not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching facial_recognition_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Facial_recognition_recordsResponse, status_code=201)
async def create_facial_recognition_records(
    data: Facial_recognition_recordsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new facial_recognition_records"""
    logger.debug(f"Creating new facial_recognition_records with data: {data}")
    
    service = Facial_recognition_recordsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create facial_recognition_records")
        
        logger.info(f"Facial_recognition_records created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating facial_recognition_records: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating facial_recognition_records: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Facial_recognition_recordsResponse], status_code=201)
async def create_facial_recognition_recordss_batch(
    request: Facial_recognition_recordsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple facial_recognition_recordss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} facial_recognition_recordss")
    
    service = Facial_recognition_recordsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} facial_recognition_recordss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Facial_recognition_recordsResponse])
async def update_facial_recognition_recordss_batch(
    request: Facial_recognition_recordsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple facial_recognition_recordss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} facial_recognition_recordss")
    
    service = Facial_recognition_recordsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} facial_recognition_recordss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Facial_recognition_recordsResponse)
async def update_facial_recognition_records(
    id: int,
    data: Facial_recognition_recordsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing facial_recognition_records"""
    logger.debug(f"Updating facial_recognition_records {id} with data: {data}")

    service = Facial_recognition_recordsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Facial_recognition_records with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Facial_recognition_records not found")
        
        logger.info(f"Facial_recognition_records {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating facial_recognition_records {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating facial_recognition_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_facial_recognition_recordss_batch(
    request: Facial_recognition_recordsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple facial_recognition_recordss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} facial_recognition_recordss")
    
    service = Facial_recognition_recordsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} facial_recognition_recordss successfully")
        return {"message": f"Successfully deleted {deleted_count} facial_recognition_recordss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_facial_recognition_records(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single facial_recognition_records by ID"""
    logger.debug(f"Deleting facial_recognition_records with id: {id}")
    
    service = Facial_recognition_recordsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Facial_recognition_records with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Facial_recognition_records not found")
        
        logger.info(f"Facial_recognition_records {id} deleted successfully")
        return {"message": "Facial_recognition_records deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting facial_recognition_records {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")