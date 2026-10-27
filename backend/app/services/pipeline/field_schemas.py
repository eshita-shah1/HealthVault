"""Per-document-type extraction schemas.

Adding a new document type's extraction support means adding one entry here
plus (optionally) a normalization/validation branch — the rest of the
pipeline (OCR, classification, persistence, timeline) stays untouched.
"""
from app.models.enums import DocumentType

# Field names the extraction step should try to populate for each document type.
# "*_items" keys denote a list of sub-records (e.g. medicines, lab results).
EXTRACTION_SCHEMAS: dict[DocumentType, list[str]] = {
    DocumentType.PRESCRIPTION: [
        "patient_name",
        "doctor_name",
        "prescription_date",
        "medicines",  # list of {medicine_name, dosage, frequency, route, duration, instructions}
    ],
    DocumentType.LAB_REPORT: [
        "patient_name",
        "doctor_name",
        "laboratory_name",
        "report_date",
        "results",  # list of {test_name, result, unit, reference_range, flag}
    ],
    DocumentType.DIAGNOSIS: [
        "condition",
        "doctor_name",
        "diagnosis_date",
        "notes",
    ],
    DocumentType.MEDICAL_REPORT: [
        "doctor_name",
        "hospital_name",
        "report_date",
        "summary_text",
    ],
    DocumentType.DISCHARGE_SUMMARY: [
        "doctor_name",
        "hospital_name",
        "report_date",
        "summary_text",
    ],
    DocumentType.SCAN_REPORT: [
        "doctor_name",
        "hospital_name",
        "report_date",
        "summary_text",
    ],
    DocumentType.CONSULTATION: [
        "doctor_name",
        "hospital_name",
        "report_date",
        "summary_text",
    ],
    DocumentType.MEDICAL_BILL: [
        "hospital_name",
        "bill_number",
        "bill_date",
        "items",  # list of {description, quantity, unit_price, amount}
        "amount",
        "tax",
        "total_amount",
        "insurance_amount",
        "patient_payable_amount",
    ],
    DocumentType.PHARMACY_BILL: [
        "hospital_name",
        "bill_number",
        "bill_date",
        "items",
        "amount",
        "tax",
        "total_amount",
        "insurance_amount",
        "patient_payable_amount",
    ],
    DocumentType.INSURANCE_DOCUMENT: [
        "doctor_name",
        "hospital_name",
        "report_date",
        "summary_text",
    ],
    DocumentType.OTHER: [
        "summary_text",
    ],
}
