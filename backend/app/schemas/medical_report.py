from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import DocumentType


class MedicalReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    report_type: DocumentType
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    report_date: Optional[date] = None
    summary_text: Optional[str] = None
    findings: Optional[dict[str, Any]] = None
    confidence: Optional[float] = None
