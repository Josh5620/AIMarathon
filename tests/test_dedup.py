"""Tests for app.ingestion.dedup — candidate-level deduplication logic."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.ingestion.dedup import check_duplicate, normalize_name, normalize_email

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

BASE = {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "full_text": "Jane Doe\njane@example.com\nSenior Engineer, 5 years.",
    "keywords": ["python", "fastapi"],
    "skills": ["python", "fastapi"],
    "certifications": [],
    "languages": ["english"],
    "years_experience": 5.0,
    "seniority": "senior",
    "location": "Singapore",
}

EXISTING = [BASE.copy()]


# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------

class TestNormalizeName:
    def test_lowercases(self):
        assert normalize_name("JANE DOE") == "jane doe"

    def test_strips_whitespace(self):
        assert normalize_name("  Jane Doe  ") == "jane doe"

    def test_collapses_internal_whitespace(self):
        assert normalize_name("Jane  Doe") == "jane doe"

    def test_none_returns_empty(self):
        assert normalize_name(None) == ""

    def test_empty_returns_empty(self):
        assert normalize_name("") == ""


class TestNormalizeEmail:
    def test_lowercases(self):
        assert normalize_email("JANE@EXAMPLE.COM") == "jane@example.com"

    def test_strips_whitespace(self):
        assert normalize_email("  jane@example.com  ") == "jane@example.com"

    def test_none_returns_empty(self):
        assert normalize_email(None) == ""


# ---------------------------------------------------------------------------
# Rejected cases
# ---------------------------------------------------------------------------

class TestRejected:
    def test_both_name_and_email_missing(self):
        result = check_duplicate({"name": None, "email": None}, EXISTING)
        assert result["decision"] == "rejected"
        assert any("name and email both missing" in r for r in result["reasons"])

    def test_name_present_email_missing(self):
        candidate = {**BASE, "email": None}
        result = check_duplicate(candidate, EXISTING)
        assert result["decision"] == "rejected"
        assert any("missing email" in r for r in result["reasons"])

    def test_email_empty_string(self):
        candidate = {**BASE, "email": "   "}
        result = check_duplicate(candidate, EXISTING)
        assert result["decision"] == "rejected"


# ---------------------------------------------------------------------------
# Duplicate cases
# ---------------------------------------------------------------------------

class TestDuplicate:
    def test_identical_resume(self):
        result = check_duplicate(BASE.copy(), EXISTING)
        assert result["decision"] == "duplicate"
        assert result["reasons"] == ["resume already exists"]

    def test_name_case_difference_still_matches(self):
        candidate = {**BASE, "name": "JANE DOE"}
        result = check_duplicate(candidate, EXISTING)
        assert result["decision"] == "duplicate"

    def test_email_case_difference_still_matches(self):
        candidate = {**BASE, "email": "JANE@EXAMPLE.COM"}
        result = check_duplicate(candidate, EXISTING)
        assert result["decision"] == "duplicate"

    def test_email_whitespace_difference_still_matches(self):
        candidate = {**BASE, "email": "  jane@example.com  "}
        result = check_duplicate(candidate, EXISTING)
        assert result["decision"] == "duplicate"


# ---------------------------------------------------------------------------
# Update cases
# ---------------------------------------------------------------------------

class TestUpdate:
    def test_changed_full_text_triggers_update(self):
        candidate = {**BASE, "full_text": "Jane Doe\njane@example.com\nSenior Engineer, 6 years — updated CV."}
        result = check_duplicate(candidate, EXISTING)
        assert result["decision"] == "update"
        assert any("update" in r for r in result["reasons"])

    def test_llm_fields_only_changed_is_duplicate(self):
        # LLM-extracted fields (skills, seniority, years_experience) are non-deterministic.
        # If full_text is unchanged, differing LLM fields must NOT trigger an update.
        candidate = {**BASE, "years_experience": 7.0, "skills": ["python", "fastapi", "docker"], "seniority": "lead"}
        result = check_duplicate(candidate, EXISTING)
        assert result["decision"] == "duplicate"


# ---------------------------------------------------------------------------
# Unique cases
# ---------------------------------------------------------------------------

class TestUnique:
    def test_different_name_and_email(self):
        candidate = {**BASE, "name": "John Smith", "email": "john@example.com"}
        result = check_duplicate(candidate, EXISTING)
        assert result["decision"] == "unique"

    def test_same_name_different_email_is_unique(self):
        """Critical case: two distinct people who share a name must NOT be merged."""
        candidate = {**BASE, "email": "jane.other@example.com"}
        result = check_duplicate(candidate, EXISTING)
        assert result["decision"] == "unique"

    def test_different_name_same_email_is_unique(self):
        candidate = {**BASE, "name": "Janet Doe"}
        result = check_duplicate(candidate, EXISTING)
        assert result["decision"] == "unique"

    def test_empty_existing_pool(self):
        result = check_duplicate(BASE.copy(), [])
        assert result["decision"] == "unique"
