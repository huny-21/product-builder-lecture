from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.compliance import BoardComplianceStatus, ComplianceIssue
from app.services.compliance_service import ComplianceService

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("/board", response_model=BoardComplianceStatus)
async def board_compliance(db: AsyncSession = Depends(get_db)):
    service = ComplianceService(db)
    stats, issues = await service.evaluate_board()
    return BoardComplianceStatus(
        director_count=stats["director_count"],
        auditor_count=stats["auditor_count"],
        special_relation_count=stats["special_relation_count"],
        foreign_director_count=stats["foreign_director_count"],
        issues=[ComplianceIssue(level=i.level, message=i.message) for i in issues],
    )
