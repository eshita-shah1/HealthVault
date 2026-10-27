"""Tesseract-backed OCR provider.

For PDFs: tries direct text extraction first (pypdf) since most medical PDFs
from hospitals/labs are digitally generated, not scans — OCR only kicks in
when the PDF has no extractable text layer, or for image uploads.
"""
import io
from typing import List

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ai.ocr.base import OCRResult, OCRService

logger = get_logger(__name__)

_MIN_CHARS_FOR_DIGITAL_TEXT = 20  # below this, treat the PDF as scanned and fall back to OCR


class TesseractOCRService(OCRService):
    provider_name = "tesseract"

    def __init__(self):
        if settings.TESSERACT_CMD:
            import pytesseract

            pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

    def extract_text(self, *, file_bytes: bytes, mime_type: str) -> OCRResult:
        if mime_type == "application/pdf":
            digital_text = self._extract_pdf_text(file_bytes)
            if len(digital_text.strip()) >= _MIN_CHARS_FOR_DIGITAL_TEXT:
                return OCRResult(text=digital_text, confidence=0.99, used_ocr=False)
            return self._ocr_pdf(file_bytes)

        if mime_type.startswith("image/"):
            return self._ocr_image(file_bytes)

        raise ValueError(f"Unsupported mime_type for OCR: {mime_type}")

    def _extract_pdf_text(self, file_bytes: bytes) -> str:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(file_bytes))
        parts: List[str] = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(parts)

    def _ocr_pdf(self, file_bytes: bytes) -> OCRResult:
        try:
            from pdf2image import convert_from_bytes
        except ImportError:
            logger.warning("pdf2image not installed; cannot OCR scanned PDF, returning empty text")
            return OCRResult(text="", confidence=0.0, used_ocr=True)

        import pytesseract

        images = convert_from_bytes(file_bytes)
        texts, confidences = [], []
        for image in images:
            text, confidence = self._ocr_single_image(image)
            texts.append(text)
            confidences.append(confidence)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        return OCRResult(text="\n".join(texts), confidence=avg_confidence, used_ocr=True)

    def _ocr_image(self, file_bytes: bytes) -> OCRResult:
        from PIL import Image

        image = Image.open(io.BytesIO(file_bytes))
        text, confidence = self._ocr_single_image(image)
        return OCRResult(text=text, confidence=confidence, used_ocr=True)

    def _ocr_single_image(self, image) -> tuple[str, float]:
        import pytesseract

        text = pytesseract.image_to_string(image)
        try:
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            word_confidences = [int(c) for c in data.get("conf", []) if str(c).isdigit() and int(c) >= 0]
            confidence = (sum(word_confidences) / len(word_confidences) / 100.0) if word_confidences else 0.5
        except Exception:  # pragma: no cover - confidence is best-effort
            confidence = 0.5
        return text, confidence
