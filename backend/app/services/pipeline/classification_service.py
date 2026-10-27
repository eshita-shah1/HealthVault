from app.services.ai.llm.base import ClassificationResult
from app.services.ai.llm.factory import get_llm_provider

# Below this confidence the document is still classified, but later stages
# should be more willing to flag the record NEEDS_REVIEW.
LOW_CONFIDENCE_THRESHOLD = 0.5


def classify_document(text: str) -> ClassificationResult:
    return get_llm_provider().classify_document(text)
