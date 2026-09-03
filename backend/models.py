from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import json

from config import settings

Base = declarative_base()

# ============================================
# データベースモデル
# ============================================
class Flashcard(Base):
    __tablename__ = "flashcards"
    id = Column(Integer, primary_key=True, autoincrement=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    source_image = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    tags = Column(String, default="[]")
    is_mastered = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "question": self.question, "answer": self.answer,
            "source_image": self.source_image, "subject": self.subject,
            "tags": json.loads(self.tags) if isinstance(self.tags, str) else self.tags,
            "is_mastered": self.is_mastered, "created_at": self.created_at.isoformat() if self.created_at else None
        }

class MistakeRecord(Base):
    __tablename__ = "mistake_records"
    id = Column(Integer, primary_key=True, autoincrement=True)
    question = Column(Text, nullable=False)
    user_answer = Column(Text, nullable=True)
    correct_answer = Column(Text, nullable=True)
    category = Column(String, nullable=False)
    tags = Column(String, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id, "question": self.question, "user_answer": self.user_answer,
            "correct_answer": self.correct_answer, "category": self.category,
            "tags": json.loads(self.tags) if isinstance(self.tags, str) else self.tags,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class ScheduleTask(Base):
    __tablename__ = "schedule_tasks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    subject = Column(String, nullable=False)
    task = Column(Text, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    priority = Column(Integer, default=1)
    status = Column(String, default="pending")
    tags = Column(String, default="[]")

    def to_dict(self):
        return {
            "id": self.id, "subject": self.subject, "task": self.task,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "priority": self.priority, "status": self.status,
            "tags": json.loads(self.tags) if isinstance(self.tags, str) else self.tags
        }

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String, nullable=False)
    type = Column(String, default="learning")
    deadline = Column(DateTime, nullable=True)
    needs_parent_signature = Column(Boolean, default=False)
    needs_payment = Column(Boolean, default=False)
    payment_amount = Column(Float, nullable=True)
    reminder_sent = Column(Boolean, default=False)
    image_path = Column(String, nullable=True)

    def to_dict(self):
        return {
            "id": self.id, "title": self.title, "type": self.type,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "needs_parent_signature": self.needs_parent_signature,
            "needs_payment": self.needs_payment, "payment_amount": self.payment_amount,
            "reminder_sent": self.reminder_sent, "image_path": self.image_path
        }

class ErrorLog(Base):
    __tablename__ = "error_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    error_type = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    stack_trace = Column(Text, nullable=True)
    self_repaired = Column(Boolean, default=False)
    repair_action = Column(Text, nullable=True)


# ============================================
# Pydanticスキーマ
# ============================================
class ChatMessage(BaseModel):
    content: str
    mode: str = "super_agent"
    image_data: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    steps: List[Dict[str, Any]] = []
    mode: str = "super_agent"

class FlashcardCreate(BaseModel):
    question: str
    answer: str
    source_image: Optional[str] = None
    subject: Optional[str] = None
    tags: List[str] = []

class FlashcardResponse(BaseModel):
    id: int
    question: str
    answer: str
    source_image: Optional[str] = None
    subject: Optional[str] = None
    tags: List[str] = []
    is_mastered: bool = False

    class Config:
        from_attributes = True

class MistakeRecordSchema(BaseModel):
    id: int
    question: str
    user_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    category: str

    class Config:
        from_attributes = True

class SubmissionSchema(BaseModel):
    id: int
    title: str
    type: str = "learning"
    deadline: Optional[str] = None

    class Config:
        from_attributes = True

class SystemStatus(BaseModel):
    status: str = "running"
    uptime_seconds: float = 0
    error_count: int = 0
    self_repairs_performed: int = 0
    last_diagnosis: Optional[Dict[str, Any]] = None

class SystemModification(BaseModel):
    target: str
    mod_type: str
    code: str
    desc: str

class ErrorLogSchema(BaseModel):
    timestamp: str
    error_type: str
    message: str
    self_repaired: bool = False


# ============================================
# データベース初期化
# ============================================
engine = create_engine(settings.DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
