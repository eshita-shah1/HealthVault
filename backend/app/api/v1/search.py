from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import DocumentType
from app.models.user import User
from app.schemas.common import Page
from app.schemas.document import DocumentOut
from app.services.search.search_service import search_documents
from app.services.sharing.access_service import require_full_vault_access

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=Page[DocumentOut])
def search(
    vault_id: str = Query(...),
    q: Optional[str] = Query(default=None, description="Free-text query, e.g. 'HbA1c' or 'Apollo Hospital'"),
    document_type: Optional[DocumentType] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Page[DocumentOut]:
    require_full_vault_access(db, user=user, vault_id=vault_id)
    results, total = search_documents(
        db, vault_id=vault_id, query=q, document_type=document_type,
        date_from=date_from, date_to=date_to, limit=limit, offset=offset,
    )
    return Page(items=[DocumentOut.model_validate(d) for d in results], total=total, limit=limit, offset=offset)
