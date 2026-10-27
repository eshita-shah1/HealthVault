from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document
from app.models.enums import MembershipStatus, ProcessingStatus, VaultRole
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.models.vault import Vault, VaultMember
from app.schemas.vault import VaultCreate, VaultDashboardOut, VaultMemberInvite, VaultMemberOut, VaultOut
from app.services.expenses.expense_service import get_expense_summary
from app.services.sharing.access_service import get_user_role_in_vault, require_full_vault_access, require_owner

router = APIRouter(prefix="/vault", tags=["vault"])


@router.get("", response_model=list[VaultOut])
def list_my_vaults(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[VaultOut]:
    owned = db.query(Vault).filter(Vault.owner_id == user.id).all()
    member_vault_ids = [
        m.vault_id
        for m in db.query(VaultMember)
        .filter(VaultMember.user_id == user.id, VaultMember.status == MembershipStatus.ACTIVE)
        .all()
    ]
    member_vaults = db.query(Vault).filter(Vault.id.in_(member_vault_ids)).all() if member_vault_ids else []

    seen = {v.id for v in owned}
    all_vaults = owned + [v for v in member_vaults if v.id not in seen]
    return [VaultOut.model_validate(v) for v in all_vaults]


@router.post("", response_model=VaultOut, status_code=status.HTTP_201_CREATED)
def create_vault(
    payload: VaultCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> VaultOut:
    vault = Vault(owner_id=user.id, name=payload.name, description=payload.description)
    db.add(vault)
    db.flush()
    db.add(VaultMember(vault_id=vault.id, user_id=user.id, role=VaultRole.OWNER, status=MembershipStatus.ACTIVE))
    db.commit()
    db.refresh(vault)
    return VaultOut.model_validate(vault)


@router.get("/{vault_id}", response_model=VaultOut)
def get_vault(vault_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> VaultOut:
    vault = db.get(Vault, vault_id)
    if vault is None or get_user_role_in_vault(db, user_id=user.id, vault_id=vault_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vault not found")
    return VaultOut.model_validate(vault)


@router.get("/{vault_id}/members", response_model=list[VaultMemberOut])
def list_members(
    vault_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[VaultMemberOut]:
    if get_user_role_in_vault(db, user_id=user.id, vault_id=vault_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vault not found")
    members = db.query(VaultMember).filter(VaultMember.vault_id == vault_id).all()
    return [VaultMemberOut.model_validate(m) for m in members]


@router.post("/{vault_id}/members", response_model=VaultMemberOut, status_code=status.HTTP_201_CREATED)
def invite_member(
    vault_id: str, payload: VaultMemberInvite, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> VaultMemberOut:
    require_owner(db, user=user, vault_id=vault_id)

    target = db.query(User).filter(User.email == payload.email.lower()).first()
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No Health Vault user with that email yet")

    existing = db.query(VaultMember).filter(VaultMember.vault_id == vault_id, VaultMember.user_id == target.id).first()
    if existing:
        existing.role = payload.role
        existing.status = MembershipStatus.ACTIVE
        db.commit()
        db.refresh(existing)
        return VaultMemberOut.model_validate(existing)

    member = VaultMember(
        vault_id=vault_id, user_id=target.id, role=payload.role, status=MembershipStatus.ACTIVE, invited_by=user.id
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return VaultMemberOut.model_validate(member)


@router.delete("/{vault_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    vault_id: str, member_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    require_owner(db, user=user, vault_id=vault_id)
    member = db.get(VaultMember, member_id)
    if member is None or member.vault_id != vault_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    if member.user_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Owner cannot remove themselves")
    db.delete(member)
    db.commit()
    return None


@router.get("/{vault_id}/dashboard", response_model=VaultDashboardOut)
def get_vault_dashboard(
    vault_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> VaultDashboardOut:
    require_full_vault_access(db, user=user, vault_id=vault_id)

    base = db.query(Document).filter(Document.vault_id == vault_id, Document.is_deleted.is_(False))
    document_count = base.count()
    needs_review = base.filter(Document.processing_status == ProcessingStatus.NEEDS_REVIEW).count()

    by_type_rows = (
        base.filter(Document.document_type.isnot(None))
        .with_entities(Document.document_type, func.count(Document.id))
        .group_by(Document.document_type)
        .all()
    )

    storage_used_bytes = (
        base.with_entities(func.coalesce(func.sum(Document.file_size_bytes), 0)).scalar()
    )

    timeline_event_count = db.query(TimelineEvent).filter(TimelineEvent.vault_id == vault_id).count()
    member_count = (
        db.query(VaultMember)
        .filter(VaultMember.vault_id == vault_id, VaultMember.status == MembershipStatus.ACTIVE)
        .count()
    )

    expense_summary = get_expense_summary(db, vault_id=vault_id)

    recent_documents = (
        base.order_by(Document.created_at.desc())
        .limit(5)
        .with_entities(Document.id, Document.original_filename, Document.document_type, Document.processing_status, Document.created_at)
        .all()
    )
    recent_events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.vault_id == vault_id)
        .order_by(TimelineEvent.event_date.desc())
        .limit(5)
        .all()
    )

    return VaultDashboardOut(
        document_count=document_count,
        documents_needing_review=needs_review,
        documents_by_type={(t.value if t else "UNKNOWN"): c for t, c in by_type_rows},
        timeline_event_count=timeline_event_count,
        member_count=member_count,
        storage_used_bytes=int(storage_used_bytes),
        expense_total=expense_summary["total"],
        expense_current_month=expense_summary["current_month_total"],
        recent_documents=[
            {
                "id": d.id,
                "filename": d.original_filename,
                "document_type": d.document_type.value if d.document_type else None,
                "processing_status": d.processing_status.value,
                "created_at": d.created_at.isoformat(),
            }
            for d in recent_documents
        ],
        recent_timeline_events=[
            {"id": e.id, "event_type": e.event_type.value, "title": e.title, "event_date": e.event_date.isoformat()}
            for e in recent_events
        ],
    )
