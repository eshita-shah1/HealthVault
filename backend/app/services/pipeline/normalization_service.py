"""Normalizes raw extracted values into canonical forms before validation.

Raw extracted text/labels are always kept alongside the normalized value
(on the model) for traceability back to the source document.
"""
import re
from datetime import date
from typing import Optional

from app.models.enums import DocumentType, ExpenseCategory
from app.utils.text_patterns import parse_date

# Canonical snake_case test name <- common aliases (lowercased, punctuation-insensitive)
TEST_NAME_ALIASES: dict[str, str] = {
    "blood sugar": "blood_glucose",
    "blood sugar fasting": "blood_glucose_fasting",
    "fasting blood sugar": "blood_glucose_fasting",
    "fbs": "blood_glucose_fasting",
    "blood glucose": "blood_glucose",
    "glucose": "blood_glucose",
    "random blood sugar": "blood_glucose_random",
    "rbs": "blood_glucose_random",
    "hba1c": "hba1c",
    "glycated hemoglobin": "hba1c",
    "glycosylated hemoglobin": "hba1c",
    "hemoglobin": "hemoglobin",
    "haemoglobin": "hemoglobin",
    "hb": "hemoglobin",
    "total cholesterol": "total_cholesterol",
    "cholesterol total": "total_cholesterol",
    "ldl": "ldl_cholesterol",
    "ldl cholesterol": "ldl_cholesterol",
    "hdl": "hdl_cholesterol",
    "hdl cholesterol": "hdl_cholesterol",
    "triglycerides": "triglycerides",
    "creatinine": "creatinine",
    "serum creatinine": "creatinine",
    "tsh": "tsh",
    "thyroid stimulating hormone": "tsh",
    "wbc": "wbc_count",
    "white blood cell count": "wbc_count",
    "platelet count": "platelet_count",
    "platelets": "platelet_count",
}

UNIT_ALIASES: dict[str, str] = {
    "mg/dl": "mg/dL",
    "g/dl": "g/dL",
    "mmol/l": "mmol/L",
    "iu/l": "IU/L",
    "u/l": "U/L",
    "%": "%",
    "meq/l": "mEq/L",
    "ng/ml": "ng/mL",
    "pg/ml": "pg/mL",
    "mm/hr": "mm/hr",
    "cells/cumm": "cells/cumm",
    "/ul": "/uL",
    "/µl": "/uL",
}

CONDITION_ALIASES: dict[str, str] = {
    "diabetes mellitus": "diabetes",
    "type 2 diabetes mellitus": "diabetes_type_2",
    "type 2 diabetes": "diabetes_type_2",
    "t2dm": "diabetes_type_2",
    "type 1 diabetes": "diabetes_type_1",
    "t1dm": "diabetes_type_1",
    "hypertension": "hypertension",
    "high blood pressure": "hypertension",
    "htn": "hypertension",
    "hypothyroidism": "hypothyroidism",
    "hyperthyroidism": "hyperthyroidism",
    "asthma": "asthma",
    "coronary artery disease": "coronary_artery_disease",
    "cad": "coronary_artery_disease",
}


def normalize_condition(raw: Optional[str]) -> Optional[str]:
    cleaned = _clean(raw)
    if not cleaned:
        return None
    key = cleaned.lower()
    return CONDITION_ALIASES.get(key, key.replace(" ", "_"))


_DOC_TYPE_TO_EXPENSE_CATEGORY: dict[DocumentType, ExpenseCategory] = {
    DocumentType.MEDICAL_BILL: ExpenseCategory.HOSPITALIZATION,
    DocumentType.PHARMACY_BILL: ExpenseCategory.MEDICINE,
    DocumentType.LAB_REPORT: ExpenseCategory.LAB_TEST,
    DocumentType.SCAN_REPORT: ExpenseCategory.SCAN,
    DocumentType.CONSULTATION: ExpenseCategory.DOCTOR_CONSULTATION,
}

_WHITESPACE_RE = re.compile(r"\s+")


def _clean(raw: Optional[str]) -> Optional[str]:
    if raw is None:
        return None
    cleaned = _WHITESPACE_RE.sub(" ", raw).strip(" .,:-")
    return cleaned or None


def normalize_test_name(raw: Optional[str]) -> Optional[str]:
    cleaned = _clean(raw)
    if not cleaned:
        return None
    key = cleaned.lower()
    return TEST_NAME_ALIASES.get(key, key.replace(" ", "_"))


def normalize_unit(raw: Optional[str]) -> Optional[str]:
    cleaned = _clean(raw)
    if not cleaned:
        return None
    return UNIT_ALIASES.get(cleaned.lower(), cleaned)


def normalize_medicine_name(raw: Optional[str]) -> Optional[str]:
    cleaned = _clean(raw)
    return cleaned.title() if cleaned else None


def normalize_person_or_org_name(raw: Optional[str]) -> Optional[str]:
    cleaned = _clean(raw)
    return cleaned.title() if cleaned else None


def normalize_document_date(raw: Optional[str]) -> Optional[date]:
    return parse_date(raw)


def expense_category_for_document_type(document_type: DocumentType) -> ExpenseCategory:
    return _DOC_TYPE_TO_EXPENSE_CATEGORY.get(document_type, ExpenseCategory.OTHER)


def normalize_frequency(raw: Optional[str]) -> Optional[str]:
    cleaned = _clean(raw)
    if not cleaned:
        return None
    mapping = {
        "od": "Once daily",
        "bd": "Twice daily",
        "bid": "Twice daily",
        "tds": "Thrice daily",
        "tid": "Thrice daily",
        "qid": "Four times daily",
        "sos": "As needed",
    }
    return mapping.get(cleaned.lower(), cleaned)


def normalize_duration_to_days(raw: Optional[str]) -> Optional[int]:
    cleaned = _clean(raw)
    if not cleaned:
        return None
    match = re.search(r"(\d+)\s*(day|week|month)", cleaned, re.IGNORECASE)
    if not match:
        return None
    value, unit = int(match.group(1)), match.group(2).lower()
    multiplier = {"day": 1, "week": 7, "month": 30}[unit]
    return value * multiplier
