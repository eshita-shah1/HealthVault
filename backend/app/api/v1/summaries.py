from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import ShareStatus
from app.models.sharing import SharedAccess
from app.models.summary import HealthSummary
from app.models.user import User
from app.schemas.summary import HealthSummaryOut, SummaryGenerateRequest
from app.services.sharing.access_service import require_full_vault_access
from app.services.summaries.summary_service import generate_summary

router = APIRouter(prefix="/summaries", tags=["summaries"])


def _active_share_for_viewer(db: Session, *, vault_id: str, user_id: str) -> SharedAccess | None:
    now = datetime.now(timezone.utc)
    share = (
        db.query(SharedAccess)
        .filter(
            SharedAccess.vault_id == vault_id,
            SharedAccess.shared_with_user_id == user_id,
            SharedAccess.status == ShareStatus.ACTIVE,
        )
        .first()
    )
    if share and (share.expires_at is None or share.expires_at > now):
        return share
    return None


@router.post("/generate", response_model=HealthSummaryOut, status_code=status.HTTP_201_CREATED)
def generate_health_summary(
    vault_id: str = Query(...),
    payload: SummaryGenerateRequest = SummaryGenerateRequest(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> HealthSummaryOut:
    require_full_vault_access(db, user=user, vault_id=vault_id)
    summary = generate_summary(
        db, vault_id=vault_id, generated_by=user.id, generated_for_share_id=payload.shared_access_id
    )
    db.commit()
    db.refresh(summary)
    return HealthSummaryOut.model_validate(summary)


@router.get("", response_model=list[HealthSummaryOut])
def list_health_summaries(
    vault_id: str = Query(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[HealthSummaryOut]:
    require_full_vault_access(db, user=user, vault_id=vault_id)
    summaries = (
        db.query(HealthSummary)
        .filter(HealthSummary.vault_id == vault_id)
        .order_by(HealthSummary.version.desc())
        .all()
    )
    return [HealthSummaryOut.model_validate(s) for s in summaries]


@router.get("/latest", response_model=HealthSummaryOut)
def get_latest_summary(
    vault_id: str = Query(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> HealthSummaryOut:
    require_full_vault_access(db, user=user, vault_id=vault_id)
    latest = (
        db.query(HealthSummary)
        .filter(HealthSummary.vault_id == vault_id)
        .order_by(HealthSummary.version.desc())
        .first()
    )
    if latest is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No health summary has been generated yet")
    return HealthSummaryOut.model_validate(latest)


@router.get("/{summary_id}", response_model=HealthSummaryOut)
def get_health_summary(summary_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> HealthSummaryOut:
    summary = db.get(HealthSummary, summary_id)
    if summary is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Summary not found")

    try:
        require_full_vault_access(db, user=user, vault_id=summary.vault_id)
    except HTTPException:
        if not _active_share_for_viewer(db, vault_id=summary.vault_id, user_id=user.id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Summary not found")

    return HealthSummaryOut.model_validate(summary)


@router.get("/doctor/{vault_id}", response_model=HealthSummaryOut)
def get_summary_for_doctor(vault_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> HealthSummaryOut:
    """Doctor-facing endpoint: returns the latest summary for a vault the
    caller has been granted shared access to, generating one on first use."""
    share = _active_share_for_viewer(db, vault_id=vault_id, user_id=user.id)
    if share is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No shared access to this vault")

    latest = (
        db.query(HealthSummary)
        .filter(HealthSummary.vault_id == vault_id)
        .order_by(HealthSummary.version.desc())
        .first()
    )
    if latest is None:
        latest = generate_summary(db, vault_id=vault_id, generated_by=user.id, generated_for_share_id=share.id)
        db.commit()
        db.refresh(latest)

    return HealthSummaryOut.model_validate(latest)
