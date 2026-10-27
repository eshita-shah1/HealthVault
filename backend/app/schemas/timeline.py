from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import TimelineEventType


class TimelineEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vault_id: str
    document_id: Optional[str] = None
    event_type: TimelineEventType
    event_date: date
    title: str
    description: Optional[str] = None
    event_metadata: Optional[dict[str, Any]] = None
    created_at: datetime
