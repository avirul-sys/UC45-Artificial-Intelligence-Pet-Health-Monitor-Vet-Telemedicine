import re
from typing import Optional
from app.ai.openai_client import call_openai, CircuitBreakerOpen
from app.ai.prompts import get_prompt


_INJECTION_PATTERNS = re.compile(
    r"(ignore (all |previous |prior )?instructions?|forget (all |previous |prior )?instructions?|"
    r"disregard|new instruction|you are now|act as|system prompt)",
    re.IGNORECASE,
)
_HTML_TAGS = re.compile(r"<[^>]+>")


def sanitise(text: str) -> str:
    text = _HTML_TAGS.sub("", text)
    text = _INJECTION_PATTERNS.sub("[removed]", text)
    return text[:500]


async def run_symptom_module(
    description: str,
    prompt_version: str = "PROMPT_V1",
    timeout: float = 4.0,
) -> dict:
    safe_desc = sanitise(description)
    system_prompt = get_prompt(prompt_version, "symptom")

    try:
        data = await call_openai("symptom", system_prompt, safe_desc, timeout=timeout)
    except CircuitBreakerOpen:
        return {"condition_category": "circuit_open", "confidence": 0.0, "reasoning": "Service temporarily unavailable."}

    if not data:
        return {"condition_category": "parse_error", "confidence": 0.0, "reasoning": ""}

    return {
        "condition_category": str(data.get("condition_category", "unknown")),
        "confidence": float(data.get("confidence") or 0.0),
        "reasoning": str(data.get("reasoning", "")),
    }
