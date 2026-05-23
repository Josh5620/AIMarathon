import json
import psycopg
from pgvector.psycopg import register_vector
from app.config import settings


def _connect() -> psycopg.Connection:
    conn = psycopg.connect(settings.SUPABASE_DB_URL)
    register_vector(conn)
    return conn


def insert_candidate(
    full_text: str,
    embedding: list[float],
    keywords: list[str],
    *,
    name: str | None = None,
    email: str | None = None,
    file_url: str | None = None,
    skills: list[str] | None = None,
    certifications: list[str] | None = None,
    languages: list[str] | None = None,
    years_experience: float | None = None,
    seniority: str | None = None,
    location: str | None = None,
    profile: dict | None = None,
) -> str:
    """Insert a candidate row. Returns the new UUID as a string."""
    sql = """
        INSERT INTO candidates (
            name, email, full_text, embedding, keywords,
            skills, certifications, languages,
            years_experience, seniority, location, profile, file_url
        )
        VALUES (
            %(name)s, %(email)s, %(full_text)s, %(embedding)s, %(keywords)s,
            %(skills)s, %(certifications)s, %(languages)s,
            %(years_experience)s, %(seniority)s, %(location)s,
            %(profile)s::jsonb, %(file_url)s
        )
        RETURNING id::text;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                {
                    "name": name,
                    "email": email,
                    "full_text": full_text,
                    "embedding": embedding,
                    "keywords": keywords,
                    "skills": skills or [],
                    "certifications": certifications or [],
                    "languages": languages or [],
                    "years_experience": years_experience,
                    "seniority": seniority,
                    "location": location,
                    "profile": json.dumps(profile or {}),
                    "file_url": file_url,
                },
            )
            row = cur.fetchone()
        conn.commit()
    return row[0]


def search_candidates(
    jd_vector: list[float],
    jd_keywords: list[str],
    limit: int = 10,
    *,
    min_years_experience: float | None = None,
    required_languages: list[str] | None = None,
    required_certifications: list[str] | None = None,
    seniority_in: list[str] | None = None,
    location_contains: str | None = None,
) -> list[dict]:
    """
    Return up to `limit` candidates ranked by cosine similarity to jd_vector,
    pre-filtered to those sharing at least one keyword with jd_keywords.
    Optional hard filters narrow the pool before ranking.

    Each dict contains: id, name, full_text, keywords, skills, certifications,
    languages, years_experience, seniority, location, profile, distance, overlap_keywords.
    """
    where_parts = ["keywords && %(jd_kw)s::text[]"]
    params: dict = {
        "jd_vec": jd_vector,
        "jd_kw": jd_keywords,
        "limit": limit,
    }

    if min_years_experience is not None:
        where_parts.append("years_experience >= %(min_yoe)s")
        params["min_yoe"] = min_years_experience

    if required_languages:
        where_parts.append("languages @> %(req_langs)s::text[]")
        params["req_langs"] = required_languages

    if required_certifications:
        where_parts.append("certifications @> %(req_certs)s::text[]")
        params["req_certs"] = required_certifications

    if seniority_in:
        where_parts.append("seniority = ANY(%(seniority_in)s::text[])")
        params["seniority_in"] = seniority_in

    if location_contains:
        where_parts.append("location ILIKE %(loc)s")
        params["loc"] = f"%{location_contains}%"

    where_clause = " AND ".join(where_parts)

    sql = f"""
        SELECT
            id::text,
            name,
            full_text,
            keywords,
            skills,
            certifications,
            languages,
            years_experience::float,
            seniority,
            location,
            profile,
            embedding <=> %(jd_vec)s::vector AS distance,
            ARRAY(
                SELECT unnest(keywords)
                INTERSECT
                SELECT unnest(%(jd_kw)s::text[])
            ) AS overlap_keywords
        FROM candidates
        WHERE {where_clause}
        ORDER BY distance ASC
        LIMIT %(limit)s;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            cols = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

    return [dict(zip(cols, row)) for row in rows]


def get_candidate(candidate_id: str) -> dict | None:
    """Fetch a single candidate by UUID. Returns None if not found."""
    sql = """
        SELECT
            id::text, name, email, full_text, keywords,
            skills, certifications, languages,
            years_experience::float, seniority, location, profile,
            file_url, created_at
        FROM candidates
        WHERE id = %(id)s::uuid;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": candidate_id})
            row = cur.fetchone()
            if row is None:
                return None
            cols = [desc[0] for desc in cur.description]
    return dict(zip(cols, row))
