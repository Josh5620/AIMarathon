from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    CHUTES_API_KEY: str
    CHUTES_BASE_URL: str = "https://llm.chutes.ai/v1"
    CHUTES_CHAT_MODEL: str = "deepseek-ai/DeepSeek-V3.2-TEE"
    GOOGLE_API_KEY: str = ""  # used for Gemini embeddings and chat fallback
    GEMINI_CHAT_MODEL: str = "gemini-2.0-flash"
    CHUTES_EMBED_MODEL: str = "gemini-embedding-001"
    EMBED_DIM: int = 3072  # must match VECTOR(N) in db/schema.sql
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_DB_URL: str  # direct psycopg connection string

    model_config = {"env_file": ".env"}


settings = Settings()
