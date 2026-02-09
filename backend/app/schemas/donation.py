from datetime import date
from uuid import UUID
from pydantic import BaseModel


class DonorBase(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None


class DonorCreate(DonorBase):
    pass


class DonorRead(DonorBase):
    id: UUID

    class Config:
        from_attributes = True


class DonationBase(BaseModel):
    donor_id: UUID
    project_id: UUID
    donated_at: date
    amount: float
    purpose: str | None = None
    payment_method: str
    receipt_issued: bool = False


class DonationCreate(DonationBase):
    pass


class DonationRead(DonationBase):
    id: UUID

    class Config:
        from_attributes = True
