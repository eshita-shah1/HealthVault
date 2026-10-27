from datetime import date
from typing import List, Optional

from sqlalchemy import Date, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDPrimaryKeyMixin, enum_column
from app.models.enums import ExpenseCategory


class MedicalExpense(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "medical_expenses"

    vault_id: Mapped[str] = mapped_column(ForeignKey("vaults.id", ondelete="CASCADE"), nullable=False)
    document_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[ExpenseCategory] = mapped_column(enum_column(ExpenseCategory), nullable=False)
    hospital_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    insurance_covered: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    patient_paid: Mapped[float] = mapped_column(Float, nullable=False)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    items: Mapped[List["ExpenseItem"]] = relationship(
        "ExpenseItem", back_populates="expense", cascade="all, delete-orphan"
    )


class ExpenseItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "expense_items"

    expense_id: Mapped[str] = mapped_column(
        ForeignKey("medical_expenses.id", ondelete="CASCADE"), nullable=False
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    unit_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)

    expense: Mapped["MedicalExpense"] = relationship("MedicalExpense", back_populates="items")
