CREATE EXTENSION IF NOT EXISTS vector;

-- embedding dim must match EMBED_DIM in .env and the active model:
--   gemini-embedding-001  (Google native) → VECTOR(3072)  ← current default
--   mistral-embed         (Mistral)       → VECTOR(1024)
--   Qwen3-Embedding-8B    (Chutes)        → VECTOR(4096)
-- When switching providers: DROP TABLE candidates; re-run this file with the new VECTOR(N).
CREATE TABLE IF NOT EXISTS candidates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT,
  email        TEXT,
  full_text    TEXT NOT NULL,
  embedding    VECTOR(3072) NOT NULL,  -- update N when switching providers
  keywords     TEXT[] NOT NULL,
  file_url     TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Note: IVFFlat/HNSW indexes cap at 2000 dims; gemini-embedding-001 is 3072.
-- For hackathon-scale data (hundreds of rows), exact search is fast enough.
-- Add an index here if you switch to a sub-2000-dim model (e.g. Chutes Qwen3 = 4096 — same issue;
-- mistral-embed = 1024 — would work with ivfflat).

-- GIN index for efficient array-overlap (&&) keyword filtering.
CREATE INDEX IF NOT EXISTS candidates_keywords_idx
  ON candidates USING gin (keywords);
