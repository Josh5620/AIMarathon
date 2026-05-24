from app.db import _connect

_PROFILE_COLUMNS = {"name", "organization", "job_title", "bio", "phone", "avatar_url"}


def get_recruiter(email: str) -> dict | None:
    sql = """
        SELECT email, active, name, organization, job_title, bio, phone, avatar_url
        FROM recruiters
        WHERE LOWER(email) = LOWER(%(email)s)
        LIMIT 1;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"email": email})
            row = cur.fetchone()
            if row is None:
                return None
            cols = [desc[0] for desc in cur.description]
    return dict(zip(cols, row))


def update_recruiter_profile(email: str, **fields) -> dict | None:
    safe = {k: v for k, v in fields.items() if k in _PROFILE_COLUMNS and v is not None}
    if not safe:
        return get_recruiter(email)

    set_clause = ", ".join(f"{col} = %({col})s" for col in safe)
    sql = f"""
        UPDATE recruiters
        SET {set_clause}
        WHERE LOWER(email) = LOWER(%(email)s)
        RETURNING email, active, name, organization, job_title, bio, phone, avatar_url;
    """
    params = {**safe, "email": email}
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            if row is None:
                return None
            cols = [desc[0] for desc in cur.description]
        conn.commit()
    return dict(zip(cols, row))
