from __future__ import annotations

from datetime import datetime, date, timedelta
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pypdf import PdfWriter, PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.core.config import settings
from app.models.board_meeting import BoardMeeting, BoardAgenda, BoardAttendance, NotaryPackage


class NotaryService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_meeting(self, title: str, meeting_date: date, agendas: list[BoardAgenda]) -> BoardMeeting:
        meeting = BoardMeeting(title=title, meeting_date=meeting_date, status="안건 등록")
        self.db.add(meeting)
        await self.db.flush()
        for agenda in agendas:
            agenda.meeting_id = meeting.id
            self.db.add(agenda)
        await self.db.flush()
        return meeting

    async def send_convene_notice(self, meeting_id: str) -> BoardMeeting | None:
        meeting = await self._get_meeting(meeting_id)
        if not meeting:
            return None
        meeting.convene_notice_sent_at = datetime.utcnow()
        meeting.status = "소집 통지"
        self.db.add(meeting)
        await self.db.flush()
        return meeting

    async def save_minutes(self, meeting_id: str, minutes_text: str) -> BoardMeeting | None:
        meeting = await self._get_meeting(meeting_id)
        if not meeting:
            return None
        meeting.minutes_text = minutes_text
        meeting.status = "회의록 작성"
        self.db.add(meeting)
        await self.db.flush()
        return meeting

    async def generate_package(
        self,
        meeting_id: str,
        seal_certificate_issued_at: date | None,
    ) -> tuple[NotaryPackage | None, list[str], bool, bool | None]:
        meeting = await self._get_meeting(meeting_id)
        if not meeting:
            return None, ["회의 정보를 찾을 수 없습니다."], False, None

        agendas = await self._list_agendas(meeting_id)
        attendance = await self._list_attendance(meeting_id)
        requires_seal = any(self._is_bylaw_change(agenda) for agenda in agendas)
        seal_valid = self._is_seal_certificate_valid(seal_certificate_issued_at) if requires_seal else None

        warnings: list[str] = []
        if requires_seal:
            warnings.append("정관 변경 안건이 포함되어 인감도장 날인이 필수입니다.")
            if seal_valid is False:
                warnings.append("인감증명서 유효기간(3개월)을 초과했습니다. 재발급이 필요합니다.")

        storage_dir = Path(settings.document_storage_dir)
        storage_dir.mkdir(parents=True, exist_ok=True)

        minutes_path = storage_dir / f"minutes-{meeting.id}.pdf"
        proxy_path = storage_dir / f"proxy-{meeting.id}.pdf"
        statement_path = storage_dir / f"statement-{meeting.id}.pdf"
        merged_path = storage_dir / f"notary-package-{meeting.id}.pdf"

        self._generate_minutes_pdf(minutes_path, meeting, agendas, attendance)
        self._generate_proxy_pdf(proxy_path, meeting, attendance)
        self._generate_statement_pdf(statement_path, meeting, agendas)
        self._merge_pdfs([minutes_path, proxy_path, statement_path], merged_path)

        package = NotaryPackage(
            meeting_id=meeting.id,
            generated_at=datetime.utcnow(),
            merged_pdf_path=str(merged_path),
            seal_certificate_issued_at=seal_certificate_issued_at,
        )
        self.db.add(package)
        meeting.status = "서류 패키징"
        self.db.add(meeting)
        await self.db.flush()
        return package, warnings, requires_seal, seal_valid

    async def add_attendance(self, meeting_id: str, attendance: BoardAttendance) -> BoardAttendance | None:
        meeting = await self._get_meeting(meeting_id)
        if not meeting:
            return None
        attendance.meeting_id = meeting.id
        self.db.add(attendance)
        await self.db.flush()
        return attendance

    async def _get_meeting(self, meeting_id: str) -> BoardMeeting | None:
        result = await self.db.execute(select(BoardMeeting).where(BoardMeeting.id == meeting_id))
        return result.scalar_one_or_none()

    async def _list_agendas(self, meeting_id: str) -> list[BoardAgenda]:
        result = await self.db.execute(select(BoardAgenda).where(BoardAgenda.meeting_id == meeting_id))
        return list(result.scalars().all())

    async def _list_attendance(self, meeting_id: str) -> list[BoardAttendance]:
        result = await self.db.execute(select(BoardAttendance).where(BoardAttendance.meeting_id == meeting_id))
        return list(result.scalars().all())

    def _is_bylaw_change(self, agenda: BoardAgenda) -> bool:
        return agenda.agenda_type == "정관 변경" or "정관 변경" in agenda.title

    def _is_seal_certificate_valid(self, issued_at: date | None) -> bool:
        if not issued_at:
            return False
        return issued_at >= date.today() - timedelta(days=90)

    def _generate_minutes_pdf(
        self,
        path: Path,
        meeting: BoardMeeting,
        agendas: list[BoardAgenda],
        attendance: list[BoardAttendance],
    ) -> None:
        c = canvas.Canvas(str(path), pagesize=A4)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, 800, "이사회 의사록")
        c.setFont("Helvetica", 11)
        c.drawString(40, 780, f"회의명: {meeting.title}")
        c.drawString(40, 765, f"일시: {meeting.meeting_date}")
        c.drawString(40, 750, f"안건 수: {len(agendas)}")
        c.drawString(40, 735, f"참석자 수: {len(attendance)}")
        y = 710
        c.setFont("Helvetica-Bold", 11)
        c.drawString(40, y, "안건")
        c.setFont("Helvetica", 10)
        for agenda in agendas:
            y -= 16
            c.drawString(40, y, f"- {agenda.title} ({agenda.agenda_type})")
        y -= 24
        c.setFont("Helvetica-Bold", 11)
        c.drawString(40, y, "회의록")
        y -= 16
        c.setFont("Helvetica", 10)
        minutes = meeting.minutes_text or "회의록 내용이 입력되지 않았습니다."
        for line in minutes.splitlines()[:20]:
            c.drawString(40, y, line)
            y -= 14
        c.showPage()
        c.save()

    def _generate_proxy_pdf(
        self,
        path: Path,
        meeting: BoardMeeting,
        attendance: list[BoardAttendance],
    ) -> None:
        c = canvas.Canvas(str(path), pagesize=A4)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, 800, "위임장")
        c.setFont("Helvetica", 11)
        c.drawString(40, 780, f"회의명: {meeting.title}")
        c.drawString(40, 765, f"일시: {meeting.meeting_date}")
        y = 740
        c.setFont("Helvetica", 10)
        for item in attendance:
            if item.attendance_type == "위임":
                c.drawString(40, y, f"- 위임자: {item.member_id} / 대리인: {item.proxy_name or '-'}")
                y -= 14
        c.showPage()
        c.save()

    def _generate_statement_pdf(
        self,
        path: Path,
        meeting: BoardMeeting,
        agendas: list[BoardAgenda],
    ) -> None:
        c = canvas.Canvas(str(path), pagesize=A4)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, 800, "진술서")
        c.setFont("Helvetica", 11)
        c.drawString(40, 780, f"회의명: {meeting.title}")
        c.drawString(40, 765, f"일시: {meeting.meeting_date}")
        y = 740
        c.setFont("Helvetica", 10)
        for agenda in agendas:
            c.drawString(40, y, f"- 안건: {agenda.title} / 유형: {agenda.agenda_type}")
            y -= 14
        c.showPage()
        c.save()

    def _merge_pdfs(self, input_paths: list[Path], output_path: Path) -> None:
        writer = PdfWriter()
        for path in input_paths:
            reader = PdfReader(str(path))
            for page in reader.pages:
                writer.add_page(page)
        with output_path.open("wb") as f:
            writer.write(f)
