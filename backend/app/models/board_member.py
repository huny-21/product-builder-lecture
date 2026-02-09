import uuid
from datetime import date
from sqlalchemy import String, Date, Boolean, ForeignKey, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class BoardMember(Base):
    __tablename__ = "board_member"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    rrn_encrypted: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    rrn_key_id: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str] = mapped_column(String(300), nullable=False)
    term_start: Mapped[date] = mapped_column(Date, nullable=False)
    term_end: Mapped[date] = mapped_column(Date, nullable=False)
    occupation: Mapped[str] = mapped_column(String(200), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    is_foreigner: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    special_relation_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("board_member.id"),
        nullable=True,
    )

    special_relation_to: Mapped["BoardMember | None"] = relationship("BoardMember", remote_side=[id])
