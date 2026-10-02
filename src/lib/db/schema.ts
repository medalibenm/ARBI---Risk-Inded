// Idempotent schema, applied on first query of each process.
// Dates are stored as 'YYYY-MM-DD' text so pg and PGlite return the same thing.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS news_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  tier INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'rss',
  rss_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES news_sources(id),
  title TEXT NOT NULL,
  title_norm TEXT NOT NULL,
  url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  description TEXT,
  author TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retrieval_method TEXT NOT NULL DEFAULT 'rss',
  external_id TEXT,
  deduplication_hash TEXT NOT NULL UNIQUE,
  rule_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_articles_status_idx ON news_articles (status, published_at);

CREATE TABLE IF NOT EXISTS article_extractions (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL UNIQUE REFERENCES news_articles(id),
  relevant BOOLEAN NOT NULL,
  relevance_probability REAL NOT NULL,
  factor TEXT,
  direction TEXT,
  magnitude_estimate INTEGER,
  event_type TEXT,
  entities JSONB,
  summary TEXT,
  source_tier INTEGER NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category TEXT NOT NULL,
  company TEXT,
  event_type TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_articles (
  event_id TEXT NOT NULL REFERENCES events(id),
  article_id TEXT NOT NULL UNIQUE REFERENCES news_articles(id),
  confidence REAL NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, article_id)
);

CREATE TABLE IF NOT EXISTS daily_scores (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  raw_score REAL NOT NULL,
  previous_score INTEGER,
  change INTEGER,
  status TEXT NOT NULL,
  summary TEXT,
  uncertainties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS score_factors (
  id TEXT PRIMARY KEY,
  daily_score_id TEXT NOT NULL REFERENCES daily_scores(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  score REAL NOT NULL,
  previous_score REAL NOT NULL,
  impact REAL NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (daily_score_id, category)
);

CREATE TABLE IF NOT EXISTS news_signals (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  factor TEXT NOT NULL,
  direction TEXT NOT NULL,
  magnitude INTEGER NOT NULL,
  confidence REAL NOT NULL,
  persistence_class TEXT NOT NULL,
  explanation TEXT,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_score_signals (
  daily_score_id TEXT NOT NULL REFERENCES daily_scores(id),
  signal_id TEXT NOT NULL REFERENCES news_signals(id),
  weight REAL NOT NULL,
  contribution REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (daily_score_id, signal_id)
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  score_date TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  rss_results_count INTEGER,
  unique_articles_count INTEGER,
  relevant_articles_count INTEGER,
  failed_sources JSONB,
  extraction_calls_count INTEGER,
  extraction_cost_estimate REAL,
  unique_events_count INTEGER,
  interpretation_calls_count INTEGER,
  interpretation_cost_estimate REAL,
  final_score INTEGER,
  error_message TEXT
);
-- the exact evidence package sent to the interpretation model, and its answer
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS interpretation_model TEXT;
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS interpretation_input JSONB;
ALTER TABLE pipeline_runs ADD COLUMN IF NOT EXISTS interpretation_output JSONB;
`
