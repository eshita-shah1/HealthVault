from functools import lru_cache

from app.core.config import settings
from app.services.ai.ocr.base import OCRService


@lru_cache
def get_ocr_service() -> OCRService:
    provider = settings.OCR_PROVIDER.lower()
    if provider == "tesseract":
        from app.services.ai.ocr.tesseract import TesseractOCRService

        return TesseractOCRService()
    if provider == "none":
        from app.services.ai.ocr.null import NullOCRService

        return NullOCRService()
    raise ValueError(f"Unknown OCR_PROVIDER: {settings.OCR_PROVIDER}")
