import time
import httpx
from app.config import settings

EMBED_DIM: int = settings.EMBED_DIM

_RETRYABLE = {429, 500, 502, 503, 504}

_GOOGLE_EMBED_BASE = "https://generativelanguage.googleapis.com/v1beta"


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
        # Chat client — Chutes (OpenAI-compatible)
        self._chat_client = httpx.Client(
            base_url=settings.CHUTES_BASE_URL,
            headers={"Authorization": f"Bearer {settings.CHUTES_API_KEY}"},
            timeout=60.0,
        )
        # Embed client — Google Gemini native (Chutes has no embeddings endpoint)
        self._embed_client = httpx.Client(
            base_url=_GOOGLE_EMBED_BASE,
            timeout=60.0,
        )

    def embed(self, text: str) -> list[float]:
        """Embed text using Google Gemini native embedContent endpoint."""
        resp = _with_retry(lambda: self._embed_client.post(
            f"/models/{settings.CHUTES_EMBED_MODEL}:embedContent",
            params={"key": settings.GOOGLE_API_KEY},
            json={"content": {"parts": [{"text": text}]}},
        ))
        return resp.json()["embedding"]["values"]

    def _chat_gemini(self, messages: list[dict], json_mode: bool = False) -> str:
        """Fallback chat via Google Gemini generateContent."""
        system_parts = [m["content"] for m in messages if m["role"] == "system"]
        turns = [
            {"role": "model" if m["role"] == "assistant" else "user",
             "parts": [{"text": m["content"]}]}
            for m in messages if m["role"] != "system"
        ]
        payload: dict = {"contents": turns}
        if system_parts:
            payload["systemInstruction"] = {"parts": [{"text": "\n".join(system_parts)}]}
        if json_mode:
            payload["generationConfig"] = {"responseMimeType": "application/json"}
        resp = _with_retry(lambda: self._embed_client.post(
            f"/models/{settings.GEMINI_CHAT_MODEL}:generateContent",
            params={"key": settings.GOOGLE_API_KEY},
            json=payload,
        ))
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]

    def chat(self, messages: list[dict], json_mode: bool = False) -> str:
        """Chat completion using Chutes (OpenAI-compatible), with Gemini fallback."""
        payload: dict = {
            "model": settings.CHUTES_CHAT_MODEL,
            "messages": messages,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        try:
            resp = _with_retry(lambda: self._chat_client.post("/chat/completions", json=payload))
            print(f"  [chutes] chat succeeded via Chutes ({settings.CHUTES_CHAT_MODEL})")
            return resp.json()["choices"][0]["message"]["content"]
        except Exception as exc:
            print(f"  [chutes] chat failed ({exc}), falling back to Gemini ({settings.GEMINI_CHAT_MODEL})")
            result = self._chat_gemini(messages, json_mode=json_mode)
            print(f"  [chutes] Gemini fallback succeeded")
            return result

    def close(self) -> None:
        self._chat_client.close()
        self._embed_client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


# Module-level singleton — API team imports this directly.
chutes = ChutesClient()
