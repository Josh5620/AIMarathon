from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.models import HealthResponse
from app.routers import candidates, recruiter

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

app.include_router(candidates.router, prefix="/api")
app.include_router(recruiter.router, prefix="/api")


@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", timestamp=datetime.now(timezone.utc).isoformat())
