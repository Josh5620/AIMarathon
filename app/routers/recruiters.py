import asyncio

from fastapi import APIRouter, HTTPException

from app.models import RecruiterProfile, RecruiterProfileUpdate
from app.recruiters import get_recruiter, update_recruiter_profile

router = APIRouter(prefix="/recruiters", tags=["recruiters"])


@router.get("/{email}", response_model=RecruiterProfile)
async def get_recruiter_profile(email: str):
    row = await asyncio.to_thread(get_recruiter, email)
    if not row:
        raise HTTPException(status_code=404, detail="Recruiter not found.")
    return RecruiterProfile(**row)


@router.patch("/{email}", response_model=RecruiterProfile)
async def update_recruiter(email: str, body: RecruiterProfileUpdate):
    row = await asyncio.to_thread(
        update_recruiter_profile,
        email,
        **body.model_dump(exclude_none=True),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Recruiter not found.")
    return RecruiterProfile(**row)
