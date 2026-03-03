from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date
from passlib.context import CryptContext
from jose import jwt
from fastapi.middleware.cors import CORSMiddleware
from . import models, schemas, database
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

@app.on_event("startup")
async def startup():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

@app.get("/health")
async def health():
    return {"status": "ok"}

# для дня
@app.get("/notes/", response_model=list[schemas.NoteOut])
async def get_notes(
    target_date: str = Query(None, alias="date"),
    db: AsyncSession = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Добавляем фильтр по владельцу заметки
    query = select(models.Note).where(models.Note.user_id == current_user.id)
    
    if target_date:
        try:
            filter_date = datetime.strptime(target_date, "%Y-%m-%d").date()
            # Используем cast для явного преобразования в тип Date
            query = query.where(cast(models.Note.created_at, Date) == filter_date)
        except ValueError:
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

@app.post("/api/notes/", response_model=schemas.NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    note: schemas.NoteCreate,
    db: AsyncSession = Depends(database.get_db)
):
    # Исправлен запрос на асинхронный и использование select
    user_query = await db.execute(select(models.User.id).limit(1))
    user_id = user_query.scalar()
    
    if not user_id:
        raise HTTPException(status_code=400, detail="No users in DB")

    db_note = models.Note(user_id=user_id, **note.model_dump())

    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)
    return db_note

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
