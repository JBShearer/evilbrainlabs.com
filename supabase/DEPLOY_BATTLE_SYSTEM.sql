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
-- ============================================================
-- PHASE 1: BATTLE SYSTEM FOUNDATION
-- Migration 013 | Cards, Wallets, Card Instances
-- From ebl-battler Part 2 package (0001_hardening_and_minting.sql)
-- ============================================================

-- ---------- Profiles Roles (Admin via table, not email pattern) ----------
CREATE TABLE IF NOT EXISTS profiles_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE profiles_roles IS
  'Admin is set ONLY via dashboard or service-role script. Never derived from email content.';

-- ---------- Wallets ----------
CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 100 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE wallets IS '$EVIL balance. Starting balance 100. Never negative.';

-- ---------- Cards (Minted from use_cases) ----------
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID UNIQUE NOT NULL,  -- References use_cases but no FK to keep registry isolated
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  impact INT NOT NULL CHECK (impact BETWEEN 1 AND 5),
  power INT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common','uncommon','rare','legendary')),
  faction TEXT NOT NULL CHECK (faction IN ('heaven','hell')),
  alignment_ratio NUMERIC NOT NULL,
  art_url TEXT NOT NULL DEFAULT 'pending',
  art_seed TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  minted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  faction_flipped_at TIMESTAMPTZ
);
COMMENT ON TABLE cards IS 'Minted cards from registry use_cases. One card per case.';

-- ---------- Card Instances (Owned copies) ----------
CREATE TABLE IF NOT EXISTS card_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES cards(id),
  owner_id UUID REFERENCES auth.users(id),
  serial INT NOT NULL,
  foil TEXT NOT NULL DEFAULT 'none' CHECK (foil IN ('none','holo','crayon')),
  source TEXT NOT NULL CHECK (source IN ('claim','scratch','quest','takeover','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (card_id, serial)
);
CREATE INDEX IF NOT EXISTS idx_instances_owner ON card_instances(owner_id);
COMMENT ON TABLE card_instances IS 'Individual owned copies of cards. Tradeable.';

-- ---------- Card Events (Audit log) ----------
CREATE TABLE IF NOT EXISTS card_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id),
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE card_events IS 'Append-only audit log for card state changes.';

-- ---------- Backgrounds (For card art generation) ----------
CREATE TABLE IF NOT EXISTS backgrounds (
  id SERIAL PRIMARY KEY,
  storage_path TEXT NOT NULL,
  weight INT NOT NULL DEFAULT 1 CHECK (weight > 0),
  active BOOLEAN NOT NULL DEFAULT true
);
COMMENT ON TABLE backgrounds IS 'Background library for card art. Weight for random selection.';

-- Fallbacks so the pipeline works before final art exists (OWNER replaces).
INSERT INTO backgrounds (storage_path, weight) VALUES
  ('backgrounds/fallback_black.png', 1),
  ('backgrounds/fallback_red.png', 1),
  ('backgrounds/fallback_bone.png', 1)
ON CONFLICT DO NOTHING;

-- ---------- RLS ----------
ALTER TABLE profiles_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE backgrounds ENABLE ROW LEVEL SECURITY;

-- Public reads for game data; writes only via service role (edge functions).
CREATE POLICY cards_read ON cards FOR SELECT USING (true);
CREATE POLICY instances_read ON card_instances FOR SELECT USING (true);
CREATE POLICY card_events_read ON card_events FOR SELECT USING (true);
CREATE POLICY backgrounds_read ON backgrounds FOR SELECT USING (active);
CREATE POLICY wallet_read_own ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY role_read_own ON profiles_roles FOR SELECT USING (auth.uid() = user_id);

-- Service role writes (no INSERT/UPDATE/DELETE policies for anon/authenticated)
CREATE POLICY wallets_service ON wallets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY roles_service ON profiles_roles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY cards_service ON cards FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY instances_service ON card_instances FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY events_service ON card_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY backgrounds_service ON backgrounds FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Add impact column to use_cases if missing
-- (Part 2 expects use_cases.impact; we derive from severity)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'use_cases' AND column_name = 'impact'
  ) THEN
    ALTER TABLE use_cases ADD COLUMN impact INT;
    -- Derive impact from severity (1-5 scale already matches)
    UPDATE use_cases SET impact = COALESCE(severity, 3);
    ALTER TABLE use_cases ALTER COLUMN impact SET DEFAULT 3;
    ALTER TABLE use_cases ADD CONSTRAINT use_cases_impact_check CHECK (impact BETWEEN 1 AND 5);
  END IF;
END $$;

-- ============================================================
-- Create view for vote counts (Part 2 expects good_votes/evil_votes)
-- ============================================================

CREATE OR REPLACE VIEW use_cases_with_votes AS
SELECT
  uc.*,
  COALESCE(
    (SELECT COUNT(*) FROM case_votes cv WHERE cv.case_id = uc.id AND cv.vote_type = 'good'),
    0
  ) AS good_votes,
  COALESCE(
    (SELECT COUNT(*) FROM case_votes cv WHERE cv.case_id = uc.id AND cv.vote_type = 'evil'),
    0
  ) AS evil_votes
FROM use_cases uc;

COMMENT ON VIEW use_cases_with_votes IS 'Read-only view of use_cases with vote counts. For mint-card and sync-alignment.';
-- ============================================================
-- PHASE 2: PORTFOLIO ECONOMY
-- Migration 014 | Products and Mining Ledger
-- From ebl-battler Part 2 package (0002_portfolio.sql)
-- ============================================================

-- ---------- Products (Claimed seats in the economy) ----------
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID UNIQUE NOT NULL,  -- References use_cases (no FK to keep registry isolated)
  card_id UUID NOT NULL REFERENCES cards(id),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  defense_loadout JSONB NOT NULL DEFAULT '{}',
  -- Siphon mechanics (raiders drain yield)
  siphon_until TIMESTAMPTZ,
  siphon_rate NUMERIC NOT NULL DEFAULT 0 CHECK (siphon_rate >= 0 AND siphon_rate <= 1),
  siphon_beneficiaries UUID[] NOT NULL DEFAULT '{}',
  -- Raid marks (3 marks in 72h = takeover eligible)
  raid_marks INT NOT NULL DEFAULT 0,
  raid_marks_reset_at TIMESTAMPTZ,
  last_battle_at TIMESTAMPTZ,
  -- Mining cursor (for lazy settlement)
  mined_through TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_owner ON products(owner_id);
COMMENT ON TABLE products IS 'Claimed seats. Owner mines $EVIL based on card impact.';

-- ---------- Mining Ledger (Immutable record of earnings) ----------
CREATE TABLE IF NOT EXISTS mining_ledger (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  beneficiary_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('mine','siphon','bounty','quest','scratch')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_beneficiary ON mining_ledger(beneficiary_id);
COMMENT ON TABLE mining_ledger IS 'Immutable earnings record. Never update or delete.';

-- ---------- RLS ----------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_ledger ENABLE ROW LEVEL SECURITY;

-- Products are public read (everyone can see the portfolio landscape)
CREATE POLICY products_read ON products FOR SELECT USING (true);
-- Ledger is owner-only read (your earnings are private)
CREATE POLICY ledger_read_own ON mining_ledger FOR SELECT USING (auth.uid() = beneficiary_id);

-- Service role writes
CREATE POLICY products_service ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY ledger_service ON mining_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);
-- ============================================================
-- PHASE 3/4: BATTLES
-- Migration 015 | Battle system tables
-- From ebl-battler Part 2 package (0003_battles.sql)
-- INVARIANT: battle_events is APPEND ONLY. No update/delete.
-- ============================================================

-- ---------- Battles ----------
CREATE TABLE IF NOT EXISTS battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  kind TEXT NOT NULL CHECK (kind IN ('raid','takeover')),
  state TEXT NOT NULL DEFAULT 'window'
    CHECK (state IN ('window','locked','resolved','cancelled')),
  window_ends_at TIMESTAMPTZ NOT NULL,
  current_turn INT NOT NULL DEFAULT 0,
  turn_ends_at TIMESTAMPTZ,
  winner TEXT CHECK (winner IN ('attackers','defenders')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_battles_state ON battles(state);
COMMENT ON TABLE battles IS 'Raid and takeover battles. State machine: window→locked→resolved.';

-- ---------- Battle Events (APPEND ONLY) ----------
CREATE TABLE IF NOT EXISTS battle_events (
  battle_id UUID NOT NULL REFERENCES battles(id),
  seq INT NOT NULL,
  type TEXT NOT NULL,
  actor_id TEXT,  -- UUID or 'bot:archetype:slot' string
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (battle_id, seq)
);
COMMENT ON TABLE battle_events IS 'Append-only event log. Reducer reads this to compute state.';

-- ---------- Battle Intents (Sealed moves, hidden until resolution) ----------
CREATE TABLE IF NOT EXISTS battle_intents (
  battle_id UUID NOT NULL REFERENCES battles(id),
  turn INT NOT NULL,
  actor_id UUID NOT NULL,
  intent JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (battle_id, turn, actor_id)
);
COMMENT ON TABLE battle_intents IS 'Sealed player intents. Never publicly readable. Hashes only broadcast.';

-- ---------- Battle Sentiment (Spectator votes) ----------
CREATE TABLE IF NOT EXISTS battle_sentiment (
  battle_id UUID NOT NULL REFERENCES battles(id),
  voter_id UUID NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('attackers','defenders')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (battle_id, voter_id)
);
COMMENT ON TABLE battle_sentiment IS 'Free spectator votes. NO paid influence path. Do not add one.';

-- ---------- Instance Locks (Cards in active battles) ----------
CREATE TABLE IF NOT EXISTS instance_locks (
  instance_id UUID PRIMARY KEY REFERENCES card_instances(id),
  battle_id UUID NOT NULL REFERENCES battles(id)
);
COMMENT ON TABLE instance_locks IS 'Cards locked into active battles cannot be used elsewhere.';

-- ---------- Append-Only Enforcement ----------
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'battle_events is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS battle_events_no_mutate ON battle_events;
CREATE TRIGGER battle_events_no_mutate
  BEFORE UPDATE OR DELETE ON battle_events
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ---------- RLS ----------
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_locks ENABLE ROW LEVEL SECURITY;

-- Public reads for battles (spectators can watch)
CREATE POLICY battles_read ON battles FOR SELECT USING (true);
CREATE POLICY events_read ON battle_events FOR SELECT USING (true);
-- Intents are NEVER publicly readable. Own rows only.
CREATE POLICY intents_read_own ON battle_intents FOR SELECT USING (auth.uid() = actor_id);
CREATE POLICY sentiment_read ON battle_sentiment FOR SELECT USING (true);
CREATE POLICY locks_read ON instance_locks FOR SELECT USING (true);

-- Service role writes (battle-referee is the ONLY writer)
CREATE POLICY battles_service ON battles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY events_service ON battle_events FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY intents_service ON battle_intents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY sentiment_service ON battle_sentiment FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY locks_service ON instance_locks FOR ALL TO service_role USING (true) WITH CHECK (true);
-- ============================================================
-- PHASE 5: QUESTS AND SCRATCH
-- Migration 016 | Quest system and scratch tickets
-- From ebl-battler Part 2 package (0004_quests_scratch.sql)
-- ============================================================

-- ---------- Quest Definitions ----------
CREATE TABLE IF NOT EXISTS quest_defs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('daily','side','story')),
  chapter INT CHECK (chapter BETWEEN 1 AND 6),
  trigger JSONB NOT NULL,          -- {"event": "...", "count": N}
  reward JSONB NOT NULL,           -- {"bc": 20, "scratch": 1}
  active BOOLEAN NOT NULL DEFAULT true,
  copy_key TEXT NOT NULL           -- [COPY:*] key in CONTENT_TODO.md
);
COMMENT ON TABLE quest_defs IS 'Quest templates. Six story chapters. There is no chapter seven.';

-- ---------- Quest Progress ----------
CREATE TABLE IF NOT EXISTS quest_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  quest_id TEXT NOT NULL REFERENCES quest_defs(id),
  period DATE NOT NULL DEFAULT '1970-01-01', -- epoch date = non-daily
  progress INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, quest_id, period)
);
COMMENT ON TABLE quest_progress IS 'Per-user quest state. Daily quests key by period date.';

-- ---------- Scratch Tickets ----------
CREATE TABLE IF NOT EXISTS scratch_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  prize JSONB NOT NULL,            -- decided AT ISSUANCE, server-side
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scratched_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON scratch_tickets(user_id);
COMMENT ON TABLE scratch_tickets IS 'Prizes decided at issuance. Reveal is theater.';

-- ---------- Seed Quest Definitions ----------
-- Rewards are TUNABLE; copy is OWNER placeholder in CONTENT_TODO.md
INSERT INTO quest_defs (id, kind, chapter, trigger, reward, copy_key) VALUES
  ('daily_vote_3',   'daily', null, '{"event":"case_voted","count":3}',  '{"bc":10}',              'COPY_QUEST_DAILY_VOTE'),
  ('daily_battle_1', 'daily', null, '{"event":"battle_played","count":1}','{"bc":20}',              'COPY_QUEST_DAILY_BATTLE'),
  ('daily_spectate', 'daily', null, '{"event":"spectated","count":1}',   '{"bc":10,"scratch":1}',  'COPY_QUEST_DAILY_SPECTATE'),
  ('story_ch1', 'story', 1, '{"event":"product_claimed","count":1}',     '{"bc":50,"scratch":1}',  'COPY_STORY_CH1'),
  ('story_ch2', 'story', 2, '{"event":"battle_played","count":1}',       '{"bc":50,"scratch":1}',  'COPY_STORY_CH2'),
  ('story_ch3', 'story', 3, '{"event":"battle_won","count":1}',          '{"bc":50,"scratch":1}',  'COPY_STORY_CH3'),
  ('story_ch4', 'story', 4, '{"event":"defense_won","count":1}',         '{"bc":50,"scratch":1}',  'COPY_STORY_CH4'),
  ('story_ch5', 'story', 5, '{"event":"card_flipped_owned","count":1}',  '{"bc":50,"scratch":1}',  'COPY_STORY_CH5'),
  ('story_ch6', 'story', 6, '{"event":"takeover_won","count":1}',        '{"bc":50,"scratch":1}',  'COPY_STORY_CH6')
ON CONFLICT (id) DO NOTHING;

-- ---------- RLS ----------
ALTER TABLE quest_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratch_tickets ENABLE ROW LEVEL SECURITY;

-- Quest defs are public read (only active ones)
CREATE POLICY quest_defs_read ON quest_defs FOR SELECT USING (active);
-- Progress is owner-only
CREATE POLICY quest_progress_read_own ON quest_progress FOR SELECT USING (auth.uid() = user_id);
-- Tickets: block direct read, expose through view that hides prize
CREATE POLICY tickets_none ON scratch_tickets FOR SELECT USING (false);

-- Service role writes
CREATE POLICY quest_defs_service ON quest_defs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY quest_progress_service ON quest_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY tickets_service ON scratch_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------- Scratch Ticket View (Hides prize until scratched) ----------
CREATE OR REPLACE VIEW my_scratch_tickets AS
  SELECT
    id,
    user_id,
    issued_at,
    scratched_at,
    CASE WHEN scratched_at IS NOT NULL THEN prize ELSE NULL END AS prize
  FROM scratch_tickets
  WHERE user_id = auth.uid();

COMMENT ON VIEW my_scratch_tickets IS 'User-facing view. Prize hidden until scratched_at is set.';
-- ============================================================
-- WALLET RPCs
-- Migration 017 | Atomic wallet operations
-- From ebl-battler Part 2 package (0005_wallet_rpcs.sql)
-- Called ONLY by service-role edge functions.
-- ============================================================

-- ---------- Wallet Debit (Atomic, never goes negative) ----------
CREATE OR REPLACE FUNCTION wallet_debit(p_user UUID, p_amount NUMERIC)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ok BOOLEAN := false;
BEGIN
  -- Ensure wallet exists with starting balance
  INSERT INTO wallets (user_id) VALUES (p_user) ON CONFLICT DO NOTHING;

  -- Atomic debit: only succeeds if balance sufficient
  UPDATE wallets
    SET balance = balance - p_amount, updated_at = now()
    WHERE user_id = p_user AND balance >= p_amount;

  ok := FOUND;
  RETURN ok;
END;
$$;

COMMENT ON FUNCTION wallet_debit IS 'Atomic debit. Returns false if insufficient balance. Never throws.';

-- ---------- Wallet Credit ----------
CREATE OR REPLACE FUNCTION wallet_credit(p_user UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Upsert: create wallet with starting balance + credit, or just add credit
  INSERT INTO wallets (user_id, balance)
    VALUES (p_user, 100 + p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + p_amount, updated_at = now();
END;
$$;

COMMENT ON FUNCTION wallet_credit IS 'Credit user wallet. Creates wallet with starting balance if new.';

-- ---------- Rate Limit Increment ----------
CREATE OR REPLACE FUNCTION increment_rate_limit(p_user UUID, p_fn TEXT, p_minute TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE rate_limits
    SET calls = calls + 1
    WHERE user_id = p_user AND fn = p_fn AND minute = p_minute;
END;
$$;

COMMENT ON FUNCTION increment_rate_limit IS 'Increment rate limit counter. Used by battle-referee.';

-- ---------- Security: Revoke public access to wallet functions ----------
REVOKE EXECUTE ON FUNCTION wallet_debit FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wallet_credit FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_rate_limit FROM public, anon, authenticated;

-- Grant to service_role only
GRANT EXECUTE ON FUNCTION wallet_debit TO service_role;
GRANT EXECUTE ON FUNCTION wallet_credit TO service_role;
GRANT EXECUTE ON FUNCTION increment_rate_limit TO service_role;
