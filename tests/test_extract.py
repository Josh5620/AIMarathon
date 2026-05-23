"""Tests for app.ingestion.extract — text extraction from PDF and DOCX."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from app.ingestion.extract import extract_text, EncryptedFileError
from tests.conftest import make_pdf, make_docx


class TestPdfExtraction:
    def test_extracts_text_from_pdf(self):
        pdf_bytes = make_pdf("Hello World PDF content")
        result = extract_text(pdf_bytes, "resume.pdf")
        assert "Hello World PDF content" in result

    def test_encrypted_pdf_raises(self):
        encrypted = make_pdf("secret", password="hunter2")
        with pytest.raises(EncryptedFileError):
            extract_text(encrypted, "locked.pdf")

    def test_corrupt_pdf_returns_empty(self):
        result = extract_text(b"not a real pdf at all", "bad.pdf")
        assert result == ""

    def test_empty_pdf_returns_empty_string(self):
        import fitz
        from io import BytesIO
        doc = fitz.open()
        doc.new_page()  # blank page — no text
        buf = BytesIO()
        doc.save(buf)
        result = extract_text(buf.getvalue(), "blank.pdf")
        assert isinstance(result, str)


class TestDocxExtraction:
    def test_extracts_paragraph_text(self):
        docx_bytes = make_docx("Main paragraph content")
        result = extract_text(docx_bytes, "resume.docx")
        assert "Main paragraph content" in result

    def test_extracts_table_cell_text(self):
        docx_bytes = make_docx("Paragraph text", table_text="Table cell content")
        result = extract_text(docx_bytes, "resume.docx")
        assert "Paragraph text" in result
        assert "Table cell content" in result

    def test_corrupt_docx_returns_empty(self):
        result = extract_text(b"not a real docx", "bad.docx")
        assert result == ""


class TestUnsupportedExtension:
    def test_txt_raises_value_error(self):
        with pytest.raises(ValueError, match="unsupported file type"):
            extract_text(b"some text", "resume.txt")

    def test_rtf_raises_value_error(self):
        with pytest.raises(ValueError, match="unsupported file type"):
            extract_text(b"some rtf", "resume.rtf")

    def test_png_raises_value_error(self):
        with pytest.raises(ValueError, match="unsupported file type"):
            extract_text(b"\x89PNG", "resume.png")


class TestOcrCascade:
    """Verify the scanned-PDF OCR fallback (per 2ndHandover.md L16)."""

    def _blank_pdf_bytes(self) -> bytes:
        """Build a one-page PDF with NO text layer (simulates a scanned document)."""
        import fitz
        from io import BytesIO
        doc = fitz.open()
        doc.new_page()
        buf = BytesIO()
        doc.save(buf)
        return buf.getvalue()

    def test_text_pdf_does_not_trigger_ocr(self, monkeypatch):
        """Rich text PDF: OCR must never fire."""
        triggered = []
        monkeypatch.setattr("app.ingestion.extract._ocr_pdf", lambda doc: triggered.append(1) or "")
        long_text = (
            "Alice Smith — alice@example.com\n"
            "Senior Software Engineer, 8 years Python, FastAPI, PostgreSQL, Docker."
        )
        pdf = make_pdf(long_text)
        extract_text(pdf, "alice.pdf")
        assert triggered == [], "OCR should not run when direct text is sufficient"

    def test_scanned_pdf_triggers_ocr(self, monkeypatch):
        """Blank PDF (< 100 chars direct text): OCR fallback must be invoked and its text returned."""
        monkeypatch.setattr(
            "app.ingestion.extract._ocr_pdf",
            lambda doc: "OCR-recovered: Jane Doe, Senior Engineer.",
        )
        result = extract_text(self._blank_pdf_bytes(), "scanned.pdf")
        assert "OCR-recovered" in result

    def test_ocr_unavailable_degrades_gracefully(self, monkeypatch):
        """If pytesseract is not importable, OCR silently returns '' — no crash."""
        monkeypatch.setattr("app.ingestion.extract._OCR_AVAILABLE", False)
        result = extract_text(self._blank_pdf_bytes(), "scanned.pdf")
        assert isinstance(result, str)  # did not raise
