from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.board_meeting import BoardAgenda, BoardAttendance
from app.schemas.board_meeting import (
    BoardMeetingCreate,
    BoardMeetingRead,
    BoardAgendaCreate,
    BoardAttendanceCreate,
    BoardMeetingMinutes,
    NotaryPackageRequest,
    NotaryPackageResponse,
)
from app.services.notary_service import NotaryService

router = APIRouter(prefix="/board-meetings", tags=["board-meetings"])


@router.post("", response_model=BoardMeetingRead)
async def create_meeting(payload: BoardMeetingCreate, db: AsyncSession = Depends(get_db)):
    service = NotaryService(db)
    agendas = [BoardAgenda(**item.model_dump()) for item in payload.agendas]
    meeting = await service.create_meeting(payload.title, payload.meeting_date, agendas)
    return meeting


@router.post("/{meeting_id}/notice", response_model=BoardMeetingRead)
async def send_notice(meeting_id: str, db: AsyncSession = Depends(get_db)):
    service = NotaryService(db)
    meeting = await service.send_convene_notice(meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("/{meeting_id}/attendance", response_model=dict)
async def add_attendance(meeting_id: str, payload: BoardAttendanceCreate, db: AsyncSession = Depends(get_db)):
    service = NotaryService(db)
    attendance = BoardAttendance(**payload.model_dump())
    saved = await service.add_attendance(meeting_id, attendance)
    if not saved:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"id": str(saved.id)}


@router.post("/{meeting_id}/minutes", response_model=BoardMeetingRead)
async def save_minutes(meeting_id: str, payload: BoardMeetingMinutes, db: AsyncSession = Depends(get_db)):
    service = NotaryService(db)
    meeting = await service.save_minutes(meeting_id, payload.minutes_text)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("/{meeting_id}/package", response_model=NotaryPackageResponse)
async def generate_package(meeting_id: str, payload: NotaryPackageRequest, db: AsyncSession = Depends(get_db)):
    service = NotaryService(db)
    package, warnings, requires_seal, seal_valid = await service.generate_package(
        meeting_id, payload.seal_certificate_issued_at
    )
    if not package:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return NotaryPackageResponse(
        meeting_id=package.meeting_id,
        merged_pdf_path=package.merged_pdf_path,
        requires_seal=requires_seal,
        seal_certificate_valid=seal_valid,
        warnings=warnings,
    )
