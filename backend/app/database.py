# backend/app/database.py

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# URL подключения (асинхронный!)
DB_PASS = os.getenv("POSTGRES_PASSWORD", "default_pass")
DATABASE_URL = f"postgresql+asyncpg://notes_user:{DB_PASS}@db:5432/notes_db"

# Асинхронный движок
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

# Фабрика сессий
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Dependency для FastAPI
async def get_db():
    async with async_session() as session:
        yield session