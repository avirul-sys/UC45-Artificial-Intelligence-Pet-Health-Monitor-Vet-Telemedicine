import asyncio
import hashlib
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Pet, TriageEvent, AuditLog, User
from app.deps import get_current_user, get_config, check_triage_rate_limit
from app.ai.symptom import run_symptom_module
from app.ai.image import run_image_module
from app.ai.breed import run_breed_module
from app.ai.urgency import run_urgency_module

router = APIRouter()

ALLOWED_IMAGE_MIME = {"image/jpeg", "image/png"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


class TriageResponse(BaseModel):
    triage_id: str
    urgency_tier: str
    confidence_score: float
    explanation: str
    breed_risk_note: Optional[str]
    fallback_triggered: bool
    module_outputs: dict
    timestamp: str


@router.post("/triage", response_model=TriageResponse)
async def submit_triage(
    pet_id: str = Form(...),
    description: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    _: None = Depends(check_triage_rate_limit),
):
    # Validate description length
    if len(description) < 20:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Description must be at least 20 characters")
    if len(description) > 500:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Description must not exceed 500 characters")

    # Validate pet ownership
    result = await db.execute(select(Pet).where(Pet.id == pet_id, Pet.user_id == user.id))
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Pet not found or not owned by you")

    # Validate and read image
    image_bytes: Optional[bytes] = None
    if image:
        if image.content_type not in ALLOWED_IMAGE_MIME:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Image must be JPEG or PNG")
        image_bytes = await image.read()
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Image exceeds 5 MB limit")

    # Load runtime config
    config = await get_config(db)
    confidence_threshold = float(config.get("confidence_threshold", 0.6))
    timeout = float(config.get("gpt4o_timeout_seconds", 4.0))
    prompt_version = str(config.get("prompt_version_id", "PROMPT_V1"))

    # Run Modules 1, 2, 3 in parallel
    m1, m2, m3 = await asyncio.gather(
        run_symptom_module(description, prompt_version, timeout),
        run_image_module(description, image_bytes, prompt_version, timeout),
        run_breed_module(pet.breed),
    )

    # Module 4 — depends on m1/m2/m3
    m4 = await run_urgency_module(m1, m2, m3, prompt_version, timeout)

    combined_confidence = m4["combined_confidence"]
    fallback = combined_confidence < confidence_threshold

    # Persist triage event
    event = TriageEvent(
        pet_id=pet.id,
        urgency_tier="UNDETERMINED" if fallback else m4["urgency_tier"],
        confidence_score=combined_confidence,
        fallback_triggered=fallback,
        explanation=m4["explanation"],
        breed_risk_note=m3.get("breed_note"),
        module_outputs={"symptom": m1, "image": m2, "breed": m3, "urgency": m4},
    )
    db.add(event)
    await db.flush()  # get event.id before audit log

    # Write audit log (append-only enforced by DB trigger)
    ts = event.created_at or datetime.utcnow()
    input_hash = hashlib.sha256((pet_id + description).encode()).hexdigest()
    output_payload = json.dumps({
        "urgency_tier": event.urgency_tier,
        "confidence_score": combined_confidence,
        "fallback_triggered": fallback,
    }, sort_keys=True)
    output_hash = hashlib.sha256(output_payload.encode()).hexdigest()
    checksum = AuditLog.compute_checksum(
        event.id, input_hash, output_hash, "gpt-4o", prompt_version,
        combined_confidence, event.urgency_tier, fallback, ts.isoformat()
    )
    audit = AuditLog(
        triage_id=event.id,
        input_hash=input_hash,
        output_hash=output_hash,
        model_version="gpt-4o",
        prompt_version_id=prompt_version,
        confidence_score=combined_confidence,
        urgency_tier=event.urgency_tier,
        fallback_triggered=fallback,
        row_checksum=checksum,
        timestamp=ts,
    )
    db.add(audit)
    await db.commit()

    return TriageResponse(
        triage_id=event.id,
        urgency_tier=event.urgency_tier,
        confidence_score=combined_confidence,
        explanation=event.explanation,
        breed_risk_note=event.breed_risk_note,
        fallback_triggered=fallback,
        module_outputs=event.module_outputs,
        timestamp=ts.isoformat(),
    )


@router.get("/triage/history")
async def triage_history(
    page: int = 1,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    page_size = 20
    offset = (page - 1) * page_size

    # Get all pets owned by user
    pets_result = await db.execute(select(Pet.id).where(Pet.user_id == user.id))
    pet_ids = [r[0] for r in pets_result.fetchall()]
    if not pet_ids:
        return {"items": [], "page": page, "total": 0}

    result = await db.execute(
        select(TriageEvent, Pet.name.label("pet_name"))
        .join(Pet, TriageEvent.pet_id == Pet.id)
        .where(TriageEvent.pet_id.in_(pet_ids))
        .order_by(TriageEvent.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    rows = result.fetchall()
    items = []
    for event, pet_name in rows:
        items.append({
            "triage_id": event.id,
            "pet_name": pet_name,
            "urgency_tier": event.urgency_tier,
            "confidence_score": event.confidence_score,
            "fallback_triggered": event.fallback_triggered,
            "created_at": event.created_at.isoformat(),
        })
    return {"items": items, "page": page}


@router.get("/triage/{triage_id}", response_model=TriageResponse)
async def get_triage(
    triage_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TriageEvent)
        .join(Pet, TriageEvent.pet_id == Pet.id)
        .where(TriageEvent.id == triage_id, Pet.user_id == user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Triage result not found")

    return TriageResponse(
        triage_id=event.id,
        urgency_tier=event.urgency_tier,
        confidence_score=event.confidence_score,
        explanation=event.explanation,
        breed_risk_note=event.breed_risk_note,
        fallback_triggered=event.fallback_triggered,
        module_outputs=event.module_outputs,
        timestamp=event.created_at.isoformat(),
    )
