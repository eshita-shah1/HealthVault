"""Import point for Alembic autogenerate: touching app.models registers every
mapped class on Base.metadata.
"""
from app.db.base_class import Base  # noqa: F401
from app.models import *  # noqa: F401,F403
