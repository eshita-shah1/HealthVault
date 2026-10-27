from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class SummaryGenerateRequest(BaseModel):
    shared_access_id: Optional[str] = None


class HealthSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    vault_id: str
    version: int
    summary_text: str
    structured_data: Optional[dict[str, Any]] = None
    model_used: str
    created_at: datetime
