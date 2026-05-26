# HireLite

> AI-powered candidate matching — upload a resume, post a job, get ranked matches with explanations in seconds.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20pgvector-3ECF8E?logo=supabase&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-VPS-2496ED?logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?logo=vercel&logoColor=white)

---

## What it does

- **Candidates** upload a PDF or DOCX resume — HireLite extracts text, runs OCR if needed, validates for injection/spam, embeds it via Gemini, and stores a structured profile (skills, certifications, experience, seniority, location) in Supabase.
- **Recruiters** post a job description and instantly get a ranked list of candidates, scored by cosine similarity over pgvector embeddings with a keyword pre-filter for speed.
- **AI explanations** are generated per match — each candidate gets a plain-English rationale tailored to the job description, not just a score.
- **Duplicate detection** compares new uploads against existing candidates by name + email, and decides whether to insert or update rather than creating stale duplicates.

---

## Architecture

```
CANDIDATE UPLOAD
─────────────────────────────────────────────────────────────
 PDF/DOCX  →  extractor.py  →  guard.py (injection/spam check)
                                    │
              ┌─────────────────────┼───────────────────────┐
              ▼                     ▼                        ▼
         embed()             extract_profile()        parse_contact_info()
       (Gemini API)          (Chutes chat LLM)          (regex + LLM)
              └─────────────────────┼───────────────────────┘
                                    ▼
                             dedup.py  →  db.py  →  Supabase


RECRUITER SEARCH
─────────────────────────────────────────────────────────────
 Job Description  →  embed JD + extract keywords (parallel)
                              │
                     Supabase SQL query:
                       keywords && overlap  (GIN index)
                       + embedding <=> cosine rank  (IVFFlat)
                              │
                     LLM explanation per match
                              │
                     Ranked results → frontend
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.12), uvicorn |
| Database | Supabase Postgres + pgvector (IVFFlat + GIN indexes) |
| Auth | Supabase Google OAuth, RLS-protected recruiter allowlist |
| AI — Chat | Chutes (OpenAI-compatible), Gemini fallback |
| AI — Embeddings | Google Gemini (`text-embedding-004`) |
| File parsing | PyMuPDF, python-docx, Tesseract OCR |
| Frontend | React 19, Vite, TailwindCSS, React Router |
| Deployment — Backend | Docker on VPS (port 8000) |
| Deployment — Frontend | Vercel (auto-deploy from `main`) |

---

## AI Pipeline

Embeddings use Google Gemini's `text-embedding-004` model (configurable dimension via `EMBED_DIM`). At search time, the job description is embedded and ranked against stored candidate vectors using pgvector's `<=>` cosine distance operator, with a keyword `&&` overlap pre-filter to keep the vector scan fast.

Chat completions go through Chutes (an OpenAI-compatible endpoint). All LLM calls use exponential backoff on 429/5xx. If Chutes fails after retries, a Gemini chat fallback fires automatically.

---

## API Overview

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/candidates/upload` | Upload resume (PDF/DOCX) |
| `GET` | `/api/candidates/{id}` | Fetch candidate profile |
| `POST` | `/api/recruiter/search` | Search + rank candidates by JD |
| `POST` | `/api/postings/` | Create job posting |
| `GET` | `/api/postings/mine` | List recruiter's postings |
| `GET` | `/api/postings/{id}` | Get posting detail |
| `PATCH` | `/api/postings/{id}` | Update posting |
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/diagnose` | Component diagnostics (DB, embed, chat) |

Full interactive docs available at `/docs` when the backend is running.

---

### Database & Auth — Supabase

Postgres with the `pgvector` extension hosts the `candidates` table. Row-Level Security policies gate the `recruiters` allowlist. Google OAuth is configured through the Supabase Auth dashboard.

---

## Future Improvements

- **Batch resume ingestion** — bulk upload via ZIP or folder for high-volume hiring pipelines
- **ATS export** — one-click export of ranked candidates to CSV / Greenhouse / Lever
- **Interview scheduling** — integrate with Google Calendar to book slots directly from the match results
- **Multi-language resume support** — extend the extraction pipeline to handle non-English resumes via translation pre-processing
- **Real-time match notifications** — notify candidates when a posted job closely matches their profile
- **Admin dashboard** — usage analytics, recruiter management, and audit log viewer for platform operators
