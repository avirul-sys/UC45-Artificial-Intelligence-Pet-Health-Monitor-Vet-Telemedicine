from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@db:5432/uc45"
    secret_key: str = "change-me-in-production"
    openai_api_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    class Config:
        env_file = ".env"


settings = Settings()
