# backend/app/main.py

from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from . import models, schemas, database
from .database import engine

app = FastAPI(title="Notes API")

# Создаём таблицы (только для dev! В продакшене — Alembic)
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

@app.get("/health")
async def health():
    return {"status": "ok"}

from fastapi import Query
from datetime import datetime

@app.get("/notes/", response_model=list[schemas.NoteOut])
async def get_notes(
    db: AsyncSession = Depends(database.get_db),
    target_date: str = Query(None, alias="date", description="Фильтр по дате в формате YYYY-MM-DD")
):
    from sqlalchemy import select

    query = select(models.Note)

    if target_date:
        try:
            filter_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        
        query = query.where(
            func.date(models.Note.created_at) == filter_date
        )

    result = await db.execute(query)
    notes = result.scalars().all()
    return notes

@app.post("/notes/", response_model=schemas.NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    note: schemas.NoteCreate,
    db: AsyncSession = Depends(database.get_db)
):
    # ВРЕМЕННО: без авторизации — привяжем к первому пользователю
    result = await db.execute("SELECT id FROM users LIMIT 1")
    user_id = result.scalar()
    if not user_id:
        raise HTTPException(status_code=400, detail="No users in DB")

    db_note = models.Note(
        user_id=user_id,
        title=note.title,
        content=note.content
    )
    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)
    return db_note