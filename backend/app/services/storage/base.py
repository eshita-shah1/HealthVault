"""Storage provider abstraction.

Nothing outside this package should know whether a file lives on local disk
or in S3. Callers work with an opaque `storage_path` string returned by
`save()` and pass it back to `read` / `delete` / `get_presigned_url`.
"""
from abc import ABC, abstractmethod
from typing import BinaryIO, Optional


class StorageService(ABC):
    provider_name: str

    @abstractmethod
    def save(self, *, file_obj: BinaryIO, key: str, content_type: str) -> str:
        """Persist the file and return the storage_path to store in the DB."""
        raise NotImplementedError

    @abstractmethod
    def read(self, storage_path: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def delete(self, storage_path: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_download_url(self, storage_path: str, *, expires_in: int = 300) -> Optional[str]:
        """Return a short-lived signed URL, or None if the provider requires
        streaming through the API instead (e.g. local disk in dev)."""
        raise NotImplementedError
