from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import ResultFlag, ValidationStatus


class LabResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    test_name_raw: str
    test_name_normalized: Optional[str] = None
    result_value_raw: Optional[str] = None
    result_value_numeric: Optional[float] = None
    unit_raw: Optional[str] = None
    unit_normalized: Optional[str] = None
    reference_range_raw: Optional[str] = None
    flag: ResultFlag
    confidence: Optional[float] = None
    validation_status: ValidationStatus


class LabReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    laboratory_name: Optional[str] = None
    report_date: Optional[date] = None
    results: list[LabResultOut] = []
