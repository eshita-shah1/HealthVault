from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import ValidationStatus


class MedicineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    medicine_name_raw: str
    medicine_name_normalized: Optional[str] = None
    dosage_raw: Optional[str] = None
    frequency_normalized: Optional[str] = None
    duration_raw: Optional[str] = None
    duration_days: Optional[int] = None
    instructions: Optional[str] = None
    confidence: Optional[float] = None
    validation_status: ValidationStatus


class PrescriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    prescription_date: Optional[date] = None
    notes: Optional[str] = None
    medicines: list[MedicineOut] = []
