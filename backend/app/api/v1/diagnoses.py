from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.diagnosis import Diagnosis
from app.models.user import User
from app.schemas.diagnosis import DiagnosisOut
from app.services.sharing.access_service import require_document_access, require_full_vault_access

router = APIRouter(prefix="/diagnoses", tags=["diagnoses"])


@router.get("", response_model=list[DiagnosisOut])
def list_diagnoses(
    vault_id: str = Query(...),
    document_id: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[DiagnosisOut]:
    require_full_vault_access(db, user=user, vault_id=vault_id)
    q = db.query(Diagnosis).filter(Diagnosis.vault_id == vault_id)
    if document_id:
        q = q.filter(Diagnosis.document_id == document_id)
    diagnoses = (
        q
        .order_by(Diagnosis.diagnosis_date.desc().nullslast())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [DiagnosisOut.model_validate(d) for d in diagnoses]


@router.get("/{diagnosis_id}", response_model=DiagnosisOut)
def get_diagnosis(diagnosis_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> DiagnosisOut:
    diagnosis = db.get(Diagnosis, diagnosis_id)
    if diagnosis is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Diagnosis not found")
    require_document_access(db, user=user, document_id=diagnosis.document_id)
    return DiagnosisOut.model_validate(diagnosis)
