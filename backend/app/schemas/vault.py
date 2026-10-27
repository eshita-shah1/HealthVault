from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import MembershipStatus, VaultRole


class VaultCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None


class VaultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime


class VaultMemberInvite(BaseModel):
    email: EmailStr
    role: VaultRole = VaultRole.VIEWER


class VaultMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vault_id: str
    user_id: str
    role: VaultRole
    status: MembershipStatus
    created_at: datetime


class VaultDashboardOut(BaseModel):
    document_count: int
    documents_needing_review: int
    documents_by_type: dict[str, int]
    timeline_event_count: int
    member_count: int
    storage_used_bytes: int
    expense_total: float
    expense_current_month: float
    recent_documents: list[dict]
    recent_timeline_events: list[dict]
