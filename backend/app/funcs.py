from sqlalchemy import text
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

async def get_current_user_id(db: AsyncSession):
    # ВРЕМЕННО: без авторизации — привяжем к первому пользователю
    result = await db.execute(text("SELECT id FROM users LIMIT 1"))
    user_id = result.scalar()
    if not user_id:
        raise HTTPException(status_code=400, detail="No users in DB. Please create a user first.")
    return user_id