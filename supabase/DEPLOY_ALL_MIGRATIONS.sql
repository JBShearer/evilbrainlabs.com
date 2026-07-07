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

-- Index for cleanup function (no partial index - now() is not immutable)
CREATE INDEX idx_rate_limits_minute
  ON rate_limits (minute_bucket);

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
-- Migration 018: UCAR Feed, Verification Pipeline, and Complaints System
-- Implements schema from UCAR_REGISTRY_BUILD_PLAN.md sections 2.5, 3.3, 4.5
-- Tables: votes, watches, case_status_log, verifications, complaints, review_queue
-- Adds UCAR status enum values and RLS policies

-- ============================================================================
-- PART 1: Status Enum Expansion for UCAR Pipeline
-- ============================================================================
-- Status flow: submitted -> machine_verified | needs_human | rejected
--              machine_verified -> under_review -> (reinstated = machine_verified) | retracted
--              needs_human -> machine_verified | rejected (human decision)
--              retracted is terminal

-- Drop old constraint and add expanded UCAR status values
ALTER TABLE use_cases DROP CONSTRAINT IF EXISTS use_cases_status_check;

ALTER TABLE use_cases ADD CONSTRAINT use_cases_status_check
  CHECK (status IN (
    -- Legacy statuses (kept for backward compatibility)
    'pending_review', 'approved', 'active', 'duplicate', 'retired', 'rejected', 'needs_revision',
    -- UCAR pipeline statuses
    'submitted',          -- Initial submission state
    'machine_verified',   -- Passed autoverify pipeline
    'needs_human',        -- Routed to human review queue
    'under_review',       -- Complaint filed, frozen from EBL use
    'retracted'           -- Terminal state, card becomes collector item
  ));

-- Add contested flag for complaint handling
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS contested BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN use_cases.contested IS 'True when an active complaint exists against this case';
COMMENT ON COLUMN use_cases.status IS 'UCAR status: submitted->machine_verified|needs_human|rejected, machine_verified->under_review->retracted';

-- ============================================================================
-- PART 2: Votes Table (Section 2.5)
-- ============================================================================
-- One vote per user per case, changeable
-- Different from legacy case_votes: authenticated only, side-based (good/evil)

CREATE TABLE IF NOT EXISTS votes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('good', 'evil')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, case_id)
);

CREATE INDEX IF NOT EXISTS votes_case_id_idx ON votes(case_id);
CREATE INDEX IF NOT EXISTS votes_user_id_idx ON votes(user_id);
CREATE INDEX IF NOT EXISTS votes_side_idx ON votes(case_id, side);

COMMENT ON TABLE votes IS 'UCAR feed votes. One vote per user per case, changeable. Source of truth for good_votes/evil_votes counters.';
COMMENT ON COLUMN votes.side IS 'Vote alignment: good or evil';
COMMENT ON COLUMN votes.updated_at IS 'Last time user changed their vote';

-- ============================================================================
-- PART 3: Watches Table (Section 2.5)
-- ============================================================================
-- Case subscriptions for status change notifications

CREATE TABLE IF NOT EXISTS watches (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, case_id)
);

CREATE INDEX IF NOT EXISTS watches_case_id_idx ON watches(case_id);
CREATE INDEX IF NOT EXISTS watches_user_id_idx ON watches(user_id);

COMMENT ON TABLE watches IS 'Case watch subscriptions. Users receive notifications on status changes and faction flips.';

-- ============================================================================
-- PART 4: Case Status Log (Section 2.5)
-- ============================================================================
-- Public status history for transparency and legal posture

CREATE TABLE IF NOT EXISTS case_status_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL,              -- 'steward' | 'human:{admin_id}' | 'system'
  reason TEXT NOT NULL,             -- public, plain language
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS case_status_log_case_id_idx ON case_status_log(case_id);
CREATE INDEX IF NOT EXISTS case_status_log_created_at_idx ON case_status_log(created_at DESC);
CREATE INDEX IF NOT EXISTS case_status_log_to_status_idx ON case_status_log(to_status);

COMMENT ON TABLE case_status_log IS 'Public audit trail of all status changes. Every transition logged with actor and reason.';
COMMENT ON COLUMN case_status_log.actor IS 'Who made the change: steward (model), human:{admin_id}, or system';
COMMENT ON COLUMN case_status_log.reason IS 'Plain language explanation, always public';

-- ============================================================================
-- PART 5: Verifications Table (Section 3.3)
-- ============================================================================
-- Autoverify pipeline stage results

CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN (
    'schema_gate',          -- Stage 1: required fields present
    'source_fetch',         -- Stage 2: source_url returns 200
    'dedupe',               -- Stage 3: duplicate detection
    'prohibited_screen',    -- Stage 4: spam/doxxing/harm check
    'claim_source',         -- Stage 5: claim-source consistency
    'classification',       -- Stage 6: category/impact confirmation
    'verdict'               -- Stage 7: final determination
  )),
  outcome TEXT NOT NULL CHECK (outcome IN (
    'pass',                 -- Stage passed
    'fail',                 -- Stage failed (soft or hard)
    'skip',                 -- Stage skipped (short-circuit)
    'supported',            -- claim_source: evidence supports claim
    'partially_supported',  -- claim_source: partial evidence
    'unsupported',          -- claim_source: no supporting evidence
    'machine_verified',     -- verdict: all pass
    'needs_human',          -- verdict: soft failure
    'rejected'              -- verdict: hard failure
  )),
  rationale TEXT NOT NULL,
  model_action_id BIGINT,           -- FK to model_actions (steward spec)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS verifications_case_id_idx ON verifications(case_id);
CREATE INDEX IF NOT EXISTS verifications_stage_idx ON verifications(stage);
CREATE INDEX IF NOT EXISTS verifications_created_at_idx ON verifications(created_at DESC);
CREATE INDEX IF NOT EXISTS verifications_case_stage_idx ON verifications(case_id, stage);

COMMENT ON TABLE verifications IS 'Autoverify pipeline stage results. Each submission runs through stages 1-7.';
COMMENT ON COLUMN verifications.stage IS 'Pipeline stage: schema_gate, source_fetch, dedupe, prohibited_screen, claim_source, classification, verdict';
COMMENT ON COLUMN verifications.outcome IS 'Stage result determining next action';
COMMENT ON COLUMN verifications.model_action_id IS 'FK to model_actions for model-based stages (steward attribution)';

-- ============================================================================
-- PART 6: Complaints Table (Section 4.5)
-- ============================================================================
-- Complaint filing with anti-weaponization guardrails

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  filed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'factual_error',
    'wrong_attribution',
    'framing',
    'duplicate',
    'dead_source',
    'legal_request'
  )),
  detail TEXT NOT NULL CHECK (char_length(detail) >= 100),
  evidence_url TEXT,
  relationship TEXT NOT NULL DEFAULT 'none' CHECK (relationship IN (
    'none',
    'employee_of_named_org',
    'counsel_for_named_org',
    'submitter'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',
    'merged',
    'dismissed',
    'upheld',
    'appealed'
  )),
  triage_memo TEXT,
  resolved_by TEXT,                 -- 'steward' | 'human:{id}'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS complaints_case_id_idx ON complaints(case_id);
CREATE INDEX IF NOT EXISTS complaints_filed_by_idx ON complaints(filed_by);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints(status);
CREATE INDEX IF NOT EXISTS complaints_type_idx ON complaints(type);
CREATE INDEX IF NOT EXISTS complaints_created_at_idx ON complaints(created_at DESC);
-- Index for rate limiting: open complaints per user
CREATE INDEX IF NOT EXISTS complaints_user_open_idx ON complaints(filed_by, status) WHERE status = 'open';

COMMENT ON TABLE complaints IS 'Complaint filings against cases. Triggers review process and potential case suspension.';
COMMENT ON COLUMN complaints.type IS 'Complaint category: factual_error, wrong_attribution, framing, duplicate, dead_source, legal_request';
COMMENT ON COLUMN complaints.detail IS 'Required explanation, minimum 100 characters';
COMMENT ON COLUMN complaints.relationship IS 'Complainant relationship to case subject. Named party triggers immediate suspension.';
COMMENT ON COLUMN complaints.triage_memo IS 'Steward triage assessment for human reviewers';

-- ============================================================================
-- PART 7: Review Queue Table (Section 4.5)
-- ============================================================================
-- Human review queue for suspended cases

CREATE TABLE IF NOT EXISTS review_queue (
  case_id UUID PRIMARY KEY REFERENCES use_cases(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  escalated_at TIMESTAMPTZ,
  complaint_ids UUID[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS review_queue_opened_at_idx ON review_queue(opened_at);
CREATE INDEX IF NOT EXISTS review_queue_escalated_at_idx ON review_queue(escalated_at) WHERE escalated_at IS NOT NULL;

COMMENT ON TABLE review_queue IS 'Cases requiring human review. SLA: 7 days, escalate at 5 days.';
COMMENT ON COLUMN review_queue.escalated_at IS 'Set when SLA warning triggers (5 days)';
COMMENT ON COLUMN review_queue.complaint_ids IS 'All complaints merged into this review';

-- ============================================================================
-- PART 8: Feed Pagination Indexes
-- ============================================================================
-- Cursor pagination on (created_at, id) for infinite scroll

CREATE INDEX IF NOT EXISTS use_cases_feed_pagination_idx
  ON use_cases(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS use_cases_feed_status_idx
  ON use_cases(status, created_at DESC, id DESC)
  WHERE status IN ('machine_verified', 'under_review');

-- Index for Top tab scoring (7-day window)
CREATE INDEX IF NOT EXISTS use_cases_feed_recent_idx
  ON use_cases(created_at DESC)
  WHERE created_at > NOW() - INTERVAL '7 days';

-- Index for Flips tab (faction changes in last 30 days)
-- Requires tracking last faction flip - add column if needed
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS last_flip_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS use_cases_flips_idx
  ON use_cases(last_flip_at DESC NULLS LAST)
  WHERE last_flip_at IS NOT NULL;

COMMENT ON COLUMN use_cases.last_flip_at IS 'Timestamp of most recent good/evil faction flip';

-- ============================================================================
-- PART 9: RLS Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;

-- Votes: users can read/write their own votes, others can read aggregate only
CREATE POLICY votes_select_own ON votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY votes_insert_own ON votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY votes_update_own ON votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY votes_delete_own ON votes
  FOR DELETE USING (auth.uid() = user_id);

-- Watches: users can manage their own watches
CREATE POLICY watches_select_own ON watches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY watches_insert_own ON watches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY watches_delete_own ON watches
  FOR DELETE USING (auth.uid() = user_id);

-- Case status log: public read (transparency requirement)
CREATE POLICY case_status_log_select_all ON case_status_log
  FOR SELECT USING (true);

-- Verifications: public read (transparency requirement)
CREATE POLICY verifications_select_all ON verifications
  FOR SELECT USING (true);

-- Complaints: users can read their own filed complaints
-- Public sees only complaint type and outcome on case page (via case_status_log)
CREATE POLICY complaints_select_own ON complaints
  FOR SELECT USING (auth.uid() = filed_by);

CREATE POLICY complaints_insert_own ON complaints
  FOR INSERT WITH CHECK (auth.uid() = filed_by);

-- Review queue: admin only (handled at app layer via service role)
-- No public RLS policy - requires service role key

-- ============================================================================
-- PART 10: Helper Functions
-- ============================================================================

-- Function to count open complaints per user (for rate limiting)
CREATE OR REPLACE FUNCTION get_user_open_complaint_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM complaints
  WHERE filed_by = p_user_id AND status = 'open';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to recalculate vote counters from votes table
CREATE OR REPLACE FUNCTION recalculate_vote_counts(p_case_id UUID)
RETURNS VOID AS $$
  UPDATE use_cases
  SET
    good_votes = (SELECT COUNT(*) FROM votes WHERE case_id = p_case_id AND side = 'good'),
    evil_votes = (SELECT COUNT(*) FROM votes WHERE case_id = p_case_id AND side = 'evil')
  WHERE id = p_case_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Trigger to update vote counters on vote change
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_vote_counts(OLD.case_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_vote_counts(NEW.case_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS votes_update_counts ON votes;
CREATE TRIGGER votes_update_counts
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_vote_counts();

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO case_status_log (case_id, from_status, to_status, actor, reason)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(current_setting('app.current_actor', true), 'system'),
      COALESCE(current_setting('app.status_reason', true), 'Status changed')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS use_cases_status_log ON use_cases;
CREATE TRIGGER use_cases_status_log
  AFTER UPDATE ON use_cases
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

-- Function to detect faction flip and update last_flip_at
CREATE OR REPLACE FUNCTION check_faction_flip()
RETURNS TRIGGER AS $$
DECLARE
  old_faction TEXT;
  new_faction TEXT;
BEGIN
  -- Determine old faction (majority wins, evil on tie)
  IF OLD.good_votes > OLD.evil_votes THEN
    old_faction := 'good';
  ELSE
    old_faction := 'evil';
  END IF;

  -- Determine new faction
  IF NEW.good_votes > NEW.evil_votes THEN
    new_faction := 'good';
  ELSE
    new_faction := 'evil';
  END IF;

  -- If faction changed, update last_flip_at
  IF old_faction != new_faction THEN
    NEW.last_flip_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS use_cases_faction_flip ON use_cases;
CREATE TRIGGER use_cases_faction_flip
  BEFORE UPDATE ON use_cases
  FOR EACH ROW
  WHEN (OLD.good_votes IS DISTINCT FROM NEW.good_votes OR OLD.evil_votes IS DISTINCT FROM NEW.evil_votes)
  EXECUTE FUNCTION check_faction_flip();

-- ============================================================================
-- PART 11: Comments and Documentation
-- ============================================================================

COMMENT ON TABLE votes IS 'UCAR feed votes per UCAR_REGISTRY_BUILD_PLAN.md section 2.5. One vote per authenticated user per case.';
COMMENT ON TABLE watches IS 'Case watch subscriptions per UCAR_REGISTRY_BUILD_PLAN.md section 2.5. For status change and flip notifications.';
COMMENT ON TABLE case_status_log IS 'Public status history per UCAR_REGISTRY_BUILD_PLAN.md section 2.5. Every status change is public.';
COMMENT ON TABLE verifications IS 'Autoverify pipeline results per UCAR_REGISTRY_BUILD_PLAN.md section 3.3. Stages 1-7 logged here.';
COMMENT ON TABLE complaints IS 'Complaint filings per UCAR_REGISTRY_BUILD_PLAN.md section 4.5. Rate limited to 3 open per user.';
COMMENT ON TABLE review_queue IS 'Human review queue per UCAR_REGISTRY_BUILD_PLAN.md section 4.5. 7-day SLA, escalate at 5 days.';
-- ============================================================
-- MODEL STEWARD INFRASTRUCTURE
-- Migration 019 | Model actions logging and audit trail
-- From MODEL_STEWARD_SPEC.md section 3
-- ============================================================

-- ---------- Model Actions Table ----------
-- Every model call logged, reversible, auditable

CREATE TABLE IF NOT EXISTS model_actions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role TEXT NOT NULL,               -- verifier | triage_officer | taxonomist | show_researcher | reconciler
  site TEXT NOT NULL CHECK (site IN ('ucar', 'ebl', 'both')),
  subject_type TEXT NOT NULL,       -- 'case' | 'complaint' | 'digest' | 'card' | ...
  subject_id UUID,
  input_hash TEXT NOT NULL,         -- sha256 of the exact prompt payload
  output JSONB NOT NULL,
  confidence NUMERIC,
  model_version TEXT NOT NULL,      -- model string + prompt version
  latency_ms INT,
  cost_estimate NUMERIC,
  overridden_by TEXT,               -- 'human:{id}' when reversed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_actions_role ON model_actions(role);
CREATE INDEX IF NOT EXISTS idx_model_actions_site ON model_actions(site);
CREATE INDEX IF NOT EXISTS idx_model_actions_subject ON model_actions(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_model_actions_version ON model_actions(model_version);
CREATE INDEX IF NOT EXISTS idx_model_actions_created ON model_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_actions_overridden ON model_actions(overridden_by) WHERE overridden_by IS NOT NULL;

COMMENT ON TABLE model_actions IS 'Every model decision logged. Reversible by human. Weekly audit sampling.';

-- ---------- Token Budget Tracking ----------
-- Daily token budget per role (TUNABLE)

CREATE TABLE IF NOT EXISTS model_budgets (
  role TEXT PRIMARY KEY,
  daily_limit INT NOT NULL,
  tokens_used INT NOT NULL DEFAULT 0,
  reset_at DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Seed default budgets (TUNABLE)
INSERT INTO model_budgets (role, daily_limit) VALUES
  ('verifier', 500000),
  ('triage_officer', 200000),
  ('taxonomist', 100000),
  ('show_researcher', 300000),
  ('reconciler', 100000)
ON CONFLICT (role) DO NOTHING;

COMMENT ON TABLE model_budgets IS 'Daily token limits per role. Exceeding routes to needs_human.';

-- ---------- Prompt Versions ----------
-- Track prompt versions for audit

CREATE TABLE IF NOT EXISTS prompt_versions (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  version TEXT NOT NULL,
  content_hash TEXT NOT NULL,       -- sha256 of prompt content
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, version)
);

COMMENT ON TABLE prompt_versions IS 'Prompt version registry. Changes are PRs in repo.';

-- ---------- Override Rate Tracking ----------
-- Weekly override rate per role

CREATE OR REPLACE VIEW model_override_rates AS
SELECT
  role,
  COUNT(*) AS total_actions,
  COUNT(*) FILTER (WHERE overridden_by IS NOT NULL) AS overridden_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE overridden_by IS NOT NULL) / NULLIF(COUNT(*), 0), 2) AS override_rate_pct
FROM model_actions
WHERE created_at > now() - INTERVAL '7 days'
GROUP BY role;

COMMENT ON VIEW model_override_rates IS 'Weekly override rate per role. >10% freezes auto-approve.';

-- ---------- RLS ----------

ALTER TABLE model_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

-- Model actions: service role write, admin read for audit
CREATE POLICY model_actions_service ON model_actions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY model_budgets_service ON model_budgets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY prompt_versions_service ON prompt_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------- FK from verifications to model_actions ----------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'verifications_model_action_fk'
  ) THEN
    ALTER TABLE verifications
      ADD CONSTRAINT verifications_model_action_fk
      FOREIGN KEY (model_action_id) REFERENCES model_actions(id);
  END IF;
END $$;

-- ---------- Budget Check Function ----------

CREATE OR REPLACE FUNCTION check_model_budget(p_role TEXT, p_tokens INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget model_budgets%ROWTYPE;
BEGIN
  SELECT * INTO v_budget FROM model_budgets WHERE role = p_role FOR UPDATE;

  IF v_budget IS NULL THEN
    RETURN false;  -- Unknown role
  END IF;

  -- Reset if new day
  IF v_budget.reset_at < CURRENT_DATE THEN
    UPDATE model_budgets SET tokens_used = 0, reset_at = CURRENT_DATE WHERE role = p_role;
    v_budget.tokens_used := 0;
  END IF;

  -- Check if over budget
  IF v_budget.tokens_used + p_tokens > v_budget.daily_limit THEN
    RETURN false;  -- Over budget, route to needs_human
  END IF;

  -- Deduct tokens
  UPDATE model_budgets SET tokens_used = tokens_used + p_tokens WHERE role = p_role;
  RETURN true;
END;
$$;

COMMENT ON FUNCTION check_model_budget IS 'Check and deduct token budget. Returns false if over limit.';

REVOKE EXECUTE ON FUNCTION check_model_budget FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION check_model_budget TO service_role;
-- ============================================================
-- SHOW EPISODES
-- Migration 020 | Episode tracking for Use Case Arms Race show
-- From SHOW_LAUNCH_RUNBOOK.md section 2
-- ============================================================

-- ---------- Episodes Table ----------
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT UNIQUE NOT NULL,
  air_date DATE NOT NULL,
  featured_case_id UUID NOT NULL REFERENCES use_cases(id),
  ticker_case_ids UUID[] NOT NULL DEFAULT '{}',
  battle_replay_id UUID,            -- EBL battle id, export bundle
  video_url TEXT,
  transcript TEXT,                  -- Optional transcript for accessibility
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON episodes(air_date);
CREATE INDEX IF NOT EXISTS idx_episodes_published ON episodes(published_at) WHERE published_at IS NOT NULL;

COMMENT ON TABLE episodes IS 'Show episodes. Publishing triggers Card of the Day and feed pin.';
COMMENT ON COLUMN episodes.featured_case_id IS 'The Case of the Day - becomes EBL Card of the Day at publish';
COMMENT ON COLUMN episodes.ticker_case_ids IS '2-4 rapid items: flips, new legendaries, review outcomes';
COMMENT ON COLUMN episodes.battle_replay_id IS 'EBL battle ID for replay footage (Phase 6)';

-- ---------- Card of the Day Tracking ----------
-- When an episode is published, the featured case becomes the Card of the Day
-- This view identifies the current Card of the Day for EBL

CREATE OR REPLACE VIEW card_of_the_day AS
SELECT
  e.featured_case_id AS case_id,
  c.id AS card_id,
  e.id AS episode_id,
  e.number AS episode_number,
  e.published_at,
  e.published_at + INTERVAL '24 hours' AS expires_at
FROM episodes e
JOIN cards c ON c.case_id = e.featured_case_id
WHERE e.published_at IS NOT NULL
  AND e.published_at + INTERVAL '24 hours' > NOW()
ORDER BY e.published_at DESC
LIMIT 1;

COMMENT ON VIEW card_of_the_day IS 'Current Card of the Day - free to play for 24h on EBL';

-- ---------- Feed Pin Tracking ----------
-- Featured case is pinned to the top of the feed for 24h after publish

CREATE OR REPLACE VIEW feed_pins AS
SELECT
  e.featured_case_id AS case_id,
  e.id AS episode_id,
  e.published_at AS pinned_at,
  e.published_at + INTERVAL '24 hours' AS expires_at
FROM episodes e
WHERE e.published_at IS NOT NULL
  AND e.published_at + INTERVAL '24 hours' > NOW();

COMMENT ON VIEW feed_pins IS 'Cases pinned to feed top from recent episode publications';

-- ---------- RLS ----------
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

-- Episodes are public read (published ones only for non-admins)
CREATE POLICY episodes_read_published ON episodes FOR SELECT
  USING (published_at IS NOT NULL);

-- Admins can see all episodes (for scheduling)
CREATE POLICY episodes_read_admin ON episodes FOR SELECT
  TO service_role
  USING (true);

-- Only service role can write episodes
CREATE POLICY episodes_service ON episodes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------- Publish Function ----------
-- Call this when publishing an episode to trigger all side effects

CREATE OR REPLACE FUNCTION publish_episode(p_episode_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_episode episodes%ROWTYPE;
  v_card_id UUID;
BEGIN
  -- Get and lock the episode
  SELECT * INTO v_episode FROM episodes WHERE id = p_episode_id FOR UPDATE;

  IF v_episode IS NULL THEN
    RETURN jsonb_build_object('error', 'episode not found');
  END IF;

  IF v_episode.published_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'already published', 'published_at', v_episode.published_at);
  END IF;

  -- Get the card for the featured case
  SELECT id INTO v_card_id FROM cards WHERE case_id = v_episode.featured_case_id;

  IF v_card_id IS NULL THEN
    RETURN jsonb_build_object('error', 'featured case has no card - run mint-card first');
  END IF;

  -- Set published timestamp
  UPDATE episodes SET published_at = NOW() WHERE id = p_episode_id;

  -- Log the card event
  INSERT INTO card_events (card_id, type, payload)
  VALUES (v_card_id, 'card_of_the_day', jsonb_build_object(
    'episode_id', p_episode_id,
    'episode_number', v_episode.number
  ));

  -- TODO: Trigger watch notifications (edge function call)
  -- TODO: Update any caching/CDN as needed

  RETURN jsonb_build_object(
    'success', true,
    'episode_id', p_episode_id,
    'episode_number', v_episode.number,
    'card_id', v_card_id,
    'card_of_the_day_expires', NOW() + INTERVAL '24 hours'
  );
END;
$$;

COMMENT ON FUNCTION publish_episode IS 'Publish an episode - triggers Card of the Day, feed pin, notifications';

-- Revoke public access
REVOKE EXECUTE ON FUNCTION publish_episode FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION publish_episode TO service_role;
