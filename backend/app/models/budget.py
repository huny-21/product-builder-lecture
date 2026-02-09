import uuid
from sqlalchemy import Integer, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Budget(Base):
    __tablename__ = "budget"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("project.id"), nullable=False)
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    total_budget: Mapped[Numeric] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    total_spent: Mapped[Numeric] = mapped_column(Numeric(18, 2), nullable=False, default=0)
