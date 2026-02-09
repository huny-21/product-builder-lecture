import uuid
from datetime import date, datetime
from sqlalchemy import String, Date, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class BoardMeeting(Base):
    __tablename__ = "board_meeting"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    meeting_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="등록")
    convene_notice_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    minutes_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    agendas: Mapped[list["BoardAgenda"]] = relationship("BoardAgenda", back_populates="meeting", cascade="all, delete-orphan")
    attendance: Mapped[list["BoardAttendance"]] = relationship("BoardAttendance", back_populates="meeting", cascade="all, delete-orphan")
    notary_package: Mapped["NotaryPackage | None"] = relationship("NotaryPackage", back_populates="meeting", uselist=False)


class BoardAgenda(Base):
    __tablename__ = "board_agenda"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("board_meeting.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    agenda_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    meeting: Mapped[BoardMeeting] = relationship("BoardMeeting", back_populates="agendas")


class BoardAttendance(Base):
    __tablename__ = "board_attendance"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("board_meeting.id", ondelete="CASCADE"))
    member_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("board_member.id", ondelete="CASCADE"))
    attendance_type: Mapped[str] = mapped_column(String(30), nullable=False, default="출석")
    proxy_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    meeting: Mapped[BoardMeeting] = relationship("BoardMeeting", back_populates="attendance")


class NotaryPackage(Base):
    __tablename__ = "notary_package"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("board_meeting.id", ondelete="CASCADE"))
    generated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    merged_pdf_path: Mapped[str] = mapped_column(String(300), nullable=False)
    seal_certificate_issued_at: Mapped[date | None] = mapped_column(Date, nullable=True)

    meeting: Mapped[BoardMeeting] = relationship("BoardMeeting", back_populates="notary_package")
