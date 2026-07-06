-- ============================================================
-- PHASE 0: HARDENING
-- Migration 012 | Security hardening before economy attachment
-- ============================================================

-- =============================================================================
-- 1. FIX MISSING RLS ON case_relationships
-- =============================================================================

ALTER TABLE case_relationships ENABLE ROW LEVEL SECURITY;

-- Public read for case relationships
CREATE POLICY "Case relationships are public"
  ON case_relationships FOR SELECT
  USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role manages case relationships"
  ON case_relationships FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 2. FIX MISSING RLS ON case_votes
-- =============================================================================

ALTER TABLE case_votes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own votes (vote secrecy)
CREATE POLICY "Users see own votes"
  ON case_votes FOR SELECT
  USING (auth.uid() = user_id);

-- Service role manages all vote operations
CREATE POLICY "Service role manages votes"
  ON case_votes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 3. TIGHTEN OVERLY PERMISSIVE POLICIES ON joke_patterns
-- =============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can manage patterns" ON joke_patterns;

-- Replace with service-role-only write access
CREATE POLICY "Service role manages joke patterns"
  ON joke_patterns FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role updates joke patterns"
  ON joke_patterns FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role deletes joke patterns"
  ON joke_patterns FOR DELETE
  TO service_role
  USING (true);

-- =============================================================================
-- 4. TIGHTEN OVERLY PERMISSIVE POLICIES ON running_jokes
-- =============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can manage jokes" ON running_jokes;

-- Replace with service-role-only write access
CREATE POLICY "Service role manages running jokes"
  ON running_jokes FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role updates running jokes"
  ON running_jokes FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role deletes running jokes"
  ON running_jokes FOR DELETE
  TO service_role
  USING (true);

-- =============================================================================
-- 5. RATE LIMITING TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  minute_bucket TIMESTAMPTZ NOT NULL,
  call_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, function_name, minute_bucket)
);

CREATE INDEX idx_rate_limits_lookup
  ON rate_limits (user_id, function_name, minute_bucket);

-- Auto-cleanup old rate limit entries (older than 1 hour)
CREATE INDEX idx_rate_limits_cleanup
  ON rate_limits (minute_bucket)
  WHERE minute_bucket < now() - interval '1 hour';

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write rate limits
CREATE POLICY "Service role manages rate limits"
  ON rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE rate_limits IS 'Per-user per-function rate limiting. Default 30 calls/min/function.';

-- =============================================================================
-- 6. RATE LIMIT CHECK FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_function_name TEXT,
  p_limit INT DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bucket TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- Calculate current minute bucket
  v_bucket := date_trunc('minute', now());

  -- Upsert and get current count
  INSERT INTO rate_limits (user_id, function_name, minute_bucket, call_count)
  VALUES (p_user_id, p_function_name, v_bucket, 1)
  ON CONFLICT (user_id, function_name, minute_bucket)
  DO UPDATE SET call_count = rate_limits.call_count + 1
  RETURNING call_count INTO v_count;

  -- Return true if under limit, false if exceeded
  RETURN v_count <= p_limit;
END;
$$;

COMMENT ON FUNCTION check_rate_limit IS 'Returns TRUE if under rate limit, FALSE if exceeded. Call at start of edge functions.';

-- =============================================================================
-- 7. DAILY ACTION LIMITS TABLE (for economy protection)
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_count INT NOT NULL DEFAULT 1,
  UNIQUE (user_id, action_type, action_date)
);

CREATE INDEX idx_daily_limits_lookup
  ON daily_limits (user_id, action_type, action_date);

ALTER TABLE daily_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages daily limits"
  ON daily_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE daily_limits IS 'Per-user per-day action limits for economy protection.';

-- =============================================================================
-- 8. DAILY LIMIT CHECK FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION check_daily_limit(
  p_user_id UUID,
  p_action_type TEXT,
  p_limit INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Upsert and get current count
  INSERT INTO daily_limits (user_id, action_type, action_date, action_count)
  VALUES (p_user_id, p_action_type, CURRENT_DATE, 1)
  ON CONFLICT (user_id, action_type, action_date)
  DO UPDATE SET action_count = daily_limits.action_count + 1
  RETURNING action_count INTO v_count;

  -- Return true if under limit, false if exceeded
  RETURN v_count <= p_limit;
END;
$$;

COMMENT ON FUNCTION check_daily_limit IS 'Returns TRUE if under daily limit, FALSE if exceeded.';

-- =============================================================================
-- 9. CLEANUP FUNCTION FOR OLD RATE LIMIT ENTRIES
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE minute_bucket < now() - interval '1 hour';

  DELETE FROM daily_limits
  WHERE action_date < CURRENT_DATE - interval '7 days';
END;
$$;

COMMENT ON FUNCTION cleanup_rate_limits IS 'Cleanup old rate limit entries. Run via cron.';

-- =============================================================================
-- 10. ADMIN ROLE COLUMN (replacing any email-based backdoors)
-- =============================================================================

-- Add admin role to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
      CHECK (role IN ('user', 'admin', 'moderator'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role) WHERE role != 'user';

COMMENT ON COLUMN profiles.role IS 'User role. Set via Supabase dashboard or service-role script only. Never via email pattern.';

-- =============================================================================
-- 11. REGISTRY READ ISOLATION (EBL can only SELECT from registry tables)
-- =============================================================================

-- Create a restricted role for EBL functions (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ebl_reader') THEN
    CREATE ROLE ebl_reader;
  END IF;
END $$;

-- Grant SELECT-only on registry tables
GRANT SELECT ON use_cases TO ebl_reader;
GRANT SELECT ON entities TO ebl_reader;
GRANT SELECT ON predicates TO ebl_reader;
GRANT SELECT ON triples TO ebl_reader;
GRANT SELECT ON sources TO ebl_reader;
GRANT SELECT ON coins TO ebl_reader;
GRANT SELECT ON votes TO ebl_reader;
GRANT SELECT ON flips TO ebl_reader;

-- Explicitly revoke write permissions
REVOKE INSERT, UPDATE, DELETE ON use_cases FROM ebl_reader;
REVOKE INSERT, UPDATE, DELETE ON entities FROM ebl_reader;
REVOKE INSERT, UPDATE, DELETE ON predicates FROM ebl_reader;
REVOKE INSERT, UPDATE, DELETE ON triples FROM ebl_reader;
REVOKE INSERT, UPDATE, DELETE ON sources FROM ebl_reader;
REVOKE INSERT, UPDATE, DELETE ON coins FROM ebl_reader;
REVOKE INSERT, UPDATE, DELETE ON votes FROM ebl_reader;
REVOKE INSERT, UPDATE, DELETE ON flips FROM ebl_reader;

COMMENT ON ROLE ebl_reader IS 'Read-only role for EBL functions accessing UCAR registry data. Enforces Invariant 1.';
