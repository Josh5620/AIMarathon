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
    existing_application: dict | None = None,
) -> dict:
    """
    Decide how to handle a newly-ingested candidate relative to existing records.

    Decisions (first match wins):
      1. Email missing                                          → "rejected"
      2. No existing candidate with same name+email            → "new_identity"
      3. Identity matches, no application for this posting     → "new_application"
      4. Identity matches, has application, different full_text → "update_application"
      5. Identity matches, has application, same full_text     → "duplicate"

    The "duplicate" (409) case is now posting-scoped: applying the same CV to a
    different posting is always "new_application" (success).

    Returns {"decision": str, "reasons": list[str]}.
    Pure — no DB calls, no IDs returned.
    """
    name = candidate.get("name")
    email = candidate.get("email")

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

    norm_name = normalize_name(name)
    norm_email = normalize_email(email)

    identity_match = None
    for existing in existing_candidates:
        if (normalize_name(existing.get("name")) == norm_name
                and normalize_email(existing.get("email")) == norm_email):
            identity_match = existing
            break

    if identity_match is None:
        return {"decision": "new_identity", "reasons": ["new candidate"]}

    if existing_application is None:
        return {"decision": "new_application", "reasons": ["existing candidate, new posting application"]}

    new_text = (candidate.get("full_text") or "").strip()
    existing_text = (existing_application.get("full_text") or "").strip()
    if new_text != existing_text:
        return {
            "decision": "update_application",
            "reasons": ["updated CV for this posting"],
        }

    return {"decision": "duplicate", "reasons": ["already applied to this posting with this CV"]}
