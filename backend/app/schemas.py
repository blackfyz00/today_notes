# backend/app/schemas.py

from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List, Literal

class UserCreate(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    created_at: datetime

    class Config:
        from_attributes = True  # для SQLAlchemy 2.0+

class NoteCreate(BaseModel):
    title: Optional[str] = None
    content: str
    in_day: Optional[date] = None 

class NoteUpdate(NoteCreate):
    pass

class NoteOut(BaseModel):
    id: int
    user_id: int
    title: Optional[str]
    content: str
    created_at: datetime
    updated_at: datetime
    in_day: date 

    class Config:
        from_attributes = True

class AttachmentCreate(BaseModel):
    type: Literal["image", "audio"]
    minio_path: str
    size: int

class AttachmentOut(BaseModel):
    id: int
    note_id: int
    type: str
    minio_path: str
    size: int
    created_at: datetime

    class Config:
        from_attributes = True