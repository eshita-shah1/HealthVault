from typing import Any, Optional

from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base, TimestampMixin, UUIDPrimaryKeyMixin


class HealthSummary(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A generated, versioned doctor-facing summary.

    `structured_data` is the exact structured context (facts pulled from
    Postgres) that was handed to the LLM — kept for traceability so the
    generated prose can always be checked against source records.
    """

    __tablename__ = "health_summaries"

    vault_id: Mapped[str] = mapped_column(ForeignKey("vaults.id", ondelete="CASCADE"), nullable=False)
    generated_by: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    generated_for_share_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("shared_access.id", ondelete="SET NULL"), nullable=True
    )

    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    structured_data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    model_used: Mapped[str] = mapped_column(String(128), nullable=False)
