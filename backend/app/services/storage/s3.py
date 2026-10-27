"""S3-compatible object storage provider (AWS S3, MinIO, etc.) for production."""
from typing import BinaryIO, Optional

from app.core.config import settings
from app.services.storage.base import StorageService


class S3StorageService(StorageService):
    provider_name = "s3"

    def __init__(self):
        import boto3  # local import: keep boto3 optional for local-only dev installs

        client_kwargs = {
            "aws_access_key_id": settings.STORAGE_ACCESS_KEY or None,
            "aws_secret_access_key": settings.STORAGE_SECRET_KEY or None,
            "region_name": settings.STORAGE_REGION or None,
        }
        if settings.STORAGE_ENDPOINT_URL:
            client_kwargs["endpoint_url"] = settings.STORAGE_ENDPOINT_URL

        self.bucket = settings.STORAGE_BUCKET
        if not self.bucket:
            raise ValueError("STORAGE_BUCKET must be set when STORAGE_PROVIDER=s3")
        self.client = boto3.client("s3", **client_kwargs)

    def save(self, *, file_obj: BinaryIO, key: str, content_type: str) -> str:
        self.client.upload_fileobj(
            file_obj, self.bucket, key, ExtraArgs={"ContentType": content_type}
        )
        return key

    def read(self, storage_path: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=storage_path)
        return response["Body"].read()

    def delete(self, storage_path: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=storage_path)

    def get_download_url(self, storage_path: str, *, expires_in: int = 300) -> Optional[str]:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": storage_path},
            ExpiresIn=expires_in,
        )
