"""Validates normalized data before it is allowed into the core medical tables.

Every validator returns a ValidationStatus rather than raising, so the
pipeline can persist the (flagged) record for human review instead of
silently dropping data.
"""
from typing import Optional

from app.models.enums import ResultFlag, ValidationStatus


def _to_float(value) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def validate_lab_result(*, test_name_normalized: Optional[str], result_value_raw, unit_normalized: Optional[str],
                         reference_range_low: Optional[float], reference_range_high: Optional[float]):
    """Returns (ValidationStatus, ResultFlag, numeric_value)."""
    numeric_value = _to_float(result_value_raw)
    issues = 0

    if numeric_value is None:
        issues += 1
    if not test_name_normalized:
        issues += 1

    flag = ResultFlag.UNKNOWN
    if numeric_value is not None and reference_range_low is not None and reference_range_high is not None:
        if numeric_value < reference_range_low:
            flag = ResultFlag.LOW
        elif numeric_value > reference_range_high:
            flag = ResultFlag.HIGH
        else:
            flag = ResultFlag.NORMAL

    if issues == 0:
        status = ValidationStatus.VALID
    elif issues < 2:
        status = ValidationStatus.NEEDS_REVIEW
    else:
        status = ValidationStatus.INVALID

    return status, flag, numeric_value


def validate_medicine(*, medicine_name: Optional[str], dosage_raw: Optional[str], frequency_raw: Optional[str],
                       duration_raw: Optional[str]) -> ValidationStatus:
    missing = sum(1 for v in (medicine_name, dosage_raw, frequency_raw) if not v)
    if not medicine_name:
        return ValidationStatus.INVALID
    if missing == 0:
        return ValidationStatus.VALID
    if missing <= 1:
        return ValidationStatus.NEEDS_REVIEW
    return ValidationStatus.NEEDS_REVIEW if duration_raw or dosage_raw else ValidationStatus.INVALID


def validate_diagnosis(*, condition: Optional[str], diagnosis_date_valid: bool) -> ValidationStatus:
    if not condition:
        return ValidationStatus.INVALID
    if not diagnosis_date_valid:
        return ValidationStatus.NEEDS_REVIEW
    return ValidationStatus.VALID


def validate_bill(*, amount, tax, total_amount, patient_payable_amount) -> ValidationStatus:
    values = [_to_float(v) for v in (amount, tax, total_amount, patient_payable_amount)]
    numeric_count = sum(1 for v in values if v is not None)
    total = _to_float(total_amount)

    if total is None:
        return ValidationStatus.NEEDS_REVIEW if numeric_count > 0 else ValidationStatus.INVALID
    if total < 0:
        return ValidationStatus.INVALID

    amt, tx = _to_float(amount), _to_float(tax)
    if amt is not None and tx is not None:
        expected = amt + tx
        # allow rounding slack
        if abs(expected - total) > max(1.0, total * 0.02):
            return ValidationStatus.NEEDS_REVIEW

    return ValidationStatus.VALID
