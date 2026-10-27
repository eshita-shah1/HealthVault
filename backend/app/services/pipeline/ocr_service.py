from app.services.ai.ocr.base import OCRResult
from app.services.ai.ocr.factory import get_ocr_service


def run_ocr(*, file_bytes: bytes, mime_type: str) -> OCRResult:
    return get_ocr_service().extract_text(file_bytes=file_bytes, mime_type=mime_type)
