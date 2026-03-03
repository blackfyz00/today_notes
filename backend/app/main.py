<<<<<<< Updated upstream
# backend/app/main.py

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware  
=======
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Query
>>>>>>> Stashed changes
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func  # Добавлен func
from passlib.context import CryptContext
from jose import jwt
from fastapi.middleware.cors import CORSMiddleware
from . import models, schemas, database
<<<<<<< Updated upstream
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
=======
import os
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from .auth import get_current_user 

load_dotenv(dotenv_path = "../.env")

origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

app = FastAPI(title="Notes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # Разрешает запросы с этих адресов
    allow_credentials=True,           # Разрешает передачу куки и заголовков авторизации
    allow_methods=["*"],              # Разрешает все методы (GET, POST, OPTIONS и т.д.)
    allow_headers=["*"],              # Разрешает любые заголовки (Content-Type, Authorization)
)

# Контекст для хэширования
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-very-secret-string")
ALGORITHM = "HS256"

# Утилиты
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

>>>>>>> Stashed changes
@app.on_event("startup")
async def startup():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

@app.get("/health")
async def health():
    return {"status": "ok"}

<<<<<<< Updated upstream
@app.get("/api/notes/", response_model=list[schemas.NoteOut])
=======
# для дня
@app.get("/notes/", response_model=list[schemas.NoteOut])
>>>>>>> Stashed changes
async def get_notes(
    target_date: str = Query(None, alias="date"),
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
<<<<<<< Updated upstream
    # 1. Получаем ID текущего пользователя
    user_id = await get_current_user_id(db)
    
    # 2. Начинаем запрос с фильтра по user_id
    query = select(models.Note).where(models.Note.user_id == user_id)

    # 3. Добавляем опциональную фильтрацию по дате
=======
    # Добавляем фильтр по владельцу заметки
    query = select(models.Note).where(models.Note.user_id == current_user.id)
    
>>>>>>> Stashed changes
    if target_date:
        try:
            filter_date = datetime.strptime(target_date, "%Y-%m-%d").date()
            query = query.where(func.date(models.Note.created_at) == filter_date)
        except ValueError:
<<<<<<< Updated upstream
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        
        query = query.where(func.date(models.Note.created_at) == filter_date)

    # 4. (Опционально) Сортировка: новые заметки сверху
    query = query.order_by(models.Note.created_at.desc())

    result = await db.execute(query)
    notes = result.scalars().all()
    return notes  # Теперь только заметки текущего пользователя
=======
            raise HTTPException(status_code=400, detail="Invalid date format.")

    result = await db.execute(query)
    return result.scalars().all()

# для месяца
@app.get("/notes/stats")
async def get_notes_stats(
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user) # Обязательно фильтруем по юзеру!
):
    query = (
        select(
            func.date(models.Note.created_at).label("day"),
            func.count(models.Note.id).label("count")
        )
        .where(models.Note.user_id == current_user.id)
        .group_by(func.date(models.Note.created_at))
    )
    
    result = await db.execute(query)
    stats = result.all()
    
    # Превращаем в удобный формат: {"2023-10-25": 3, "2023-10-26": 1}
    return {str(row.day): row.count for row in stats}
>>>>>>> Stashed changes

@app.post("/api/notes/", response_model=schemas.NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    note: schemas.NoteCreate,
    db: AsyncSession = Depends(database.get_db)
):
<<<<<<< Updated upstream
    user_id = await get_current_user_id(db)

    db_note = models.Note(
        user_id=user_id,
        title=note.title, # Убедитесь, что title есть в схеме NoteCreate
        content=note.content
    )
=======
    # Исправлен запрос на асинхронный и использование select
    user_query = await db.execute(select(models.User.id).limit(1))
    user_id = user_query.scalar()
    
    if not user_id:
        raise HTTPException(status_code=400, detail="No users in DB")

    db_note = models.Note(user_id=user_id, **note.model_dump())

>>>>>>> Stashed changes
    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)
    return db_note

<<<<<<< Updated upstream
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
=======
@app.post("/login")
async def login(
    user_data: schemas.UserCreate, # Используем схему из schemas
    db: AsyncSession = Depends(database.get_db) # Переключено на Async
):
    # Исправлено на асинхронный запрос
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
>>>>>>> Stashed changes
