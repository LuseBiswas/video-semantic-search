"""Debug and monitoring endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db import get_pool, get_connection

router = APIRouter(prefix="/debug", tags=["debug"])


class PoolStats(BaseModel):
    """Connection pool statistics."""
    name: str
    size: int
    available: int
    waiting: int
    max_size: int
    min_size: int
    status: str
    timestamp: str


class ConnectionTest(BaseModel):
    """Database connection test result."""
    can_connect: bool
    response_time_ms: float
    error: Optional[str] = None


@router.get("/pool-stats", response_model=PoolStats)
def get_pool_stats():
    """
    Get connection pool statistics.
    
    Use this to monitor pool health:
    - If 'available' is often 0, you may have connection leaks
    - If 'waiting' is high, increase pool size or optimize queries
    - If 'size' is much lower than 'max_size', connections are being recycled properly
    
    Returns:
        PoolStats with current pool metrics
    """
    try:
        pool = get_pool()
        
        # Determine pool status
        if pool.available == 0:
            status = "warning" if pool.waiting > 0 else "critical"
        elif pool.available < pool.size * 0.3:  # Less than 30% available
            status = "degraded"
        else:
            status = "healthy"
        
        return PoolStats(
            name="postgres_pool",
            size=pool.size,
            available=pool.available,
            waiting=pool.waiting,
            max_size=pool.max_size,
            min_size=pool.min_size,
            status=status,
            timestamp=datetime.utcnow().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pool stats: {str(e)}")


@router.get("/test-connection", response_model=ConnectionTest)
def test_database_connection():
    """
    Test database connectivity and measure response time.
    
    Use this to verify database is accessible and responsive.
    
    Returns:
        ConnectionTest with connection status and timing
    """
    import time
    
    start_time = time.time()
    
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Simple query to test connection
                cur.execute("SELECT 1")
                result = cur.fetchone()
                
                if result and result[0] == 1:
                    response_time = (time.time() - start_time) * 1000  # Convert to ms
                    return ConnectionTest(
                        can_connect=True,
                        response_time_ms=round(response_time, 2),
                        error=None
                    )
                else:
                    return ConnectionTest(
                        can_connect=False,
                        response_time_ms=0,
                        error="Unexpected query result"
                    )
    except Exception as e:
        response_time = (time.time() - start_time) * 1000
        return ConnectionTest(
            can_connect=False,
            response_time_ms=round(response_time, 2),
            error=str(e)
        )


@router.get("/pool-health")
def get_pool_health():
    """
    Detailed pool health report with recommendations.
    
    Returns:
        Detailed health information and optimization suggestions
    """
    try:
        pool = get_pool()
        
        # Calculate metrics
        utilization = ((pool.size - pool.available) / pool.size * 100) if pool.size > 0 else 0
        capacity = (pool.available / pool.max_size * 100) if pool.max_size > 0 else 0
        
        # Generate recommendations
        recommendations = []
        
        if pool.available == 0:
            recommendations.append({
                "level": "critical",
                "message": "No connections available! Requests will be queued or timeout.",
                "action": "Check for connection leaks. Ensure connections are closed properly."
            })
        
        if pool.waiting > 5:
            recommendations.append({
                "level": "warning",
                "message": f"{pool.waiting} requests waiting for connections.",
                "action": "Consider increasing max_size or optimizing slow queries."
            })
        
        if utilization > 80:
            recommendations.append({
                "level": "warning",
                "message": f"High utilization ({utilization:.1f}%). Pool is near capacity.",
                "action": "Monitor for connection leaks or increase pool size."
            })
        
        if pool.size < pool.min_size:
            recommendations.append({
                "level": "info",
                "message": "Pool is below minimum size. New connections will be created.",
                "action": "This is normal during startup or low traffic periods."
            })
        
        if not recommendations:
            recommendations.append({
                "level": "success",
                "message": "Pool is healthy!",
                "action": "No action needed."
            })
        
        return {
            "status": "healthy" if utilization < 80 and pool.available > 0 else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": {
                "current_size": pool.size,
                "available": pool.available,
                "in_use": pool.size - pool.available,
                "waiting": pool.waiting,
                "max_size": pool.max_size,
                "min_size": pool.min_size,
                "utilization_percent": round(utilization, 2),
                "capacity_percent": round(capacity, 2)
            },
            "recommendations": recommendations,
            "tips": [
                "Keep database operations short (<100ms)",
                "Always use 'with get_connection()' to ensure cleanup",
                "Close connections before making HTTP calls or processing",
                "Monitor this endpoint regularly for early warning signs"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pool health: {str(e)}")

