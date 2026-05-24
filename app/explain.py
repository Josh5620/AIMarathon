from app.chutes import chutes

_EXPLAIN_SYSTEM = (
    "You are a recruiting assistant. In 2-3 sentences, explain "
    "why this candidate is a strong match for this role. Be specific — "
    "cite skills or experience that align. Don't invent facts not in the resume."
)


def generate_explanation(jd_text: str, resume_text: str, overlap_keywords: list[str]) -> str:
    return chutes.chat([
        {"role": "system", "content": _EXPLAIN_SYSTEM},
        {
            "role": "user",
            "content": (
                f"JOB DESCRIPTION:\n{jd_text}\n\n"
                f"CANDIDATE RESUME:\n{resume_text}\n\n"
                f"MATCHED KEYWORDS: {overlap_keywords}"
            ),
        },
    ])
