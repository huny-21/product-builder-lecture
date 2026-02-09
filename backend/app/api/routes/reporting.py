from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.reporting_service import ReportingService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/financials")
async def financials(
    start: date = Query(...),
    end: date = Query(...),
    db: AsyncSession = Depends(get_db),
):
    service = ReportingService(db)
    return await service.financial_statements(start, end)


@router.get("/reserve")
async def reserve(
    start: date = Query(...),
    end: date = Query(...),
    limit_rate: float = Query(0.5),
    penalty_rate: float = Query(0.1),
    unused_amount: float = Query(0),
    db: AsyncSession = Depends(get_db),
):
    service = ReportingService(db)
    return await service.reserve_simulation(start, end, limit_rate, penalty_rate, unused_amount)


@router.get("/compliance")
async def compliance(
    prev_year_revenue: float = Query(...),
    current_public_spend: float = Query(...),
    db: AsyncSession = Depends(get_db),
):
    service = ReportingService(db)
    return await service.public_spending_compliance(prev_year_revenue, current_public_spend)
