import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.camera_streams import Camera_streamsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/camera_streams", tags=["camera_streams"])


# ---------- Pydantic Schemas ----------
class Camera_streamsData(BaseModel):
    """Entity data schema (for create/update)"""
    zone_id: int
    stream_url: str
    protocol: str
    hls_url: str = None
    status: str
    resolution: str = None
    fps: int = None
    bitrate: str = None
    last_connected: str = None


class Camera_streamsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    zone_id: Optional[int] = None
    stream_url: Optional[str] = None
    protocol: Optional[str] = None
    hls_url: Optional[str] = None
    status: Optional[str] = None
    resolution: Optional[str] = None
    fps: Optional[int] = None
    bitrate: Optional[str] = None
    last_connected: Optional[str] = None


class Camera_streamsResponse(BaseModel):
    """Entity response schema"""
    id: int
    zone_id: int
    stream_url: str
    protocol: str
    hls_url: Optional[str] = None
    status: str
    resolution: Optional[str] = None
    fps: Optional[int] = None
    bitrate: Optional[str] = None
    last_connected: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Camera_streamsListResponse(BaseModel):
    """List response schema"""
    items: List[Camera_streamsResponse]
    total: int
    skip: int
    limit: int


class Camera_streamsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Camera_streamsData]


class Camera_streamsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Camera_streamsUpdateData


class Camera_streamsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Camera_streamsBatchUpdateItem]


class Camera_streamsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Camera_streamsListResponse)
async def query_camera_streamss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query camera_streamss with filtering, sorting, and pagination"""
    logger.debug(f"Querying camera_streamss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Camera_streamsService(db)
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
        logger.debug(f"Found {result['total']} camera_streamss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying camera_streamss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Camera_streamsListResponse)
async def query_camera_streamss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query camera_streamss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying camera_streamss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Camera_streamsService(db)
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
        logger.debug(f"Found {result['total']} camera_streamss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying camera_streamss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Camera_streamsResponse)
async def get_camera_streams(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single camera_streams by ID"""
    logger.debug(f"Fetching camera_streams with id: {id}, fields={fields}")
    
    service = Camera_streamsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Camera_streams with id {id} not found")
            raise HTTPException(status_code=404, detail="Camera_streams not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching camera_streams {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Camera_streamsResponse, status_code=201)
async def create_camera_streams(
    data: Camera_streamsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new camera_streams"""
    logger.debug(f"Creating new camera_streams with data: {data}")
    
    service = Camera_streamsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create camera_streams")
        
        logger.info(f"Camera_streams created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating camera_streams: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating camera_streams: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Camera_streamsResponse], status_code=201)
async def create_camera_streamss_batch(
    request: Camera_streamsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple camera_streamss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} camera_streamss")
    
    service = Camera_streamsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} camera_streamss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Camera_streamsResponse])
async def update_camera_streamss_batch(
    request: Camera_streamsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple camera_streamss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} camera_streamss")
    
    service = Camera_streamsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} camera_streamss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Camera_streamsResponse)
async def update_camera_streams(
    id: int,
    data: Camera_streamsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing camera_streams"""
    logger.debug(f"Updating camera_streams {id} with data: {data}")

    service = Camera_streamsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Camera_streams with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Camera_streams not found")
        
        logger.info(f"Camera_streams {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating camera_streams {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating camera_streams {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_camera_streamss_batch(
    request: Camera_streamsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple camera_streamss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} camera_streamss")
    
    service = Camera_streamsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} camera_streamss successfully")
        return {"message": f"Successfully deleted {deleted_count} camera_streamss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_camera_streams(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single camera_streams by ID"""
    logger.debug(f"Deleting camera_streams with id: {id}")
    
    service = Camera_streamsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Camera_streams with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Camera_streams not found")
        
        logger.info(f"Camera_streams {id} deleted successfully")
        return {"message": "Camera_streams deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting camera_streams {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")