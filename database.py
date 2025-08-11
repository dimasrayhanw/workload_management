# backend/database.py
from sqlalchemy import create_engine, Column, Integer, String, Text, Float
from sqlalchemy.orm import declarative_base, sessionmaker

import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./workload.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class WorkloadItemDB(Base):
    __tablename__ = "workload_items"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=True, index=True)
    job_type = Column(String, index=True)               # "Dev" | "Non Dev" | "DX"
    task_name = Column(String, index=True)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, default=1)
    estimated_duration = Column(Float, nullable=True)   # stored in hours
    unit = Column(String, nullable=True)                # unit for quantity (e.g., item, set, tv, week)
    start_date = Column(String, nullable=True)          # ISO date string
    due_date = Column(String, nullable=True)            # ISO date string
    status = Column(String, nullable=True, default="Open")