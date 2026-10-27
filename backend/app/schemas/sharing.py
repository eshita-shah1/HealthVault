from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import DocumentType, ShareStatus, VaultRole


class ShareCreate(BaseModel):
    shared_with_email: EmailStr
    role: VaultRole = VaultRole.DOCTOR
    allowed_document_types: Optional[list[DocumentType]] = None
    document_ids: Optional[list[str]] = None
    expires_at: Optional[datetime] = None


class SharedAccessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vault_id: str
    owner_id: str
    shared_with_user_id: Optional[str] = None
    shared_with_email: Optional[str] = None
    role: VaultRole
    allowed_document_types: Optional[list[str]] = None
    status: ShareStatus
    expires_at: Optional[datetime] = None
    created_at: datetime
