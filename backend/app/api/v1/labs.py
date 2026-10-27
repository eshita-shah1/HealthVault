from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.lab import LabReport
from app.models.user import User
from app.schemas.lab import LabReportOut
from app.services.sharing.access_service import require_document_access, require_full_vault_access

router = APIRouter(prefix="/labs", tags=["labs"])


@router.get("", response_model=list[LabReportOut])
def list_lab_reports(
    vault_id: str = Query(...),
    document_id: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LabReportOut]:
    require_full_vault_access(db, user=user, vault_id=vault_id)
    q = db.query(LabReport).filter(LabReport.vault_id == vault_id)
    if document_id:
        q = q.filter(LabReport.document_id == document_id)
    reports = (
        q
        .order_by(LabReport.report_date.desc().nullslast())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [LabReportOut.model_validate(r) for r in reports]


@router.get("/{lab_report_id}", response_model=LabReportOut)
def get_lab_report(lab_report_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> LabReportOut:
    report = db.get(LabReport, lab_report_id)
    if report is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lab report not found")
    require_document_access(db, user=user, document_id=report.document_id)
    return LabReportOut.model_validate(report)
