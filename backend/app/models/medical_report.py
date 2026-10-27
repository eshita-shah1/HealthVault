"""Catch-all structured record for document types that aren't a prescription,
lab report, diagnosis or bill: MEDICAL_REPORT, DISCHARGE_SUMMARY, SCAN_REPORT,
CONSULTATION, INSURANCE_DOCUMENT.
"""
from datetime import date
from typing import Any, Optional

from sqlalchemy import Date, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base, TimestampMixin, UUIDPrimaryKeyMixin, enum_column
from app.models.enums import DocumentType


class MedicalReport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "medical_reports"

    document_id: Mapped[str] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    vault_id: Mapped[str] = mapped_column(ForeignKey("vaults.id", ondelete="CASCADE"), nullable=False)

    report_type: Mapped[DocumentType] = mapped_column(enum_column(DocumentType), nullable=False)
    doctor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    hospital_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    report_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    summary_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    findings: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
