import asyncio

from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from app.applications_db import (
    get_application,
    set_interested,
    set_explanation,
    cross_fit_postings_for_candidate,
)
from app.postings_db import get_posting
from app.explain import generate_explanation
from app.gmail import send_email, GmailAuthError
from app.models import (
    ApplicationOut,
    InterestedUpdate,
    CrossFitOut,
    SendEmailRequest,
    PostingOut,
)

router = APIRouter(prefix="/applications", tags=["applications"])


# ── Full application + candidate profile ──────────────────────────────────────

@router.get("/{application_id}", response_model=ApplicationOut)
async def get_application_detail(application_id: str):
    row = await asyncio.to_thread(get_application, application_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Application not found.")

    # Generate and cache explanation if missing
    if not row.get("explanation") and row.get("full_text"):
        posting = await asyncio.to_thread(get_posting, row["posting_id"])
        if posting:
            jd_text = f"{posting['description']}\n{posting.get('requirements') or ''}".strip()
            try:
                explanation = await asyncio.to_thread(
                    generate_explanation,
                    jd_text,
                    row["full_text"],
                    row.get("overlap_keywords") or [],
                )
                await asyncio.to_thread(set_explanation, application_id, explanation)
                row["explanation"] = explanation
            except Exception:
                row["explanation"] = "Explanation unavailable."

    return ApplicationOut(**row)


# ── Toggle interested ─────────────────────────────────────────────────────────

@router.patch("/{application_id}/interested", response_model=ApplicationOut)
async def toggle_interested(application_id: str, body: InterestedUpdate):
    updated = await asyncio.to_thread(set_interested, application_id, body.is_interested)
    if not updated:
        raise HTTPException(status_code=404, detail="Application not found.")
    row = await asyncio.to_thread(get_application, application_id)
    return ApplicationOut(**row)


# ── Cross-fit suggestions ─────────────────────────────────────────────────────

@router.get("/{application_id}/cross-fit", response_model=list[CrossFitOut])
async def get_cross_fit(application_id: str, top_n: int = 5):
    row = await asyncio.to_thread(get_application, application_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Application not found.")

    posting = await asyncio.to_thread(get_posting, row["posting_id"])
    if posting is None:
        raise HTTPException(status_code=404, detail="Posting not found.")

    fits = await asyncio.to_thread(
        cross_fit_postings_for_candidate,
        row["candidate_id"],
        posting["recruiter_email"],
        row["posting_id"],
        top_n,
    )
    return [CrossFitOut(**f) for f in fits]


# ── Send suggestion email ─────────────────────────────────────────────────────

@router.post("/{application_id}/send-suggestion-email")
async def send_suggestion_email(
    application_id: str,
    body: SendEmailRequest,
    x_google_access_token: Optional[str] = Header(None),
):
    if not x_google_access_token:
        raise HTTPException(status_code=401, detail="X-Google-Access-Token header required.")

    row = await asyncio.to_thread(get_application, application_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Application not found.")

    target_posting = await asyncio.to_thread(get_posting, body.target_posting_id)
    if target_posting is None:
        raise HTTPException(status_code=404, detail="Target posting not found.")

    candidate_email = body.candidate_email or row.get("email")
    if not candidate_email:
        raise HTTPException(status_code=422, detail="Candidate email is required to send suggestion.")

    candidate_name = body.candidate_name or row.get("name") or "Candidate"
    recruiter_name = body.recruiter_name or "The Recruiting Team"

    subject = body.subject or (
        f"A Better-Fit Opportunity at {target_posting['company_name']} — "
        f"{target_posting['position_title']}"
    )
    email_body = body.body or (
        f"Dear {candidate_name},\n\n"
        f"Thank you for your interest. Based on your profile, we believe you would be "
        f"an excellent fit for another role at {target_posting['company_name']}:\n\n"
        f"Position: {target_posting['position_title']}\n\n"
        f"{target_posting['description'][:500]}{'...' if len(target_posting['description']) > 500 else ''}\n\n"
        f"We would love to discuss this opportunity with you further.\n\n"
        f"Best regards,\n{recruiter_name}"
    )

    try:
        message_id = await asyncio.to_thread(
            send_email,
            x_google_access_token,
            to=candidate_email,
            subject=subject,
            body=email_body,
            from_name=recruiter_name,
        )
    except GmailAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to send email: {exc}")

    return {"status": "sent", "message_id": message_id}
