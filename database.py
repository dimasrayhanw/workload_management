# database.py
import os
from sqlalchemy import create_engine, Column, Integer, String, Text, Float
from sqlalchemy.orm import sessionmaker, declarative_base

# Read from env if present (Render/production), otherwise default to local SQLite
RAW_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./workload.db")

# Render/Neon sometimes gives "postgres://" – SQLAlchemy expects "postgresql+psycopg2://"
if RAW_DATABASE_URL.startswith("postgres://"):
    RAW_DATABASE_URL = RAW_DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif RAW_DATABASE_URL.startswith("postgresql://") and "+psycopg2" not in RAW_DATABASE_URL:
    RAW_DATABASE_URL = RAW_DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

SQLALCHEMY_DATABASE_URL = RAW_DATABASE_URL

# SQLite needs a special connect arg; Postgres/others do not
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)
Base = declarative_base()


class WorkloadItemDB(Base):
    __tablename__ = "workload_items"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=True, index=True)
    job_type = Column(String, index=True)
    task_name = Column(String, index=True)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, default=1)
    estimated_duration = Column(Float, nullable=True)  # always stored in hours
    unit = Column(String, nullable=True)
    start_date = Column(String, nullable=True)  # ISO date string
    due_date = Column(String, nullable=True)    # ISO date string
    status = Column(String, nullable=True, index=True, default="Open")  # NEW