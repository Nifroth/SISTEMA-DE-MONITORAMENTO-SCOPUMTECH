import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.sectors import SectorsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/sectors", tags=["sectors"])


# ---------- Pydantic Schemas ----------
class SectorsData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    description: str = None
    location: str = None
    camera_id: str = None
    status: str


class SectorsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    camera_id: Optional[str] = None
    status: Optional[str] = None


class SectorsResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    camera_id: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SectorsListResponse(BaseModel):
    """List response schema"""
    items: List[SectorsResponse]
    total: int
    skip: int
    limit: int


class SectorsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[SectorsData]


class SectorsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: SectorsUpdateData


class SectorsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[SectorsBatchUpdateItem]


class SectorsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=SectorsListResponse)
async def query_sectorss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query sectorss with filtering, sorting, and pagination"""
    logger.debug(f"Querying sectorss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = SectorsService(db)
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
        logger.debug(f"Found {result['total']} sectorss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying sectorss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=SectorsListResponse)
async def query_sectorss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query sectorss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying sectorss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = SectorsService(db)
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
        logger.debug(f"Found {result['total']} sectorss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying sectorss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=SectorsResponse)
async def get_sectors(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single sectors by ID"""
    logger.debug(f"Fetching sectors with id: {id}, fields={fields}")
    
    service = SectorsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Sectors with id {id} not found")
            raise HTTPException(status_code=404, detail="Sectors not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sectors {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=SectorsResponse, status_code=201)
async def create_sectors(
    data: SectorsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new sectors"""
    logger.debug(f"Creating new sectors with data: {data}")
    
    service = SectorsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create sectors")
        
        logger.info(f"Sectors created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating sectors: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating sectors: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[SectorsResponse], status_code=201)
async def create_sectorss_batch(
    request: SectorsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple sectorss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} sectorss")
    
    service = SectorsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} sectorss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[SectorsResponse])
async def update_sectorss_batch(
    request: SectorsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple sectorss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} sectorss")
    
    service = SectorsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} sectorss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=SectorsResponse)
async def update_sectors(
    id: int,
    data: SectorsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing sectors"""
    logger.debug(f"Updating sectors {id} with data: {data}")

    service = SectorsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Sectors with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Sectors not found")
        
        logger.info(f"Sectors {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating sectors {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating sectors {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_sectorss_batch(
    request: SectorsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple sectorss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} sectorss")
    
    service = SectorsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} sectorss successfully")
        return {"message": f"Successfully deleted {deleted_count} sectorss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_sectors(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single sectors by ID"""
    logger.debug(f"Deleting sectors with id: {id}")
    
    service = SectorsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Sectors with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Sectors not found")
        
        logger.info(f"Sectors {id} deleted successfully")
        return {"message": "Sectors deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting sectors {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")