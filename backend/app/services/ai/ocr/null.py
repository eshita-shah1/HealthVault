"""No-op OCR provider: extracts text from digital PDFs only, skips images.

Useful for dev/demo environments without Tesseract installed. Image uploads
will be left with empty extracted_text and flagged NEEDS_REVIEW downstream.
"""
import io

from app.services.ai.ocr.base import OCRResult, OCRService


class NullOCRService(OCRService):
    provider_name = "none"

    def extract_text(self, *, file_bytes: bytes, mime_type: str) -> OCRResult:
        if mime_type == "application/pdf":
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(file_bytes))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
            return OCRResult(text=text, confidence=0.99 if text.strip() else 0.0, used_ocr=False)
        return OCRResult(text="", confidence=0.0, used_ocr=False)
