import json
from app.chutes import chutes

_SYSTEM_PROMPT = """\
You extract structured keywords from resumes or job descriptions.
Return ONLY a JSON object with this exact shape:
{
  "skills": ["..."],
  "roles": ["..."],
  "domains": ["..."]
}
Rules:
- skills: technical skills, tools, programming languages, frameworks
- roles: job titles, role types (e.g. "software engineer", "data scientist")
- domains: industries or domains of expertise (e.g. "fintech", "machine learning")
- Lowercase every value. No duplicates. Max 30 items per array.
- Return nothing outside the JSON object.\
"""


class KeywordExtractionError(Exception):
    pass


def extract_keywords(text: str) -> list[str]:
    """
    Extract and flatten keywords from a resume or job description.
    Returns a deduplicated list[str] suitable for the candidates.keywords TEXT[] column.
    """
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": text},
    ]
    raw = chutes.chat(messages, json_mode=True)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise KeywordExtractionError(f"LLM returned non-JSON: {raw!r}") from exc

    combined: list[str] = []
    for key in ("skills", "roles", "domains"):
        items = parsed.get(key, [])
        if not isinstance(items, list):
            raise KeywordExtractionError(f"Expected list for '{key}', got {type(items)}")
        combined.extend(items)

    # normalize + dedupe (preserve first-seen order)
    seen: dict[str, None] = {}
    for kw in combined:
        if not isinstance(kw, str):
            continue
        normalized = kw.strip().lower()
        if normalized:
            seen[normalized] = None

    return list(seen)[:90]
