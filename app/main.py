from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.models import HealthResponse
from app.routers import candidates, recruiter, recruiters, meetings, postings, applications

app = FastAPI(title="Intelligent Recruiter API", version="0.1.0")

# CORS must be registered before the catch-all exception handler so headers
# are present even on 500 responses (Starlette's ServerErrorMiddleware runs
# outside CORSMiddleware and strips headers from unhandled exceptions).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Return JSON with CORS headers for any unhandled exception."""
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )

app.include_router(candidates.router,    prefix="/api")
app.include_router(recruiter.router,     prefix="/api")
app.include_router(recruiters.router,    prefix="/api")
app.include_router(meetings.router,      prefix="/api")
app.include_router(postings.router,      prefix="/api")
app.include_router(applications.router,  prefix="/api")


@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", timestamp=datetime.now(timezone.utc).isoformat())


@app.get("/api/diagnose")
async def diagnose():
    """Tests each backend component individually. Use this to find what's broken."""
    import asyncio
    from app.chutes import chutes
    from app.db import _connect

    results = {}

    # 1. Test Google embedding
    try:
        vec = await asyncio.to_thread(chutes.embed, "test")
        results["embed"] = f"OK — got {len(vec)}-dim vector"
    except Exception as exc:
        results["embed"] = f"FAIL — {exc}"

    # 2. Test Chutes chat
    try:
        reply = await asyncio.to_thread(
            chutes.chat, [{"role": "user", "content": "Say the word OK and nothing else."}]
        )
        results["chat"] = f"OK — model replied: {reply[:60]}"
    except Exception as exc:
        results["chat"] = f"FAIL — {exc}"

    # 3. Test DB connection
    try:
        conn = await asyncio.to_thread(_connect)
        conn.close()
        results["db"] = "OK — connected to Supabase"
    except Exception as exc:
        results["db"] = f"FAIL — {exc}"

    return results
