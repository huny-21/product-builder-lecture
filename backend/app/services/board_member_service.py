from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.crypto import encrypt_rrn
from app.core.config import settings
from app.models.board_member import BoardMember
from app.schemas.board_member import BoardMemberCreate, BoardMemberUpdate


class BoardMemberService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_members(self) -> list[BoardMember]:
        result = await self.db.execute(select(BoardMember))
        return list(result.scalars().all())

    async def create_member(self, data: BoardMemberCreate) -> BoardMember:
        encrypted = encrypt_rrn(data.rrn)
        member = BoardMember(
            name=data.name,
            rrn_encrypted=encrypted,
            rrn_key_id=settings.rrn_encryption_key_id,
            address=data.address,
            term_start=data.term_start,
            term_end=data.term_end,
            occupation=data.occupation,
            role=data.role,
            is_foreigner=data.is_foreigner,
            special_relation_to_id=data.special_relation_to_id,
        )
        self.db.add(member)
        await self.db.flush()
        return member

    async def update_member(self, member_id: str, data: BoardMemberUpdate) -> BoardMember | None:
        result = await self.db.execute(select(BoardMember).where(BoardMember.id == member_id))
        member = result.scalar_one_or_none()
        if not member:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(member, field, value)
        self.db.add(member)
        await self.db.flush()
        return member
