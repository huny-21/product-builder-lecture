from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401  # ensure models are registered


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
