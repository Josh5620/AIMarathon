-- Migration 002: job_postings + applications
-- Wipe existing candidate rows (design decision: start fresh with posting-scoped flow)
TRUNCATE TABLE candidates CASCADE;

-- ── Job Postings ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_postings (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_email TEXT         NOT NULL REFERENCES recruiters(email) ON DELETE CASCADE,
  company_name    TEXT         NOT NULL,
  position_title  TEXT         NOT NULL,
  description     TEXT         NOT NULL,
  requirements    TEXT,
  -- Cached at creation time so apply endpoint scores without re-embedding
  jd_embedding    VECTOR(3072),
  jd_keywords     TEXT[],
  status          TEXT         NOT NULL DEFAULT 'open',   -- 'open' | 'closed'
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_postings_recruiter ON job_postings (recruiter_email);
CREATE INDEX IF NOT EXISTS idx_postings_status    ON job_postings (status);

-- ── Applications ──────────────────────────────────────────────────────────────
-- One row per (candidate × posting) pair.
CREATE TABLE IF NOT EXISTS applications (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id       UUID         NOT NULL REFERENCES job_postings(id)  ON DELETE CASCADE,
  candidate_id     UUID         NOT NULL REFERENCES candidates(id)    ON DELETE CASCADE,
  distance         DOUBLE PRECISION,          -- cosine distance (lower = better match)
  rank_score       DOUBLE PRECISION,          -- 1 - distance (higher = better; used for ORDER BY)
  explanation      TEXT,                      -- LLM-generated; NULL until first profile view
  overlap_keywords TEXT[],
  is_interested    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (posting_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_apps_posting_rank ON applications (posting_id, rank_score DESC);
CREATE INDEX IF NOT EXISTS idx_apps_candidate     ON applications (candidate_id);
