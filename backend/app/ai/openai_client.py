import asyncio
import json
import time
import logging
from typing import Optional
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.config import settings

logger = logging.getLogger(__name__)

OPENAI_URL = "https://api.openai.com/v1/chat/completions"


class CircuitBreakerOpen(Exception):
    pass


class AsyncCircuitBreaker:
    """Simple per-module async circuit breaker."""

    def __init__(self, failure_threshold: int = 3, recovery_timeout: int = 30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._failures = 0
        self._opened_at: Optional[float] = None
        self._state = "closed"  # closed | open | half-open

    @property
    def state(self) -> str:
        if self._state == "open":
            if time.monotonic() - self._opened_at >= self.recovery_timeout:
                self._state = "half-open"
                logger.info("Circuit HALF-OPEN — allowing probe request")
        return self._state

    def record_success(self):
        self._failures = 0
        if self._state != "closed":
            logger.info("Circuit CLOSED")
        self._state = "closed"

    def record_failure(self):
        self._failures += 1
        if self._failures >= self.failure_threshold:
            self._state = "open"
            self._opened_at = time.monotonic()
            logger.warning("Circuit OPEN after %d failures", self._failures)


# One breaker per AI module
_breakers: dict[str, AsyncCircuitBreaker] = {
    "symptom": AsyncCircuitBreaker(),
    "image": AsyncCircuitBreaker(),
    "breed": AsyncCircuitBreaker(),
    "urgency": AsyncCircuitBreaker(),
}


def get_breaker(module: str) -> AsyncCircuitBreaker:
    return _breakers.get(module, AsyncCircuitBreaker())


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=1, max=4),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
    reraise=True,
)
async def _call_openai_raw(
    system_prompt: str,
    user_message: str,
    image_b64: Optional[str],
    timeout: float,
) -> dict:
    messages_content: list = [{"type": "text", "text": user_message}]
    if image_b64:
        messages_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}", "detail": "low"},
        })

    payload = {
        "model": "gpt-4o",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": messages_content},
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 300,
        "temperature": 0,
        "seed": 42,
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            OPENAI_URL,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json=payload,
        )
        response.raise_for_status()
        return response.json()


async def call_openai(
    module: str,
    system_prompt: str,
    user_message: str,
    image_b64: Optional[str] = None,
    timeout: float = 4.0,
) -> Optional[dict]:
    breaker = get_breaker(module)
    if breaker.state == "open":
        raise CircuitBreakerOpen(f"Circuit open for module '{module}'")

    try:
        result = await _call_openai_raw(system_prompt, user_message, image_b64, timeout)
        raw_content = result["choices"][0]["message"]["content"]
        parsed = json.loads(raw_content)
        breaker.record_success()
        return parsed
    except CircuitBreakerOpen:
        raise
    except json.JSONDecodeError as e:
        logger.error("JSON parse failure in module '%s': %s", module, e)
        breaker.record_failure()
        return None
    except Exception as e:
        logger.error("OpenAI call failed in module '%s': %s", module, e)
        breaker.record_failure()
        return None
