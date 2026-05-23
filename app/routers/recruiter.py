import asyncio
from fastapi import APIRouter, HTTPException

from app.chutes import chutes
from app.keywords import extract_keywords
from app.db import search_candidates
from app.models import SearchRequest, SearchResponse, MatchResult

router = APIRouter(prefix="/recruiter", tags=["recruiter"])

_EMBED_CHAR_LIMIT = 6000

_EXPLAIN_SYSTEM = (
    "You are a recruiting assistant. In 2-3 sentences, explain "
    "why this candidate is a strong match for this role. Be specific — "
    "cite skills or experience that align. Don't invent facts not in the resume."
)


def _explain(jd_text: str, resume_text: str, overlap_keywords: list[str]) -> str:
    return chutes.chat([
        {"role": "system", "content": _EXPLAIN_SYSTEM},
        {
            "role": "user",
            "content": (
                f"JOB DESCRIPTION:\n{jd_text}\n\n"
                f"CANDIDATE RESUME:\n{resume_text}\n\n"
                f"MATCHED KEYWORDS: {overlap_keywords}"
            ),
        },
    ])


@router.post("/search", response_model=SearchResponse)
async def search(body: SearchRequest):
    jd_text = body.jobDescription

    try:
        jd_vector, jd_keywords = await asyncio.gather(
            asyncio.to_thread(chutes.embed, jd_text[:_EMBED_CHAR_LIMIT]),
            asyncio.to_thread(extract_keywords, jd_text),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Embedding/keyword step failed: {exc}")

    try:
        matches = await asyncio.to_thread(
            search_candidates,
            jd_vector,
            jd_keywords,
            5,
            min_years_experience=body.min_years_experience,
            required_languages=body.required_languages,
            required_certifications=body.required_certifications,
            seniority_in=body.seniority_in,
            location_contains=body.location_contains,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Database search failed: {exc}")

    explanations = []
    for m in matches:
        try:
            explanation = await asyncio.to_thread(_explain, jd_text, m["full_text"], m["overlap_keywords"])
        except Exception:
            explanation = "Explanation unavailable."
        explanations.append(explanation)

    results = [
        MatchResult(
            id=m["id"],
            name=m.get("name"),
            distance=m["distance"],
            overlap_keywords=m["overlap_keywords"],
            explanation=explanations[i],
            skills=m.get("skills") or [],
            years_experience=m.get("years_experience"),
            seniority=m.get("seniority"),
            location=m.get("location"),
            summary=(m.get("profile") or {}).get("summary"),
        )
        for i, m in enumerate(matches)
    ]

    return SearchResponse(results=results)
