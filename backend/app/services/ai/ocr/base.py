"""OCR provider abstraction.

Swap providers (Tesseract, Google Vision, Azure Document Intelligence, ...)
by implementing this interface and registering it in `factory.py` — nothing
else in the pipeline needs to change.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class OCRResult:
    text: str
    confidence: float  # 0.0 - 1.0
    used_ocr: bool  # False when text was extracted directly (digital PDF), not OCR'd


class OCRService(ABC):
    provider_name: str

    @abstractmethod
    def extract_text(self, *, file_bytes: bytes, mime_type: str) -> OCRResult:
        raise NotImplementedError
