# backend/app/main.py

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware  
from sqlalchemy.ext.asyncio import AsyncSession
from . import models, schemas, database
from .database import engine
from sqlalchemy import select, func, text
from datetime import datetime
from .funcs import get_current_user_id


app = FastAPI(title="Notes API")

# ← Добавьте этот блок после создания app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Если используете другой порт
        "capacitor://localhost",  # Для Capacitor в продакшене
        "http://localhost",       # Для локальной разработки
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Разрешить все методы: GET, POST, PUT, DELETE, OPTIONS
    allow_headers=["*"],  # Разрешить все заголовки
)

# Создаём таблицы (только для dev! В продакшене — Alembic)
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/api/notes/", response_model=list[schemas.NoteOut])
async def get_notes(
    db: AsyncSession = Depends(database.get_db),
    target_date: str = Query(None, alias="date", description="Фильтр по дате в формате YYYY-MM-DD")
):
    # 1. Получаем ID текущего пользователя
    user_id = await get_current_user_id(db)
    
    # 2. Начинаем запрос с фильтра по user_id
    query = select(models.Note).where(models.Note.user_id == user_id)

    # 3. Добавляем опциональную фильтрацию по дате
    if target_date:
        try:
            filter_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        
        query = query.where(func.date(models.Note.created_at) == filter_date)

    # 4. (Опционально) Сортировка: новые заметки сверху
    query = query.order_by(models.Note.created_at.desc())

    result = await db.execute(query)
    notes = result.scalars().all()
    return notes  # Теперь только заметки текущего пользователя

@app.post("/api/notes/", response_model=schemas.NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    note: schemas.NoteCreate,
    db: AsyncSession = Depends(database.get_db)
):
    user_id = await get_current_user_id(db)

    db_note = models.Note(
        user_id=user_id,
        title=note.title, # Убедитесь, что title есть в схеме NoteCreate
        content=note.content
    )
    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)
    return db_note

# --- UPDATE NOTE (НОВОЕ) ---
@app.put("/api/notes/{note_id}", response_model=schemas.NoteOut)
async def update_note(
    note_id: int,
    note_data: schemas.NoteUpdate, # Нужна новая схема с optional полями
    db: AsyncSession = Depends(database.get_db)
):
    user_id = await get_current_user_id(db)
    
    # Ищем заметку
    result = await db.execute(select(models.Note).where(models.Note.id == note_id))
    db_note = result.scalar_one_or_none()
    
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Проверка прав (владелец ли?)
    if db_note.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # Обновляем поля
    if note_data.title is not None:
        db_note.title = note_data.title
    if note_data.content is not None:
        db_note.content = note_data.content
        
    # Можно обновить updated_at, если есть такая колонка в модели
    # db_note.updated_at = datetime.now() 

    await db.commit()
    await db.refresh(db_note)
    return db_note

# --- DELETE NOTE (Опционально, если еще нет) ---
@app.delete("/api/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(database.get_db)
):
    user_id = await get_current_user_id(db)
    
    result = await db.execute(select(models.Note).where(models.Note.id == note_id))
    db_note = result.scalar_one_or_none()
    
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    if db_note.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    await db.delete(db_note)
    await db.commit()
    return None