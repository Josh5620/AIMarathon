-- Migration: add recruiter profile columns + meetings table
-- Run this in the Supabase SQL editor against an EXISTING deployment.
-- schema.sql already includes these changes for fresh installs.

-- 1. Add profile columns to existing recruiters table
ALTER TABLE recruiters
  ADD COLUMN IF NOT EXISTS name         TEXT,
  ADD COLUMN IF NOT EXISTS organization TEXT,
  ADD COLUMN IF NOT EXISTS job_title    TEXT,
  ADD COLUMN IF NOT EXISTS bio          TEXT,
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT;

-- 2. Allow recruiters to update their own profile via Supabase client
DROP POLICY IF EXISTS recruiters_update_own ON recruiters;
CREATE POLICY recruiters_update_own ON recruiters
  FOR UPDATE TO authenticated
  USING (auth.email() = email)
  WITH CHECK (auth.email() = email);

GRANT UPDATE (name, organization, job_title, bio, phone, avatar_url)
  ON recruiters TO authenticated;

-- 3. Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_email  TEXT         NOT NULL REFERENCES recruiters(email),
  candidate_id     UUID         NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  candidate_email  TEXT         NOT NULL,
  candidate_name   TEXT,
  scheduled_at     TIMESTAMPTZ  NOT NULL,
  duration_minutes INTEGER      NOT NULL DEFAULT 30,
  google_event_id  TEXT,
  meet_link        TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meetings_recruiter_idx ON meetings (recruiter_email, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS meetings_candidate_idx ON meetings (candidate_id);
