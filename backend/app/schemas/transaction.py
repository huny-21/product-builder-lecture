from datetime import date
from uuid import UUID
from pydantic import BaseModel


class TransactionHeadBase(BaseModel):
    tx_date: date
    description: str | None = None
    status: str
    created_by: UUID
    approved_by: UUID | None = None


class TransactionHeadCreate(TransactionHeadBase):
    pass


class TransactionHeadRead(TransactionHeadBase):
    id: UUID

    class Config:
        from_attributes = True


class TransactionLineBase(BaseModel):
    head_id: UUID
    project_id: UUID
    account_code_id: UUID
    debit_amount: float = 0
    credit_amount: float = 0
    evidence_url: str | None = None


class TransactionLineCreate(TransactionLineBase):
    pass


class TransactionLineRead(TransactionLineBase):
    id: UUID

    class Config:
        from_attributes = True
