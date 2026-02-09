import uuid
from sqlalchemy import String, Date, Numeric, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Donation(Base):
    __tablename__ = "donation"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("donor.id"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project.id"), nullable=False)
    donated_at: Mapped[Date] = mapped_column(Date, nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(18, 2), nullable=False)
    purpose: Mapped[str | None] = mapped_column(String(300), nullable=True)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)
    receipt_issued: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class DonationReceipt(Base):
    __tablename__ = "donation_receipt"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("donation.id", ondelete="CASCADE"), nullable=False)
    receipt_no: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    issued_amount: Mapped[Numeric] = mapped_column(Numeric(18, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
