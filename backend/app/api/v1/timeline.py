from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.document import Document
from app.models.enums import DocumentType, TimelineEventType
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.schemas.timeline import TimelineEventOut
from app.services.sharing.access_service import require_full_vault_access

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("", response_model=list[TimelineEventOut])
def list_timeline(
    vault_id: str = Query(...),
    event_type: Optional[TimelineEventType] = None,
    document_type: Optional[DocumentType] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TimelineEventOut]:
    require_full_vault_access(db, user=user, vault_id=vault_id)

    q = db.query(TimelineEvent).filter(TimelineEvent.vault_id == vault_id)
    if event_type:
        q = q.filter(TimelineEvent.event_type == event_type)
    if date_from:
        q = q.filter(TimelineEvent.event_date >= date_from)
    if date_to:
        q = q.filter(TimelineEvent.event_date <= date_to)
    if document_type:
        q = q.join(Document, TimelineEvent.document_id == Document.id).filter(Document.document_type == document_type)

    events = q.order_by(TimelineEvent.event_date.desc()).offset(offset).limit(limit).all()
    return [TimelineEventOut.model_validate(e) for e in events]


@router.get("/{event_id}", response_model=TimelineEventOut)
def get_timeline_event(event_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> TimelineEventOut:
    event = db.get(TimelineEvent, event_id)
    if event is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Timeline event not found")
    require_full_vault_access(db, user=user, vault_id=event.vault_id)
    return TimelineEventOut.model_validate(event)
