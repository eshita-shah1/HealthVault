from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import DocumentType, ProcessingStatus


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vault_id: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    document_type: Optional[DocumentType] = None
    classification_confidence: Optional[float] = None
    processing_status: ProcessingStatus
    document_date: Optional[date] = None
    is_archived: bool
    created_at: datetime


class DocumentDetailOut(DocumentOut):
    extracted_text: Optional[str] = None
    doc_metadata: Optional[dict[str, Any]] = None


class ProcessingLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    stage: str
    status: str
    message: Optional[str] = None
    confidence: Optional[float] = None
    created_at: datetime
