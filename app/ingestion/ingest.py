from app.ingestion.audit import log_decision
from app.ingestion.extract import extract_text, EncryptedFileError, ALLOWED_EXTENSIONS

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PDF_PAGES = 2


def ingest_resume(file_bytes: bytes, filename: str) -> dict:
    """
    Orchestrate file pre-checks, text extraction, and guardrail validation.

    Always returns a dict — never raises to the caller.

    Returns:
        {
            "clean_text": str,
            "status": "ok" | "flagged" | "needs_review" | "blocked",
            "reasons": list[str],
        }
    """
    # ── Pre-check: file size ──────────────────────────────────────────────────
    if len(file_bytes) > MAX_FILE_BYTES:
        result = {
            "clean_text": "",
            "status": "blocked",
            "reasons": [f"file exceeds size limit ({MAX_FILE_BYTES // (1024*1024)} MB)"],
        }
        log_decision(filename, result)
        return result

    # ── Pre-check: PDF page count ─────────────────────────────────────────────
    if filename.lower().endswith(".pdf"):
        try:
            import fitz
            _doc = fitz.open(stream=file_bytes, filetype="pdf")
            page_count = len(_doc)
            _doc.close()
            if page_count > MAX_PDF_PAGES:
                result = {
                    "clean_text": "",
                    "status": "blocked",
                    "reasons": [
                        f"resume is {page_count} pages — maximum allowed is {MAX_PDF_PAGES} pages"
                    ],
                }
                log_decision(filename, result)
                return result
        except Exception:
            pass  # corrupt PDF — let extraction handle and report it

    # ── Extraction ────────────────────────────────────────────────────────────
    text: str
    try:
        text = extract_text(file_bytes, filename)
    except EncryptedFileError:
        result = {
            "clean_text": "",
            "status": "needs_review",
            "reasons": ["password-protected PDF — cannot extract text"],
        }
        log_decision(filename, result)
        return result
    except ValueError as exc:
        result = {
            "clean_text": "",
            "status": "blocked",
            "reasons": [str(exc)],
        }
        log_decision(filename, result)
        return result
    except Exception as exc:  # noqa: BLE001
        result = {
            "clean_text": "",
            "status": "needs_review",
            "reasons": [f"extraction failed: {str(exc)[:120]}"],
        }
        log_decision(filename, result)
        return result

    # ── Guard ─────────────────────────────────────────────────────────────────
    from app.ingestion.guard import guard_input  # local import avoids circular at module level
    result = guard_input(text)
    log_decision(filename, result)
    return result
