"""Central authorization logic for vault/document access.

Every protected endpoint that reads/writes vault data must go through one of
these helpers rather than trusting a vault_id/document_id from the request.

Access model (MVP):
  - Vault owner: full access (read/write/delete/manage sharing).
  - vault_members with role OWNER/FAMILY_MEMBER: full read/write access to
    the vault's documents, timeline, expenses, prescriptions, labs, etc.
  - vault_members with role DOCTOR/VIEWER, or a SharedAccess grant without a
    vault_members row: read-only access, and ONLY to documents that match
    the grant's allowed_document_types or an explicit document_access row.
    This narrower grant covers /documents and /summaries; it does not confer
    access to /timeline, /expenses or /search, which stay full-vault-member
    only for this MVP (a doctor works from the shared documents + the
    generated health summary, not the owner's raw timeline/expenses).
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.enums import DocumentType, MembershipStatus, ShareStatus, VaultRole
from app.models.sharing import DocumentAccess, SharedAccess
from app.models.user import User
from app.models.vault import Vault, VaultMember

FULL_ACCESS_ROLES = {VaultRole.OWNER, VaultRole.FAMILY_MEMBER}


def get_user_role_in_vault(db: Session, *, user_id: str, vault_id: str) -> Optional[VaultRole]:
    vault = db.get(Vault, vault_id)
    if vault is None:
        return None
    if vault.owner_id == user_id:
        return VaultRole.OWNER

    membership = (
        db.query(VaultMember)
        .filter(
            VaultMember.vault_id == vault_id,
            VaultMember.user_id == user_id,
            VaultMember.status == MembershipStatus.ACTIVE,
        )
        .first()
    )
    return membership.role if membership else None


def has_full_vault_access(db: Session, *, user_id: str, vault_id: str) -> bool:
    role = get_user_role_in_vault(db, user_id=user_id, vault_id=vault_id)
    return role in FULL_ACCESS_ROLES


def require_full_vault_access(db: Session, *, user: User, vault_id: str) -> Vault:
    vault = db.get(Vault, vault_id)
    if vault is None or not has_full_vault_access(db, user_id=user.id, vault_id=vault_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vault not found")
    return vault


def require_owner(db: Session, *, user: User, vault_id: str) -> Vault:
    vault = db.get(Vault, vault_id)
    if vault is None or vault.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vault not found")
    return vault


def _active_shares_for_user(db: Session, *, user_id: str, vault_id: str) -> list[SharedAccess]:
    now = datetime.now(timezone.utc)
    return (
        db.query(SharedAccess)
        .filter(
            SharedAccess.vault_id == vault_id,
            SharedAccess.shared_with_user_id == user_id,
            SharedAccess.status == ShareStatus.ACTIVE,
            or_(SharedAccess.expires_at.is_(None), SharedAccess.expires_at > now),
        )
        .all()
    )


def user_can_access_document(db: Session, *, user: User, document: Document) -> bool:
    if has_full_vault_access(db, user_id=user.id, vault_id=document.vault_id):
        return True

    shares = _active_shares_for_user(db, user_id=user.id, vault_id=document.vault_id)
    if not shares:
        return False

    for share in shares:
        allowed_types = share.allowed_document_types or []
        if document.document_type and document.document_type.value in allowed_types:
            return True

    share_ids = [s.id for s in shares]
    explicit = (
        db.query(DocumentAccess)
        .filter(DocumentAccess.shared_access_id.in_(share_ids), DocumentAccess.document_id == document.id)
        .first()
    )
    return explicit is not None


def require_document_access(db: Session, *, user: User, document_id: str) -> Document:
    document = db.get(Document, document_id)
    if document is None or document.is_deleted or not user_can_access_document(db, user=user, document=document):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    return document


def accessible_document_filter(db: Session, *, user: User, vault_id: str):
    """Returns a SQLAlchemy filter expression restricting a Document query to
    what `user` may see in `vault_id`, or None if the user has no access at
    all (caller should then 404/return empty)."""
    if has_full_vault_access(db, user_id=user.id, vault_id=vault_id):
        return Document.vault_id == vault_id

    shares = _active_shares_for_user(db, user_id=user.id, vault_id=vault_id)
    if not shares:
        return None

    allowed_types: set[str] = set()
    for share in shares:
        allowed_types.update(share.allowed_document_types or [])

    share_ids = [s.id for s in shares]
    allowed_document_ids = [
        row.document_id
        for row in db.query(DocumentAccess.document_id)
        .filter(DocumentAccess.shared_access_id.in_(share_ids))
        .all()
    ]

    conditions = []
    if allowed_types:
        conditions.append(Document.document_type.in_(list(allowed_types)))
    if allowed_document_ids:
        conditions.append(Document.id.in_(allowed_document_ids))
    if not conditions:
        return None

    return (Document.vault_id == vault_id) & or_(*conditions)
