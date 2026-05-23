"""
Contact info extraction from resume text.

Email is extracted with a regex (fast, reliable).
Name is extracted via LLM (handles varied resume layouts).
Both return None on failure — never raise.
"""
import json
import re

from app.chutes import chutes

_NAME_SYSTEM_PROMPT = """\
Extract the candidate's full name from the resume text.
Return ONLY a JSON object with this exact shape:
{"name": "Full Name"}
or {"name": null} if you cannot find it.
Return nothing outside the JSON object.\
"""


def parse_contact_info(text: str) -> dict:
    """
    Extract name and email from resume text.

    Returns {"name": str | None, "email": str | None}.
    """
    return {
        "name": _extract_name(text),
        "email": _extract_email(text),
    }


def _extract_email(text: str) -> str | None:
    match = re.search(r"[\w.+\-]+@[\w\-]+(?:\.[a-zA-Z]{2,})+", text)
    return match.group(0) if match else None


def _extract_name(text: str) -> str | None:
    try:
        raw = chutes.chat(
            messages=[
                {"role": "system", "content": _NAME_SYSTEM_PROMPT},
                {"role": "user", "content": text[:2000]},
            ],
            json_mode=True,
        )
        name = json.loads(raw).get("name") or None
        if name and (len(name) > 100 or not name.strip()):
            return None
        return name
    except Exception:
        return None
