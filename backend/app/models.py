# backend/app/models.py

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, BIGINT, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class AttachmentType(enum.Enum):
    image = "image"
    audio = "audio"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(15), nullable=True) # Добавлено nullable=True для соответствия string | null
    
    # Поле in_day: используем Date для "дня к которому относится заметка"
    in_day = Column(Date, nullable=False, index=True) 
    
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
# Определяем Enum для использования в Python
class AttachmentType(enum.Enum):
    image = "image"
    audio = "audio"

class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=True)

    type = Column(
        Enum(AttachmentType, name='attachment_type'), 
        nullable=False
    )
    
    minio_path = Column(Text, nullable=False)
    size = Column(BIGINT, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())