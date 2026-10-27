from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.prescription import Prescription
from app.models.user import User
from app.schemas.prescription import PrescriptionOut
from app.services.sharing.access_service import require_document_access, require_full_vault_access

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


@router.get("", response_model=list[PrescriptionOut])
def list_prescriptions(
    vault_id: str = Query(...),
    document_id: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[PrescriptionOut]:
    require_full_vault_access(db, user=user, vault_id=vault_id)
    q = db.query(Prescription).filter(Prescription.vault_id == vault_id)
    if document_id:
        q = q.filter(Prescription.document_id == document_id)
    prescriptions = (
        q
        .order_by(Prescription.prescription_date.desc().nullslast())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [PrescriptionOut.model_validate(p) for p in prescriptions]


@router.get("/{prescription_id}", response_model=PrescriptionOut)
def get_prescription(prescription_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> PrescriptionOut:
    prescription = db.get(Prescription, prescription_id)
    if prescription is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prescription not found")
    require_document_access(db, user=user, document_id=prescription.document_id)
    return PrescriptionOut.model_validate(prescription)
