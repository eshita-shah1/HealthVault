"""Declarative base + shared mixins used by every model."""
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Type

from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def new_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def enum_column(enum_cls: Type[Enum], length: int = 32):
    """VARCHAR-backed enum column (not a native DB enum type) that still
    round-trips to/from the Python Enum member on read/write.

    No CHECK constraint is generated (create_constraint=False) on purpose:
    adding a new enum value (e.g. a new DocumentType) should only require
    changing this codebase, never an ALTER TYPE / constraint migration.
    """
    return SAEnum(
        enum_cls,
        native_enum=False,
        length=length,
        create_constraint=False,
        values_callable=lambda obj: [e.value for e in obj],
    )


class Base(DeclarativeBase):
    pass


class UUIDPrimaryKeyMixin:
    id: Mapped[str] = mapped_column(primary_key=True, default=new_uuid)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
