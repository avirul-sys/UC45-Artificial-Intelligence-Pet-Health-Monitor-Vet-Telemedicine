import base64
from typing import Optional
from app.ai.openai_client import call_openai, CircuitBreakerOpen
from app.ai.prompts import get_prompt

NOT_ASSESSED = {"condition_label": "not_assessed", "confidence": None, "area_description": None}


async def run_image_module(
    description: str,
    image_bytes: Optional[bytes],
    prompt_version: str = "PROMPT_V1",
    timeout: float = 4.0,
) -> dict:
    if not image_bytes:
        return NOT_ASSESSED

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    system_prompt = get_prompt(prompt_version, "image")
    user_message = f"Pet symptom description: {description[:500]}"

    try:
        data = await call_openai("image", system_prompt, user_message, image_b64=image_b64, timeout=timeout)
    except CircuitBreakerOpen:
        return {"condition_label": "circuit_open", "confidence": 0.0, "area_description": ""}

    if not data:
        return {"condition_label": "error", "confidence": 0.0, "area_description": ""}

    return {
        "condition_label": str(data.get("condition_label", "unknown")),
        "confidence": float(data.get("confidence") or 0.0),
        "area_description": str(data.get("area_description", "")),
    }
