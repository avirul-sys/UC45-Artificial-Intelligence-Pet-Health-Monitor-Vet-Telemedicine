from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import JWTError, jwt

from app.database import get_db
from app.models import User
from app.config import settings

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserRegister(BaseModel):
    name: str
    email: str
    phone: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


def _make_token(data: dict, expires: timedelta) -> str:
    payload = {**data, "exp": datetime.utcnow() + expires}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


@router.post("/register", status_code=201)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        phone=body.phone,
        password_hash=pwd_context.hash(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"user_id": user.id, "message": "Account created successfully"}


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    access = _make_token({"sub": user.id}, timedelta(minutes=settings.access_token_expire_minutes))
    refresh = _make_token({"sub": user.id, "type": "refresh"}, timedelta(days=settings.refresh_token_expire_days))
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        user={"id": user.id, "name": user.name, "email": user.email},
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(body.refresh_token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "refresh":
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not a refresh token")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    access = _make_token({"sub": user.id}, timedelta(minutes=settings.access_token_expire_minutes))
    new_refresh = _make_token({"sub": user.id, "type": "refresh"}, timedelta(days=settings.refresh_token_expire_days))
    return TokenResponse(
        access_token=access,
        refresh_token=new_refresh,
        user={"id": user.id, "name": user.name, "email": user.email},
    )


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    # Always return 200 to prevent email enumeration (FRS FR-05)
    return {"message": "If that email is registered, a reset link has been sent."}
