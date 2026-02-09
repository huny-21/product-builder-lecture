from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.project import ProjectCreate, ProjectRead

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectRead)
async def create_project(payload: ProjectCreate, db: AsyncSession = Depends(get_db)):
    # TODO: implement service layer
    return payload.model_dump() | {"id": "00000000-0000-0000-0000-000000000000"}


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    # TODO: implement service layer
    return {
        "id": project_id,
        "code": "DEMO",
        "name": "Demo Project",
        "type": "Public",
        "start_date": None,
        "end_date": None,
        "is_active": True,
    }
