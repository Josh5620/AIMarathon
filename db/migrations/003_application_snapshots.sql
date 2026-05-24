-- Migration 003: Add per-application CV snapshot columns
-- Candidates table becomes identity-only; each application stores the CV it was submitted with.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS full_text         TEXT,
  ADD COLUMN IF NOT EXISTS embedding         VECTOR(3072),
  ADD COLUMN IF NOT EXISTS file_url          TEXT,
  ADD COLUMN IF NOT EXISTS profile           JSONB,
  ADD COLUMN IF NOT EXISTS skills            TEXT[],
  ADD COLUMN IF NOT EXISTS certifications    TEXT[],
  ADD COLUMN IF NOT EXISTS languages         TEXT[],
  ADD COLUMN IF NOT EXISTS years_experience  NUMERIC,
  ADD COLUMN IF NOT EXISTS seniority         TEXT,
  ADD COLUMN IF NOT EXISTS location          TEXT,
  ADD COLUMN IF NOT EXISTS candidate_keywords TEXT[];

-- Backfill existing rows from candidates so historical applicant lists keep rendering
UPDATE applications a
SET full_text          = c.full_text,
    embedding          = c.embedding,
    file_url           = c.file_url,
    profile            = c.profile,
    skills             = c.skills,
    certifications     = c.certifications,
    languages          = c.languages,
    years_experience   = c.years_experience,
    seniority          = c.seniority,
    location           = c.location,
    candidate_keywords = c.keywords
FROM candidates c
WHERE a.candidate_id = c.id;
