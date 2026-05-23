"""
End-to-end smoke test for the DB + Keywords modules.

Run from the project root (with .venv active and .env populated):
    python scripts/smoke_test.py
"""
import sys
import json
from pathlib import Path

# Allow running from project root without installing the package
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.chutes import chutes, EMBED_DIM
from app.keywords import extract_keywords
from app.db import insert_candidate, search_candidates
import psycopg
from pgvector.psycopg import register_vector
from app.config import settings

SAMPLE_RESUME = """
Jane Doe
jane@example.com

Senior Software Engineer with 6 years of experience.

Skills: Python, FastAPI, PostgreSQL, Docker, Kubernetes, Redis, machine learning, scikit-learn
Experience:
  - Backend Engineer at TechCorp (2020-2024): built REST APIs with FastAPI and PostgreSQL,
    deployed microservices on Kubernetes, reduced p99 latency by 40%.
  - Data Engineer at DataCo (2018-2020): built ETL pipelines in Python, used scikit-learn
    for anomaly detection in fintech data.

Education: B.Sc. Computer Science, MIT, 2018
"""

SAMPLE_JD = """
We are looking for a Senior Backend Engineer to join our fintech platform team.

Requirements:
- 4+ years of Python development experience
- Strong knowledge of FastAPI or Django REST framework
- Experience with PostgreSQL and Redis
- Familiarity with Docker and Kubernetes
- Machine learning or data engineering experience is a plus

Responsibilities:
- Design and implement scalable REST APIs
- Maintain and extend our PostgreSQL data models
- Collaborate with the data science team on ML feature pipelines
"""


def separator(label: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {label}")
    print("=" * 60)


def main() -> None:
    separator("1. Keyword extraction — resume")
    resume_keywords = extract_keywords(SAMPLE_RESUME)
    print(f"Keywords ({len(resume_keywords)}): {resume_keywords}")
    assert len(resume_keywords) > 0, "No keywords extracted from resume"

    separator("2. Keyword extraction — JD")
    jd_keywords = extract_keywords(SAMPLE_JD)
    print(f"Keywords ({len(jd_keywords)}): {jd_keywords}")
    assert len(jd_keywords) > 0, "No keywords extracted from JD"

    separator("3. Embedding — resume")
    resume_vec = chutes.embed(SAMPLE_RESUME)
    print(f"Embedding dimension: {len(resume_vec)}")
    assert len(resume_vec) == EMBED_DIM, (
        f"Dimension mismatch: got {len(resume_vec)}, expected {EMBED_DIM}. "
        "Update EMBED_DIM in app/chutes.py and re-run db/schema.sql with the correct VECTOR(N)."
    )

    separator("4. Embedding — JD")
    jd_vec = chutes.embed(SAMPLE_JD)
    print(f"Embedding dimension: {len(jd_vec)}")

    separator("5. Insert candidate into DB")
    candidate_id = insert_candidate(
        full_text=SAMPLE_RESUME,
        embedding=resume_vec,
        keywords=resume_keywords,
        name="Jane Doe",
        email="jane@example.com",
    )
    print(f"Inserted candidate ID: {candidate_id}")

    separator("6. Search candidates")
    results = search_candidates(jd_vector=jd_vec, jd_keywords=jd_keywords, limit=5)
    print(f"Results returned: {len(results)}")
    assert len(results) > 0, "search_candidates returned 0 results — keyword overlap filter may be too strict"
    top = results[0]
    print(f"\nTop match:")
    print(f"  id:               {top['id']}")
    print(f"  name:             {top['name']}")
    print(f"  distance:         {top['distance']:.4f}")
    print(f"  overlap_keywords: {top['overlap_keywords']}")
    assert top["distance"] < 1.0, "Cosine distance >= 1.0 — something is wrong with the vectors"
    assert len(top["overlap_keywords"]) > 0, "No keyword overlap found — check keyword extraction"

    separator("7. Cleanup")
    conn = psycopg.connect(settings.SUPABASE_DB_URL)
    register_vector(conn)
    with conn.cursor() as cur:
        cur.execute("DELETE FROM candidates WHERE id = %s::uuid", (candidate_id,))
    conn.commit()
    conn.close()
    print(f"Deleted test row {candidate_id}")

    separator("ALL CHECKS PASSED")
    print("DB + Keywords modules are working correctly. Ready for API team handoff.\n")


if __name__ == "__main__":
    main()
