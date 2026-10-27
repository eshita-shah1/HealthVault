"""Local-disk storage provider, for development.

storage_path is a path relative to STORAGE_LOCAL_DIR, never an absolute path
or a publicly reachable URL — files are only ever served through the
authenticated /documents/{id}/download endpoint.
"""
import os
from pathlib import Path
from typing import BinaryIO, Optional

from app.core.config import settings
from app.services.storage.base import StorageService


class LocalStorageService(StorageService):
    provider_name = "local"

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or settings.STORAGE_LOCAL_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve(self, storage_path: str) -> Path:
        full_path = (self.base_dir / storage_path).resolve()
        if self.base_dir not in full_path.parents and full_path != self.base_dir:
            raise ValueError("Invalid storage path")
        return full_path

    def save(self, *, file_obj: BinaryIO, key: str, content_type: str) -> str:
        target = self._resolve(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "wb") as f:
            for chunk in iter(lambda: file_obj.read(1024 * 1024), b""):
                f.write(chunk)
        return key

    def read(self, storage_path: str) -> bytes:
        target = self._resolve(storage_path)
        with open(target, "rb") as f:
            return f.read()

    def delete(self, storage_path: str) -> None:
        target = self._resolve(storage_path)
        if target.exists():
            os.remove(target)

    def get_download_url(self, storage_path: str, *, expires_in: int = 300) -> Optional[str]:
        # Local dev has no public URL scheme; the API streams the file instead.
        return None
