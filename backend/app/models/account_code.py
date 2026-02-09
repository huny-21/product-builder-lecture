import uuid
from sqlalchemy import String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AccountCode(Base):
    __tablename__ = "account_code"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    level1: Mapped[str] = mapped_column(String(100), nullable=False)
    level2: Mapped[str] = mapped_column(String(100), nullable=False)
    level3: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    is_common_expense: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
