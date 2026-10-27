from datetime import date, datetime
from typing import TYPE_CHECKING, Any, List, Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDPrimaryKeyMixin, enum_column, utcnow
from app.models.enums import DocumentType, LogStatus, ProcessingStage, ProcessingStatus

if TYPE_CHECKING:
    from app.models.vault import Vault


class Document(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Central entity: every structured medical record traces back here."""

    __tablename__ = "documents"

    vault_id: Mapped[str] = mapped_column(ForeignKey("vaults.id", ondelete="CASCADE"), nullable=False)
    uploaded_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # File metadata (binary itself lives in object/file storage, never in Postgres)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_provider: Mapped[str] = mapped_column(String(32), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)

    # AI pipeline outputs
    document_type: Mapped[Optional[DocumentType]] = mapped_column(enum_column(DocumentType), nullable=True)
    classification_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        enum_column(ProcessingStatus), default=ProcessingStatus.UPLOADED, nullable=False
    )
    document_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    doc_metadata: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    vault: Mapped["Vault"] = relationship("Vault", back_populates="documents")
    processing_logs: Mapped[List["ProcessingLog"]] = relationship(
        "ProcessingLog", back_populates="document", cascade="all, delete-orphan",
        order_by="ProcessingLog.created_at",
    )


class ProcessingLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "processing_logs"

    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    stage: Mapped[ProcessingStage] = mapped_column(enum_column(ProcessingStage), nullable=False)
    status: Mapped[LogStatus] = mapped_column(enum_column(LogStatus), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    document: Mapped["Document"] = relationship("Document", back_populates="processing_logs")
