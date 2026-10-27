from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import ValidationStatus


class DiagnosisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    condition_raw: str
    condition_normalized: Optional[str] = None
    doctor_name: Optional[str] = None
    diagnosis_date: Optional[date] = None
    notes: Optional[str] = None
    confidence: Optional[float] = None
    validation_status: ValidationStatus
