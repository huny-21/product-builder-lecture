from fastapi import APIRouter
from app.api.routes.health import router as health_router
from app.api.routes.project import router as project_router
from app.api.routes.transaction import router as transaction_router
from app.api.routes.donation import router as donation_router
from app.api.routes.reporting import router as reporting_router
from app.api.routes.board_member import router as board_member_router
from app.api.routes.compliance import router as compliance_router
from app.api.routes.notary import router as notary_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(project_router)
api_router.include_router(transaction_router)
api_router.include_router(donation_router)
api_router.include_router(reporting_router)
api_router.include_router(board_member_router)
api_router.include_router(compliance_router)
api_router.include_router(notary_router)
