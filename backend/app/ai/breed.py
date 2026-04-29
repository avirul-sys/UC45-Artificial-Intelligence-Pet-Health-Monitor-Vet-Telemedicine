import json
import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from app.ai.openai_client import call_openai
from app.ai.prompts import get_prompt

logger = logging.getLogger(__name__)

_BREED_CACHE: dict = {}
_CACHE_LOADED_AT: Optional[datetime] = None
_CACHE_TTL = timedelta(hours=24)
_CACHE_LOCK = asyncio.Lock()

BREED_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "breed_data.json")


async def _load_breed_db():
    global _BREED_CACHE, _CACHE_LOADED_AT
    async with _CACHE_LOCK:
        try:
            with open(BREED_DB_PATH, "r") as f:
                _BREED_CACHE = {k.lower(): v for k, v in json.load(f).items()}
            _CACHE_LOADED_AT = datetime.utcnow()
            logger.info("Breed database loaded: %d entries", len(_BREED_CACHE))
        except Exception as e:
            logger.error("Failed to load breed database: %s", e)


async def _ensure_cache():
    global _CACHE_LOADED_AT
    if not _BREED_CACHE or (
        _CACHE_LOADED_AT and datetime.utcnow() - _CACHE_LOADED_AT > _CACHE_TTL
    ):
        await _load_breed_db()


async def run_breed_module(
    breed: str,
    species: str = "",
    prompt_version: str = "PROMPT_V1",
    timeout: float = 4.0,
) -> dict:
    await _ensure_cache()

    key = breed.strip().lower()
    data = _BREED_CACHE.get(key)

    if data:
        return {
            "risk_flags": data.get("risk_flags", []),
            "breed_note": data.get("breed_note", ""),
            "confidence": 1.0,
        }

    # Breed not in local DB — enrich via GPT-4o (Module 3)
    system_prompt = get_prompt(prompt_version, "breed")
    user_message = f"Breed: {breed}\nSpecies: {species or 'unknown'}"

    result = await call_openai(
        module="breed",
        system_prompt=system_prompt,
        user_message=user_message,
        timeout=timeout,
    )

    if result:
        return {
            "risk_flags": result.get("risk_flags", []),
            "breed_note": result.get("breed_note"),
            "confidence": result.get("confidence", 0.5),
        }

    # Fallback to unknown entry if GPT-4o call fails
    fallback = _BREED_CACHE.get("unknown", {})
    return {
        "risk_flags": fallback.get("risk_flags", []),
        "breed_note": fallback.get("breed_note"),
        "confidence": 0.0,
    }
