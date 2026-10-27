from app.models.enums import DocumentType
from app.services.ai.llm.base import ExtractionResult
from app.services.ai.llm.factory import get_llm_provider


def extract_fields(text: str, document_type: DocumentType) -> ExtractionResult:
    return get_llm_provider().extract_fields(text, document_type)
