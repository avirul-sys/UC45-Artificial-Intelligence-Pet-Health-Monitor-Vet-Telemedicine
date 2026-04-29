import json
from typing import Optional
from app.ai.openai_client import call_openai, CircuitBreakerOpen
from app.ai.prompts import get_prompt


def _compute_confidence(m1: dict, m2: dict, m3: dict) -> tuple[float, bool]:
    """
    Weighted confidence per FRS §5.2.3 Module 4 logic.
    Returns (combined_confidence, capped_due_to_error).
    """
    s_conf = m1.get("confidence", 0.0) or 0.0
    i_conf = m2.get("confidence")            # None = no image
    b_conf = float(m3.get("confidence", 0.0)) if m3 else None

    errored = s_conf == 0.0 or (i_conf is not None and i_conf == 0.0)

    if i_conf is not None:
        # Image was submitted — weights 0.4/0.4/0.2
        weights = {"s": 0.4, "i": 0.4, "b": 0.2}
        values = {"s": s_conf, "i": i_conf, "b": b_conf if b_conf is not None else 0.0}
        # Exclude errored modules (conf == 0.0), redistribute
        active = {k: v for k, v in values.items() if v > 0.0}
        if not active:
            return 0.0, True
        total_weight = sum(weights[k] for k in active)
        combined = sum(values[k] * weights[k] for k in active) / total_weight
    else:
        # No image — weights 0.7/0.3
        if s_conf == 0.0 and b_conf is None:
            return 0.0, True
        if s_conf > 0.0 and b_conf is not None:
            combined = 0.7 * s_conf + 0.3 * b_conf
        elif s_conf > 0.0:
            combined = s_conf
        else:
            combined = 0.0

    if errored:
        combined = min(combined, 0.7)

    return round(combined, 4), errored


async def run_urgency_module(
    m1: dict,
    m2: dict,
    m3: dict,
    prompt_version: str = "PROMPT_V1",
    timeout: float = 4.0,
) -> dict:
    combined_confidence, capped = _compute_confidence(m1, m2, m3)

    system_prompt = get_prompt(prompt_version, "urgency")
    user_message = json.dumps({
        "symptom_analysis": m1,
        "image_analysis": m2,
        "breed_risk": m3,
        "combined_confidence": combined_confidence,
    })

    try:
        data = await call_openai("urgency", system_prompt, user_message, timeout=timeout)
    except CircuitBreakerOpen:
        return {
            "urgency_tier": "UNDETERMINED",
            "combined_confidence": combined_confidence,
            "explanation": "Service temporarily unavailable. Please try again.",
        }

    if not data:
        tier = _fallback_tier(m1, m2, m3)
        return {
            "urgency_tier": tier,
            "combined_confidence": combined_confidence,
            "explanation": "Analysis completed using available data.",
        }

    return {
        "urgency_tier": str(data.get("urgency_tier", "MONITOR")).upper(),
        "combined_confidence": combined_confidence,
        "explanation": str(data.get("explanation", ""))[:400],
    }


def _fallback_tier(m1, m2, m3) -> str:
    """Simple keyword-based fallback when GPT is unavailable."""
    emergency_words = {"collapse", "seizure", "unconscious", "can't breathe", "bleeding heavily", "poison"}
    urgent_words = {"limping", "vomiting", "diarrhea", "swollen", "crying", "painful"}
    category = (m1.get("condition_category") or "").lower()
    label = (m2.get("condition_label") or "").lower()
    combined = f"{category} {label}"
    if any(w in combined for w in emergency_words):
        return "EMERGENCY"
    if any(w in combined for w in urgent_words):
        return "URGENT"
    return "MONITOR"
