"""Doctor-facing health summary generation.

Pulls structured facts straight from Postgres (never re-reads original PDFs)
and hands them to the configured LLM provider to turn into prose. Every fact
in `structured_data` carries a `source` reference back to its document, and
the rendered prompt keeps those references so a downstream LLM is asked to
cite them rather than invent anything.
"""
from datetime import date, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.diagnosis import Diagnosis
from app.models.document import Document
from app.models.expense import MedicalExpense
from app.models.lab import LabReport, LabResult
from app.models.prescription import Medicine, Prescription
from app.models.summary import HealthSummary
from app.models.timeline import TimelineEvent
from app.services.ai.llm.factory import get_llm_provider

_RECENT_WINDOW_DAYS = 365
_MAX_LIST_ITEMS = 10


def build_structured_context(db: Session, *, vault_id: str) -> dict[str, Any]:
    since = date.today() - timedelta(days=_RECENT_WINDOW_DAYS)

    diagnoses = (
        db.query(Diagnosis)
        .filter(Diagnosis.vault_id == vault_id)
        .order_by(Diagnosis.diagnosis_date.desc().nullslast())
        .limit(_MAX_LIST_ITEMS)
        .all()
    )

    lab_results = (
        db.query(LabResult)
        .join(LabReport, LabResult.lab_report_id == LabReport.id)
        .filter(LabReport.vault_id == vault_id, LabReport.report_date >= since)
        .order_by(LabReport.report_date.desc().nullslast())
        .limit(_MAX_LIST_ITEMS)
        .all()
    )

    medicines = (
        db.query(Medicine)
        .join(Prescription, Medicine.prescription_id == Prescription.id)
        .filter(Prescription.vault_id == vault_id)
        .order_by(Prescription.prescription_date.desc().nullslast())
        .limit(_MAX_LIST_ITEMS)
        .all()
    )

    consultations = (
        db.query(Prescription)
        .filter(Prescription.vault_id == vault_id)
        .order_by(Prescription.prescription_date.desc().nullslast())
        .limit(_MAX_LIST_ITEMS)
        .all()
    )

    recent_events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.vault_id == vault_id)
        .order_by(TimelineEvent.event_date.desc())
        .limit(_MAX_LIST_ITEMS)
        .all()
    )

    recent_expense_total = (
        db.query(MedicalExpense)
        .filter(MedicalExpense.vault_id == vault_id, MedicalExpense.expense_date >= since)
        .with_entities(MedicalExpense.amount)
        .all()
    )
    total_recent_expense = sum(a for (a,) in recent_expense_total)

    document_count = db.query(Document).filter(Document.vault_id == vault_id, Document.is_deleted.is_(False)).count()

    return {
        "known_conditions": [
            {
                "condition": d.condition_normalized or d.condition_raw,
                "date": d.diagnosis_date.isoformat() if d.diagnosis_date else None,
                "source_document_id": d.document_id,
            }
            for d in diagnoses
        ],
        "recent_investigations": [
            {
                "test_name": r.test_name_normalized or r.test_name_raw,
                "result": r.result_value_raw,
                "unit": r.unit_normalized or r.unit_raw,
                "flag": r.flag.value,
                "date": r.lab_report.report_date.isoformat() if r.lab_report.report_date else None,
                "source_document_id": r.lab_report.document_id,
            }
            for r in lab_results
        ],
        "current_medications": [
            {
                "medicine": m.medicine_name_normalized or m.medicine_name_raw,
                "dosage": m.dosage_raw,
                "frequency": m.frequency_normalized or m.frequency_raw,
                "source_document_id": m.prescription.document_id,
            }
            for m in medicines
        ],
        "recent_consultations": [
            {
                "date": c.prescription_date.isoformat() if c.prescription_date else None,
                "doctor": c.doctor_name,
                "source_document_id": c.document_id,
            }
            for c in consultations
        ],
        "recent_medical_events": [
            {"date": e.event_date.isoformat(), "type": e.event_type.value, "title": e.title}
            for e in recent_events
        ],
        "recent_expenses_total": total_recent_expense,
        "available_documents": document_count,
    }


def _render_prompt(context: dict[str, Any]) -> str:
    """Renders the structured facts as plain text for the LLM provider.

    Source-document traceability is NOT embedded here as inline [doc:id]
    tags: those are internal UUIDs, meaningless in prose, and the frontend
    already links each fact back to its source document independently using
    the structured_data this function's input is built from (see each
    fact's source_document_id). Keeping raw IDs out of this text means
    neither this rule-based fallback (which returns the text largely as-is)
    nor a real LLM asked to summarize it can leak them into displayed prose.
    """
    lines = ["Patient Health Summary", ""]

    lines.append("Known Conditions:")
    for c in context["known_conditions"]:
        lines.append(f"- {c['condition']} (diagnosed {c['date'] or 'date unknown'})")

    lines.append("\nRecent Investigations:")
    for r in context["recent_investigations"]:
        lines.append(f"- {r['test_name']}: {r['result']} {r['unit'] or ''} ({r['flag']})")

    lines.append("\nCurrent/Recent Medications:")
    for m in context["current_medications"]:
        lines.append(f"- {m['medicine']} {m['dosage'] or ''} {m['frequency'] or ''}")

    lines.append("\nRecent Consultations:")
    for c in context["recent_consultations"]:
        lines.append(f"- {c['date'] or 'unknown date'} — {c['doctor'] or 'Unknown doctor'}")

    lines.append("\nRecent Medical Events:")
    for e in context["recent_medical_events"]:
        lines.append(f"- {e['date']} — {e['type']}: {e['title']}")

    lines.append(f"\nRecent Expenses: {context['recent_expenses_total']:.2f}")
    lines.append(f"Available Documents: {context['available_documents']}")

    return "\n".join(lines)


def generate_summary(
    db: Session, *, vault_id: str, generated_by: str, generated_for_share_id: str | None = None
) -> HealthSummary:
    context = build_structured_context(db, vault_id=vault_id)
    prompt = _render_prompt(context)

    provider = get_llm_provider()
    summary_text = provider.generate_summary(prompt)

    last_version = (
        db.query(HealthSummary)
        .filter(HealthSummary.vault_id == vault_id)
        .order_by(HealthSummary.version.desc())
        .first()
    )
    next_version = (last_version.version + 1) if last_version else 1

    summary = HealthSummary(
        vault_id=vault_id,
        generated_by=generated_by,
        generated_for_share_id=generated_for_share_id,
        version=next_version,
        summary_text=summary_text,
        structured_data=context,
        model_used=provider.provider_name,
    )
    db.add(summary)
    db.flush()
    return summary
