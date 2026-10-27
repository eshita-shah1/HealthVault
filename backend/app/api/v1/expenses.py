from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import ExpenseCategory
from app.models.expense import MedicalExpense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseSummaryOut
from app.services.expenses.expense_service import create_manual_expense, get_expense_summary
from app.services.sharing.access_service import require_full_vault_access

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    vault_id: str = Query(...),
    category: Optional[ExpenseCategory] = None,
    document_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ExpenseOut]:
    require_full_vault_access(db, user=user, vault_id=vault_id)

    q = db.query(MedicalExpense).filter(MedicalExpense.vault_id == vault_id)
    if category:
        q = q.filter(MedicalExpense.category == category)
    if document_id:
        q = q.filter(MedicalExpense.document_id == document_id)
    if date_from:
        q = q.filter(MedicalExpense.expense_date >= date_from)
    if date_to:
        q = q.filter(MedicalExpense.expense_date <= date_to)

    expenses = q.order_by(MedicalExpense.expense_date.desc()).offset(offset).limit(limit).all()
    return [ExpenseOut.model_validate(e) for e in expenses]


@router.get("/summary", response_model=ExpenseSummaryOut)
def expense_summary(
    vault_id: str = Query(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ExpenseSummaryOut:
    require_full_vault_access(db, user=user, vault_id=vault_id)
    return ExpenseSummaryOut(**get_expense_summary(db, vault_id=vault_id))


@router.post("", response_model=ExpenseOut, status_code=201)
def create_expense(
    vault_id: str = Query(...),
    payload: ExpenseCreate = ...,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExpenseOut:
    require_full_vault_access(db, user=user, vault_id=vault_id)
    expense = create_manual_expense(
        db,
        vault_id=vault_id,
        created_by=user.id,
        expense_date=payload.expense_date,
        category=payload.category,
        amount=payload.amount,
        hospital_name=payload.hospital_name,
        insurance_covered=payload.insurance_covered,
        patient_paid=payload.patient_paid,
        notes=payload.notes,
    )
    db.commit()
    db.refresh(expense)
    return ExpenseOut.model_validate(expense)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    expense = db.get(MedicalExpense, expense_id)
    if expense is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    require_full_vault_access(db, user=user, vault_id=expense.vault_id)

    if expense.document_id is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This expense was extracted from a document and can't be deleted directly; "
            "delete or reprocess the source document instead.",
        )

    db.delete(expense)
    db.commit()
    return None
