from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.donation import DonationCreate, DonationRead

router = APIRouter(prefix="/donations", tags=["donations"])


@router.post("", response_model=DonationRead)
async def create_donation(payload: DonationCreate, db: AsyncSession = Depends(get_db)):
    # TODO: implement service layer
    return payload.model_dump() | {"id": "00000000-0000-0000-0000-000000000000"}
