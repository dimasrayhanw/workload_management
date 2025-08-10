# models.py
from pydantic import BaseModel
from typing import Optional, Literal

class WorkloadItem(BaseModel):
    user_name: str
    job_type: Literal["Dev", "Non Dev", "DX"]
    task_name: str
    description: Optional[str] = None
    quantity: int = 1
    estimated_duration: Optional[float] = None
    unit: Optional[str] = None
    start_date: Optional[str] = None  # ISO date string: "YYYY-MM-DD"
    due_date: Optional[str] = None

    class Config:
        from_attributes = True