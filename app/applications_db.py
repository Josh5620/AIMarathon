import psycopg
from pgvector.psycopg import register_vector
from app.config import settings


def _connect() -> psycopg.Connection:
    conn = psycopg.connect(settings.SUPABASE_DB_URL)
    register_vector(conn)
    return conn


def upsert_application(
    posting_id: str,
    candidate_id: str,
    distance: float,
    overlap_keywords: list[str],
) -> str:
    """Insert or update an application row. Returns the application UUID."""
    rank_score = 1.0 - distance
    sql = """
        INSERT INTO applications
            (posting_id, candidate_id, distance, rank_score, overlap_keywords)
        VALUES
            (%(posting_id)s::uuid, %(candidate_id)s::uuid,
             %(distance)s, %(rank_score)s, %(overlap_keywords)s)
        ON CONFLICT (posting_id, candidate_id)
        DO UPDATE SET
            distance         = EXCLUDED.distance,
            rank_score       = EXCLUDED.rank_score,
            overlap_keywords = EXCLUDED.overlap_keywords
        RETURNING id::text;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {
                "posting_id": posting_id,
                "candidate_id": candidate_id,
                "distance": distance,
                "rank_score": rank_score,
                "overlap_keywords": overlap_keywords,
            })
            row = cur.fetchone()
        conn.commit()
    return row[0]


def list_applications_for_posting(
    posting_id: str,
    limit: int = 10,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Returns (rows, total) of ranked applicants for a posting, joined with candidate snapshot."""
    count_sql = "SELECT COUNT(*) FROM applications WHERE posting_id = %(pid)s::uuid;"
    rows_sql = """
        SELECT
            a.id::text          AS application_id,
            a.posting_id::text,
            a.candidate_id::text,
            a.distance,
            a.rank_score,
            a.overlap_keywords,
            a.is_interested,
            a.created_at,
            c.name,
            c.email,
            c.skills,
            c.certifications,
            c.languages,
            c.years_experience::float,
            c.seniority,
            c.location,
            c.profile,
            c.file_url,
            a.explanation
        FROM applications a
        JOIN candidates c ON c.id = a.candidate_id
        WHERE a.posting_id = %(pid)s::uuid
        ORDER BY a.rank_score DESC
        LIMIT %(limit)s OFFSET %(offset)s;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(count_sql, {"pid": posting_id})
            total = cur.fetchone()[0]
            cur.execute(rows_sql, {"pid": posting_id, "limit": limit, "offset": offset})
            cols = [desc[0] for desc in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    return rows, total


def get_application(application_id: str) -> dict | None:
    sql = """
        SELECT
            a.id::text          AS application_id,
            a.posting_id::text,
            a.candidate_id::text,
            a.distance,
            a.rank_score,
            a.overlap_keywords,
            a.is_interested,
            a.explanation,
            a.created_at,
            c.name,
            c.email,
            c.full_text,
            c.skills,
            c.certifications,
            c.languages,
            c.years_experience::float,
            c.seniority,
            c.location,
            c.profile,
            c.file_url
        FROM applications a
        JOIN candidates c ON c.id = a.candidate_id
        WHERE a.id = %(id)s::uuid;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": application_id})
            row = cur.fetchone()
            if row is None:
                return None
            cols = [desc[0] for desc in cur.description]
    return dict(zip(cols, row))


def set_interested(application_id: str, value: bool) -> bool:
    sql = """
        UPDATE applications SET is_interested = %(val)s
        WHERE id = %(id)s::uuid
        RETURNING id;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": application_id, "val": value})
            updated = cur.fetchone() is not None
        conn.commit()
    return updated


def set_explanation(application_id: str, text: str) -> None:
    sql = "UPDATE applications SET explanation = %(text)s WHERE id = %(id)s::uuid;"
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": application_id, "text": text})
        conn.commit()


def cross_fit_postings_for_candidate(
    candidate_id: str,
    recruiter_email: str,
    current_posting_id: str,
    top_n: int = 5,
) -> list[dict]:
    """
    For each other open posting by this recruiter, compute this candidate's rank
    among that posting's applicants.  Returns postings where the candidate falls
    inside the top-N (rank position <= top_n), ordered by rank_score DESC.
    """
    sql = """
        WITH ranked AS (
            SELECT
                a.posting_id,
                a.candidate_id,
                a.rank_score,
                RANK() OVER (
                    PARTITION BY a.posting_id ORDER BY a.rank_score DESC
                ) AS position_in_posting
            FROM applications a
            JOIN job_postings jp ON jp.id = a.posting_id
            WHERE jp.recruiter_email = %(recruiter_email)s
              AND jp.status          = 'open'
              AND jp.id             != %(current_posting_id)s::uuid
        )
        SELECT
            jp.id::text,
            jp.company_name,
            jp.position_title,
            jp.description,
            r.rank_score,
            r.position_in_posting::int
        FROM ranked r
        JOIN job_postings jp ON jp.id = r.posting_id
        WHERE r.candidate_id = %(candidate_id)s::uuid
          AND r.position_in_posting <= %(top_n)s
        ORDER BY r.rank_score DESC;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {
                "candidate_id": candidate_id,
                "recruiter_email": recruiter_email,
                "current_posting_id": current_posting_id,
                "top_n": top_n,
            })
            cols = [desc[0] for desc in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    return rows


def list_all_applications_for_posting(posting_id: str) -> list[dict]:
    """Returns all applications for a posting (no pagination — used for printable report)."""
    sql = """
        SELECT
            a.id::text          AS application_id,
            a.posting_id::text  AS posting_id,
            a.candidate_id::text AS candidate_id,
            a.rank_score,
            a.distance,
            a.overlap_keywords,
            a.is_interested,
            a.explanation,
            c.name,
            c.email,
            c.skills,
            c.years_experience::float,
            c.seniority,
            c.location,
            c.profile
        FROM applications a
        JOIN candidates c ON c.id = a.candidate_id
        WHERE a.posting_id = %(pid)s::uuid
        ORDER BY a.rank_score DESC;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"pid": posting_id})
            cols = [desc[0] for desc in cur.description]
            rows = [dict(zip(cols, row)) for row in cur.fetchall()]
    return rows
