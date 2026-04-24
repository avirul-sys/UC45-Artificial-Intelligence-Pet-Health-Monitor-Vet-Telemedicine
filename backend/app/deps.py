from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from jose import JWTError, jwt

from app.database import get_db
from app.models import User, Config, Pet, TriageEvent
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


async def check_triage_rate_limit(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    config = await get_config(db)
    limit = int(config.get("rate_limit_per_hour", "10"))
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    pets_result = await db.execute(select(Pet.id).where(Pet.user_id == user.id))
    pet_ids = [r[0] for r in pets_result.fetchall()]
    if pet_ids:
        count = await db.scalar(
            select(func.count(TriageEvent.id)).where(
                TriageEvent.pet_id.in_(pet_ids),
                TriageEvent.created_at >= one_hour_ago,
            )
        )
        if (count or 0) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {limit} triage requests per hour.",
                headers={"Retry-After": "3600"},
            )
