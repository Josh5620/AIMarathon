from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class Education(BaseModel):
    degree: Optional[str] = None
    field: Optional[str] = None
    institution: Optional[str] = None
    year: Optional[int] = None


class Links(BaseModel):
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None


class CandidateProfile(BaseModel):
    education: list[Education] = []
    links: Links = Links()
    summary: Optional[str] = None
    work_authorization: Optional[str] = None


class ResumeProfile(BaseModel):
    """Full structured extraction from a resume. Used internally in the upload pipeline."""
    skills: list[str] = []
    roles: list[str] = []
    domains: list[str] = []
    certifications: list[str] = []
    languages: list[str] = []
    years_experience: Optional[float] = None
    seniority: Optional[str] = None
    location: Optional[str] = None
    education: list[Education] = []
    links: Links = Links()
    summary: Optional[str] = None
    work_authorization: Optional[str] = None
    keywords: list[str] = []  # derived flat list: skills ∪ roles ∪ domains ∪ certifications


class UploadResponse(BaseModel):
    id: str
    message: str


class CandidateDetail(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    full_text: str
    keywords: list[str]
    skills: list[str] = []
    certifications: list[str] = []
    languages: list[str] = []
    years_experience: Optional[float] = None
    seniority: Optional[str] = None
    location: Optional[str] = None
    profile: CandidateProfile = CandidateProfile()
    file_url: Optional[str] = None
    created_at: Optional[datetime] = None


class SearchRequest(BaseModel):
    jobDescription: str
    min_years_experience: Optional[float] = None
    required_languages: Optional[list[str]] = None
    required_certifications: Optional[list[str]] = None
    seniority_in: Optional[list[str]] = None
    location_contains: Optional[str] = None


class MatchResult(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    distance: float
    overlap_keywords: list[str]
    explanation: str
    skills: list[str] = []
    years_experience: Optional[float] = None
    seniority: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None


class SearchResponse(BaseModel):
    results: list[MatchResult]


class HealthResponse(BaseModel):
    status: str
    timestamp: str


# ── Recruiter profile ──────────────────────────────────────────────────────────

class RecruiterProfile(BaseModel):
    email: str
    active: bool = True
    name: Optional[str] = None
    organization: Optional[str] = None
    job_title: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class RecruiterProfileUpdate(BaseModel):
    name: Optional[str] = None
    organization: Optional[str] = None
    job_title: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


# ── Meetings ───────────────────────────────────────────────────────────────────

class ScheduleMeetingRequest(BaseModel):
    candidate_id: str
    recruiter_email: str
    start_iso: str          # ISO 8601 with offset, e.g. "2026-05-25T10:00:00+03:00"
    duration_minutes: int = 30
    notes: Optional[str] = None


class MeetingResponse(BaseModel):
    id: str
    recruiter_email: str
    candidate_id: str
    candidate_email: str
    candidate_name: Optional[str] = None
    scheduled_at: str
    duration_minutes: int
    google_event_id: Optional[str] = None
    meet_link: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
