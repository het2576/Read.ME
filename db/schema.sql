-- /db/schema.sql
-- RepoDoc database schema
-- Run this in Supabase SQL Editor to create all tables
--
-- Tables: users, repos, analyses, readmes, drift_logs, installations

-- ─────────────────────────────────────────
-- Core Tables
-- ─────────────────────────────────────────

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE NOT NULL,
  github_username TEXT NOT NULL,
  github_avatar TEXT,
  email TEXT,
  access_token TEXT NOT NULL,
  api_key TEXT UNIQUE,                        -- RepoDoc API key for CI (rd_...)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  default_branch TEXT DEFAULT 'main',
  installation_id BIGINT,                     -- GitHub App installation ID (if installed)
  webhook_active BOOLEAN DEFAULT FALSE,       -- true = GitHub App is active on this repo
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, full_name),
  UNIQUE(full_name)                           -- enables upsert from webhook events
);

CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  analysis_data JSONB NOT NULL,
  file_tree JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE readmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES analyses(id),
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  pr_url TEXT,
  pr_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE drift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID REFERENCES repos(id) ON DELETE CASCADE,
  drift_score INTEGER NOT NULL,
  status TEXT NOT NULL,
  drift_data JSONB NOT NULL,
  readme_id UUID REFERENCES readmes(id),
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- GitHub App Installations
-- ─────────────────────────────────────────

CREATE TABLE installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  installation_id BIGINT UNIQUE NOT NULL,     -- GitHub's installation ID
  account_login TEXT NOT NULL,                -- GitHub username or org name
  account_type TEXT NOT NULL,                 -- 'User' or 'Organization'
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ                  -- null = still active
);

-- ─────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE readmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE drift_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────
-- Migration: Add columns to existing tables
-- Run these if you already have data in your DB
-- ─────────────────────────────────────────

-- ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;
-- ALTER TABLE repos ADD COLUMN IF NOT EXISTS installation_id BIGINT;
-- ALTER TABLE repos ADD COLUMN IF NOT EXISTS webhook_active BOOLEAN DEFAULT FALSE;
-- ALTER TABLE repos ADD UNIQUE (full_name);
-- CREATE TABLE IF NOT EXISTS installations ( ... );  -- run the CREATE TABLE above
