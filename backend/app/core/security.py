"""Password hashing and JWT helpers.

Uses bcrypt directly (not passlib, which has known compatibility issues with
modern bcrypt releases) and PyJWT for token encode/decode.
"""
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional

import bcrypt
import jwt

from app.core.config import settings

_BCRYPT_MAX_BYTES = 72  # bcrypt silently truncates beyond this; reject earlier instead


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"


def hash_password(plain_password: str) -> str:
    password_bytes = plain_password.encode("utf-8")
    if len(password_bytes) > _BCRYPT_MAX_BYTES:
        raise ValueError("Password is too long")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _create_token(subject: str, token_type: TokenType, expires_delta: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: str) -> str:
    return _create_token(
        user_id, TokenType.ACCESS, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        user_id, TokenType.REFRESH, timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    )


def decode_token(token: str) -> dict[str, Any]:
    """Raises jwt.PyJWTError subclasses on invalid/expired tokens."""
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def get_token_subject(token: str, expected_type: Optional[TokenType] = None) -> str:
    payload = decode_token(token)
    if expected_type and payload.get("type") != expected_type.value:
        raise jwt.InvalidTokenError(f"Expected token type '{expected_type.value}'")
    return payload["sub"]
