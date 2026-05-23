"""CLI entry point: python -m ingestion <path-to-resume>"""
import json
import sys
from pathlib import Path

from ingestion import ingest_resume


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: python -m ingestion <path-to-resume>", file=sys.stderr)
        return 2
    path = Path(sys.argv[1])
    if not path.exists():
        print(f"error: file not found: {path}", file=sys.stderr)
        return 1

    result = ingest_resume(path.read_bytes(), path.name)
    preview = {
        **result,
        "clean_text": (
            result["clean_text"][:200] + "…"
            if len(result["clean_text"]) > 200
            else result["clean_text"]
        ),
    }
    print(json.dumps(preview, indent=2, ensure_ascii=False))
    return 0 if result["status"] in ("ok", "flagged") else 1


if __name__ == "__main__":
    raise SystemExit(main())
