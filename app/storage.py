"""
Supabase Storage helpers for uploaded resume files.

The 'resumes' bucket is created automatically on first import if it
doesn't already exist. If creation or upload fails for any reason,
upload_resume_file returns None — the candidate row is still inserted.

Production note: ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
set in .env. On the Supabase dashboard you can verify the bucket at
Storage → resumes.
"""
import uuid
from pathlib import Path

from supabase import create_client

from app.config import settings

BUCKET_NAME = "resumes"

_supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# Create the bucket once at import time; ignore the error if it already exists.
try:
    _supabase.storage.create_bucket(BUCKET_NAME, options={"public": True})
except Exception:
    pass


def upload_resume_file(file_bytes: bytes, filename: str) -> str | None:
    """
    Upload file_bytes to the 'resumes' bucket in Supabase Storage.

    Returns the public URL on success, or None if the upload fails.
    Failure is always silent — the candidate insert proceeds without a file URL.
    """
    try:
        ext = Path(filename).suffix.lower()
        unique_path = f"{uuid.uuid4()}{ext}"

        _supabase.storage.from_(BUCKET_NAME).upload(
            path=unique_path,
            file=file_bytes,
            file_options={"content-type": _content_type(ext)},
        )

        return _supabase.storage.from_(BUCKET_NAME).get_public_url(unique_path)
    except Exception:
        return None


def _content_type(ext: str) -> str:
    return {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }.get(ext, "application/octet-stream")
