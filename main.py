# backend/main.py
from fastapi import FastAPI, HTTPException, Depends, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Optional, Dict

import database
import models

database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Workload Manager")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",   # vite preview
    "http://127.0.0.1:4173",   # vite preview
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---- Auto duration rules (hours) ----
DEV_RULES: Dict[str, float] = {
    "BOM": 2.0,
    "Sending Sample": 3.0,
    "Assembly": 3.0,
    "Power Consumption": 4.0,
    "EMI": 4.0,
    "Audio": 4.0,
    "D_VA Project Management": 5.0,
    "High Grade Project Management": 160.0,  # ~1 month (8h*20d)
    "CST": 40.0,      # ~1 week
    "ESD/EOS": 8.0,   # 1 day
    "Backend": 40.0,  # 1 week
    "HDMI": 40.0,
    "USB": 40.0,
    "Sub Assy": 40.0,
}
NON_DEV_RULES: Dict[str, float] = {
    "Innovation": 2.0,
    "SHEE 5S": 1.0,
    "Education": 3.0,
    "Budget/Accounting": 2.0,
    "VI": 3.0,
    "CA": 2.0,
    "IT": 1.0,
    "Reinvent": 2.0,
    "GA": 0.5,
    "Asset": 3.0,
}

def compute_estimated(job: models.WorkloadItem) -> float:
    q = max(1, int(job.quantity or 1))
    if job.job_type == "DX":
        return 5.5 * 40.0  # midpoint of 3–8 weeks
    if job.job_type == "Dev":
        base = DEV_RULES.get(job.task_name, 0.0)
        return base * q
    if job.job_type == "Non Dev":
        base = NON_DEV_RULES.get(job.task_name, 0.0)
        return base * q
    return float(job.estimated_duration or 0.0)

def validate_dates(start_date: Optional[str], due_date: Optional[str]):
    if not start_date or not due_date:
        return
    s = date.fromisoformat(start_date)
    d = date.fromisoformat(due_date)
    if d < s:
        raise HTTPException(status_code=400, detail="due_date must be on/after start_date")

def serialize(r: database.WorkloadItemDB):
    return {
        "id": r.id,
        "user_name": r.user_name,
        "job_type": r.job_type,
        "task_name": r.task_name,
        "description": r.description,
        "quantity": r.quantity,
        "estimated_duration": r.estimated_duration,
        "unit": r.unit,
        "start_date": r.start_date,
        "due_date": r.due_date,
        "status": r.status or "Open",
    }

@app.get("/jobs/")
def read_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    rows = db.query(database.WorkloadItemDB).offset(skip).limit(limit).all()
    return [serialize(r) for r in rows]

@app.post("/jobs/")
def create_job(job: models.WorkloadItem, db: Session = Depends(get_db)):
    allowed_types = {"Dev", "Non Dev", "DX"}
    if job.job_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"job_type must be one of {allowed_types}")
    validate_dates(job.start_date, job.due_date)
    job_data = job.dict()
    job_data["estimated_duration"] = compute_estimated(job)
    db_item = database.WorkloadItemDB(**job_data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return serialize(db_item)

@app.put("/jobs/{job_id}")
def update_job(job_id: int, updated_job: models.WorkloadItem, db: Session = Depends(get_db)):
    row = db.query(database.WorkloadItemDB).filter(database.WorkloadItemDB.id == job_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    validate_dates(updated_job.start_date, updated_job.due_date)
    # overwrite fields
    for k, v in updated_job.dict(exclude_unset=True).items():
        setattr(row, k, v)
    # recompute duration for consistency
    row.estimated_duration = compute_estimated(updated_job)
    db.commit()
    db.refresh(row)
    return serialize(row)

@app.get("/jobs/{job_id}")
def read_job(job_id: int, db: Session = Depends(get_db)):
    r = db.query(database.WorkloadItemDB).filter(database.WorkloadItemDB.id == job_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Job not found")
    return serialize(r)

@app.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    r = db.query(database.WorkloadItemDB).filter(database.WorkloadItemDB.id == job_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(r)
    db.commit()
    return {"message": "Job deleted successfully", "deleted_id": job_id}

# Summaries (unchanged)
@app.get("/jobs/summary_by_user")
def get_summary_by_user(db: Session = Depends(get_db)):
    results = (
        db.query(
            func.lower(database.WorkloadItemDB.user_name).label("user_name"),
            func.sum(database.WorkloadItemDB.estimated_duration).label("total_estimated_duration"),
            func.sum(database.WorkloadItemDB.quantity).label("total_quantity"),
            func.count(database.WorkloadItemDB.id).label("total_jobs"),
        )
        .group_by(func.lower(database.WorkloadItemDB.user_name))
        .all()
    )
    return [
        {
            "user_name": row.user_name,
            "total_estimated_duration": float(row.total_estimated_duration or 0),
            "total_quantity": int(row.total_quantity or 0),
            "total_jobs": int(row.total_jobs or 0),
        }
        for row in results
    ]

@app.get("/jobs/summary")
def get_summary(
    job_type: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(
        func.lower(database.WorkloadItemDB.user_name).label("user_name"),
        database.WorkloadItemDB.job_type.label("job_type"),
        func.count(database.WorkloadItemDB.id).label("total_jobs"),
        func.sum(database.WorkloadItemDB.quantity).label("total_quantity"),
        func.sum(database.WorkloadItemDB.estimated_duration).label("total_estimated_duration"),
    )
    if job_type:
        query = query.filter(database.WorkloadItemDB.job_type == job_type)
    if user_name:
        query = query.filter(func.lower(database.WorkloadItemDB.user_name) == user_name.lower())
    query = query.group_by(func.lower(database.WorkloadItemDB.user_name), database.WorkloadItemDB.job_type)
    results = query.all()
    return [
        {
            "user_name": r.user_name,
            "job_type": r.job_type,
            "total_jobs": int(r.total_jobs or 0),
            "total_quantity": int(r.total_quantity or 0),
            "total_estimated_duration": float(r.total_estimated_duration or 0),
        }
        for r in results
    ]