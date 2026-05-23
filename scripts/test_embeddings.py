"""
Embedding unit tests — run without a server.

    python scripts/test_embeddings.py

Tests the chutes.embed() function directly:
  1. Returns a vector of the correct dimension
  2. Vector is non-trivial (not all zeros, has sign variation)
  3. Same input always produces the same vector (determinism)
  4. Semantically similar texts are closer than dissimilar ones
  5. Truncated long input (6000 chars) still produces a valid vector
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.chutes import chutes, EMBED_DIM


def cosine_distance(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = sum(x * x for x in a) ** 0.5
    mag_b = sum(x * x for x in b) ** 0.5
    return 1.0 - dot / (mag_a * mag_b)


def separator(label: str) -> None:
    print(f"\n{'='*60}\n  {label}\n{'='*60}")


def main() -> None:
    separator("1. Dimension check")
    vec = chutes.embed("Hello world")
    assert len(vec) == EMBED_DIM, f"FAIL — expected {EMBED_DIM} dims, got {len(vec)}"
    assert all(isinstance(x, float) for x in vec), "FAIL — vector contains non-float values"
    print(f"PASS — vector dimension: {len(vec)}")

    separator("2. Non-trivial output")
    vec = chutes.embed("Python developer with FastAPI and PostgreSQL experience")
    assert any(x != 0.0 for x in vec), "FAIL — vector is all zeros"
    has_positive = any(x > 0 for x in vec)
    has_negative = any(x < 0 for x in vec)
    assert has_positive and has_negative, "FAIL — vector has no sign variation"
    print(f"PASS — vector has real values (min={min(vec):.4f}, max={max(vec):.4f})")

    separator("3. Determinism")
    text = "Software engineer skilled in Python and machine learning"
    v1 = chutes.embed(text)
    v2 = chutes.embed(text)
    assert v1 == v2, "FAIL — same input produced different vectors"
    print("PASS — same input produces identical vectors")

    separator("4. Semantic similarity (most important)")
    resume = chutes.embed(
        "Senior Python developer, FastAPI, PostgreSQL, fintech, 5 years experience"
    )
    jd_match = chutes.embed(
        "Looking for a Python backend engineer with FastAPI and database experience in fintech"
    )
    jd_mismatch = chutes.embed(
        "Marketing manager with social media strategy, brand campaigns, and content creation"
    )

    d_match = cosine_distance(resume, jd_match)
    d_mismatch = cosine_distance(resume, jd_mismatch)

    print(f"  Resume vs matching JD:    distance = {d_match:.4f}  (want low)")
    print(f"  Resume vs mismatched JD:  distance = {d_mismatch:.4f}  (want high)")

    assert d_match < d_mismatch, (
        f"FAIL — similar texts are farther apart ({d_match:.4f}) "
        f"than dissimilar ones ({d_mismatch:.4f}). Embedding isn't ranking correctly."
    )
    print("PASS — semantically similar texts are closer")

    separator("5. Truncation safety (6000-char input)")
    long_text = "Python developer. " * 500  # ~9000 chars
    vec = chutes.embed(long_text[:6000])
    assert len(vec) == EMBED_DIM, f"FAIL — truncated input returned wrong dimension: {len(vec)}"
    print(f"PASS — 6000-char truncated input embeds correctly ({len(vec)} dims)")

    separator("ALL EMBEDDING TESTS PASSED")
    print("chutes.embed() is working correctly.\n")


if __name__ == "__main__":
    main()
