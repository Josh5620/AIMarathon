import json
import re
from app.chutes import chutes
from app.models import ResumeProfile, Education, Links

_VALID_SENIORITY = {"junior", "mid", "senior", "lead", "principal"}

_SYSTEM_PROMPT = """\
You extract a comprehensive structured profile from a resume or job description.
Return ONLY a JSON object with this exact shape (omit fields you cannot determine):
{
  "skills":            ["python", "fastapi", "docker"],
  "roles":             ["software engineer", "backend developer"],
  "domains":           ["fintech", "cloud infrastructure"],
  "certifications":    ["aws certified solutions architect"],
  "languages":         ["english", "french"],
  "years_experience":  5.5,
  "seniority":         "senior",
  "location":          "Berlin, Germany",
  "education":         [{"degree": "BS", "field": "Computer Science", "institution": "MIT", "year": 2020}],
  "links":             {"github": "https://github.com/...", "linkedin": "https://linkedin.com/in/...", "portfolio": "https://..."},
  "summary":           "Experienced backend engineer with 5 years in fintech, specializing in Python microservices and AWS infrastructure.",
  "work_authorization": "EU citizen"
}
Rules:
- skills: technical skills, tools, programming languages, frameworks. Lowercase. Max 30.
- roles: job titles and role types only. Lowercase. Max 15.
- domains: industries and domains of expertise. Lowercase. Max 15.
- certifications: professional certifications (e.g. "aws certified solutions architect", "pmp"). Lowercase. Max 20.
- languages: spoken/written human languages ONLY — not programming languages. Lowercase. Max 10.
- years_experience: total professional years as a decimal number. Estimate from employment dates. Omit if not determinable.
- seniority: MUST be one of: junior | mid | senior | lead | principal. Infer from years_experience and job titles. Omit if not determinable.
- education: extract all degrees. year is the graduation year as an integer.
- links: ONLY include URLs explicitly present in the resume text. Do not invent URLs.
- summary: 2-3 sentences written for a recruiter. Be specific — cite real skills and domains. Do not invent facts.
- work_authorization: only include if explicitly stated in the resume.
- Lowercase all string values in arrays. No duplicates. Return nothing outside the JSON object.\
"""


class KeywordExtractionError(Exception):
    pass


def _coerce_number(val) -> float | None:
    """Extract a leading number from val — handles "5+", "3-5", "~4.5", integers, floats."""
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        m = re.search(r"\d+(?:\.\d+)?", val)
        if m:
            return float(m.group())
    return None


def _normalize_array(items, cap: int = 30) -> list[str]:
    seen: dict[str, None] = {}
    for item in (items or []):
        if isinstance(item, str):
            v = item.strip().lower()
            if v:
                seen[v] = None
    return list(seen)[:cap]


def extract_profile(text: str) -> ResumeProfile:
    """
    Extract a full structured profile from resume or JD text.
    Returns a ResumeProfile with all extractable fields populated.
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

    if not isinstance(parsed, dict):
        raise KeywordExtractionError(f"Expected dict, got {type(parsed)}")

    skills         = _normalize_array(parsed.get("skills"), 30)
    roles          = _normalize_array(parsed.get("roles"), 15)
    domains        = _normalize_array(parsed.get("domains"), 15)
    certifications = _normalize_array(parsed.get("certifications"), 20)
    languages      = _normalize_array(parsed.get("languages"), 10)

    years_experience = _coerce_number(parsed.get("years_experience"))

    raw_seniority = parsed.get("seniority", "")
    seniority = (
        raw_seniority.strip().lower()
        if isinstance(raw_seniority, str) and raw_seniority.strip().lower() in _VALID_SENIORITY
        else None
    )

    location = parsed.get("location")
    location = location.strip() if isinstance(location, str) and location.strip() else None

    work_authorization = parsed.get("work_authorization")
    work_authorization = (
        work_authorization.strip()
        if isinstance(work_authorization, str) and work_authorization.strip()
        else None
    )

    summary = parsed.get("summary")
    summary = summary.strip() if isinstance(summary, str) and summary.strip() else None

    education: list[Education] = []
    for entry in (parsed.get("education") or []):
        if isinstance(entry, dict):
            year_val = _coerce_number(entry.get("year"))
            education.append(Education(
                degree=entry.get("degree") or None,
                field=entry.get("field") or None,
                institution=entry.get("institution") or None,
                year=int(year_val) if year_val is not None else None,
            ))

    raw_links = parsed.get("links") or {}
    links = Links(
        github=raw_links.get("github") or None,
        linkedin=raw_links.get("linkedin") or None,
        portfolio=raw_links.get("portfolio") or None,
    )

    # Flat keyword list for pre-filter: skills ∪ roles ∪ domains ∪ certifications (NOT languages)
    seen: dict[str, None] = {}
    for kw in [*skills, *roles, *domains, *certifications]:
        if kw:
            seen[kw] = None
    keywords = list(seen)[:90]

    return ResumeProfile(
        skills=skills,
        roles=roles,
        domains=domains,
        certifications=certifications,
        languages=languages,
        years_experience=years_experience,
        seniority=seniority,
        location=location,
        education=education,
        links=links,
        summary=summary,
        work_authorization=work_authorization,
        keywords=keywords,
    )


def extract_keywords(text: str) -> list[str]:
    """Backward-compatible wrapper — returns the flat keywords list from extract_profile()."""
    return extract_profile(text).keywords
