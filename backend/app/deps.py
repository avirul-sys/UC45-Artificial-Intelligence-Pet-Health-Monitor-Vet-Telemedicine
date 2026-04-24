from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt

from app.database import get_db
from app.models import User, Config
from app.config import settings

security = HTTPBearer()

DEFAULT_CONFIG = {
    "confidence_threshold": "0.6",
    "rate_limit_per_hour": "10",
    "gpt4o_timeout_seconds": "4.0",
    "circuit_breaker_reset_seconds": "30",
    "prompt_version_id": "PROMPT_V1",
}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user


async def get_config(db: AsyncSession) -> dict:
    result = await db.execute(select(Config))
    rows = result.scalars().all()
    config = dict(DEFAULT_CONFIG)
    for row in rows:
        config[row.key] = row.value
    return config
