from datetime import date
from typing import List, Optional

from sqlalchemy import Date, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDPrimaryKeyMixin, enum_column
from app.models.enums import ResultFlag, ValidationStatus


class LabReport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "lab_reports"

    document_id: Mapped[str] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    vault_id: Mapped[str] = mapped_column(ForeignKey("vaults.id", ondelete="CASCADE"), nullable=False)

    patient_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    doctor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    laboratory_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    report_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    results: Mapped[List["LabResult"]] = relationship(
        "LabResult", back_populates="lab_report", cascade="all, delete-orphan"
    )


class LabResult(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "lab_results"

    lab_report_id: Mapped[str] = mapped_column(
        ForeignKey("lab_reports.id", ondelete="CASCADE"), nullable=False
    )

    test_name_raw: Mapped[str] = mapped_column(String(255), nullable=False)
    test_name_normalized: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)

    result_value_raw: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    result_value_numeric: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    unit_raw: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    unit_normalized: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    reference_range_raw: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    reference_range_low: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reference_range_high: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    flag: Mapped[ResultFlag] = mapped_column(enum_column(ResultFlag), default=ResultFlag.UNKNOWN, nullable=False)

    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    validation_status: Mapped[ValidationStatus] = mapped_column(
        enum_column(ValidationStatus), default=ValidationStatus.NEEDS_REVIEW, nullable=False
    )

    lab_report: Mapped["LabReport"] = relationship("LabReport", back_populates="results")
