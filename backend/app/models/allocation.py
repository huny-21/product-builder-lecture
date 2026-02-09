import uuid
from sqlalchemy import String, Date, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AllocationRule(Base):
    __tablename__ = "allocation_rule"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    basis_type: Mapped[str] = mapped_column(String(50), nullable=False)
    basis_value: Mapped[Numeric] = mapped_column(Numeric(18, 4), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project.id"), nullable=False)
    effective_from: Mapped[Date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[Date | None] = mapped_column(Date, nullable=True)


class AllocationRuleItem(Base):
    __tablename__ = "allocation_rule_item"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("allocation_rule.id", ondelete="CASCADE"), nullable=False)
    target_project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project.id"), nullable=False)
    ratio: Mapped[Numeric] = mapped_column(Numeric(6, 4), nullable=False)


class AllocationResult(Base):
    __tablename__ = "allocation_result"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_line_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transaction_line.id", ondelete="CASCADE"), nullable=False)
    allocated_line_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("transaction_line.id", ondelete="CASCADE"), nullable=False)
    rule_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("allocation_rule.id"), nullable=False)
    allocated_amount: Mapped[Numeric] = mapped_column(Numeric(18, 2), nullable=False)
