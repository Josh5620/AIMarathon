import base64
import email.message

import httpx

_GMAIL_SEND_API = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


class GmailAuthError(Exception):
    """Raised when the Google access token is invalid or expired."""


def send_email(
    access_token: str,
    *,
    to: str,
    subject: str,
    body: str,
    from_name: str | None = None,
) -> str:
    """
    Send an email via the Gmail API using the recruiter's OAuth token.
    Returns the Gmail message ID on success.
    """
    msg = email.message.EmailMessage()
    msg["To"] = to
    msg["Subject"] = subject
    if from_name:
        msg["From"] = from_name
    msg.set_content(body)

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    with httpx.Client(timeout=15) as client:
        resp = client.post(
            _GMAIL_SEND_API,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"raw": raw},
        )

    if resp.status_code == 401:
        raise GmailAuthError(
            "Google access token is invalid or expired — gmail.send scope may be missing. "
            "Please sign out and sign in again."
        )
    if not resp.is_success:
        raise RuntimeError(
            f"Gmail API returned {resp.status_code}: {resp.text[:400]}"
        )

    return resp.json().get("id", "")
