from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router
from app.db.init_db import init_db

app = FastAPI(title=settings.app_name)

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 단계이므로 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api") # 라우터에 /api 접두사 추가 (일반적인 관례)


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()
