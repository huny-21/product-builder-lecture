from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "NPO-TrustOS"
    env: str = "dev"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/npo_trustos"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    rrn_encryption_key_b64: str = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
    rrn_encryption_key_id: str = "rrn-key-dev-001"
    document_storage_dir: str = "/tmp/npo-trustos-docs"

    class Config:
        env_file = ".env"


settings = Settings()
