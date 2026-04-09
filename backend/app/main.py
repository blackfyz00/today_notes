from datetime import datetime, timedelta, timezone, date
from fastapi import FastAPI, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from passlib.context import CryptContext
from jose import jwt
from fastapi.middleware.cors import CORSMiddleware
from . import models, schemas, database
import os
from dotenv import load_dotenv
from .auth import get_current_user

app = FastAPI(title="Notes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-very-secret-string")
ALGORITHM = "HS256"

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=540)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.on_event("startup")
async def startup():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/notes/", response_model=list[schemas.NoteOut])
async def get_notes(
    target_date: str = Query(None, alias="date"),
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = select(models.Note).where(models.Note.user_id == current_user.id)
    
    if target_date:
        try:
            # Парсим дату строго из строки формата YYYY-MM-DD
            filter_date = date.fromisoformat(target_date)
            query = query.where(models.Note.in_day == filter_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    result = await db.execute(query)
    notes = result.scalars().all()
    return notes

@app.get("/notes/stats")
async def get_notes_stats(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = (
        select(
            models.Note.in_day.label("day"),
            func.count(models.Note.id).label("count")
        )
        .where(models.Note.user_id == current_user.id)
        .group_by(models.Note.in_day)
    )
    
    result = await db.execute(query)
    stats = result.all()
    
    # Явно преобразуем date объекты в строки для JSON ответа
    return {row.day.isoformat(): row.count for row in stats}

@app.post("/notes/", response_model=schemas.NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    note: schemas.NoteCreate,
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user) 
):
    in_day_value = note.in_day
    
    # Если фронтенд не прислал дату, используем текущую дату UTC
    if in_day_value is None:
        in_day_value = date.today()
    elif isinstance(in_day_value, str):
        # Если пришла строка, конвертируем в объект date
        try:
            in_day_value = date.fromisoformat(in_day_value)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format for in_day.")

    db_note = models.Note(
        user_id=current_user.id,
        title=note.title,
        content=note.content,
        in_day=in_day_value
    )

    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)
    return db_note

@app.put("/notes/{note_id}", response_model=schemas.NoteOut)
async def update_note(
    note_id: int, 
    note_data: schemas.NoteCreate, 
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = select(models.Note).where(
        models.Note.id == note_id, 
        models.Note.user_id == current_user.id
    )
    result = await db.execute(query)
    db_note = result.scalar_one_or_none()
    
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    db_note.title = note_data.title
    db_note.content = note_data.content
    
    if note_data.in_day is not None:
        if isinstance(note_data.in_day, str):
            try:
                db_note.in_day = date.fromisoformat(note_data.in_day)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format.")
        else:
            db_note.in_day = note_data.in_day
            
    db_note.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    await db.refresh(db_note)
    return db_note

@app.post("/login")
async def login(
    user_data: schemas.UserCreate,
    db: AsyncSession = Depends(database.get_db)
):
    query = select(models.User).where(models.User.email == user_data.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.delete("/notes/{note_id}")
async def delete_note(
    note_id: int, 
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = select(models.Note).where(
        models.Note.id == note_id, 
        models.Note.user_id == current_user.id
    )
    result = await db.execute(query)
    db_note = result.scalar_one_or_none()
    
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    await db.delete(db_note)
    await db.commit()
    return {"status": "deleted"}