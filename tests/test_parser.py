"""Tests for app.parser — contact info extraction from resume text."""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from unittest.mock import patch
import pytest

from app.parser import parse_contact_info, _extract_email, _extract_name


RESUME = (
    "Jane Doe\n"
    "jane.doe@example.com | +65 9123 4567\n"
    "Senior Software Engineer, 6 years.\n"
    "Skills: Python, FastAPI, PostgreSQL, Docker."
)


class TestEmailExtraction:
    def test_standard_email(self):
        assert _extract_email("Contact: jane@example.com") == "jane@example.com"

    def test_email_with_dots_and_plus(self):
        assert _extract_email("jane.doe+work@company.co.uk") == "jane.doe+work@company.co.uk"

    def test_no_email_returns_none(self):
        assert _extract_email("No contact info here.") is None

    def test_email_extracted_from_full_resume(self):
        assert _extract_email(RESUME) == "jane.doe@example.com"


class TestNameExtraction:
    def test_name_extracted_via_llm(self):
        with patch("app.parser.chutes.chat", return_value='{"name": "Jane Doe"}'):
            assert _extract_name(RESUME) == "Jane Doe"

    def test_null_llm_response_returns_none(self):
        with patch("app.parser.chutes.chat", return_value='{"name": null}'):
            assert _extract_name(RESUME) is None

    def test_llm_failure_returns_none(self):
        with patch("app.parser.chutes.chat", side_effect=Exception("API down")):
            assert _extract_name(RESUME) is None

    def test_suspiciously_long_name_discarded(self):
        long_name = "A" * 101
        with patch("app.parser.chutes.chat", return_value=json.dumps({"name": long_name})):
            assert _extract_name(RESUME) is None


class TestParseContactInfo:
    def test_returns_both_name_and_email(self):
        with patch("app.parser.chutes.chat", return_value='{"name": "Jane Doe"}'):
            result = parse_contact_info(RESUME)
        assert result["name"] == "Jane Doe"
        assert result["email"] == "jane.doe@example.com"

    def test_returns_dict_on_llm_failure(self):
        with patch("app.parser.chutes.chat", side_effect=Exception("timeout")):
            result = parse_contact_info(RESUME)
        assert isinstance(result, dict)
        assert result["name"] is None
        assert result["email"] == "jane.doe@example.com"  # regex still works

    def test_both_none_when_no_contact_info(self):
        with patch("app.parser.chutes.chat", return_value='{"name": null}'):
            result = parse_contact_info("Skills: Python, Java.")
        assert result["name"] is None
        assert result["email"] is None
