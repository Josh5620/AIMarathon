import time
import httpx
from app.config import settings

EMBED_DIM: int = settings.EMBED_DIM  # read from .env so it matches the active provider

_RETRYABLE = {429, 500, 502, 503, 504}

# When base URL is Google's generativelanguage API, embeddings use a different
# native endpoint and request/response format (not OpenAI-compat).
_GOOGLE_BASE = "generativelanguage.googleapis.com"
_IS_GOOGLE = _GOOGLE_BASE in settings.CHUTES_BASE_URL


def _with_retry(fn, max_attempts: int = 5):
    """Call fn(), retrying on rate-limit / transient errors with exponential backoff."""
    delay = 2.0
    for attempt in range(1, max_attempts + 1):
        resp = fn()
        if resp.status_code not in _RETRYABLE:
            resp.raise_for_status()
            return resp
        if attempt == max_attempts:
            resp.raise_for_status()
        wait = delay * (2 ** (attempt - 1))  # 2s, 4s, 8s, 16s
        print(f"  [chutes] {resp.status_code} — retrying in {wait:.0f}s (attempt {attempt}/{max_attempts})")
        time.sleep(wait)


class ChutesClient:
    def __init__(self) -> None:
        self._client = httpx.Client(
            base_url=settings.CHUTES_BASE_URL,
            headers={"Authorization": f"Bearer {settings.CHUTES_API_KEY}"},
            timeout=60.0,
        )
        # Separate client for Google native embedding API (uses ?key= auth, different base)
        if _IS_GOOGLE:
            self._google_embed_client = httpx.Client(
                base_url="https://generativelanguage.googleapis.com/v1beta",
                timeout=60.0,
            )

    def embed(self, text: str) -> list[float]:
        if _IS_GOOGLE:
            return self._google_embed(text)
        resp = _with_retry(lambda: self._client.post(
            "/embeddings",
            json={"model": settings.CHUTES_EMBED_MODEL, "input": text},
        ))
        return resp.json()["data"][0]["embedding"]

    def _google_embed(self, text: str) -> list[float]:
        """Google's native embedContent endpoint (not OpenAI-compat)."""
        resp = _with_retry(lambda: self._google_embed_client.post(
            f"/models/{settings.CHUTES_EMBED_MODEL}:embedContent",
            params={"key": settings.CHUTES_API_KEY},
            json={"content": {"parts": [{"text": text}]}},
        ))
        return resp.json()["embedding"]["values"]

    def chat(self, messages: list[dict], json_mode: bool = False) -> str:
        payload: dict = {
            "model": settings.CHUTES_CHAT_MODEL,
            "messages": messages,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        resp = _with_retry(lambda: self._client.post("/chat/completions", json=payload))
        return resp.json()["choices"][0]["message"]["content"]

    def close(self) -> None:
        self._client.close()
        if _IS_GOOGLE:
            self._google_embed_client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


# Module-level singleton — API team imports this directly.
chutes = ChutesClient()
