import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import VetSession, User
from app.deps import get_current_user

router = APIRouter()


class InitiateCallRequest(BaseModel):
    pet_id: str
    triage_id: Optional[str] = None


class RateCallRequest(BaseModel):
    rating: int
    call_note: Optional[str] = None


@router.post("/calls/initiate", status_code=201)
async def initiate_call(
    body: InitiateCallRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    peer_id = f"uc45-{user.id[:8]}-{secrets.token_hex(6)}"
    signalling_token = secrets.token_urlsafe(32)

    session = VetSession(
        pet_owner_id=user.id,
        triage_id=body.triage_id,
        peer_id=peer_id,
        signalling_token=signalling_token,
        status="initiated",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "call_id": session.id,
        "peer_id": peer_id,
        "signalling_token": signalling_token,
        "status": session.status,
    }


@router.put("/calls/{call_id}/end")
async def end_call(
    call_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(VetSession).where(VetSession.id == call_id, VetSession.pet_owner_id == user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

    session.ended_at = datetime.utcnow()
    session.status = "ended"
    await db.commit()
    return {"message": "Call ended"}


@router.put("/calls/{call_id}/rate")
async def rate_call(
    call_id: str,
    body: RateCallRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not 1 <= body.rating <= 5:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Rating must be between 1 and 5")

    result = await db.execute(
        select(VetSession).where(VetSession.id == call_id, VetSession.pet_owner_id == user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")

    session.rating = body.rating
    session.call_note = body.call_note
    await db.commit()
    return {"message": "Rating saved"}
