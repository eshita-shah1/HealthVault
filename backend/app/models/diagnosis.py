from datetime import date
from typing import Optional

from sqlalchemy import Date, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDPrimaryKeyMixin, enum_column
from app.models.enums import ValidationStatus


class Diagnosis(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "diagnoses"

    document_id: Mapped[str] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    vault_id: Mapped[str] = mapped_column(ForeignKey("vaults.id", ondelete="CASCADE"), nullable=False)

    condition_raw: Mapped[str] = mapped_column(String(500), nullable=False)
    condition_normalized: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    doctor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    diagnosis_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    validation_status: Mapped[ValidationStatus] = mapped_column(
        enum_column(ValidationStatus), default=ValidationStatus.NEEDS_REVIEW, nullable=False
    )
