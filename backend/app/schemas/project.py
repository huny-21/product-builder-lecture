from datetime import date
from uuid import UUID
from pydantic import BaseModel


class ProjectBase(BaseModel):
    code: str
    name: str
    type: str
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool = True


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    id: UUID

    class Config:
        from_attributes = True
