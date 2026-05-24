from app.db import _connect


def insert_meeting(
    *,
    recruiter_email: str,
    candidate_id: str,
    candidate_email: str,
    candidate_name: str | None,
    scheduled_at: str,
    duration_minutes: int,
    google_event_id: str | None,
    meet_link: str | None,
    notes: str | None,
) -> dict:
    sql = """
        INSERT INTO meetings (
            recruiter_email, candidate_id, candidate_email, candidate_name,
            scheduled_at, duration_minutes, google_event_id, meet_link, notes
        )
        VALUES (
            %(recruiter_email)s, %(candidate_id)s::uuid, %(candidate_email)s, %(candidate_name)s,
            %(scheduled_at)s::timestamptz, %(duration_minutes)s,
            %(google_event_id)s, %(meet_link)s, %(notes)s
        )
        RETURNING
            id::text, recruiter_email, candidate_id::text, candidate_email, candidate_name,
            scheduled_at::text, duration_minutes, google_event_id, meet_link, notes, created_at::text;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {
                "recruiter_email": recruiter_email,
                "candidate_id": candidate_id,
                "candidate_email": candidate_email,
                "candidate_name": candidate_name,
                "scheduled_at": scheduled_at,
                "duration_minutes": duration_minutes,
                "google_event_id": google_event_id,
                "meet_link": meet_link,
                "notes": notes,
            })
            row = cur.fetchone()
            cols = [desc[0] for desc in cur.description]
        conn.commit()
    return dict(zip(cols, row))


def get_meeting(meeting_id: str) -> dict | None:
    sql = """
        SELECT
            id::text, recruiter_email, candidate_id::text, candidate_email, candidate_name,
            scheduled_at::text, duration_minutes, google_event_id, meet_link, notes, created_at::text
        FROM meetings
        WHERE id = %(id)s::uuid;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": meeting_id})
            row = cur.fetchone()
            if row is None:
                return None
            cols = [desc[0] for desc in cur.description]
    return dict(zip(cols, row))


def delete_meeting(meeting_id: str) -> bool:
    sql = "DELETE FROM meetings WHERE id = %(id)s::uuid RETURNING id;"
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"id": meeting_id})
            deleted = cur.fetchone() is not None
        conn.commit()
    return deleted


def list_meetings_for_recruiter(recruiter_email: str) -> list[dict]:
    sql = """
        SELECT
            id::text, recruiter_email, candidate_id::text, candidate_email, candidate_name,
            scheduled_at::text, duration_minutes, google_event_id, meet_link, notes, created_at::text
        FROM meetings
        WHERE LOWER(recruiter_email) = LOWER(%(email)s)
        ORDER BY scheduled_at DESC;
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, {"email": recruiter_email})
            cols = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
    return [dict(zip(cols, row)) for row in rows]
