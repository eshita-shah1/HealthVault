from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ExpenseCategory


class ExpenseCreate(BaseModel):
    expense_date: date
    category: ExpenseCategory
    amount: float = Field(gt=0)
    hospital_name: Optional[str] = None
    insurance_covered: float = Field(default=0.0, ge=0)
    patient_paid: Optional[float] = None
    notes: Optional[str] = None


class ExpenseItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    description: str
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    amount: float


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vault_id: str
    document_id: Optional[str] = None
    expense_date: date
    category: ExpenseCategory
    hospital_name: Optional[str] = None
    amount: float
    currency: str
    insurance_covered: float
    patient_paid: float
    notes: Optional[str] = None
    created_at: datetime
    items: list[ExpenseItemOut] = []


class MonthlyExpenseOut(BaseModel):
    month: str
    amount: float


class ExpenseSummaryOut(BaseModel):
    total: float
    current_month_total: float
    current_year_total: float
    insurance_covered: float
    out_of_pocket: float
    by_category: dict[str, float]
    by_month: list[MonthlyExpenseOut]
