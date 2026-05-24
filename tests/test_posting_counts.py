from fastapi.testclient import TestClient

from app.main import app
from app.routers import postings as postings_router


client = TestClient(app)


def test_count_open_postings(monkeypatch):
    monkeypatch.setattr(postings_router, "count_open_postings", lambda: 7)

    resp = client.get("/api/postings/count")

    assert resp.status_code == 200
    assert resp.json() == {"total": 7}


def test_get_posting_applicant_count(monkeypatch):
    posting_id = "11111111-1111-1111-1111-111111111111"

    def fake_count(selected_posting_id):
        assert selected_posting_id == posting_id
        return 12

    monkeypatch.setattr(postings_router, "get_posting_applicant_count", fake_count)

    resp = client.get(f"/api/postings/{posting_id}/applicant-count")

    assert resp.status_code == 200
    assert resp.json() == {
        "posting_id": posting_id,
        "applicant_count": 12,
    }


def test_get_posting_applicant_count_unknown_posting(monkeypatch):
    monkeypatch.setattr(
        postings_router,
        "get_posting_applicant_count",
        lambda posting_id: None,
    )

    resp = client.get(
        "/api/postings/11111111-1111-1111-1111-111111111111/applicant-count"
    )

    assert resp.status_code == 404


def test_get_my_open_posting_stats(monkeypatch):
    def fake_stats(email):
        assert email == "recruiter@example.com"
        return {
            "recruiter_email": email,
            "total_open_postings": 2,
            "total_open_posting_applicants": 9,
        }

    monkeypatch.setattr(postings_router, "get_recruiter_open_posting_stats", fake_stats)

    resp = client.get("/api/postings/mine/stats?recruiter_email=recruiter@example.com")

    assert resp.status_code == 200
    assert resp.json() == {
        "recruiter_email": "recruiter@example.com",
        "total_open_postings": 2,
        "total_open_posting_applicants": 9,
    }
