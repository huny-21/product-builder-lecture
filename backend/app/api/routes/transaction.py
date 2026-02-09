from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.transaction import TransactionHeadCreate, TransactionHeadRead

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=TransactionHeadRead)
async def create_transaction(payload: TransactionHeadCreate, db: AsyncSession = Depends(get_db)):
    # TODO: implement service layer
    return payload.model_dump() | {"id": "00000000-0000-0000-0000-000000000000"}
