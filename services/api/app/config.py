from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    aegis_api_key: str = "local-dev-key"
    database_url: str = "postgresql+psycopg://aegis:aegis@localhost:5432/aegis"
    redis_url: str = "redis://localhost:6379/0"


settings = Settings()
