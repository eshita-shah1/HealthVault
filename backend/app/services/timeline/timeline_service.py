"""Builds timeline_events rows from already-persisted structured records.

Runs as the last pipeline step so the timeline always reflects validated
data, not raw extraction output.
"""
from datetime import date
from typing import Optional

from sqlalchemy.orm import Session

from app.models.diagnosis import Diagnosis
from app.models.document import Document
from app.models.enums import DocumentType, TimelineEventType
from app.models.lab import LabReport
from app.models.medical_report import MedicalReport
from app.models.prescription import Prescription
from app.models.timeline import TimelineEvent

_SCAN_TYPES = {DocumentType.SCAN_REPORT}
_HOSPITALIZATION_TYPES = {DocumentType.DISCHARGE_SUMMARY}


def _fallback_date(document: Document) -> date:
    return document.document_date or document.created_at.date()


def generate_events_for_document(db: Session, document: Document) -> list[TimelineEvent]:
    """Idempotent: clears any previously generated events for this document
    (e.g. on reprocessing) before creating fresh ones."""
    db.query(TimelineEvent).filter(TimelineEvent.document_id == document.id).delete()

    events: list[TimelineEvent] = []

    if document.document_type == DocumentType.PRESCRIPTION:
        prescription = db.query(Prescription).filter(Prescription.document_id == document.id).first()
        if prescription:
            medicine_names = [m.medicine_name_normalized or m.medicine_name_raw for m in prescription.medicines]
            events.append(
                TimelineEvent(
                    vault_id=document.vault_id,
                    document_id=document.id,
                    event_type=TimelineEventType.PRESCRIPTION,
                    event_date=prescription.prescription_date or _fallback_date(document),
                    title=f"Prescription — {prescription.doctor_name or 'Doctor'}",
                    description=", ".join(medicine_names) if medicine_names else None,
                    event_metadata={"medicine_count": len(prescription.medicines)},
                )
            )

    elif document.document_type == DocumentType.LAB_REPORT:
        lab_report = db.query(LabReport).filter(LabReport.document_id == document.id).first()
        if lab_report:
            abnormal = [r for r in lab_report.results if r.flag.value in ("HIGH", "LOW", "ABNORMAL", "CRITICAL")]
            events.append(
                TimelineEvent(
                    vault_id=document.vault_id,
                    document_id=document.id,
                    event_type=TimelineEventType.LAB_TEST,
                    event_date=lab_report.report_date or _fallback_date(document),
                    title=f"Lab Test — {lab_report.laboratory_name or 'Laboratory'}",
                    description=", ".join(
                        f"{r.test_name_normalized or r.test_name_raw}: {r.result_value_raw}{r.unit_raw or ''}"
                        for r in lab_report.results
                    )
                    or None,
                    event_metadata={"result_count": len(lab_report.results), "abnormal_count": len(abnormal)},
                )
            )

    elif document.document_type == DocumentType.DIAGNOSIS:
        diagnosis = db.query(Diagnosis).filter(Diagnosis.document_id == document.id).first()
        if diagnosis:
            events.append(
                TimelineEvent(
                    vault_id=document.vault_id,
                    document_id=document.id,
                    event_type=TimelineEventType.DIAGNOSIS,
                    event_date=diagnosis.diagnosis_date or _fallback_date(document),
                    title=f"Diagnosis — {diagnosis.condition_normalized or diagnosis.condition_raw}",
                    description=diagnosis.notes,
                    event_metadata={},
                )
            )

    elif document.document_type in (
        DocumentType.MEDICAL_REPORT,
        DocumentType.DISCHARGE_SUMMARY,
        DocumentType.SCAN_REPORT,
        DocumentType.CONSULTATION,
    ):
        report = db.query(MedicalReport).filter(MedicalReport.document_id == document.id).first()
        if report:
            event_type = (
                TimelineEventType.DISCHARGE
                if document.document_type == DocumentType.DISCHARGE_SUMMARY
                else TimelineEventType.SCAN
                if document.document_type == DocumentType.SCAN_REPORT
                else TimelineEventType.CONSULTATION
            )
            events.append(
                TimelineEvent(
                    vault_id=document.vault_id,
                    document_id=document.id,
                    event_type=event_type,
                    event_date=report.report_date or _fallback_date(document),
                    title=f"{document.document_type.value.replace('_', ' ').title()} — {report.doctor_name or report.hospital_name or ''}".strip(" —"),
                    description=(report.summary_text or "")[:500] or None,
                    event_metadata={},
                )
            )

    for event in events:
        db.add(event)
    db.flush()
    return events
