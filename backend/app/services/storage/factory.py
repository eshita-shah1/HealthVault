from functools import lru_cache

from app.core.config import settings
from app.services.storage.base import StorageService


@lru_cache
def get_storage_service() -> StorageService:
    provider = settings.STORAGE_PROVIDER.lower()
    if provider == "local":
        from app.services.storage.local import LocalStorageService

        return LocalStorageService()
    if provider == "s3":
        from app.services.storage.s3 import S3StorageService

        return S3StorageService()
    raise ValueError(f"Unknown STORAGE_PROVIDER: {settings.STORAGE_PROVIDER}")
