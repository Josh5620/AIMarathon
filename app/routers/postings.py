import asyncio

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query

from app.chutes import chutes
from app.keywords import extract_keywords, extract_profile
from app.parser import parse_contact_info
from app.storage import upload_resume_file
from app.db import (
    insert_candidate,
    get_candidates_for_dedup,
)
from app.extractor import extract_text
from app.ingestion.dedup import check_duplicate, normalize_name, normalize_email
from app.ingestion.audit import log_decision
from app.postings_db import (
    create_posting,
    list_postings_for_recruiter,
    list_open_postings,
    get_posting,
    get_posting_with_embedding,
    update_posting,
    delete_posting,
)
from app.applications_db import (
    upsert_application,
    find_application_by_posting_and_candidate,
    list_applications_for_posting,
    list_all_applications_for_posting,
    set_explanation,
)
from app.explain import generate_explanation
from app.models import (
    PostingCreate,
    PostingOut,
    PostingUpdate,
    PaginatedPostings,
    ApplicationOut,
    PaginatedApplications,
    UploadResponse,
    ReportOut,
)

router = APIRouter(prefix="/postings", tags=["postings"])

_EMBED_CHAR_LIMIT = 6000


# ── Recruiter: create posting ─────────────────────────────────────────────────

@router.post("/", response_model=PostingOut, status_code=201)
async def create_posting_endpoint(body: PostingCreate):
    jd_text = f"{body.description}\n{body.requirements or ''}".strip()

    try:
        jd_embedding, jd_keywords = await asyncio.gather(
            asyncio.to_thread(chutes.embed, jd_text[:_EMBED_CHAR_LIMIT]),
            asyncio.to_thread(extract_keywords, jd_text),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Embedding/keyword extraction failed: {exc}")

    posting_id = await asyncio.to_thread(
        create_posting,
        body.recruiter_email,
        body.company_name,
        body.position_title,
        body.description,
        jd_embedding,
        jd_keywords,
        requirements=body.requirements,
    )

    posting = await asyncio.to_thread(get_posting, posting_id)
    return PostingOut(**posting)


# ── Recruiter: list own postings ──────────────────────────────────────────────

@router.get("/mine", response_model=PaginatedPostings)
async def list_my_postings(
    recruiter_email: str = Query(...),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    offset = (page - 1) * limit
    rows, total = await asyncio.to_thread(
        list_postings_for_recruiter, recruiter_email, limit, offset
    )
    return PaginatedPostings(
        items=[PostingOut(**r) for r in rows],
        page=page,
        limit=limit,
        total=total,
    )


# ── Public: list open postings (candidate side) ───────────────────────────────

@router.get("/", response_model=PaginatedPostings)
async def list_open_postings_endpoint(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    offset = (page - 1) * limit
    rows, total = await asyncio.to_thread(list_open_postings, limit, offset)
    return PaginatedPostings(
        items=[PostingOut(**r) for r in rows],
        page=page,
        limit=limit,
        total=total,
    )


# ── Single posting detail ─────────────────────────────────────────────────────

@router.get("/{posting_id}", response_model=PostingOut)
async def get_posting_endpoint(posting_id: str):
    posting = await asyncio.to_thread(get_posting, posting_id)
    if posting is None:
        raise HTTPException(status_code=404, detail="Posting not found.")
    return PostingOut(**posting)


# ── Recruiter: edit / close posting ──────────────────────────────────────────

@router.patch("/{posting_id}", response_model=PostingOut)
async def update_posting_endpoint(posting_id: str, body: PostingUpdate):
    result = await asyncio.to_thread(
        update_posting,
        posting_id,
        company_name=body.company_name,
        position_title=body.position_title,
        description=body.description,
        requirements=body.requirements,
        status=body.status,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Posting not found.")
    posting = await asyncio.to_thread(get_posting, posting_id)
    return PostingOut(**posting)


# ── Recruiter: delete posting ─────────────────────────────────────────────────

@router.delete("/{posting_id}", status_code=204)
async def delete_posting_endpoint(posting_id: str):
    deleted = await asyncio.to_thread(delete_posting, posting_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Posting not found.")


# ── Candidate: apply to posting ───────────────────────────────────────────────

@router.post("/{posting_id}/apply", response_model=UploadResponse)
async def apply_to_posting(
    posting_id: str,
    file: UploadFile = File(...),
):
    posting = await asyncio.to_thread(get_posting_with_embedding, posting_id)
    if posting is None:
        raise HTTPException(status_code=404, detail="Posting not found.")
    if posting["status"] != "open":
        raise HTTPException(status_code=409, detail="This posting is closed.")

    # --- ingestion pipeline (guardrails unchanged) ---
    try:
        full_text = await extract_text(file)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if not full_text or len(full_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Could not extract enough text from the file.")

    await file.seek(0)
    file_bytes = await file.read()
    filename = file.filename or "unknown"

    embedding, profile, contact, file_url = await asyncio.gather(
        asyncio.to_thread(chutes.embed, full_text[:_EMBED_CHAR_LIMIT]),
        asyncio.to_thread(extract_profile, full_text),
        asyncio.to_thread(parse_contact_info, full_text),
        asyncio.to_thread(upload_resume_file, file_bytes, filename),
    )

    if not contact.get("name"):
        raise HTTPException(
            status_code=422,
            detail="Could not extract a name from the resume. Please ensure the resume includes a full name.",
        )

    profile_dict = {
        "education": [e.model_dump(exclude_none=True) for e in profile.education],
        "links": profile.links.model_dump(exclude_none=True),
        "summary": profile.summary,
        "work_authorization": profile.work_authorization,
    }

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
        "profile": profile_dict,
    }

    # 1. Identity lookup (global — who is this person?)
    existing_identities = await asyncio.to_thread(get_candidates_for_dedup)
    identity_match = next(
        (c for c in existing_identities
         if normalize_name(c.get("name")) == normalize_name(contact.get("name"))
         and normalize_email(c.get("email")) == normalize_email(contact.get("email"))),
        None,
    )

    # 2. Per-posting application lookup (only if identity already known)
    existing_app = None
    if identity_match:
        existing_app = await asyncio.to_thread(
            find_application_by_posting_and_candidate, posting_id, identity_match["id"]
        )

    dedup = check_duplicate(candidate_data, existing_identities, existing_app)
    log_decision(filename, {"status": dedup["decision"], "reasons": dedup["reasons"], "clean_text": full_text})

    if dedup["decision"] == "rejected":
        raise HTTPException(status_code=422, detail=dedup["reasons"][0])

    if dedup["decision"] == "duplicate":
        # Same CV already on file for this specific posting — not a new application
        raise HTTPException(status_code=409, detail="You have already applied to this posting with this CV.")

    # 3. Identity row: INSERT only when this is a brand-new person (never overwrite)
    if identity_match is None:
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
            profile=profile_dict,
        )
    else:
        candidate_id = identity_match["id"]

    # 4. Application snapshot — INSERT or UPDATE via ON CONFLICT
    distance = _cosine_distance(posting["jd_embedding"], embedding)
    overlap = list(set(posting["jd_keywords"] or []) & set(profile.keywords))

    await asyncio.to_thread(
        upsert_application,
        posting_id, candidate_id, distance, overlap,
        full_text=full_text,
        embedding=embedding,
        file_url=file_url,
        profile=profile_dict,
        skills=profile.skills,
        certifications=profile.certifications,
        languages=profile.languages,
        years_experience=profile.years_experience,
        seniority=profile.seniority,
        location=profile.location,
        candidate_keywords=profile.keywords,
    )

    return UploadResponse(id=candidate_id, message="applied")


def _cosine_distance(a, b) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    return 1.0 - dot / (norm_a * norm_b + 1e-10)


# ── Recruiter: paginated applicant list for a posting ─────────────────────────

@router.get("/{posting_id}/applications", response_model=PaginatedApplications)
async def list_applications_endpoint(
    posting_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
):
    posting = await asyncio.to_thread(get_posting, posting_id)
    if posting is None:
        raise HTTPException(status_code=404, detail="Posting not found.")

    offset = (page - 1) * limit
    rows, total = await asyncio.to_thread(
        list_applications_for_posting, posting_id, limit, offset
    )
    return PaginatedApplications(
        items=[ApplicationOut(**r) for r in rows],
        page=page,
        limit=limit,
        total=total,
    )


# ── Recruiter: printable summary report ──────────────────────────────────────

@router.get("/{posting_id}/report", response_model=ReportOut)
async def get_report(posting_id: str):
    posting = await asyncio.to_thread(get_posting, posting_id)
    if posting is None:
        raise HTTPException(status_code=404, detail="Posting not found.")

    applicants = await asyncio.to_thread(list_all_applications_for_posting, posting_id)

    jd_text = f"{posting['description']}\n{posting.get('requirements') or ''}".strip()
    top5_missing = [
        a for a in applicants[:5]
        if not a.get("explanation") and a.get("full_text")
    ]

    async def _fill(app_row):
        try:
            text = await asyncio.to_thread(
                generate_explanation,
                jd_text,
                app_row["full_text"],
                app_row.get("overlap_keywords") or [],
            )
            await asyncio.to_thread(set_explanation, app_row["application_id"], text)
            app_row["explanation"] = text
        except Exception:
            app_row["explanation"] = "Explanation unavailable."

    if top5_missing:
        await asyncio.gather(*(_fill(a) for a in top5_missing))

    return ReportOut(
        posting=PostingOut(**posting),
        applicants=[ApplicationOut(**a) for a in applicants],
    )
