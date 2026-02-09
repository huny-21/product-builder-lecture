from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.board_member import BoardMemberCreate, BoardMemberRead, BoardMemberUpdate
from app.services.board_member_service import BoardMemberService

router = APIRouter(prefix="/board-members", tags=["board-members"])


@router.get("", response_model=list[BoardMemberRead])
async def list_members(db: AsyncSession = Depends(get_db)):
    service = BoardMemberService(db)
    return await service.list_members()


@router.post("", response_model=BoardMemberRead)
async def create_member(payload: BoardMemberCreate, db: AsyncSession = Depends(get_db)):
    service = BoardMemberService(db)
    member = await service.create_member(payload)
    return member


@router.patch("/{member_id}", response_model=BoardMemberRead)
async def update_member(member_id: str, payload: BoardMemberUpdate, db: AsyncSession = Depends(get_db)):
    service = BoardMemberService(db)
    member = await service.update_member(member_id, payload)
    if not member:
        raise HTTPException(status_code=404, detail="Board member not found")
    return member
