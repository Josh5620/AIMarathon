import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.chutes import chutes
from app.keywords import extract_keywords
from app.db import insert_candidate, get_candidate
from app.extractor import extract_text
from app.models import UploadResponse, CandidateDetail

router = APIRouter(prefix="/candidates", tags=["candidates"])

_EMBED_CHAR_LIMIT = 6000  # gemini-embedding-001 token cap (~2048 tokens ≈ 6000 chars)


@router.post("/upload", response_model=UploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    full_text = await extract_text(file)

    if not full_text or len(full_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="Could not extract enough text from the file.")

    embedding, keywords = await asyncio.gather(
        asyncio.to_thread(chutes.embed, full_text[:_EMBED_CHAR_LIMIT]),
        asyncio.to_thread(extract_keywords, full_text),
    )

    candidate_id = await asyncio.to_thread(
        insert_candidate,
        full_text,
        embedding,
        keywords,
    )

    return UploadResponse(id=candidate_id, message="uploaded")


@router.get("/{candidate_id}", response_model=CandidateDetail)
async def get_candidate_detail(candidate_id: str):
    row = await asyncio.to_thread(get_candidate, candidate_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return CandidateDetail(**row)
