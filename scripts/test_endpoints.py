"""
API endpoint integration tests — no running server needed (uses FastAPI TestClient).

    python scripts/test_endpoints.py

Tests all four endpoints against real Chutes + Supabase.
The only mock is extract_text (stub until OCR teammate implements it) — everything
else (embedding, keyword extraction, DB writes/reads) runs for real.

Cleans up all inserted test rows at the end.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import json
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
import psycopg
from pgvector.psycopg import register_vector
from app.config import settings

client = TestClient(app)

SAMPLE_RESUME = """
Jane Doe — jane@example.com

Senior Software Engineer, 6 years experience.

Skills: Python, FastAPI, PostgreSQL, Docker, Kubernetes, Redis, machine learning, scikit-learn
Experience:
  - Backend Engineer at TechCorp (2020-2024): built REST APIs with FastAPI and PostgreSQL,
    deployed microservices on Kubernetes, reduced p99 latency by 40%.
  - Data Engineer at DataCo (2018-2020): ETL pipelines in Python, scikit-learn for anomaly
    detection in fintech data.

Education: B.Sc. Computer Science, MIT, 2018
"""

SAMPLE_JD = """
Senior Backend Engineer — Fintech Platform

Requirements:
- 4+ years Python development
- FastAPI or Django REST Framework
- PostgreSQL and Redis
- Docker and Kubernetes
- Machine learning or data engineering experience a plus

Responsibilities:
- Design and implement scalable REST APIs
- Maintain PostgreSQL data models
- Collaborate with the data science team
"""

_inserted_ids: list[str] = []


def separator(label: str) -> None:
    print(f"\n{'='*60}\n  {label}\n{'='*60}")


def cleanup() -> None:
    if not _inserted_ids:
        return
    conn = psycopg.connect(settings.SUPABASE_DB_URL)
    register_vector(conn)
    with conn.cursor() as cur:
        for cid in _inserted_ids:
            cur.execute("DELETE FROM candidates WHERE id = %s::uuid", (cid,))
    conn.commit()
    conn.close()
    print(f"\nCleaned up {len(_inserted_ids)} test row(s): {_inserted_ids}")


# ── Test 1: Health ────────────────────────────────────────────────────────────

def test_health() -> None:
    separator("1. GET /api/health")
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["status"] == "ok", f"Expected status=ok, got: {data}"
    assert "timestamp" in data, "Missing timestamp field"
    print(f"PASS — {data}")


# ── Test 2: Upload ────────────────────────────────────────────────────────────

def test_upload() -> str:
    separator("2. POST /api/candidates/upload")

    with patch("app.routers.candidates.extract_text", new=AsyncMock(return_value=SAMPLE_RESUME)):
        resp = client.post(
            "/api/candidates/upload",
            files={"file": ("resume.pdf", b"%PDF dummy content", "application/pdf")},
        )

    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "id" in data, f"Response missing 'id': {data}"
    assert data["message"] == "uploaded", f"Unexpected message: {data}"

    candidate_id = data["id"]
    _inserted_ids.append(candidate_id)
    print(f"PASS — candidate inserted with id: {candidate_id}")
    return candidate_id


# ── Test 3: Get candidate ─────────────────────────────────────────────────────

def test_get_candidate(candidate_id: str) -> None:
    separator("3. GET /api/candidates/{id}")

    resp = client.get(f"/api/candidates/{candidate_id}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()

    assert data["id"] == candidate_id
    assert "full_text" in data and len(data["full_text"]) > 0
    assert "keywords" in data and len(data["keywords"]) > 0
    print(f"PASS — retrieved candidate: id={data['id']}, keywords={data['keywords'][:5]}...")

    separator("3b. GET /api/candidates/{id} — 404 on unknown id")
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = client.get(f"/api/candidates/{fake_id}")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
    print(f"PASS — unknown id returns 404")


# ── Test 4: Search ────────────────────────────────────────────────────────────

def test_search(candidate_id: str) -> None:
    separator("4. POST /api/recruiter/search")

    resp = client.post(
        "/api/recruiter/search",
        json={"jobDescription": SAMPLE_JD},
    )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()

    assert "results" in data, f"Response missing 'results': {data}"
    results = data["results"]
    assert len(results) > 0, "Search returned 0 results — keyword overlap filter may be too strict"

    top = results[0]
    print(f"Results returned: {len(results)}")
    print(f"Top match:")
    print(f"  id:               {top['id']}")
    print(f"  name:             {top.get('name')}")
    print(f"  distance:         {top['distance']:.4f}  (lower = better)")
    print(f"  overlap_keywords: {top['overlap_keywords']}")
    print(f"  explanation:      {top['explanation'][:120]}...")

    assert top["distance"] < 1.0, f"Distance >= 1.0 ({top['distance']}) — vectors broken"
    assert len(top["overlap_keywords"]) > 0, "No keyword overlap — check keyword extraction"
    assert len(top["explanation"]) > 20, "Explanation is suspiciously short"

    our_candidate = next((r for r in results if r["id"] == candidate_id), None)
    assert our_candidate is not None, (
        f"The candidate we just uploaded ({candidate_id}) didn't appear in search results. "
        "Keyword overlap may be too strict or embedding failed."
    )
    print(f"PASS — uploaded candidate appears in results at distance {our_candidate['distance']:.4f}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    try:
        test_health()
        candidate_id = test_upload()
        test_get_candidate(candidate_id)
        test_search(candidate_id)
        separator("ALL ENDPOINT TESTS PASSED")
        print("All four endpoints are working correctly with real embeddings and DB.\n")
    finally:
        cleanup()


if __name__ == "__main__":
    main()
