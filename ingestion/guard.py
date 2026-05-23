import re
import unicodedata
from collections import Counter

# ── Thresholds (all tunable here) ────────────────────────────────────────────

MAX_TEXT_CHARS = 50_000
MIN_USABLE_CHARS = 30
MAX_NONPRINTABLE_RATIO = 0.30

INJECTION_PATTERNS: list[str] = [
    "ignore previous instructions",
    "ignore all previous",
    "disregard previous",
    "disregard all",
    "you must rate",
    "rate this candidate",
    "system prompt",
    "as an ai language model",
    "new instructions",
]

# Keyword-stuffing heuristics
STUFFING_UNIQUE_RATIO_THRESHOLD = 0.30   # unique / total token count
STUFFING_MAX_TOKEN_REPEAT = 25           # any single token this many times → stuffing
STUFFING_MAX_CSV_RUN = 50               # comma/space-separated run of N+ items → stuffing

# Zero-width / invisible Unicode ranges to strip
_INVISIBLE_CHARS = re.compile(
    r"[​-‏⁠-⁤﻿­͏឴឵᠋-᠍"
    r"‪-‮⁦-⁯]"
)


def guard_input(text: str) -> dict:
    """
    Normalize and validate extracted resume text.

    Returns a dict with keys:
        clean_text: str
        status: "ok" | "flagged" | "needs_review" | "blocked"
        reasons: list[str]
    """
    reasons: list[str] = []

    # ── Step 1: Normalize ────────────────────────────────────────────────────
    clean = _normalize(text)

    # ── Step 2: Truncate ─────────────────────────────────────────────────────
    if len(clean) > MAX_TEXT_CHARS:
        original_len = len(clean)
        clean = clean[:MAX_TEXT_CHARS]
        reasons.append(f"text truncated to {MAX_TEXT_CHARS} chars (was {original_len})")

    # ── Step 3: Usability ────────────────────────────────────────────────────
    if len(clean.strip()) < MIN_USABLE_CHARS:
        reasons.append("no extractable text — possibly a scanned document or empty file")
        return {"clean_text": clean, "status": "needs_review", "reasons": reasons}

    # ── Step 4: Garbled / bad-encoding ───────────────────────────────────────
    if _garbled_ratio(clean) > MAX_NONPRINTABLE_RATIO:
        reasons.append("text appears garbled — possible encoding issue")
        return {"clean_text": clean, "status": "needs_review", "reasons": reasons}

    # ── Step 5: Prompt injection ─────────────────────────────────────────────
    lower = clean.lower()
    for pattern in INJECTION_PATTERNS:
        if pattern in lower:
            reasons.append(f"prompt injection detected: '{pattern}'")
            return {"clean_text": clean, "status": "blocked", "reasons": reasons}

    # ── Step 6: Keyword stuffing ─────────────────────────────────────────────
    stuffing_reason = _detect_stuffing(clean)
    if stuffing_reason:
        reasons.append(stuffing_reason)
        return {"clean_text": clean, "status": "flagged", "reasons": reasons}

    # ── Step 7: All clear ─────────────────────────────────────────────────────
    return {"clean_text": clean, "status": "ok", "reasons": reasons}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Strip invisible Unicode; remove non-printable control chars; collapse whitespace."""
    # Remove zero-width / invisible chars
    text = _INVISIBLE_CHARS.sub("", text)

    # Strip control characters except tab, newline, carriage return
    cleaned: list[str] = []
    for ch in text:
        if ch in ("\t", "\n", "\r"):
            cleaned.append(ch)
        elif unicodedata.category(ch).startswith("C"):
            # Control / format / surrogate / private-use — drop it
            continue
        else:
            cleaned.append(ch)
    text = "".join(cleaned)

    # Collapse runs of spaces/tabs on a single line (preserve line breaks)
    lines = text.split("\n")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in lines]
    # Collapse more than 2 consecutive blank lines into one
    result = re.sub(r"\n{3,}", "\n\n", "\n".join(lines))
    return result.strip()


def _garbled_ratio(text: str) -> float:
    """Return proportion of replacement chars + non-printable chars (excl. \\n\\r\\t)."""
    if not text:
        return 0.0
    bad = sum(
        1 for ch in text
        if ch == "�" or (
            unicodedata.category(ch).startswith("C") and ch not in "\t\n\r"
        )
    )
    return bad / len(text)


def _detect_stuffing(text: str) -> str | None:
    """Return a human-readable reason string if keyword stuffing is detected, else None."""
    tokens = re.findall(r"\b\w+\b", text.lower())
    if not tokens:
        return None

    total = len(tokens)
    unique = len(set(tokens))

    # Unique-word ratio
    if total >= 50 and unique / total < STUFFING_UNIQUE_RATIO_THRESHOLD:
        return (
            f"keyword stuffing detected: unique-word ratio {unique/total:.2f} "
            f"below threshold {STUFFING_UNIQUE_RATIO_THRESHOLD}"
        )

    # Single-token repetition
    counts = Counter(tokens)
    most_common_token, most_common_count = counts.most_common(1)[0]
    if most_common_count >= STUFFING_MAX_TOKEN_REPEAT:
        return (
            f"keyword stuffing detected: token '{most_common_token}' "
            f"repeated {most_common_count} times"
        )

    # Long comma/space-separated keyword runs
    csv_run = _longest_csv_run(text)
    if csv_run >= STUFFING_MAX_CSV_RUN:
        return f"keyword stuffing detected: comma-separated keyword run of {csv_run} items"

    return None


def _longest_csv_run(text: str) -> int:
    """Count the longest run of comma-separated single-word tokens in the text."""
    # Split by newline, find lines with many comma-separated short tokens
    max_run = 0
    for line in text.split("\n"):
        parts = [p.strip() for p in line.split(",")]
        # A "keyword run" line: most parts are 1-3 words
        if len(parts) >= 3 and all(0 < len(p.split()) <= 3 for p in parts if p):
            max_run = max(max_run, len([p for p in parts if p]))
    return max_run
