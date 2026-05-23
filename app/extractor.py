from fastapi import UploadFile

from app.ingestion import ingest_resume


async def extract_text(file: UploadFile) -> str:
    """
    Adapter: reads FastAPI's UploadFile and delegates to the ingestion pipeline.

    Returns clean text only when status is ok.
    Raises ValueError with guard reasons for flagged, needs_review, or blocked,
    so the router can map it to HTTP 422.
    """
    file_bytes = await file.read()
    result = ingest_resume(file_bytes, file.filename or "unknown")
    if result["status"] == "ok":
        return result["clean_text"]
    raise ValueError("; ".join(result["reasons"]) or result["status"])
