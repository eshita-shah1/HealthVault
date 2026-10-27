from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import ShareStatus
from app.models.sharing import SharedAccess
from app.models.user import User
from app.schemas.sharing import ShareCreate, SharedAccessOut
from app.services.sharing.access_service import require_owner
from app.services.sharing.sharing_service import create_share, list_shares_for_vault, revoke_share

router = APIRouter(prefix="/sharing", tags=["sharing"])


@router.post("", response_model=SharedAccessOut, status_code=status.HTTP_201_CREATED)
def create_sharing_grant(
    vault_id: str = Query(...),
    payload: ShareCreate = ...,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SharedAccessOut:
    require_owner(db, user=user, vault_id=vault_id)
    share = create_share(
        db,
        vault_id=vault_id,
        owner_id=user.id,
        role=payload.role,
        shared_with_email=payload.shared_with_email,
        allowed_document_types=payload.allowed_document_types,
        document_ids=payload.document_ids,
        expires_at=payload.expires_at,
    )
    db.commit()
    db.refresh(share)
    return SharedAccessOut.model_validate(share)


@router.get("", response_model=list[SharedAccessOut])
def list_sharing_grants(
    vault_id: str = Query(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[SharedAccessOut]:
    require_owner(db, user=user, vault_id=vault_id)
    return [SharedAccessOut.model_validate(s) for s in list_shares_for_vault(db, vault_id=vault_id)]


@router.get("/shared-with-me", response_model=list[SharedAccessOut])
def list_shared_with_me(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> list[SharedAccessOut]:
    now = datetime.now(timezone.utc)
    shares = (
        db.query(SharedAccess)
        .filter(
            SharedAccess.shared_with_user_id == user.id,
            SharedAccess.status == ShareStatus.ACTIVE,
        )
        .all()
    )
    active = [s for s in shares if s.expires_at is None or s.expires_at > now]
    return [SharedAccessOut.model_validate(s) for s in active]


@router.delete("/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_sharing_grant(share_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    share = db.get(SharedAccess, share_id)
    if share is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share not found")
    require_owner(db, user=user, vault_id=share.vault_id)
    revoke_share(db, share=share)
    db.commit()
    return None
