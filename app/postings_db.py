import json
import psycopg
from pgvector.psycopg import register_vector
from app.config import settings


def _connect() -> psycopg.Connection:
    conn = psycopg.connect(settings.SUPABASE_DB_URL)
    register_vector(conn)
    return conn


def create_posting(
    recruiter_email: str,
    company_name: str,
    position_title: str,
    description: str,
    jd_embedding: list[float],
    jd_keywords: list[str],
    *,
    requirements: str | None = None,
) -> str:
    sql = """
        INSERT INTO job_postings
            (recruiter_email, company_name, position_title, description, requirements,
             jd_embedding, jd_keywords, status)
        VALUES
            (%(recruiter_email)s, %(company_name)s, %(position_title)s, %(description)s,
             %(requirements)s, %(jd_embedding)s, %(jd_keywords)s, 'open')
        RETURNING id::text;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {
                "recruiter_email": recruiter_email,
                "company_name": company_name,
                "position_title": position_title,
                "description": description,
                "requirements": requirements,
                "jd_embedding": jd_embedding,
                "jd_keywords": jd_keywords,
            })
            row = cur.fetchone()
        conn.commit()
    return row[0]


def list_postings_for_recruiter(
    recruiter_email: str,
    limit: int = 10,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Returns (rows, total_count) for a paginated recruiter postings list."""
    count_sql = """
        SELECT COUNT(*) FROM job_postings WHERE recruiter_email = %(email)s;
    """
    rows_sql = """
        SELECT
            id::text, recruiter_email, company_name, position_title,
            description, requirements, status, created_at, updated_at,
            (SELECT COUNT(*) FROM applications WHERE posting_id = job_postings.id) AS applicant_count
        FROM job_postings
        WHERE recruiter_email = %(email)s
        ORDER BY created_at DESC
        LIMIT %(limit)s OFFSET %(offset)s;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(count_sql, {"email": recruiter_email})
            total = cur.fetchone()[0]
            cur.execute(rows_sql, {"email": recruiter_email, "limit": limit, "offset": offset})
            cols = [desc[0] for desc in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    return rows, total


def list_open_postings(limit: int = 10, offset: int = 0) -> tuple[list[dict], int]:
    """Returns (rows, total_count) for the public guest postings list."""
    count_sql = "SELECT COUNT(*) FROM job_postings WHERE status = 'open';"
    rows_sql = """
        SELECT
            id::text, company_name, position_title, description, requirements,
            status, created_at,
            (SELECT COUNT(*) FROM applications WHERE posting_id = job_postings.id) AS applicant_count
        FROM job_postings
        WHERE status = 'open'
        ORDER BY created_at DESC
        LIMIT %(limit)s OFFSET %(offset)s;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(count_sql)
            total = cur.fetchone()[0]
            cur.execute(rows_sql, {"limit": limit, "offset": offset})
            cols = [desc[0] for desc in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    return rows, total


def get_posting(posting_id: str) -> dict | None:
    sql = """
        SELECT
            id::text, recruiter_email, company_name, position_title,
            description, requirements, jd_keywords, status, created_at, updated_at,
            (SELECT COUNT(*) FROM applications WHERE posting_id = job_postings.id) AS applicant_count
        FROM job_postings
        WHERE id = %(id)s::uuid;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": posting_id})
            row = cur.fetchone()
            if row is None:
                return None
            cols = [desc[0] for desc in cur.description]
    return dict(zip(cols, row))


def get_posting_with_embedding(posting_id: str) -> dict | None:
    """Like get_posting but also returns jd_embedding (heavy — only use when needed)."""
    sql = """
        SELECT
            id::text, recruiter_email, company_name, position_title,
            description, requirements, jd_embedding, jd_keywords, status
        FROM job_postings
        WHERE id = %(id)s::uuid;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": posting_id})
            row = cur.fetchone()
            if row is None:
                return None
            cols = [desc[0] for desc in cur.description]
    return dict(zip(cols, row))


def update_posting(
    posting_id: str,
    *,
    company_name: str | None = None,
    position_title: str | None = None,
    description: str | None = None,
    requirements: str | None = None,
    status: str | None = None,
) -> dict | None:
    sets = ["updated_at = now()"]
    params: dict = {"id": posting_id}
    if company_name is not None:
        sets.append("company_name = %(company_name)s")
        params["company_name"] = company_name
    if position_title is not None:
        sets.append("position_title = %(position_title)s")
        params["position_title"] = position_title
    if description is not None:
        sets.append("description = %(description)s")
        params["description"] = description
    if requirements is not None:
        sets.append("requirements = %(requirements)s")
        params["requirements"] = requirements
    if status is not None:
        sets.append("status = %(status)s")
        params["status"] = status

    sql = f"""
        UPDATE job_postings SET {", ".join(sets)}
        WHERE id = %(id)s::uuid
        RETURNING id::text;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
        conn.commit()
    return {"id": row[0]} if row else None


def delete_posting(posting_id: str) -> bool:
    sql = "DELETE FROM job_postings WHERE id = %(id)s::uuid RETURNING id;"
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": posting_id})
            deleted = cur.fetchone() is not None
        conn.commit()
    return deleted
