"""
Candidate-level deduplication for the ingestion pipeline.

Pure decision function — no DB calls, no IDs, no global state.
Wiring (DB fetch, update, insert) is done by the caller.
"""
from __future__ import annotations
import re

_EXCLUDE_FROM_COMPARE = frozenset({"name", "email", "embedding", "file_url", "id", "created_at"})


def normalize_name(name: str | None) -> str:
    """Lowercase, strip, and collapse internal whitespace."""
    if not name:
        return ""
    return re.sub(r"\s+", " ", name.strip().lower())


def normalize_email(email: str | None) -> str:
    """Lowercase and strip whitespace."""
    if not email:
        return ""
    return email.strip().lower()


def _normalize_for_compare(value):
    """Recursively normalize a field value for equality comparison."""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return sorted(str(v).strip().lower() for v in value if v is not None)
    if isinstance(value, dict):
        return {k: _normalize_for_compare(v) for k, v in sorted(value.items())}
    return value


def check_duplicate(
    candidate: dict,
    existing_candidates: list[dict],
) -> dict:
    """
    Decide how to handle a newly-ingested candidate relative to existing records.

    Decision order (first match wins):
      1. Email missing                          → "rejected"
      2. No existing record with same name+email → "unique"
      3. Match found, all other fields identical → "duplicate"
      4. Match found, some other field differs   → "update"

    Returns {"decision": "unique"|"duplicate"|"update"|"rejected", "reasons": list[str]}.
    Pure — no DB calls, no IDs returned.
    """
    name = candidate.get("name")
    email = candidate.get("email")

    # Step 1: Email missing → rejected immediately
    if not normalize_email(email):
        if not normalize_name(name):
            return {
                "decision": "rejected",
                "reasons": ["no identifying fields (name and email both missing)"],
            }
        return {
            "decision": "rejected",
            "reasons": ["missing email — cannot identify candidate"],
        }

    # Step 2: Look for a record whose normalized name AND email both match
    norm_name = normalize_name(name)
    norm_email = normalize_email(email)

    match = None
    for existing in existing_candidates:
        if (normalize_name(existing.get("name")) == norm_name
                and normalize_email(existing.get("email")) == norm_email):
            match = existing
            break

    if match is None:
        # Includes the critical case: same name but different email → distinct person
        return {"decision": "unique", "reasons": ["new candidate"]}

    # Step 3: Compare only full_text — LLM-extracted fields (skills, keywords, summary)
    # are non-deterministic across calls, so comparing them always finds spurious diffs
    # for identical resumes. full_text is the stable ground truth.
    new_text = (candidate.get("full_text") or "").strip()
    existing_text = (match.get("full_text") or "").strip()
    if new_text != existing_text:
        return {
            "decision": "update",
            "reasons": ["candidate already exists with new information — update the existing record"],
        }

    return {"decision": "duplicate", "reasons": ["resume already exists"]}
