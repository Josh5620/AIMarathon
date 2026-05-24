import uuid
from datetime import datetime, timedelta, timezone

import httpx

_CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events"


class CalendarAuthError(Exception):
    """Raised when the Google access token is invalid or expired."""


def create_meeting_event(
    access_token: str,
    *,
    recruiter_email: str,
    candidate_email: str,
    candidate_name: str | None,
    start_iso: str,
    duration_minutes: int,
    summary: str,
    description: str,
) -> dict:
    """
    Create a Google Calendar event with a Meet link on the recruiter's calendar.
    sendUpdates=all causes Google to email the .ics invite to every attendee,
    including non-Gmail addresses — the candidate needs no Google account to receive
    the invite or join the meeting via the Meet link.
    Returns the parsed event dict (includes meet_link and google_event_id).
    """
    start_dt = datetime.fromisoformat(start_iso)
    end_dt = start_dt + timedelta(minutes=duration_minutes)

    body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "UTC"},
        "end":   {"dateTime": end_dt.isoformat(),   "timeZone": "UTC"},
        "attendees": [
            {"email": recruiter_email},
            {"email": candidate_email, "displayName": candidate_name or candidate_email},
        ],
        "conferenceData": {
            "createRequest": {
                "requestId": str(uuid.uuid4()),
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "email",  "minutes": 24 * 60},
                {"method": "popup",  "minutes": 10},
            ],
        },
    }

    with httpx.Client(timeout=15) as client:
        resp = client.post(
            _CALENDAR_API,
            params={"conferenceDataVersion": "1", "sendUpdates": "all"},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=body,
        )

    if resp.status_code == 401:
        raise CalendarAuthError(
            "Google access token is invalid or expired. Please sign out and sign in again."
        )
    if not resp.is_success:
        raise RuntimeError(
            f"Google Calendar API returned {resp.status_code}: {resp.text[:400]}"
        )

    event = resp.json()
    meet_link = None
    for ep in (event.get("conferenceData") or {}).get("entryPoints") or []:
        if ep.get("entryPointType") == "video":
            meet_link = ep.get("uri")
            break
    if not meet_link:
        meet_link = event.get("hangoutLink")

    return {
        "google_event_id": event.get("id"),
        "meet_link": meet_link,
        "html_link": event.get("htmlLink"),
    }
