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


# ── Job Postings ───────────────────────────────────────────────────────────────

class PostingCreate(BaseModel):
    recruiter_email: str
    company_name: str
    position_title: str
    description: str
    requirements: Optional[str] = None


class PostingUpdate(BaseModel):
    company_name: Optional[str] = None
    position_title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    status: Optional[str] = None  # 'open' | 'closed'


class PostingOut(BaseModel):
    id: str
    recruiter_email: Optional[str] = None
    company_name: str
    position_title: str
    description: str
    requirements: Optional[str] = None
    jd_keywords: Optional[list[str]] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    applicant_count: Optional[int] = None


class PaginatedPostings(BaseModel):
    items: list[PostingOut]
    page: int
    limit: int
    total: int


class PostingCountOut(BaseModel):
    total: int


class PostingApplicantCountOut(BaseModel):
    posting_id: str
    applicant_count: int


class RecruiterPostingStatsOut(BaseModel):
    recruiter_email: str
    total_open_postings: int
    total_open_posting_applicants: int


# ── Applications ───────────────────────────────────────────────────────────────

class ApplicationOut(BaseModel):
    application_id: str
    posting_id: str
    candidate_id: str
    distance: Optional[float] = None
    rank_score: Optional[float] = None
    overlap_keywords: Optional[list[str]] = None
    is_interested: bool = False
    explanation: Optional[str] = None
    created_at: Optional[datetime] = None
    # Candidate snapshot fields (from JOIN)
    name: Optional[str] = None
    email: Optional[str] = None
    skills: list[str] = []
    certifications: list[str] = []
    languages: list[str] = []
    years_experience: Optional[float] = None
    seniority: Optional[str] = None
    location: Optional[str] = None
    profile: Optional[dict] = None
    file_url: Optional[str] = None
    full_text: Optional[str] = None


class PaginatedApplications(BaseModel):
    items: list[ApplicationOut]
    page: int
    limit: int
    total: int


class InterestedUpdate(BaseModel):
    is_interested: bool


class CrossFitOut(BaseModel):
    id: str
    company_name: str
    position_title: str
    description: str
    rank_score: float
    position_in_posting: int


class SendEmailRequest(BaseModel):
    target_posting_id: str
    candidate_email: str
    candidate_name: Optional[str] = None
    recruiter_name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None


class ReportOut(BaseModel):
    posting: PostingOut
    applicants: list[ApplicationOut]
