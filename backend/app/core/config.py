"""Central application configuration, loaded from environment variables / .env.

Every provider-specific setting (storage, OCR, LLM) lives here so the rest of
the app never reads os.environ directly and providers stay swappable.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    APP_NAME: str = "Health Vault"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+psycopg://healthvault:healthvault@localhost:5432/healthvault"

    # Auth
    JWT_SECRET_KEY: str = "insecure-dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30

    # Storage
    STORAGE_PROVIDER: str = "local"  # local | s3
    STORAGE_LOCAL_DIR: str = "./uploads"
    STORAGE_BUCKET: str = ""
    STORAGE_REGION: str = ""
    STORAGE_ENDPOINT_URL: str = ""
    STORAGE_ACCESS_KEY: str = ""
    STORAGE_SECRET_KEY: str = ""

    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_UPLOAD_EXTENSIONS: str = ".pdf,.jpg,.jpeg,.png,.tiff,.bmp"

    # AI / LLM
    AI_PROVIDER: str = "rule_based"  # openai | rule_based
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # OCR
    OCR_PROVIDER: str = "tesseract"  # tesseract | none
    TESSERACT_CMD: str = ""

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def allowed_upload_extensions(self) -> List[str]:
        return [e.strip().lower() for e in self.ALLOWED_UPLOAD_EXTENSIONS.split(",") if e.strip()]

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
