# models.py
from pydantic import BaseModel, field_validator
from typing import Optional, Literal
from datetime import date

class WorkloadItem(BaseModel):
    user_name: str
    job_type: Literal["Dev", "Non Dev", "DX"]
    task_name: str
    description: Optional[str] = None
    quantity: int = 1
    estimated_duration: Optional[float] = None  # will be auto-calculated
    unit: Optional[str] = None
    start_date: Optional[str] = None  # "YYYY-MM-DD"
    due_date: Optional[str] = None    # "YYYY-MM-DD"
    status: Optional[str] = None  

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