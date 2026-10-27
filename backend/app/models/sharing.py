from datetime import datetime
from typing import List, Optional

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDPrimaryKeyMixin, enum_column
from app.models.enums import DocumentPermission, ShareStatus, VaultRole


class SharedAccess(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A grant of vault/category-level access to another user (e.g. a doctor).

    `allowed_document_types` being null/empty means "no category-wide grant" —
    access is then limited to whatever rows exist in `document_access`.
    """

    __tablename__ = "shared_access"

    vault_id: Mapped[str] = mapped_column(ForeignKey("vaults.id", ondelete="CASCADE"), nullable=False)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    shared_with_user_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    shared_with_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    role: Mapped[VaultRole] = mapped_column(enum_column(VaultRole), default=VaultRole.VIEWER, nullable=False)
    allowed_document_types: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)

    status: Mapped[ShareStatus] = mapped_column(enum_column(ShareStatus), default=ShareStatus.ACTIVE, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    document_grants: Mapped[List["DocumentAccess"]] = relationship(
        "DocumentAccess", back_populates="shared_access", cascade="all, delete-orphan"
    )


class DocumentAccess(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Individual-document grant, layered on top of (or instead of) a SharedAccess."""

    __tablename__ = "document_access"

    shared_access_id: Mapped[str] = mapped_column(
        ForeignKey("shared_access.id", ondelete="CASCADE"), nullable=False
    )
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    permission: Mapped[DocumentPermission] = mapped_column(
        enum_column(DocumentPermission), default=DocumentPermission.VIEW, nullable=False
    )

    shared_access: Mapped["SharedAccess"] = relationship("SharedAccess", back_populates="document_grants")
