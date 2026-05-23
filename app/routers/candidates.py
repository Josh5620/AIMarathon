import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.chutes import chutes
from app.keywords import extract_profile
from app.parser import parse_contact_info
from app.storage import upload_resume_file
from app.db import insert_candidate, get_candidate, get_candidates_for_dedup, update_candidate_by_email
from app.extractor import extract_text
from app.ingestion.dedup import check_duplicate
from app.ingestion.audit import log_decision
from app.models import UploadResponse, CandidateDetail

router = APIRouter(prefix="/candidates", tags=["candidates"])

_EMBED_CHAR_LIMIT = 6000  # gemini-embedding-001 token cap (~2048 tokens ≈ 6000 chars)


@router.post("/upload", response_model=UploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    try:
        full_text = await extract_text(file)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if not full_text or len(full_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Could not extract enough text from the file.")

    # Re-read file bytes for storage (extractor already consumed the stream; seek resets it).
    await file.seek(0)
    file_bytes = await file.read()
    filename = file.filename or "unknown"

    # Run all four tasks in parallel — none depend on each other.
    embedding, profile, contact, file_url = await asyncio.gather(
        asyncio.to_thread(chutes.embed, full_text[:_EMBED_CHAR_LIMIT]),
        asyncio.to_thread(extract_profile, full_text),
        asyncio.to_thread(parse_contact_info, full_text),
        asyncio.to_thread(upload_resume_file, file_bytes, filename),
    )

    # Name is required — dedup does not cover the missing-name case alone.
    if not contact.get("name"):
        raise HTTPException(status_code=422, detail="Could not extract a name from the resume. Please ensure the resume includes a full name.")

    # Build the candidate dict for dedup comparison (excludes embedding + file_url).
    candidate_data = {
        "name": contact.get("name"),
        "email": contact.get("email"),
        "full_text": full_text,
        "keywords": profile.keywords,
        "skills": profile.skills,
        "certifications": profile.certifications,
        "languages": profile.languages,
        "years_experience": profile.years_experience,
        "seniority": profile.seniority,
        "location": profile.location,
        "profile": {
            "education": [e.model_dump(exclude_none=True) for e in profile.education],
            "links": profile.links.model_dump(exclude_none=True),
            "summary": profile.summary,
            "work_authorization": profile.work_authorization,
        },
    }

    existing = await asyncio.to_thread(get_candidates_for_dedup)
    dedup = check_duplicate(candidate_data, existing)

    log_decision(filename, {"status": dedup["decision"], "reasons": dedup["reasons"], "clean_text": full_text})

    if dedup["decision"] == "rejected":
        raise HTTPException(status_code=422, detail=dedup["reasons"][0])

    if dedup["decision"] == "duplicate":
        raise HTTPException(status_code=409, detail="Resume already exists in the database — no changes detected.")

    if dedup["decision"] == "update":
        candidate_id = await asyncio.to_thread(
            update_candidate_by_email,
            contact["email"],
            full_text,
            embedding,
            profile.keywords,
            file_url=file_url,
            skills=profile.skills,
            certifications=profile.certifications,
            languages=profile.languages,
            years_experience=profile.years_experience,
            seniority=profile.seniority,
            location=profile.location,
            profile={
                "education": [e.model_dump(exclude_none=True) for e in profile.education],
                "links": profile.links.model_dump(exclude_none=True),
                "summary": profile.summary,
                "work_authorization": profile.work_authorization,
            },
        )
        return UploadResponse(id=candidate_id, message="updated")

    # decision == "unique"
    candidate_id = await asyncio.to_thread(
        insert_candidate,
        full_text,
        embedding,
        profile.keywords,
        name=contact.get("name"),
        email=contact.get("email"),
        file_url=file_url,
        skills=profile.skills,
        certifications=profile.certifications,
        languages=profile.languages,
        years_experience=profile.years_experience,
        seniority=profile.seniority,
        location=profile.location,
        profile={
            "education": [e.model_dump(exclude_none=True) for e in profile.education],
            "links": profile.links.model_dump(exclude_none=True),
            "summary": profile.summary,
            "work_authorization": profile.work_authorization,
        },
    )

    return UploadResponse(id=candidate_id, message="uploaded")


@router.get("/{candidate_id}", response_model=CandidateDetail)
async def get_candidate_detail(candidate_id: str):
    row = await asyncio.to_thread(get_candidate, candidate_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return CandidateDetail(**row)
