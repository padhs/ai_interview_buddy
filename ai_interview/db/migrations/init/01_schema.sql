CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Trigram extension for similarity search

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_enum') THEN
    CREATE TYPE difficulty_enum AS ENUM ('easy','medium','hard');
  END IF;
END$$;

-- Problems table
CREATE TABLE IF NOT EXISTS problems (
  id              INTEGER PRIMARY KEY,           -- from CSV
  title           TEXT NOT NULL,
  difficulty      difficulty_enum NOT NULL,
  url             TEXT NOT NULL,
  likes           INTEGER NOT NULL DEFAULT 0,

  -- parsed text fields (all lower-cased per your cleaning)
  question        TEXT NOT NULL DEFAULT '',
  examples        TEXT NOT NULL DEFAULT '',
  constraints     TEXT NOT NULL DEFAULT '',
  follow_up       TEXT NOT NULL DEFAULT '',

  -- keep the original description only if you want traceability
  description     TEXT NOT NULL DEFAULT ''
);

-- Companies (unique list)
CREATE TABLE IF NOT EXISTS companies (
  id    SERIAL PRIMARY KEY,
  name  TEXT UNIQUE NOT NULL
);

-- M2M: problem <-> companies
CREATE TABLE IF NOT EXISTS problem_companies (
  problem_id  INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (problem_id, company_id)
);

-- Topics (unique list)
CREATE TABLE IF NOT EXISTS topics (
  id    SERIAL PRIMARY KEY,
  name  TEXT UNIQUE NOT NULL
);

-- M2M: problem <-> topics
CREATE TABLE IF NOT EXISTS problem_topics (
  problem_id  INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  topic_id    INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (problem_id, topic_id)
);

-- Similar questions extracted from CSV (title + slug/url)
CREATE TABLE IF NOT EXISTS similar_questions (
  id            SERIAL PRIMARY KEY,
  problem_id    INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  sim_title     TEXT NOT NULL,
  sim_url       TEXT NOT NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_title_trgm ON problems USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_topics_name_trgm ON topics USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin (name gin_trgm_ops);
