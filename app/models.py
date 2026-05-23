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
