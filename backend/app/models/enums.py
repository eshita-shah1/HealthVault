"""Shared enums used across models, schemas and services.

Kept as plain str-Enums (not DB-level CHECK/ENUM types) so new values can be
added by changing this file + a migration that widens the column, without a
destructive ALTER TYPE.
"""
from enum import Enum


class DocumentType(str, Enum):
    PRESCRIPTION = "PRESCRIPTION"
    LAB_REPORT = "LAB_REPORT"
    MEDICAL_REPORT = "MEDICAL_REPORT"
    DIAGNOSIS = "DIAGNOSIS"
    DISCHARGE_SUMMARY = "DISCHARGE_SUMMARY"
    SCAN_REPORT = "SCAN_REPORT"
    MEDICAL_BILL = "MEDICAL_BILL"
    PHARMACY_BILL = "PHARMACY_BILL"
    INSURANCE_DOCUMENT = "INSURANCE_DOCUMENT"
    CONSULTATION = "CONSULTATION"
    OTHER = "OTHER"


class ProcessingStatus(str, Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    OCR_COMPLETED = "OCR_COMPLETED"
    CLASSIFIED = "CLASSIFIED"
    EXTRACTED = "EXTRACTED"
    VALIDATED = "VALIDATED"
    PROCESSED = "PROCESSED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    FAILED = "FAILED"


class ProcessingStage(str, Enum):
    UPLOAD = "UPLOAD"
    OCR = "OCR"
    CLASSIFICATION = "CLASSIFICATION"
    EXTRACTION = "EXTRACTION"
    NORMALIZATION = "NORMALIZATION"
    VALIDATION = "VALIDATION"
    PERSISTENCE = "PERSISTENCE"
    TIMELINE = "TIMELINE"
    EXPENSE = "EXPENSE"


class LogStatus(str, Enum):
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class VaultRole(str, Enum):
    OWNER = "OWNER"
    FAMILY_MEMBER = "FAMILY_MEMBER"
    DOCTOR = "DOCTOR"
    VIEWER = "VIEWER"


class MembershipStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    REVOKED = "REVOKED"


class ValidationStatus(str, Enum):
    VALID = "VALID"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    INVALID = "INVALID"


class ResultFlag(str, Enum):
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    LOW = "LOW"
    ABNORMAL = "ABNORMAL"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class ExpenseCategory(str, Enum):
    DOCTOR_CONSULTATION = "DOCTOR_CONSULTATION"
    MEDICINE = "MEDICINE"
    LAB_TEST = "LAB_TEST"
    SCAN = "SCAN"
    HOSPITALIZATION = "HOSPITALIZATION"
    SURGERY = "SURGERY"
    OTHER = "OTHER"


class TimelineEventType(str, Enum):
    CONSULTATION = "CONSULTATION"
    PRESCRIPTION = "PRESCRIPTION"
    LAB_TEST = "LAB_TEST"
    DIAGNOSIS = "DIAGNOSIS"
    SCAN = "SCAN"
    HOSPITALIZATION = "HOSPITALIZATION"
    DISCHARGE = "DISCHARGE"
    MEDICAL_EXPENSE = "MEDICAL_EXPENSE"


class ShareStatus(str, Enum):
    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"


class DocumentPermission(str, Enum):
    VIEW = "VIEW"
    DOWNLOAD = "DOWNLOAD"
