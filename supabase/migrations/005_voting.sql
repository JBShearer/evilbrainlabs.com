-- Migration 005: Add voting columns for Good/Evil valence
-- Allows users to vote on whether a use case is beneficial or harmful

-- Add vote count columns
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS evil_votes INTEGER DEFAULT 0;
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS good_votes INTEGER DEFAULT 0;

-- Create votes tracking table (to prevent duplicate votes)
CREATE TABLE IF NOT EXISTS case_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  use_case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  session_id TEXT,  -- For anonymous voting
  valence TEXT NOT NULL CHECK (valence IN ('evil', 'good')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One vote per user per case (or session for anonymous)
  UNIQUE (use_case_id, user_id),
  UNIQUE (use_case_id, session_id)
);

CREATE INDEX IF NOT EXISTS case_votes_case_idx ON case_votes(use_case_id);
CREATE INDEX IF NOT EXISTS case_votes_user_idx ON case_votes(user_id);

-- Update existing cases with default vote counts
UPDATE use_cases SET evil_votes = 0 WHERE evil_votes IS NULL;
UPDATE use_cases SET good_votes = 0 WHERE good_votes IS NULL;

COMMENT ON COLUMN use_cases.evil_votes IS 'Count of users who voted this case as harmful/evil';
COMMENT ON COLUMN use_cases.good_votes IS 'Count of users who voted this case as beneficial/good';
