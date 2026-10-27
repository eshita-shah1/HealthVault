"""Orchestrates the full AI document processing pipeline:

Storage -> OCR -> Classification -> Extraction -> Normalization ->
Validation -> Structured DB records -> Timeline -> Expense

Each stage is a thin call into its own service module; this file only
sequences them, updates document.processing_status, and writes a
ProcessingLog row per stage so failures are debuggable.

Designed to be called from a FastAPI BackgroundTask today and from a Celery
task later without changes (it takes a document_id and opens its own DB
session, rather than depending on request-scoped state).
"""
import re
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.models.diagnosis import Diagnosis
from app.models.document import Document, ProcessingLog
from app.models.enums import (
    DocumentType,
    LogStatus,
    ProcessingStage,
    ProcessingStatus,
    ValidationStatus,
)
from app.models.lab import LabReport, LabResult
from app.models.medical_report import MedicalReport
from app.models.prescription import Medicine, Prescription
from app.services.expenses.expense_service import create_expense_from_bill
from app.services.pipeline.classification_service import LOW_CONFIDENCE_THRESHOLD, classify_document
from app.services.pipeline.extraction_service import extract_fields
from app.services.pipeline.normalization_service import (
    normalize_condition,
    normalize_document_date,
    normalize_duration_to_days,
    normalize_frequency,
    normalize_medicine_name,
    normalize_person_or_org_name,
    normalize_test_name,
    normalize_unit,
)
from app.services.pipeline.ocr_service import run_ocr
from app.services.pipeline.validation_service import validate_bill, validate_diagnosis, validate_lab_result, validate_medicine
from app.services.storage.factory import get_storage_service
from app.services.timeline.timeline_service import generate_events_for_document

logger = get_logger(__name__)

_DOSAGE_SPLIT_RE = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*([A-Za-z/%]+)\s*$")
_RANGE_SPLIT_RE = re.compile(r"^\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*$")


def _log(db: Session, document_id: str, stage: ProcessingStage, status: LogStatus,
         message: Optional[str] = None, confidence: Optional[float] = None) -> None:
    db.add(ProcessingLog(document_id=document_id, stage=stage, status=status,
                          message=message, confidence=confidence))
    db.flush()


def process_document(document_id: str) -> None:
    """Entry point used by the background task / worker. Opens its own session."""
    db = SessionLocal()
    try:
        _run_pipeline(db, document_id)
    finally:
        db.close()


def _run_pipeline(db: Session, document_id: str) -> None:
    document = db.get(Document, document_id)
    if document is None:
        logger.error("process_document: document %s not found", document_id)
        return

    try:
        document.processing_status = ProcessingStatus.PROCESSING
        db.commit()

        storage = get_storage_service()
        file_bytes = storage.read(document.storage_path)

        # --- OCR ---
        ocr_result = run_ocr(file_bytes=file_bytes, mime_type=document.mime_type)
        document.extracted_text = ocr_result.text
        document.processing_status = ProcessingStatus.OCR_COMPLETED
        _log(db, document.id, ProcessingStage.OCR, LogStatus.SUCCESS,
             message=f"used_ocr={ocr_result.used_ocr}", confidence=ocr_result.confidence)
        db.commit()

        if not ocr_result.text.strip():
            document.processing_status = ProcessingStatus.NEEDS_REVIEW
            _log(db, document.id, ProcessingStage.OCR, LogStatus.FAILED, message="No text extracted")
            db.commit()
            return

        # --- Classification ---
        classification = classify_document(ocr_result.text)
        document.document_type = classification.document_type
        document.classification_confidence = classification.confidence
        document.processing_status = ProcessingStatus.CLASSIFIED
        _log(db, document.id, ProcessingStage.CLASSIFICATION, LogStatus.SUCCESS,
             message=classification.document_type.value, confidence=classification.confidence)
        db.commit()

        # --- Extraction ---
        extraction = extract_fields(ocr_result.text, classification.document_type)
        document.processing_status = ProcessingStatus.EXTRACTED
        _log(db, document.id, ProcessingStage.EXTRACTION, LogStatus.SUCCESS, confidence=extraction.confidence)
        db.commit()

        # --- Normalization + Validation + Persistence ---
        needs_review, document_date = _persist_structured_record(
            db, document, classification.document_type, extraction.fields, extraction.confidence
        )
        if document_date:
            document.document_date = document_date
        document.processing_status = ProcessingStatus.VALIDATED
        _log(db, document.id, ProcessingStage.VALIDATION, LogStatus.SUCCESS)
        db.commit()

        # --- Timeline ---
        generate_events_for_document(db, document)
        _log(db, document.id, ProcessingStage.TIMELINE, LogStatus.SUCCESS)
        db.commit()

        # --- Expense (bills only; other categories can incur manual expenses) ---
        if classification.document_type in (DocumentType.MEDICAL_BILL, DocumentType.PHARMACY_BILL):
            expense = create_expense_from_bill(
                db, document=document, fields=_normalize_bill_fields(extraction.fields), report_date=document_date
            )
            _log(
                db, document.id, ProcessingStage.EXPENSE,
                LogStatus.SUCCESS if expense else LogStatus.SKIPPED,
                message=None if expense else "No total amount found",
            )
            db.commit()

        low_confidence = (
            classification.confidence < LOW_CONFIDENCE_THRESHOLD or extraction.confidence < LOW_CONFIDENCE_THRESHOLD
        )
        document.processing_status = (
            ProcessingStatus.NEEDS_REVIEW if (needs_review or low_confidence) else ProcessingStatus.PROCESSED
        )
        _log(db, document.id, ProcessingStage.PERSISTENCE, LogStatus.SUCCESS,
             message=document.processing_status.value)
        db.commit()

    except Exception as exc:  # noqa: BLE001 - pipeline must never crash the background task silently
        logger.exception("Document processing failed for %s", document_id)
        db.rollback()
        document = db.get(Document, document_id)
        if document:
            document.processing_status = ProcessingStatus.FAILED
            _log(db, document.id, ProcessingStage.PERSISTENCE, LogStatus.FAILED, message=str(exc))
            db.commit()


def _parse_dosage(raw: Optional[str]) -> tuple[Optional[float], Optional[str]]:
    if not raw:
        return None, None
    m = _DOSAGE_SPLIT_RE.match(raw)
    if not m:
        return None, None
    return float(m.group(1)), m.group(2)


def _parse_range(raw: Optional[str]) -> tuple[Optional[float], Optional[float]]:
    if not raw:
        return None, None
    m = _RANGE_SPLIT_RE.match(raw)
    if not m:
        return None, None
    return float(m.group(1)), float(m.group(2))


def _normalize_bill_fields(fields: dict) -> dict:
    return {
        **fields,
        "hospital_name": normalize_person_or_org_name(fields.get("hospital_name")),
        "bill_date": fields.get("bill_date"),
    }


def _persist_structured_record(
    db: Session, document: Document, document_type: DocumentType, fields: dict, confidence: float
) -> tuple[bool, Optional[date]]:
    """Normalizes + validates extracted fields, writes the type-specific
    table, and returns (needs_review, document_date)."""

    if document_type == DocumentType.PRESCRIPTION:
        return _persist_prescription(db, document, fields, confidence)
    if document_type == DocumentType.LAB_REPORT:
        return _persist_lab_report(db, document, fields, confidence)
    if document_type == DocumentType.DIAGNOSIS:
        return _persist_diagnosis(db, document, fields, confidence)
    if document_type in (
        DocumentType.MEDICAL_REPORT,
        DocumentType.DISCHARGE_SUMMARY,
        DocumentType.SCAN_REPORT,
        DocumentType.CONSULTATION,
        DocumentType.INSURANCE_DOCUMENT,
    ):
        return _persist_medical_report(db, document, document_type, fields, confidence)
    if document_type in (DocumentType.MEDICAL_BILL, DocumentType.PHARMACY_BILL):
        bill_date = normalize_document_date(fields.get("bill_date"))
        status = validate_bill(
            amount=fields.get("amount"), tax=fields.get("tax"),
            total_amount=fields.get("total_amount"), patient_payable_amount=fields.get("patient_payable_amount"),
        )
        return status != ValidationStatus.VALID, bill_date

    # OTHER / unrecognized: nothing structured to persist, always needs review
    return True, None


def _persist_prescription(db: Session, document: Document, fields: dict, confidence: float):
    db.query(Prescription).filter(Prescription.document_id == document.id).delete()

    prescription_date = normalize_document_date(fields.get("prescription_date"))
    prescription = Prescription(
        document_id=document.id,
        vault_id=document.vault_id,
        patient_name=normalize_person_or_org_name(fields.get("patient_name")),
        doctor_name=normalize_person_or_org_name(fields.get("doctor_name")),
        prescription_date=prescription_date,
    )
    db.add(prescription)
    db.flush()

    raw_medicines = fields.get("medicines") or []
    needs_review = len(raw_medicines) == 0
    for raw in raw_medicines:
        dosage_raw = raw.get("dosage")
        dosage_value, dosage_unit = _parse_dosage(dosage_raw)
        status = validate_medicine(
            medicine_name=raw.get("medicine_name"), dosage_raw=dosage_raw,
            frequency_raw=raw.get("frequency"), duration_raw=raw.get("duration"),
        )
        if status != ValidationStatus.VALID:
            needs_review = True
        db.add(
            Medicine(
                prescription_id=prescription.id,
                medicine_name_raw=raw.get("medicine_name") or "Unknown",
                medicine_name_normalized=normalize_medicine_name(raw.get("medicine_name")),
                dosage_raw=dosage_raw,
                dosage_value=dosage_value,
                dosage_unit=dosage_unit,
                frequency_raw=raw.get("frequency"),
                frequency_normalized=normalize_frequency(raw.get("frequency")),
                route=raw.get("route"),
                duration_raw=raw.get("duration"),
                duration_days=normalize_duration_to_days(raw.get("duration")),
                instructions=raw.get("instructions"),
                confidence=confidence,
                validation_status=status,
            )
        )
    db.flush()
    return needs_review, prescription_date


def _persist_lab_report(db: Session, document: Document, fields: dict, confidence: float):
    db.query(LabReport).filter(LabReport.document_id == document.id).delete()

    report_date = normalize_document_date(fields.get("report_date"))
    lab_report = LabReport(
        document_id=document.id,
        vault_id=document.vault_id,
        patient_name=normalize_person_or_org_name(fields.get("patient_name")),
        doctor_name=normalize_person_or_org_name(fields.get("doctor_name")),
        laboratory_name=normalize_person_or_org_name(fields.get("laboratory_name")),
        report_date=report_date,
    )
    db.add(lab_report)
    db.flush()

    raw_results = fields.get("results") or []
    needs_review = len(raw_results) == 0
    for raw in raw_results:
        range_low, range_high = _parse_range(raw.get("reference_range"))
        test_name_normalized = normalize_test_name(raw.get("test_name"))
        unit_normalized = normalize_unit(raw.get("unit"))
        status, flag, numeric_value = validate_lab_result(
            test_name_normalized=test_name_normalized, result_value_raw=raw.get("result"),
            unit_normalized=unit_normalized, reference_range_low=range_low, reference_range_high=range_high,
        )
        if status != ValidationStatus.VALID:
            needs_review = True
        db.add(
            LabResult(
                lab_report_id=lab_report.id,
                test_name_raw=raw.get("test_name") or "Unknown",
                test_name_normalized=test_name_normalized,
                result_value_raw=str(raw.get("result")) if raw.get("result") is not None else None,
                result_value_numeric=numeric_value,
                unit_raw=raw.get("unit"),
                unit_normalized=unit_normalized,
                reference_range_raw=raw.get("reference_range"),
                reference_range_low=range_low,
                reference_range_high=range_high,
                flag=flag,
                confidence=confidence,
                validation_status=status,
            )
        )
    db.flush()
    return needs_review, report_date


def _persist_diagnosis(db: Session, document: Document, fields: dict, confidence: float):
    db.query(Diagnosis).filter(Diagnosis.document_id == document.id).delete()

    diagnosis_date = normalize_document_date(fields.get("diagnosis_date"))
    condition = fields.get("condition")
    status = validate_diagnosis(condition=condition, diagnosis_date_valid=diagnosis_date is not None)

    diagnosis = Diagnosis(
        document_id=document.id,
        vault_id=document.vault_id,
        condition_raw=condition or "Unknown",
        condition_normalized=normalize_condition(condition),
        doctor_name=normalize_person_or_org_name(fields.get("doctor_name")),
        diagnosis_date=diagnosis_date,
        notes=fields.get("notes"),
        confidence=confidence,
        validation_status=status,
    )
    db.add(diagnosis)
    db.flush()
    return status != ValidationStatus.VALID, diagnosis_date


def _persist_medical_report(db: Session, document: Document, document_type: DocumentType, fields: dict, confidence: float):
    db.query(MedicalReport).filter(MedicalReport.document_id == document.id).delete()

    report_date = normalize_document_date(fields.get("report_date"))
    report = MedicalReport(
        document_id=document.id,
        vault_id=document.vault_id,
        report_type=document_type,
        doctor_name=normalize_person_or_org_name(fields.get("doctor_name")),
        hospital_name=normalize_person_or_org_name(fields.get("hospital_name")),
        report_date=report_date,
        summary_text=fields.get("summary_text"),
        findings=None,
        confidence=confidence,
    )
    db.add(report)
    db.flush()
    needs_review = not fields.get("summary_text")
    return needs_review, report_date
