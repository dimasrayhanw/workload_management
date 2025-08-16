# database.py
import os
from sqlalchemy import create_engine, Column, Integer, String, Text, Float
from sqlalchemy.orm import sessionmaker, declarative_base

# 1) Read DATABASE_URL (Render env) or fallback to local SQLite
raw_url = os.getenv("DATABASE_URL", "sqlite:///./workload.db")

# 2) Normalize postgres scheme for SQLAlchemy
#    (Render/Neon may give 'postgres://'; SQLAlchemy wants 'postgresql+psycopg2://')
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
elif raw_url.startswith("postgresql://") and "+psycopg2" not in raw_url:
    raw_url = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)

is_sqlite = raw_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {
    # psycopg2 args:
    "connect_timeout": 5,              # seconds
    "options": "-c statement_timeout=5000",  # 5s query timeout
}

# 3) Ensure SSL for hosted Postgres if not already present
if raw_url.startswith("postgresql+psycopg2://") and "sslmode=" not in raw_url:
    sep = "&" if "?" in raw_url else "?"
    raw_url = f"{raw_url}{sep}sslmode=require"

DATABASE_URL = raw_url

# 4) SQLite needs a special connect arg; Postgres does not
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    future=True,
    pool_pre_ping=True,
    echo=False,
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
    estimated_duration = Column(Float, nullable=True)  # hours
    unit = Column(String, nullable=True)
    start_date = Column(String, nullable=True)  # ISO date string
    due_date = Column(String, nullable=True)    # ISO date string
    status = Column(String, nullable=True, index=True, default="Open")