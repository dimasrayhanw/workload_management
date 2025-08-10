# database.py
from sqlalchemy import create_engine, Column, Integer, String, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./workload.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class WorkloadItemDB(Base):
    __tablename__ = "workload_items"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=True, index=True)
    job_type = Column(String, index=True)
    task_name = Column(String, index=True)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, default=1)
    estimated_duration = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    start_date = Column(String, nullable=True)  # store ISO date string
    due_date = Column(String, nullable=True)    # store ISO date string