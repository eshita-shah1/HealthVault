"""Keyword/regex-based LLM provider.

This is the zero-dependency default (AI_PROVIDER=rule_based) so the full
pipeline runs out of the box without any API key. It is intentionally
conservative: confidence scores stay modest so ambiguous documents fall into
NEEDS_REVIEW rather than being silently misfiled. Swap AI_PROVIDER=openai for
real language understanding.
"""
from app.models.enums import DocumentType
from app.services.ai.llm.base import ClassificationResult, ExtractionResult, LLMProvider
from app.utils.text_patterns import (
    extract_lab_result_lines,
    extract_medicine_lines,
    find_amount,
    find_label_value,
)

_KEYWORDS: dict[DocumentType, list[str]] = {
    DocumentType.PRESCRIPTION: ["prescription", "rx", "sig:", "dosage", "tablet", "capsule", "take orally"],
    DocumentType.LAB_REPORT: ["laboratory", "lab report", "reference range", "specimen", "test name", "pathology"],
    DocumentType.DISCHARGE_SUMMARY: ["discharge summary", "admission date", "discharge date", "discharged on"],
    DocumentType.SCAN_REPORT: ["mri", "ct scan", "x-ray", "ultrasound", "radiology", "impression:", "scan report"],
    DocumentType.MEDICAL_BILL: ["hospital bill", "invoice", "amount due", "total amount", "gst", "bill no"],
    DocumentType.PHARMACY_BILL: ["pharmacy", "chemist", "medicine bill", "drug store"],
    DocumentType.INSURANCE_DOCUMENT: ["policy number", "insurance", "claim number", "sum insured"],
    DocumentType.DIAGNOSIS: ["diagnosis:", "diagnosed with", "impression:", "clinical diagnosis"],
    DocumentType.CONSULTATION: ["consultation", "chief complaint", "follow up", "opd"],
}


class RuleBasedLLMProvider(LLMProvider):
    provider_name = "rule_based"

    def classify_document(self, text: str) -> ClassificationResult:
        lowered = text.lower()
        best_type, best_score = DocumentType.OTHER, 0
        for doc_type, keywords in _KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in lowered)
            if score > best_score:
                best_type, best_score = doc_type, score

        if best_score == 0:
            return ClassificationResult(document_type=DocumentType.OTHER, confidence=0.3)

        confidence = min(0.95, 0.5 + 0.12 * best_score)
        return ClassificationResult(document_type=best_type, confidence=confidence)

    def extract_fields(self, text: str, document_type: DocumentType) -> ExtractionResult:
        common = {
            "patient_name": find_label_value(text, ["Patient Name", "Patient", "Name"]),
            "doctor_name": find_label_value(text, ["Doctor", "Dr", "Physician", "Consultant", "Referred by"]),
            "hospital_name": find_label_value(text, ["Hospital", "Clinic", "Center", "Centre"]),
        }

        if document_type == DocumentType.PRESCRIPTION:
            fields = {
                **common,
                "prescription_date": find_label_value(text, ["Date", "Prescription Date"]),
                "medicines": extract_medicine_lines(text),
            }
            confidence = 0.75 if fields["medicines"] else 0.35

        elif document_type == DocumentType.LAB_REPORT:
            results = extract_lab_result_lines(text)
            fields = {
                **common,
                "laboratory_name": find_label_value(text, ["Laboratory", "Lab", "Performed at"]),
                "report_date": find_label_value(text, ["Report Date", "Date", "Collected on"]),
                "results": results,
            }
            confidence = 0.75 if results else 0.35

        elif document_type in (DocumentType.MEDICAL_BILL, DocumentType.PHARMACY_BILL):
            total = find_amount(text, ["Total Amount", "Grand Total", "Total", "Net Payable"])
            fields = {
                "hospital_name": common["hospital_name"],
                "bill_number": find_label_value(text, ["Bill No", "Invoice No", "Receipt No"]),
                "bill_date": find_label_value(text, ["Bill Date", "Date"]),
                "amount": find_amount(text, ["Amount", "Subtotal"]),
                "tax": find_amount(text, ["Tax", "GST", "VAT"]),
                "total_amount": total,
                "insurance_amount": find_amount(text, ["Insurance Covered", "Insurance Amount"]),
                "patient_payable_amount": find_amount(text, ["Patient Payable", "Amount Due", "Balance Due"])
                or total,
                "items": [],
            }
            confidence = 0.7 if total else 0.3

        elif document_type == DocumentType.DIAGNOSIS:
            fields = {
                "condition": find_label_value(text, ["Diagnosis", "Impression", "Condition"]) or "",
                "doctor_name": common["doctor_name"],
                "diagnosis_date": find_label_value(text, ["Date"]),
                "notes": find_label_value(text, ["Notes", "Remarks"]),
            }
            confidence = 0.7 if fields["condition"] else 0.25

        else:  # generic report-style documents
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            fields = {
                "doctor_name": common["doctor_name"],
                "hospital_name": common["hospital_name"],
                "report_date": find_label_value(text, ["Date", "Report Date"]),
                "summary_text": " ".join(lines[:5])[:1000] if lines else None,
            }
            confidence = 0.5 if lines else 0.2

        return ExtractionResult(fields=fields, confidence=confidence)

    def generate_summary(self, prompt: str) -> str:
        # Deterministic fallback used when AI_PROVIDER=rule_based: the
        # summary_service already renders a templated summary from structured
        # data, so this just echoes it back unchanged.
        return prompt
