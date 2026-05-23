from fastapi import UploadFile


async def extract_text(file: UploadFile) -> str:
    """
    OCR/text-extraction teammate implements this.
    Accept an UploadFile (PDF/DOCX/image), return extracted plain text.
    Raise ValueError if text cannot be extracted.
    """
    raise NotImplementedError("Text extraction not yet implemented — see app/extractor.py")
