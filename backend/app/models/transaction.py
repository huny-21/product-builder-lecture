import uuid
from sqlalchemy import String, Date, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class TransactionHead(Base):
    __tablename__ = "transaction_head"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tx_date: Mapped[Date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)


class TransactionLine(Base):
    __tablename__ = "transaction_line"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    head_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transaction_head.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project.id"), nullable=False)
    account_code_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("account_code.id"), nullable=False)
    debit_amount: Mapped[Numeric] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    credit_amount: Mapped[Numeric] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    evidence_url: Mapped[str | None] = mapped_column(String, nullable=True)
