import uuid
from sqlalchemy import String, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Donor(Base):
    __tablename__ = "donor"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)


class DonorSensitive(Base):
    __tablename__ = "donor_sensitive"

    donor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    rrn_encrypted: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    encryption_key_id: Mapped[str] = mapped_column(String(100), nullable=False)
