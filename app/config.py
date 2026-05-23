from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    CHUTES_API_KEY: str
    CHUTES_BASE_URL: str = "https://llm.chutes.ai/v1"
    CHUTES_EMBED_MODEL: str = "Qwen/Qwen3-Embedding-8B"
    CHUTES_CHAT_MODEL: str = "Qwen/Qwen2.5-72B-Instruct"
    EMBED_DIM: int = 4096  # must match VECTOR(N) in db/schema.sql
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_DB_URL: str  # direct psycopg connection string

    model_config = {"env_file": ".env"}


settings = Settings()
