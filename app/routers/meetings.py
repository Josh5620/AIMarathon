import asyncio

from fastapi import APIRouter, Header, HTTPException, Query

from app.db import get_candidate
from app.gcal import CalendarAuthError, create_meeting_event, cancel_meeting_event
from app.meetings_db import insert_meeting, list_meetings_for_recruiter, get_meeting, delete_meeting
from app.models import MeetingResponse, ScheduleMeetingRequest
from app.recruiters import get_recruiter

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("/schedule", response_model=MeetingResponse)
async def schedule_meeting(
    body: ScheduleMeetingRequest,
    x_google_access_token: str = Header(..., alias="X-Google-Access-Token"),
):
    recruiter = await asyncio.to_thread(get_recruiter, body.recruiter_email)
    if not recruiter or not recruiter.get("active"):
        raise HTTPException(status_code=403, detail="Recruiter not found or inactive.")

    candidate = await asyncio.to_thread(get_candidate, body.candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    if not candidate.get("email"):
        raise HTTPException(status_code=422, detail="Candidate has no email on file.")

    org = recruiter.get("organization") or ""
    recruiter_name = recruiter.get("name") or body.recruiter_email
    candidate_name = candidate.get("name")

    summary = f"Interview: {candidate_name or 'Candidate'}"
    if org:
        summary += f" — {org}"

    lines = [
        f"Recruiter: {recruiter_name} ({body.recruiter_email})",
        f"Candidate: {candidate_name or 'N/A'} ({candidate.get('email')})",
    ]
    if body.notes:
        lines.append(f"\nNotes: {body.notes}")
    lines.append(
        "\nThis meeting was scheduled via the Intelligent Recruiter platform. "
        "The Google Meet link above allows you to join without a Google account."
    )
    description = "\n".join(lines)

    try:
        event = await asyncio.to_thread(
            create_meeting_event,
            x_google_access_token,
            recruiter_email=body.recruiter_email,
            candidate_email=candidate["email"],
            candidate_name=candidate_name,
            start_iso=body.start_iso,
            duration_minutes=body.duration_minutes,
            summary=summary,
            description=description,
        )
    except CalendarAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Google Calendar error: {exc}")

    row = await asyncio.to_thread(
        insert_meeting,
        recruiter_email=body.recruiter_email,
        candidate_id=body.candidate_id,
        candidate_email=candidate["email"],
        candidate_name=candidate_name,
        scheduled_at=body.start_iso,
        duration_minutes=body.duration_minutes,
        google_event_id=event.get("google_event_id"),
        meet_link=event.get("meet_link"),
        notes=body.notes,
    )

    return MeetingResponse(**row)


@router.delete("/{meeting_id}", status_code=204)
async def cancel_meeting(
    meeting_id: str,
    x_google_access_token: str = Header(..., alias="X-Google-Access-Token"),
):
    meeting = await asyncio.to_thread(get_meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")

    if meeting.get("google_event_id"):
        try:
            await asyncio.to_thread(
                cancel_meeting_event,
                x_google_access_token,
                meeting["google_event_id"],
            )
        except CalendarAuthError as exc:
            raise HTTPException(status_code=401, detail=str(exc))
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Google Calendar error: {exc}")

    await asyncio.to_thread(delete_meeting, meeting_id)


@router.get("", response_model=list[MeetingResponse])
async def get_meetings(recruiter_email: str = Query(...)):
    rows = await asyncio.to_thread(list_meetings_for_recruiter, recruiter_email)
    return [MeetingResponse(**r) for r in rows]
