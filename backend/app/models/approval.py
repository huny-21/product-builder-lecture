import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class ApprovalStep(Base):
    __tablename__ = "approval_step"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    required_role: Mapped[str] = mapped_column(String(50), nullable=False)


class TransactionApproval(Base):
    __tablename__ = "transaction_approval"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    head_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transaction_head.id", ondelete="CASCADE"), nullable=False)
    step_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("approval_step.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    decided_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
