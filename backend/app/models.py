import uuid
import hashlib
import json
from datetime import datetime
from sqlalchemy import (
    String, Boolean, Float, Integer, DateTime, Text, ForeignKey,
    Enum as SAEnum, ARRAY, JSON, event,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def _new_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(String(128))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    pets: Mapped[list["Pet"]] = relationship("Pet", back_populates="owner")


class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    species: Mapped[str] = mapped_column(String(20))
    breed: Mapped[str] = mapped_column(String(100))
    age_months: Mapped[int] = mapped_column(Integer, default=0)
    weight_kg: Mapped[float] = mapped_column(Float, default=0.0)
    conditions: Mapped[list] = mapped_column(ARRAY(Text), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="pets")
    triage_events: Mapped[list["TriageEvent"]] = relationship("TriageEvent", back_populates="pet")


class TriageEvent(Base):
    __tablename__ = "triage_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    pet_id: Mapped[str] = mapped_column(String(36), ForeignKey("pets.id"), index=True)
    urgency_tier: Mapped[str] = mapped_column(String(20))
    confidence_score: Mapped[float] = mapped_column(Float)
    fallback_triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    explanation: Mapped[str] = mapped_column(Text, default="")
    breed_risk_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    module_outputs: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="triage_events")
    audit_entry: Mapped["AuditLog"] = relationship("AuditLog", back_populates="triage_event", uselist=False)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    triage_id: Mapped[str] = mapped_column(String(36), ForeignKey("triage_events.id"))
    event_type: Mapped[str] = mapped_column(String(40), default="triage")
    input_hash: Mapped[str] = mapped_column(String(64))
    output_hash: Mapped[str] = mapped_column(String(64))
    model_version: Mapped[str] = mapped_column(String(20), default="gpt-4o")
    prompt_version_id: Mapped[str] = mapped_column(String(20), default="PROMPT_V1")
    confidence_score: Mapped[float] = mapped_column(Float)
    urgency_tier: Mapped[str] = mapped_column(String(20))
    fallback_triggered: Mapped[bool] = mapped_column(Boolean)
    row_checksum: Mapped[str] = mapped_column(String(64))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    triage_event: Mapped["TriageEvent"] = relationship("TriageEvent", back_populates="audit_entry")

    @staticmethod
    def compute_checksum(triage_id, input_hash, output_hash, model_version,
                         prompt_version_id, confidence_score, urgency_tier,
                         fallback_triggered, timestamp) -> str:
        raw = f"{triage_id}{input_hash}{output_hash}{model_version}{prompt_version_id}{confidence_score}{urgency_tier}{fallback_triggered}{timestamp}"
        return hashlib.sha256(raw.encode()).hexdigest()


class Config(Base):
    __tablename__ = "config"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class ConfigChangeHistory(Base):
    __tablename__ = "config_change_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(60), index=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str] = mapped_column(Text)
    changed_by: Mapped[str | None] = mapped_column(String(254), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class VetSession(Base):
    __tablename__ = "vet_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    pet_owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    vet_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    triage_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("triage_events.id"), nullable=True)
    peer_id: Mapped[str] = mapped_column(String(120))
    signalling_token: Mapped[str] = mapped_column(String(255))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="initiated")
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    call_note: Mapped[str | None] = mapped_column(Text, nullable=True)
