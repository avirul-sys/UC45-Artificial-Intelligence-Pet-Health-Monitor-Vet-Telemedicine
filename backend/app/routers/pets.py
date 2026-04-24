from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Pet, User
from app.deps import get_current_user

router = APIRouter()


class PetCreate(BaseModel):
    name: str
    species: str
    breed: str
    age_months: int = 0
    weight_kg: float = 0.0
    conditions: List[str] = []


class PetResponse(BaseModel):
    id: str
    name: str
    species: str
    breed: str
    age_months: int
    weight_kg: float
    conditions: List[str]

    class Config:
        from_attributes = True


@router.get("/pets", response_model=List[PetResponse])
async def list_pets(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Pet).where(Pet.user_id == user.id))
    return result.scalars().all()


@router.post("/pets", status_code=201)
async def create_pet(
    body: PetCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pet = Pet(user_id=user.id, **body.model_dump())
    db.add(pet)
    await db.commit()
    await db.refresh(pet)
    return {"pet_id": pet.id}


@router.put("/pets/{pet_id}")
async def update_pet(
    pet_id: str,
    body: PetCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Pet).where(Pet.id == pet_id, Pet.user_id == user.id))
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Pet not found or not owned by you")

    for field, value in body.model_dump().items():
        setattr(pet, field, value)
    await db.commit()
    return {"message": "Pet updated"}
