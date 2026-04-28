from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import engine
from app.models import Base
from app.ai.breed import _load_breed_db
from app.routers import auth, pets, triage, calls, admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (Alembic handles production migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Pre-load breed cache
    await _load_breed_db()
    logger.info("AI Pet Health Monitor API started")
    yield
    await engine.dispose()
    logger.info("AI Pet Health Monitor API shutdown")


app = FastAPI(
    title="AI Pet Health Monitor & Vet Telemedicine API",
    version="1.0.0",
    description="AI-powered pet health triage and vet telemedicine platform",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal error. Please try again."},
    )


app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(pets.router, prefix="/api/v1", tags=["pets"])
app.include_router(triage.router, prefix="/api/v1", tags=["triage"])
app.include_router(calls.router, prefix="/api/v1", tags=["calls"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])


@app.get("/health")
async def health():
    return {"status": "ok"}
