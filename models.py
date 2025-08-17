# models.py
from pydantic import BaseModel, field_validator
from typing import Any, List, Optional, Dict, Literal
from datetime import date
# backend/models.py

class WorkloadItem(BaseModel):
    user_name: str
    job_type: Literal["Dev", "Non Dev", "DX"]
    task_name: str
    description: Optional[str] = None
    quantity: int = 1
    estimated_duration: Optional[float] = None  # server will compute; client can ignore
    unit: Optional[str] = None                  # unit for the quantity
    start_date: Optional[str] = None            # YYYY-MM-DD
    due_date: Optional[str] = None
    status: Optional[str] = "Open"

    @field_validator("start_date", "due_date")
    @classmethod
    def valid_date(cls, v):
        if v in (None, "", "null"):
            return None
        # basic format check
        date.fromisoformat(v)  # raises if invalid
        return v

    class Config:
        from_attributes = True

class HistoryChange(BaseModel):
    field: str
    old: Any = None
    new: Any = None

class JobHistory(BaseModel):
    id: int
    job_id: int
    event: str
    changed_at: str
    changes: Optional[List[HistoryChange]] = None

    class Config:
        orm_mode = True

class JobHistoryOut(BaseModel):
    id: int
    job_id: int
    action: str
    field_changed: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: str
    created_by: Optional[str] = None

    class Config:
        from_attributes = True   # pydantic v2 (replaces orm_mode=True)