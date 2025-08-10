# main.py
from fastapi import FastAPI, HTTPException, Depends, Request, Query
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from sqlalchemy import func
import models
import database

database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Workload Manager")

# Allow all origins during dev (change for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"Request: {request.method} {request.url}")
    print("Query Params:", dict(request.query_params))
    response = await call_next(request)
    return response

@app.post("/jobs/")
def create_job(job: models.WorkloadItem, db: Session = Depends(get_db)):
    allowed_types = {"Dev", "Non Dev", "DX"}
    if job.job_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"job_type must be one of {allowed_types}")

    job_data = job.dict()
    # ensure numeric duration
    if job_data.get("estimated_duration") is not None:
        try:
            job_data["estimated_duration"] = float(job_data["estimated_duration"])
        except (TypeError, ValueError):
            job_data["estimated_duration"] = None

    db_item = database.WorkloadItemDB(**job_data)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return {
        "id": db_item.id,
        "user_name": db_item.user_name,
        "job_type": db_item.job_type,
        "task_name": db_item.task_name,
        "description": db_item.description,
        "quantity": db_item.quantity,
        "estimated_duration": db_item.estimated_duration,
        "unit": db_item.unit,
        "start_date": db_item.start_date,
        "due_date": db_item.due_date,
    }

@app.get("/jobs/")
def read_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    rows = db.query(database.WorkloadItemDB).offset(skip).limit(limit).all()
    return [
        {
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
        }
        for r in rows
    ]

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
    db: Session = Depends(get_db)
):
    query = db.query(
        func.lower(database.WorkloadItemDB.user_name).label("user_name"),
        database.WorkloadItemDB.job_type.label("job_type"),
        func.count(database.WorkloadItemDB.id).label("total_jobs"),
        func.sum(database.WorkloadItemDB.quantity).label("total_quantity"),
        func.sum(database.WorkloadItemDB.estimated_duration).label("total_estimated_duration")
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
            "total_estimated_duration": float(r.total_estimated_duration or 0)
        }
        for r in results
    ]

@app.get("/jobs/{job_id}")
def read_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(database.WorkloadItemDB).filter(database.WorkloadItemDB.id == job_id).first()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "user_name": job.user_name,
        "job_type": job.job_type,
        "task_name": job.task_name,
        "description": job.description,
        "quantity": job.quantity,
        "estimated_duration": job.estimated_duration,
        "unit": job.unit,
        "start_date": job.start_date,
        "due_date": job.due_date,
    }

@app.put("/jobs/{job_id}")
def update_job(job_id: int, updated_job: models.WorkloadItem, db: Session = Depends(get_db)):
    job = db.query(database.WorkloadItemDB).filter(database.WorkloadItemDB.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    for key, value in updated_job.dict(exclude_unset=True).items():
        if key == "estimated_duration" and value is not None:
            try:
                value = float(value)
            except (TypeError, ValueError):
                value = None
        setattr(job, key, value)
    db.commit()
    db.refresh(job)
    return {
        "id": job.id,
        "user_name": job.user_name,
        "job_type": job.job_type,
        "task_name": job.task_name,
        "description": job.description,
        "quantity": job.quantity,
        "estimated_duration": job.estimated_duration,
        "unit": job.unit,
        "start_date": job.start_date,
        "due_date": job.due_date,
    }

@app.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(database.WorkloadItemDB).filter(database.WorkloadItemDB.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully", "deleted_id": job_id}

@app.get("/jobs/filter/")
def filter_jobs(job_type: str, db: Session = Depends(get_db)):
    rows = db.query(database.WorkloadItemDB).filter(database.WorkloadItemDB.job_type == job_type).all()
    return [
        {
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
        }
        for r in rows
    ]