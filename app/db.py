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
    name: str | None = None,
    email: str | None = None,
    file_url: str | None = None,
) -> str:
    """Insert a candidate row. Returns the new UUID as a string."""
    sql = """
        INSERT INTO candidates (name, email, full_text, embedding, keywords, file_url)
        VALUES (%(name)s, %(email)s, %(full_text)s, %(embedding)s, %(keywords)s, %(file_url)s)
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
) -> list[dict]:
    """
    Return up to `limit` candidates ranked by cosine similarity to jd_vector,
    pre-filtered to those sharing at least one keyword with jd_keywords.

    Each dict contains:
      id, name, full_text, keywords, distance, overlap_keywords
    """
    sql = """
        SELECT
            id::text,
            name,
            full_text,
            keywords,
            embedding <=> %(jd_vec)s::vector AS distance,
            ARRAY(
                SELECT unnest(keywords)
                INTERSECT
                SELECT unnest(%(jd_kw)s::text[])
            ) AS overlap_keywords
        FROM candidates
        WHERE keywords && %(jd_kw)s::text[]
        ORDER BY distance ASC
        LIMIT %(limit)s;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                sql,
                {
                    "jd_vec": jd_vector,
                    "jd_kw": jd_keywords,
                    "limit": limit,
                },
            )
            cols = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

    return [dict(zip(cols, row)) for row in rows]
