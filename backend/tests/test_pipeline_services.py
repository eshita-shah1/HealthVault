from app.models.enums import DocumentType, ResultFlag, ValidationStatus
from app.services.pipeline.classification_service import classify_document
from app.services.pipeline.extraction_service import extract_fields
from app.services.pipeline.normalization_service import (
    normalize_condition,
    normalize_document_date,
    normalize_test_name,
    normalize_unit,
)
from app.services.pipeline.validation_service import validate_bill, validate_lab_result, validate_medicine

LAB_REPORT_TEXT = """
Patient Name: John Doe
Doctor: Dr. Smith
Laboratory: Apollo Diagnostics
Report Date: 15/08/2026
HbA1c 7.2 % (4.0-5.6)
Glucose 145 mg/dL (70-110)
"""

PRESCRIPTION_TEXT = """
Patient: Jane Roe
Doctor: Dr. Lee
Date: 01/09/2026
Metformin 500 mg twice daily for 30 days
"""


def test_classify_lab_report():
    result = classify_document(LAB_REPORT_TEXT)
    assert result.document_type == DocumentType.LAB_REPORT
    assert result.confidence > 0.5


def test_classify_prescription():
    result = classify_document(PRESCRIPTION_TEXT + "\nPrescription\nRx: Sig: take orally")
    assert result.document_type == DocumentType.PRESCRIPTION


def test_extract_lab_report_fields():
    result = extract_fields(LAB_REPORT_TEXT, DocumentType.LAB_REPORT)
    assert result.fields["doctor_name"] == "Dr. Smith"
    test_names = {r["test_name"] for r in result.fields["results"]}
    assert "HbA1c" in test_names


def test_extract_prescription_medicines():
    result = extract_fields(PRESCRIPTION_TEXT, DocumentType.PRESCRIPTION)
    medicines = result.fields["medicines"]
    assert len(medicines) == 1
    assert medicines[0]["medicine_name"] == "Metformin"
    assert medicines[0]["dosage"] == "500 mg"


def test_normalize_test_name_aliases():
    assert normalize_test_name("Blood Sugar") == "blood_glucose"
    assert normalize_test_name("HbA1c") == "hba1c"
    assert normalize_test_name("Some Unmapped Test") == "some_unmapped_test"


def test_normalize_unit():
    assert normalize_unit("mg/dl") == "mg/dL"
    assert normalize_unit("%") == "%"


def test_normalize_condition_aliases():
    assert normalize_condition("Type 2 Diabetes") == "diabetes_type_2"
    assert normalize_condition("High Blood Pressure") == "hypertension"


def test_normalize_document_date_formats():
    assert normalize_document_date("15/08/2026").isoformat() == "2026-08-15"
    assert normalize_document_date("2026-08-15").isoformat() == "2026-08-15"
    assert normalize_document_date(None) is None
    assert normalize_document_date("not a date") is None


def test_validate_lab_result_flags_high_value():
    status, flag, numeric = validate_lab_result(
        test_name_normalized="hba1c", result_value_raw="7.2",
        unit_normalized="%", reference_range_low=4.0, reference_range_high=5.6,
    )
    assert flag == ResultFlag.HIGH
    assert numeric == 7.2
    assert status == ValidationStatus.VALID


def test_validate_lab_result_missing_value_is_invalid():
    status, flag, numeric = validate_lab_result(
        test_name_normalized=None, result_value_raw=None,
        unit_normalized=None, reference_range_low=None, reference_range_high=None,
    )
    assert numeric is None
    assert status == ValidationStatus.INVALID


def test_validate_medicine_requires_core_fields():
    assert validate_medicine(
        medicine_name="Metformin", dosage_raw="500 mg", frequency_raw="Twice daily", duration_raw="30 days"
    ) == ValidationStatus.VALID
    assert validate_medicine(
        medicine_name=None, dosage_raw="500 mg", frequency_raw="Twice daily", duration_raw="30 days"
    ) == ValidationStatus.INVALID


def test_validate_bill_amount_mismatch_needs_review():
    status = validate_bill(amount=1000, tax=180, total_amount=5000, patient_payable_amount=5000)
    assert status == ValidationStatus.NEEDS_REVIEW

    status = validate_bill(amount=1000, tax=180, total_amount=1180, patient_payable_amount=1180)
    assert status == ValidationStatus.VALID
