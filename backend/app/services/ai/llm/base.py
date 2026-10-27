"""LLM provider abstraction.

Two concerns share this interface: structured extraction (classification +
field extraction from a document's OCR'd text) and free-text generation (the
doctor-facing health summary). Swapping AI_PROVIDER in .env changes both
without touching classification_service / extraction_service / summary_service.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from app.models.enums import DocumentType


@dataclass
class ClassificationResult:
    document_type: DocumentType
    confidence: float


@dataclass
class ExtractionResult:
    fields: dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0


class LLMProvider(ABC):
    provider_name: str

    @abstractmethod
    def classify_document(self, text: str) -> ClassificationResult:
        raise NotImplementedError

    @abstractmethod
    def extract_fields(self, text: str, document_type: DocumentType) -> ExtractionResult:
        raise NotImplementedError

    @abstractmethod
    def generate_summary(self, prompt: str) -> str:
        """Given a prompt containing only structured facts already pulled from
        Postgres, return readable prose. Must not be asked to re-derive facts
        from raw documents."""
        raise NotImplementedError
