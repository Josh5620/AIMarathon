CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding dimension must match EMBED_DIM in .env and the active model:
--   gemini-embedding-001  (Google native)  → VECTOR(3072)  ← current
--   Qwen3-Embedding-8B    (Chutes)         → VECTOR(4096)
--   mistral-embed         (Mistral)        → VECTOR(1024)
-- When switching providers: DROP TABLE candidates; re-run this file with the new VECTOR(N).
-- See HANDOVER.md → "Chutes/Qwen3 swap path" for the full procedure.

DROP TABLE IF EXISTS candidates;

CREATE TABLE candidates (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT,
  email            TEXT,
  full_text        TEXT         NOT NULL,
  embedding        VECTOR(3072) NOT NULL,        -- update N when switching providers
  -- Flat pre-filter array: skills ∪ roles ∪ domains ∪ certifications (used for && overlap filter)
  keywords         TEXT[]       NOT NULL,
  -- Structured profile fields
  skills           TEXT[]       NOT NULL DEFAULT '{}',
  certifications   TEXT[]       NOT NULL DEFAULT '{}',
  languages        TEXT[]       NOT NULL DEFAULT '{}',  -- spoken languages, not programming
  years_experience NUMERIC(4,1),                        -- nullable; estimated total professional years
  seniority        TEXT,                                -- junior|mid|senior|lead|principal
  location         TEXT,
  profile          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  -- profile shape: {"education":[{"degree","field","institution","year"}],
  --                 "links":{"github","linkedin","portfolio"},
  --                 "summary":"...", "work_authorization":"..."}
  file_url         TEXT,
  created_at       TIMESTAMPTZ  DEFAULT now()
);

-- Note: IVFFlat/HNSW cap at 2000 dims; gemini=3072 and Qwen3=4096 both exceed it.
-- Exact cosine scan is fast at hackathon scale (hundreds of rows).

-- GIN indexes for array-overlap (&&) and containment (@>) queries
CREATE INDEX candidates_keywords_idx       ON candidates USING gin (keywords);
CREATE INDEX candidates_skills_idx         ON candidates USING gin (skills);
CREATE INDEX candidates_certifications_idx ON candidates USING gin (certifications);
CREATE INDEX candidates_languages_idx      ON candidates USING gin (languages);

-- B-tree indexes for range/equality filters on scalar fields
CREATE INDEX candidates_yoe_idx            ON candidates (years_experience);
CREATE INDEX candidates_seniority_idx      ON candidates (seniority);
