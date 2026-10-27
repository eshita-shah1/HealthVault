from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin, UUIDPrimaryKeyMixin, enum_column
from app.models.enums import MembershipStatus, VaultRole

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.user import User


class Vault(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "vaults"

    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)

    owner: Mapped["User"] = relationship(
        "User", back_populates="owned_vaults", foreign_keys=[owner_id]
    )
    members: Mapped[List["VaultMember"]] = relationship(
        "VaultMember", back_populates="vault", cascade="all, delete-orphan"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="vault", cascade="all, delete-orphan"
    )


class VaultMember(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "vault_members"
    __table_args__ = (UniqueConstraint("vault_id", "user_id", name="uq_vault_member"),)

    vault_id: Mapped[str] = mapped_column(ForeignKey("vaults.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[VaultRole] = mapped_column(enum_column(VaultRole), default=VaultRole.VIEWER, nullable=False)
    status: Mapped[MembershipStatus] = mapped_column(
        enum_column(MembershipStatus), default=MembershipStatus.ACTIVE, nullable=False
    )
    invited_by: Mapped[Optional[str]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    vault: Mapped["Vault"] = relationship("Vault", back_populates="members")
    user: Mapped["User"] = relationship(
        "User", back_populates="vault_memberships", foreign_keys=[user_id]
    )
