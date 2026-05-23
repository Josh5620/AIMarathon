from datetime import datetime
from pydantic import BaseModel


class UploadResponse(BaseModel):
    id: str
    message: str


class CandidateDetail(BaseModel):
    id: str
    name: str | None
    email: str | None
    full_text: str
    keywords: list[str]
    file_url: str | None
    created_at: datetime | None


class SearchRequest(BaseModel):
    jobDescription: str


class MatchResult(BaseModel):
    id: str
    name: str | None
    distance: float
    overlap_keywords: list[str]
    explanation: str


class SearchResponse(BaseModel):
    results: list[MatchResult]


class HealthResponse(BaseModel):
    status: str
    timestamp: str
