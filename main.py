# backend/main.py
from fastapi import FastAPI, HTTPException, Depends, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Optional, Dict, List
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError
from models import JobHistory, HistoryChange
from sqlalchemy.orm.attributes import flag_modified
import os
import database
import models

# database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Workload Manager")

# main.py


ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],  # or keep it strict if you prefer
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
DEV_RULES: Dict[str, float] = { # hour per day
    "BOM - Part Compose": 2.0,
    "BOM - Compare": 1.0,
    "BOM - HW Option": 4.0,
    "BOM - Rule Validation": 3.0,
    "BOM - Tool Option": 2.0,
    "BOM - Automation": 4.0,
    "BOM Check": 3.0,
    "Material Forecast/Request": 0.2,
    "Sending Sample": 3.0,
    "Assembly": 0.3,
    "Power Consumption": 4.0,
    "EMI": 5.0,
    "Audio": 5.0,
    "D_VA Project Management": 2.0,
    "High Grade Project Management": 4.0,  
    "CST": 5.0,     
    "ESD/EOS": 3.0,  
    "Backend": 5.0,  
    "HDMI": 4.0,
    "USB": 4.0,
    "Sub Assy": 4.0,
    "DCDC": 4.0,
    "Others (1 hour)": 1.0,
}
NON_DEV_RULES: Dict[str, float] = {# hour per day
    "Innovation": 2.0,
    "SHEE 5S": 1.0,
    "Education": 3.0,
    "Budget/Accounting": 2.0,
    "Investment": 3.0,
    "VI": 3.0,
    "CA": 2.0,
    "IT": 1.0,
    "Reinvent": 2.0,
    "GA": 0.5,
    "Asset": 5.0,
    "Warehouse": 4.0,
    "Others (1 hour)": 1.0,
}
DX_RULES: Dict[str, float] = {# hour per day
    "Initial Setup": 2.0,
    "Phase 1": 4.0,
    "Phase 2": 4.0,
    "Phase 3": 4.0,
    "Beta Test": 2.0,
    "Launching": 0.5,
    "Others (1 hour)": 1.0,
}

def compute_estimated(job: models.WorkloadItem) -> float:
    q = max(1, int(job.quantity or 1))
    if job.job_type == "DX":
        base = DX_RULES.get(job.task_name, 0.0)
        return base * q
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

def diff_fields(old_row, new_payload: dict) -> List[dict]:
    """Return list of per-field changes old->new (skip identical/None-only noise)."""
    tracked = [
        "user_name","job_type","task_name","description",
        "quantity","estimated_duration","unit","start_date","due_date","status"
    ]
    changes = []
    for f in tracked:
        old = getattr(old_row, f)
        new = new_payload.get(f, old)
        # normalize to simple scalars/strings for comparison
        if old != new:
            changes.append({"field": f, "old": old, "new": new})
    return changes

def serialize_history(h: database.JobHistoryDB):
    return {
        "id": h.id,
        "job_id": h.job_id,
        "event": h.event,
        "changed_at": h.changed_at.isoformat() if h.changed_at else None,
        "changes": h.changes or None,
    }

def log_history(
    db: Session,
    job_id: int,
    action: str,
    field_changed: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    created_by: Optional[str] = None,
):
    rec = database.JobHistoryDB(
        job_id=job_id,
        action=action,
        field_changed=field_changed,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        created_by=created_by,
    )
    db.add(rec)
    db.commit()
# main.py

@app.exception_handler(SQLAlchemyError)
def db_error_handler(request, exc: SQLAlchemyError):
    print("💥 SQL error:", exc)
    return JSONResponse(status_code=400, content={"error": "database_error", "detail": str(exc)})

@app.exception_handler(ValidationError)
def val_error_handler(request, exc: ValidationError):
    print("💥 Validation error:", exc)
    return JSONResponse(status_code=422, content={"error": "validation_error", "detail": exc.errors()})

@app.get("/healthz")
def healthz():
    # simple fast check for Render health probe
    return {"ok": True}

@app.on_event("startup")
def on_startup():
    # Try to create tables, but don't prevent the app from starting.
    try:
        # SQLAlchemy 2.x way to create_all safely
        with database.engine.begin() as conn:
            database.Base.metadata.create_all(bind=conn)
        print("✅ DB tables ensured.")
    except SQLAlchemyError as e:
        # Log and continue — app still boots; API will 500 on DB routes until DB works
        print(f"⚠️  DB init failed (continuing to serve): {e}")

@app.get("/", tags=["meta"])
def root():
    return {"ok": True, "service": "Workload Manager API", "docs": "/docs"}

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

   # history: Created
    log_history(
        db,
        job_id=db_item.id,
        action="Created",
        field_changed=None,
        old_value=None,
        new_value=job.description or "",
        created_by=job.user_name or "system",
    )
    db.add(hist)
    db.commit()

    return serialize(db_item)

@app.put("/jobs/{job_id}")
def update_job(job_id: int, updated_job: models.WorkloadItem, db: Session = Depends(get_db)):
    row = db.query(database.WorkloadItemDB).filter(database.WorkloadItemDB.id == job_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    validate_dates(updated_job.start_date, updated_job.due_date)

    # capture before-values for important fields
    watched = [
        "user_name", "job_type", "task_name", "description",
        "quantity", "unit", "start_date", "due_date", "status",
    ]
    before = {k: getattr(row, k) for k in watched}

    # apply updates
    for k, v in updated_job.dict(exclude_unset=True).items():
        setattr(row, k, v)

    # recompute duration for consistency
    row.estimated_duration = compute_estimated(updated_job)
    db.commit()
    db.refresh(row)

    # log field-by-field diffs
    for k in watched:
        old = before.get(k)
        new = getattr(row, k)
        # normalize to string for comparison, but don't spam if identical
        if (old is None and new is None) or str(old) == str(new):
            continue

        action = "StatusChanged" if k == "status" else "Updated"
        log_history(
            db,
            job_id=row.id,
            action=action,
            field_changed=k,
            old_value=old,
            new_value=new,
            created_by=row.user_name or "system",
        )

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

@app.get("/jobs/{job_id}/history")
def get_job_history(job_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(database.JobHistoryDB)
        .filter(database.JobHistoryDB.job_id == job_id)
        .order_by(database.JobHistoryDB.changed_at.asc())   # ← use changed_at
        .all()
    )
    return [
        {
            "id": r.id,
            "job_id": r.job_id,
            "event": r.event,
            "changed_at": r.changed_at.isoformat() if r.changed_at else None,
            "changes": r.changes or [],
        }
        for r in rows
    ]