import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

AUDIT_LOG_PATH = Path("audit.log")


def log_decision(filename: str, result: dict) -> None:
    """Append one JSONL entry to the audit log. Never logs resume text or PII."""
    clean = result.get("clean_text", "")
    text_hash = hashlib.sha256(clean.encode()).hexdigest()[:12] if clean else ""

    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "filename": filename,
        "status": result.get("status"),
        "reasons": result.get("reasons", []),
        "text_sha256_prefix": text_hash,
    }

    with AUDIT_LOG_PATH.open("a", encoding="utf-8", newline="") as fh:
        fh.write(json.dumps(entry) + "\n")
