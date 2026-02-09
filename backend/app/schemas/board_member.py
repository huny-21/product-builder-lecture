from datetime import date
from uuid import UUID
from pydantic import BaseModel, Field


class BoardMemberBase(BaseModel):
    name: str
    address: str
    term_start: date
    term_end: date
    occupation: str
    role: str
    is_foreigner: bool = False
    special_relation_to_id: UUID | None = None


class BoardMemberCreate(BoardMemberBase):
    rrn: str = Field(min_length=6)


class BoardMemberUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    term_start: date | None = None
    term_end: date | None = None
    occupation: str | None = None
    role: str | None = None
    is_foreigner: bool | None = None
    special_relation_to_id: UUID | None = None


class BoardMemberRead(BoardMemberBase):
    id: UUID
    rrn_key_id: str

    class Config:
        from_attributes = True
