"""Expense extraction from bills, manual entry, and summary aggregation."""
from calendar import monthrange
from datetime import date
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.enums import DocumentType, ExpenseCategory, TimelineEventType
from app.models.expense import ExpenseItem, MedicalExpense
from app.models.timeline import TimelineEvent
from app.services.pipeline.normalization_service import expense_category_for_document_type


def create_expense_from_bill(
    db: Session, *, document: Document, fields: dict, report_date: Optional[date]
) -> Optional[MedicalExpense]:
    """Called by the processing pipeline after a MEDICAL_BILL/PHARMACY_BILL
    document has been validated. Returns None if no usable total was found."""
    total = fields.get("total_amount") or fields.get("amount")
    if total is None:
        return None

    db.query(MedicalExpense).filter(MedicalExpense.document_id == document.id).delete()

    insurance_covered = float(fields.get("insurance_amount") or 0)
    patient_paid = fields.get("patient_payable_amount")
    patient_paid = float(patient_paid) if patient_paid is not None else max(float(total) - insurance_covered, 0.0)

    expense = MedicalExpense(
        vault_id=document.vault_id,
        document_id=document.id,
        created_by=document.uploaded_by,
        expense_date=report_date or document.document_date or document.created_at.date(),
        category=expense_category_for_document_type(document.document_type),
        hospital_name=fields.get("hospital_name"),
        amount=float(total),
        insurance_covered=insurance_covered,
        patient_paid=patient_paid,
        notes=f"Auto-extracted from {document.original_filename}",
    )
    db.add(expense)
    db.flush()

    for item in fields.get("items") or []:
        if not item.get("description"):
            continue
        db.add(
            ExpenseItem(
                expense_id=expense.id,
                description=item["description"],
                quantity=item.get("quantity"),
                unit_price=item.get("unit_price"),
                amount=float(item.get("amount") or 0),
            )
        )

    db.add(
        TimelineEvent(
            vault_id=document.vault_id,
            document_id=document.id,
            event_type=TimelineEventType.MEDICAL_EXPENSE,
            event_date=expense.expense_date,
            title=f"Medical Expense — {expense.hospital_name or document.document_type.value.replace('_', ' ').title()}",
            description=f"{expense.currency} {expense.amount:,.2f}",
            event_metadata={"expense_id": expense.id},
        )
    )
    db.flush()
    return expense


def create_manual_expense(
    db: Session,
    *,
    vault_id: str,
    created_by: str,
    expense_date: date,
    category: ExpenseCategory,
    amount: float,
    hospital_name: Optional[str] = None,
    insurance_covered: float = 0.0,
    patient_paid: Optional[float] = None,
    notes: Optional[str] = None,
) -> MedicalExpense:
    expense = MedicalExpense(
        vault_id=vault_id,
        created_by=created_by,
        expense_date=expense_date,
        category=category,
        hospital_name=hospital_name,
        amount=amount,
        insurance_covered=insurance_covered,
        patient_paid=patient_paid if patient_paid is not None else max(amount - insurance_covered, 0.0),
        notes=notes,
    )
    db.add(expense)
    db.flush()
    db.add(
        TimelineEvent(
            vault_id=vault_id,
            event_type=TimelineEventType.MEDICAL_EXPENSE,
            event_date=expense_date,
            title=f"Medical Expense — {hospital_name or category.value.replace('_', ' ').title()}",
            description=f"{expense.currency} {amount:,.2f}",
            event_metadata={"expense_id": expense.id, "manual": True},
        )
    )
    db.flush()
    return expense


def get_expense_summary(db: Session, *, vault_id: str) -> dict:
    today = date.today()
    month_start = today.replace(day=1)
    month_end = today.replace(day=monthrange(today.year, today.month)[1])
    year_start = today.replace(month=1, day=1)
    year_end = today.replace(month=12, day=31)

    base_query = db.query(MedicalExpense).filter(MedicalExpense.vault_id == vault_id)

    total = base_query.with_entities(func.coalesce(func.sum(MedicalExpense.amount), 0.0)).scalar()
    insurance_total = base_query.with_entities(
        func.coalesce(func.sum(MedicalExpense.insurance_covered), 0.0)
    ).scalar()
    out_of_pocket = base_query.with_entities(func.coalesce(func.sum(MedicalExpense.patient_paid), 0.0)).scalar()

    month_total = (
        base_query.filter(MedicalExpense.expense_date.between(month_start, month_end))
        .with_entities(func.coalesce(func.sum(MedicalExpense.amount), 0.0))
        .scalar()
    )
    year_total = (
        base_query.filter(MedicalExpense.expense_date.between(year_start, year_end))
        .with_entities(func.coalesce(func.sum(MedicalExpense.amount), 0.0))
        .scalar()
    )

    by_category_rows = (
        base_query.with_entities(MedicalExpense.category, func.coalesce(func.sum(MedicalExpense.amount), 0.0))
        .group_by(MedicalExpense.category)
        .all()
    )

    by_month = []
    for i in range(5, -1, -1):
        month_index = today.month - i
        year_offset, month_index = divmod(month_index - 1, 12)
        year, month = today.year + year_offset, month_index + 1
        bucket_start = date(year, month, 1)
        bucket_end = date(year, month, monthrange(year, month)[1])
        amount = (
            base_query.filter(MedicalExpense.expense_date.between(bucket_start, bucket_end))
            .with_entities(func.coalesce(func.sum(MedicalExpense.amount), 0.0))
            .scalar()
        )
        by_month.append({"month": bucket_start.strftime("%b"), "amount": amount})

    return {
        "total": total,
        "current_month_total": month_total,
        "current_year_total": year_total,
        "insurance_covered": insurance_total,
        "out_of_pocket": out_of_pocket,
        "by_category": {category.value: amount for category, amount in by_category_rows},
        "by_month": by_month,
    }
