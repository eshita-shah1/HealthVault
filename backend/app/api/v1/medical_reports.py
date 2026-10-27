"""Read-only access to the generic structured record used for document types
that aren't a prescription, lab report, diagnosis or bill: MEDICAL_REPORT,
DISCHARGE_SUMMARY, SCAN_REPORT, CONSULTATION, INSURANCE_DOCUMENT.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.medical_report import MedicalReport
from app.models.user import User
from app.schemas.medical_report import MedicalReportOut
from app.services.sharing.access_service import require_document_access, require_full_vault_access

router = APIRouter(prefix="/medical-reports", tags=["medical-reports"])


@router.get("", response_model=list[MedicalReportOut])
def list_medical_reports(
    vault_id: str = Query(...),
    document_id: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[MedicalReportOut]:
    require_full_vault_access(db, user=user, vault_id=vault_id)
    q = db.query(MedicalReport).filter(MedicalReport.vault_id == vault_id)
    if document_id:
        q = q.filter(MedicalReport.document_id == document_id)
    reports = q.order_by(MedicalReport.report_date.desc().nullslast()).offset(offset).limit(limit).all()
    return [MedicalReportOut.model_validate(r) for r in reports]


@router.get("/{medical_report_id}", response_model=MedicalReportOut)
def get_medical_report(
    medical_report_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> MedicalReportOut:
    report = db.get(MedicalReport, medical_report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medical report not found")
    require_document_access(db, user=user, document_id=report.document_id)
    return MedicalReportOut.model_validate(report)
