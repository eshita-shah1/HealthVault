"""Create/list/revoke sharing grants. Only a vault owner may call these
(enforced by the API layer via access_service.require_owner)."""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.enums import DocumentType, ShareStatus, VaultRole
from app.models.sharing import DocumentAccess, SharedAccess
from app.models.user import User


def create_share(
    db: Session,
    *,
    vault_id: str,
    owner_id: str,
    role: VaultRole,
    shared_with_email: str,
    allowed_document_types: Optional[list[DocumentType]] = None,
    document_ids: Optional[list[str]] = None,
    expires_at: Optional[datetime] = None,
) -> SharedAccess:
    target_user = db.query(User).filter(User.email == shared_with_email.lower()).first()

    share = SharedAccess(
        vault_id=vault_id,
        owner_id=owner_id,
        shared_with_user_id=target_user.id if target_user else None,
        shared_with_email=shared_with_email.lower(),
        role=role,
        allowed_document_types=[t.value for t in allowed_document_types] if allowed_document_types else None,
        status=ShareStatus.ACTIVE,
        expires_at=expires_at,
    )
    db.add(share)
    db.flush()

    for document_id in document_ids or []:
        db.add(DocumentAccess(shared_access_id=share.id, document_id=document_id))

    db.flush()
    return share


def list_shares_for_vault(db: Session, *, vault_id: str) -> list[SharedAccess]:
    return db.query(SharedAccess).filter(SharedAccess.vault_id == vault_id).order_by(SharedAccess.created_at.desc()).all()


def revoke_share(db: Session, *, share: SharedAccess) -> None:
    share.status = ShareStatus.REVOKED
    db.flush()
