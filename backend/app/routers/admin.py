import csv
import io
from datetime import datetime, date, timedelta, time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.database import get_db
from app.models import AuditLog, Config, ConfigChangeHistory, TriageEvent, VetSession, User
from app.deps import get_admin_user

router = APIRouter()

ALLOWED_CONFIG_KEYS = {
    "confidence_threshold",
    "rate_limit_per_hour",
    "gpt4o_timeout_seconds",
    "circuit_breaker_reset_seconds",
    "prompt_version_id",
}


class ConfigUpdate(BaseModel):
    key: str
    value: str


# ─── Metrics ────────────────────────────────────────────────────────────────

@router.get("/metrics")
async def get_metrics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    triage_today = await db.scalar(
        select(func.count(TriageEvent.id)).where(TriageEvent.created_at >= today_start)
    )
    avg_conf = await db.scalar(
        select(func.avg(TriageEvent.confidence_score)).where(TriageEvent.created_at >= today_start)
    )
    fallback_count = await db.scalar(
        select(func.count(TriageEvent.id)).where(
            TriageEvent.created_at >= today_start,
            TriageEvent.fallback_triggered == True,
        )
    )
    active_sessions = await db.scalar(
        select(func.count(VetSession.id)).where(VetSession.status == "initiated")
    )

    fallback_rate = (fallback_count / triage_today) if triage_today else 0.0

    # Error rate — fallback proportion over last 30 days
    total_30d = await db.scalar(
        select(func.count(TriageEvent.id)).where(TriageEvent.created_at >= thirty_days_ago)
    )
    fallback_30d = await db.scalar(
        select(func.count(TriageEvent.id)).where(
            TriageEvent.created_at >= thirty_days_ago,
            TriageEvent.fallback_triggered == True,
        )
    )
    error_rate = (fallback_30d / total_30d) if total_30d else 0.0

    # Urgency distribution — counts per tier for today
    urg_result = await db.execute(
        select(TriageEvent.urgency_tier, func.count(TriageEvent.id))
        .where(TriageEvent.created_at >= today_start)
        .group_by(TriageEvent.urgency_tier)
    )
    urgency_distribution = {tier: count for tier, count in urg_result.all()}

    # Confidence distribution — bucketed over last 30 days
    conf_result = await db.execute(
        select(TriageEvent.confidence_score).where(TriageEvent.created_at >= thirty_days_ago)
    )
    scores = [r[0] for r in conf_result.all()]
    confidence_buckets = {"0-40": 0, "40-60": 0, "60-70": 0, "70-80": 0, "80-100": 0}
    for s in scores:
        pct = (s or 0) * 100
        if pct < 40:
            confidence_buckets["0-40"] += 1
        elif pct < 60:
            confidence_buckets["40-60"] += 1
        elif pct < 70:
            confidence_buckets["60-70"] += 1
        elif pct < 80:
            confidence_buckets["70-80"] += 1
        else:
            confidence_buckets["80-100"] += 1

    # Recent triage events — last 5
    recent_result = await db.execute(
        select(TriageEvent).order_by(TriageEvent.created_at.desc()).limit(5)
    )
    recent_triages = [
        {
            "id": r.id[:8],
            "urgency_tier": r.urgency_tier,
            "confidence_score": r.confidence_score,
            "fallback_triggered": r.fallback_triggered,
            "created_at": r.created_at.isoformat(),
        }
        for r in recent_result.scalars().all()
    ]

    return {
        "triage_requests_today": triage_today or 0,
        "avg_confidence": round(avg_conf or 0.0, 4),
        "fallback_rate": round(fallback_rate, 4),
        "error_rate": round(error_rate, 4),
        "active_sessions": active_sessions or 0,
        "urgency_distribution": urgency_distribution,
        "confidence_buckets": confidence_buckets,
        "recent_triages": recent_triages,
    }


# ─── Config ──────────────────────────────────────────────────────────────────

@router.put("/config")
async def update_config(
    body: ConfigUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    if body.key not in ALLOWED_CONFIG_KEYS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown config key: {body.key}")

    result = await db.execute(select(Config).where(Config.key == body.key))
    row = result.scalar_one_or_none()
    old_value = row.value if row else None

    if row:
        row.value = body.value
        row.updated_at = datetime.utcnow()
        row.updated_by = admin.id
    else:
        db.add(Config(key=body.key, value=body.value, updated_by=admin.id))

    # Record in change history (FRS §5.3.2)
    db.add(ConfigChangeHistory(
        key=body.key,
        old_value=old_value,
        new_value=body.value,
        changed_by=admin.email,
    ))

    await db.commit()
    return {"message": f"Config '{body.key}' updated to '{body.value}'"}


@router.get("/config")
async def get_config_values(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(Config))
    rows = result.scalars().all()
    return {r.key: r.value for r in rows}


@router.get("/config/history")
async def get_config_history(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(ConfigChangeHistory)
        .order_by(ConfigChangeHistory.changed_at.desc())
        .limit(10)
    )
    rows = result.scalars().all()
    return [
        {
            "key": r.key,
            "old_value": r.old_value,
            "new_value": r.new_value,
            "changed_by": r.changed_by,
            "changed_at": r.changed_at.isoformat(),
        }
        for r in rows
    ]


# ─── Audit Log ───────────────────────────────────────────────────────────────

def _build_audit_query(
    from_date: Optional[date],
    to_date: Optional[date],
    urgency_tiers: Optional[list[str]],
    fallback: Optional[bool],
    min_confidence: float,
    max_confidence: float,
):
    filters = []
    if from_date:
        filters.append(AuditLog.timestamp >= datetime.combine(from_date, datetime.min.time()))
    if to_date:
        filters.append(AuditLog.timestamp <= datetime.combine(to_date, time.max))
    if urgency_tiers:
        filters.append(AuditLog.urgency_tier.in_(urgency_tiers))
    if fallback is not None:
        filters.append(AuditLog.fallback_triggered == fallback)
    filters.append(AuditLog.confidence_score >= min_confidence)
    filters.append(AuditLog.confidence_score <= max_confidence)
    return and_(*filters) if filters else True


@router.get("/audit-log")
async def get_audit_log(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    urgency_tier: Optional[list[str]] = Query(None),
    fallback: Optional[bool] = Query(None),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    max_confidence: float = Query(1.0, ge=0.0, le=1.0),
    page: int = Query(1, ge=1),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    page_size = 20
    filters = _build_audit_query(from_date, to_date, urgency_tier, fallback, min_confidence, max_confidence)

    total = await db.scalar(select(func.count(AuditLog.id)).where(filters))
    result = await db.execute(
        select(AuditLog)
        .where(filters)
        .order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "items": [
            {
                "triage_id": r.triage_id,
                "event_type": r.event_type,
                "input_hash": r.input_hash,
                "output_hash": r.output_hash,
                "model_version": r.model_version,
                "prompt_version_id": r.prompt_version_id,
                "confidence_score": r.confidence_score,
                "urgency_tier": r.urgency_tier,
                "fallback_triggered": r.fallback_triggered,
                "row_checksum": r.row_checksum,
                "prev_checksum": r.prev_checksum,
                "timestamp": r.timestamp.isoformat(),
            }
            for r in rows
        ],
    }


@router.get("/audit-log/export")
async def export_audit_log(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    urgency_tier: Optional[list[str]] = Query(None),
    fallback: Optional[bool] = Query(None),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    max_confidence: float = Query(1.0, ge=0.0, le=1.0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    filters = _build_audit_query(from_date, to_date, urgency_tier, fallback, min_confidence, max_confidence)
    result = await db.execute(
        select(AuditLog).where(filters).order_by(AuditLog.timestamp.desc())
    )
    rows = result.scalars().all()

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "triage_id", "event_type", "input_hash", "output_hash",
            "model_version", "prompt_version_id", "confidence_score",
            "urgency_tier", "fallback_triggered", "row_checksum", "prev_checksum", "timestamp",
        ])
        yield buf.getvalue()
        for r in rows:
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow([
                r.triage_id, r.event_type, r.input_hash, r.output_hash,
                r.model_version, r.prompt_version_id, r.confidence_score,
                r.urgency_tier, r.fallback_triggered,
                r.row_checksum, r.prev_checksum, r.timestamp.isoformat(),
            ])
            yield buf.getvalue()

    filename = f"audit_log_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ─── Audit Chain Verification ────────────────────────────────────────────────

@router.get("/audit/verify")
async def verify_audit_chain(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    from app.models import AuditLog as _AuditLog
    result = await db.execute(
        select(_AuditLog).order_by(_AuditLog.timestamp.asc())
    )
    rows = result.scalars().all()

    tampered = []
    expected_prev = ""
    for row in rows:
        expected = _AuditLog.compute_checksum(
            row.triage_id, row.input_hash, row.output_hash,
            row.model_version, row.prompt_version_id,
            row.confidence_score, row.urgency_tier,
            row.fallback_triggered, row.timestamp.isoformat(),
            row.prev_checksum or "",
        )
        if row.row_checksum != expected:
            tampered.append({"triage_id": row.triage_id, "timestamp": row.timestamp.isoformat()})
        expected_prev = row.row_checksum

    return {
        "total_checked": len(rows),
        "tampered_count": len(tampered),
        "tampered_entries": tampered,
        "chain_valid": len(tampered) == 0,
    }
