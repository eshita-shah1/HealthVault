"""OpenAI-backed LLM provider: real classification/extraction/summarization.

Uses JSON-mode chat completions so responses parse deterministically. Prompts
instruct the model to only report what is present in the text and to avoid
diagnostic conclusions (see summary_service for the doctor-summary prompt).
"""
import json

from app.core.config import settings
from app.core.logging import get_logger
from app.models.enums import DocumentType
from app.services.ai.llm.base import ClassificationResult, ExtractionResult, LLMProvider
from app.services.pipeline.field_schemas import EXTRACTION_SCHEMAS

logger = get_logger(__name__)

_CLASSIFY_SYSTEM_PROMPT = (
    "You classify medical documents. Categories: "
    + ", ".join(t.value for t in DocumentType)
    + ". Respond ONLY with JSON: {\"document_type\": <category>, \"confidence\": <0-1 float>}."
    " Base the classification on the document's actual text content, not just formatting."
)

_EXTRACT_SYSTEM_PROMPT = (
    "You extract structured fields from a medical document's text. "
    "Only report information explicitly present in the text; use null for anything missing. "
    "Do not infer medical conclusions beyond what is written. "
    "Respond ONLY with a JSON object containing exactly these top-level keys: {fields}. "
    "Also include a top-level \"confidence\" key (0-1 float) reflecting how complete/clear the extraction is."
)


class OpenAILLMProvider(LLMProvider):
    provider_name = "openai"

    def __init__(self):
        from openai import OpenAI

        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY must be set when AI_PROVIDER=openai")
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

    def _chat_json(self, system_prompt: str, user_prompt: str) -> dict:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )
        content = response.choices[0].message.content
        try:
            return json.loads(content)
        except (json.JSONDecodeError, TypeError):
            logger.error("OpenAI returned non-JSON content: %s", content)
            return {}

    def classify_document(self, text: str) -> ClassificationResult:
        result = self._chat_json(_CLASSIFY_SYSTEM_PROMPT, text[:8000])
        try:
            doc_type = DocumentType(result.get("document_type", DocumentType.OTHER.value))
        except ValueError:
            doc_type = DocumentType.OTHER
        confidence = float(result.get("confidence", 0.5))
        return ClassificationResult(document_type=doc_type, confidence=confidence)

    def extract_fields(self, text: str, document_type: DocumentType) -> ExtractionResult:
        field_names = EXTRACTION_SCHEMAS.get(document_type, ["summary_text"])
        system_prompt = _EXTRACT_SYSTEM_PROMPT.format(fields=", ".join(field_names))
        result = self._chat_json(system_prompt, text[:12000])
        confidence = float(result.pop("confidence", 0.6)) if "confidence" in result else 0.6
        fields = {k: result.get(k) for k in field_names}
        return ExtractionResult(fields=fields, confidence=confidence)

    def generate_summary(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You write concise clinical handoff summaries for doctors from "
                        "structured patient data that is given to you in full. Only use the "
                        "facts provided - never invent test results, medications or diagnoses, "
                        "and never state a diagnosis that isn't already in the provided data. "
                        "Write plain prose with no inline identifiers, document IDs or citation "
                        "markers - the application links each fact back to its source document "
                        "separately from this text."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        return response.choices[0].message.content or ""
