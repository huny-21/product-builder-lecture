from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel


class BoardAgendaCreate(BaseModel):
    title: str
    agenda_type: str
    description: str | None = None


class BoardAgendaRead(BoardAgendaCreate):
    id: UUID

    class Config:
        from_attributes = True


class BoardAttendanceCreate(BaseModel):
    member_id: UUID
    attendance_type: str = "출석"
    proxy_name: str | None = None


class BoardAttendanceRead(BoardAttendanceCreate):
    id: UUID

    class Config:
        from_attributes = True


class BoardMeetingCreate(BaseModel):
    title: str
    meeting_date: date
    agendas: list[BoardAgendaCreate] = []


class BoardMeetingRead(BaseModel):
    id: UUID
    title: str
    meeting_date: date
    status: str
    convene_notice_sent_at: datetime | None
    minutes_text: str | None
    agendas: list[BoardAgendaRead]
    attendance: list[BoardAttendanceRead]

    class Config:
        from_attributes = True


class BoardMeetingMinutes(BaseModel):
    minutes_text: str


class NotaryPackageRequest(BaseModel):
    seal_certificate_issued_at: date | None = None


class NotaryPackageResponse(BaseModel):
    meeting_id: UUID
    merged_pdf_path: str
    requires_seal: bool
    seal_certificate_valid: bool | None
    warnings: list[str]
