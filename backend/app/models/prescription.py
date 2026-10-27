from datetime import date
from typing import List, Optional

from sqlalchemy import Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDPrimaryKeyMixin, enum_column
from app.models.enums import ValidationStatus


class Prescription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "prescriptions"

    document_id: Mapped[str] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    vault_id: Mapped[str] = mapped_column(ForeignKey("vaults.id", ondelete="CASCADE"), nullable=False)

    patient_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    doctor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    prescription_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    medicines: Mapped[List["Medicine"]] = relationship(
        "Medicine", back_populates="prescription", cascade="all, delete-orphan"
    )


class Medicine(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "medicines"

    prescription_id: Mapped[str] = mapped_column(
        ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False
    )

    medicine_name_raw: Mapped[str] = mapped_column(String(255), nullable=False)
    medicine_name_normalized: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    dosage_raw: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    dosage_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    dosage_unit: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    frequency_raw: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    frequency_normalized: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    route: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    duration_raw: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    duration_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    validation_status: Mapped[ValidationStatus] = mapped_column(
        enum_column(ValidationStatus), default=ValidationStatus.NEEDS_REVIEW, nullable=False
    )

    prescription: Mapped["Prescription"] = relationship("Prescription", back_populates="medicines")
