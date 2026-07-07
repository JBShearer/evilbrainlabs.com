-- ============================================================
-- DEPLOY_ALL_BATTLE_MIGRATIONS.sql
-- ============================================================
-- Combined migrations 012-017 for Evil Brain Labs Battle System
--
-- USAGE: Copy and paste this entire file into Supabase SQL Editor
--        and execute. Safe for re-runs due to IF NOT EXISTS guards.
--
-- MIGRATIONS INCLUDED:
--   012 - Phase 0: Hardening (RLS fixes, rate limiting, admin roles)
--   013 - Phase 1: Battle System Foundation (cards, wallets, instances)
--   014 - Phase 2: Portfolio Economy (products, mining ledger)
--   015 - Phase 3/4: Battles (battle system, events, intents)
--   016 - Phase 5: Quests and Scratch (quest system, scratch tickets)
--   017 - Wallet RPCs (atomic wallet operations)
--
-- INVARIANT: battle_events is APPEND ONLY. No update/delete.
-- INVARIANT: Registry tables are READ-ONLY from EBL functions.
-- ============================================================


-- ############################################################
-- SECTION 1: PHASE 0 HARDENING (Migration 012)
-- Security hardening before economy attachment
-- ############################################################

-- =============================================================================
-- 1.1 FIX MISSING RLS ON case_relationships
-- =============================================================================

ALTER TABLE case_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Case relationships are public" ON case_relationships;
CREATE POLICY "Case relationships are public"
  ON case_relationships FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role manages case relationships" ON case_relationships;
CREATE POLICY "Service role manages case relationships"
  ON case_relationships FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 1.2 FIX MISSING RLS ON case_votes
-- =============================================================================

ALTER TABLE case_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own votes" ON case_votes;
CREATE POLICY "Users see own votes"
  ON case_votes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages votes" ON case_votes;
CREATE POLICY "Service role manages votes"
  ON case_votes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 1.3 TIGHTEN OVERLY PERMISSIVE POLICIES ON joke_patterns
-- =============================================================================

DROP POLICY IF EXISTS "Service can manage patterns" ON joke_patterns;
DROP POLICY IF EXISTS "Service role manages joke patterns" ON joke_patterns;
DROP POLICY IF EXISTS "Service role updates joke patterns" ON joke_patterns;
DROP POLICY IF EXISTS "Service role deletes joke patterns" ON joke_patterns;

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
-- 1.4 TIGHTEN OVERLY PERMISSIVE POLICIES ON running_jokes
-- =============================================================================

DROP POLICY IF EXISTS "Service can manage jokes" ON running_jokes;
DROP POLICY IF EXISTS "Service role manages running jokes" ON running_jokes;
DROP POLICY IF EXISTS "Service role updates running jokes" ON running_jokes;
DROP POLICY IF EXISTS "Service role deletes running jokes" ON running_jokes;

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
-- 1.5 RATE LIMITING TABLE
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

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits (user_id, function_name, minute_bucket);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
  ON rate_limits (minute_bucket)
  WHERE minute_bucket < now() - interval '1 hour';

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages rate limits" ON rate_limits;
CREATE POLICY "Service role manages rate limits"
  ON rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE rate_limits IS 'Per-user per-function rate limiting. Default 30 calls/min/function.';

-- =============================================================================
-- 1.6 RATE LIMIT CHECK FUNCTION
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
-- 1.7 DAILY ACTION LIMITS TABLE (for economy protection)
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_count INT NOT NULL DEFAULT 1,
  UNIQUE (user_id, action_type, action_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_limits_lookup
  ON daily_limits (user_id, action_type, action_date);

ALTER TABLE daily_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages daily limits" ON daily_limits;
CREATE POLICY "Service role manages daily limits"
  ON daily_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE daily_limits IS 'Per-user per-day action limits for economy protection.';

-- =============================================================================
-- 1.8 DAILY LIMIT CHECK FUNCTION
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
-- 1.9 CLEANUP FUNCTION FOR OLD RATE LIMIT ENTRIES
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
-- 1.10 ADMIN ROLE COLUMN (replacing any email-based backdoors)
-- =============================================================================

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
-- 1.11 REGISTRY READ ISOLATION (EBL can only SELECT from registry tables)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ebl_reader') THEN
    CREATE ROLE ebl_reader;
  END IF;
END $$;

-- Grant SELECT-only on registry tables (ignore errors if tables don't exist)
DO $$
BEGIN
  GRANT SELECT ON use_cases TO ebl_reader;
  GRANT SELECT ON entities TO ebl_reader;
  GRANT SELECT ON predicates TO ebl_reader;
  GRANT SELECT ON triples TO ebl_reader;
  GRANT SELECT ON sources TO ebl_reader;
  GRANT SELECT ON coins TO ebl_reader;
  GRANT SELECT ON votes TO ebl_reader;
  GRANT SELECT ON flips TO ebl_reader;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  REVOKE INSERT, UPDATE, DELETE ON use_cases FROM ebl_reader;
  REVOKE INSERT, UPDATE, DELETE ON entities FROM ebl_reader;
  REVOKE INSERT, UPDATE, DELETE ON predicates FROM ebl_reader;
  REVOKE INSERT, UPDATE, DELETE ON triples FROM ebl_reader;
  REVOKE INSERT, UPDATE, DELETE ON sources FROM ebl_reader;
  REVOKE INSERT, UPDATE, DELETE ON coins FROM ebl_reader;
  REVOKE INSERT, UPDATE, DELETE ON votes FROM ebl_reader;
  REVOKE INSERT, UPDATE, DELETE ON flips FROM ebl_reader;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- ############################################################
-- SECTION 2: BATTLE SYSTEM FOUNDATION (Migration 013)
-- Cards, Wallets, Card Instances
-- ############################################################

-- =============================================================================
-- 2.1 Profiles Roles (Admin via table, not email pattern)
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player','admin')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE profiles_roles IS
  'Admin is set ONLY via dashboard or service-role script. Never derived from email content.';

-- =============================================================================
-- 2.2 Wallets
-- =============================================================================

CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 100 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE wallets IS '$EVIL balance. Starting balance 100. Never negative.';

-- =============================================================================
-- 2.3 Cards (Minted from use_cases)
-- =============================================================================

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID UNIQUE NOT NULL,
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

-- =============================================================================
-- 2.4 Card Instances (Owned copies)
-- =============================================================================

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

-- =============================================================================
-- 2.5 Card Events (Audit log)
-- =============================================================================

CREATE TABLE IF NOT EXISTS card_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES cards(id),
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE card_events IS 'Append-only audit log for card state changes.';

-- =============================================================================
-- 2.6 Backgrounds (For card art generation)
-- =============================================================================

CREATE TABLE IF NOT EXISTS backgrounds (
  id SERIAL PRIMARY KEY,
  storage_path TEXT NOT NULL,
  weight INT NOT NULL DEFAULT 1 CHECK (weight > 0),
  active BOOLEAN NOT NULL DEFAULT true
);
COMMENT ON TABLE backgrounds IS 'Background library for card art. Weight for random selection.';

INSERT INTO backgrounds (storage_path, weight) VALUES
  ('backgrounds/fallback_black.png', 1),
  ('backgrounds/fallback_red.png', 1),
  ('backgrounds/fallback_bone.png', 1)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2.7 RLS for Battle Foundation Tables
-- =============================================================================

ALTER TABLE profiles_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE backgrounds ENABLE ROW LEVEL SECURITY;

-- Public reads for game data
DROP POLICY IF EXISTS cards_read ON cards;
CREATE POLICY cards_read ON cards FOR SELECT USING (true);

DROP POLICY IF EXISTS instances_read ON card_instances;
CREATE POLICY instances_read ON card_instances FOR SELECT USING (true);

DROP POLICY IF EXISTS card_events_read ON card_events;
CREATE POLICY card_events_read ON card_events FOR SELECT USING (true);

DROP POLICY IF EXISTS backgrounds_read ON backgrounds;
CREATE POLICY backgrounds_read ON backgrounds FOR SELECT USING (active);

DROP POLICY IF EXISTS wallet_read_own ON wallets;
CREATE POLICY wallet_read_own ON wallets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS role_read_own ON profiles_roles;
CREATE POLICY role_read_own ON profiles_roles FOR SELECT USING (auth.uid() = user_id);

-- Service role writes
DROP POLICY IF EXISTS wallets_service ON wallets;
CREATE POLICY wallets_service ON wallets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS roles_service ON profiles_roles;
CREATE POLICY roles_service ON profiles_roles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cards_service ON cards;
CREATE POLICY cards_service ON cards FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS instances_service ON card_instances;
CREATE POLICY instances_service ON card_instances FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS events_service ON card_events;
CREATE POLICY events_service ON card_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS backgrounds_service ON backgrounds;
CREATE POLICY backgrounds_service ON backgrounds FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 2.8 Add impact column to use_cases if missing
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'use_cases' AND column_name = 'impact'
  ) THEN
    ALTER TABLE use_cases ADD COLUMN impact INT;
    UPDATE use_cases SET impact = COALESCE(severity, 3);
    ALTER TABLE use_cases ALTER COLUMN impact SET DEFAULT 3;
    ALTER TABLE use_cases ADD CONSTRAINT use_cases_impact_check CHECK (impact BETWEEN 1 AND 5);
  END IF;
END $$;

-- =============================================================================
-- 2.9 Create view for vote counts
-- =============================================================================

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


-- ############################################################
-- SECTION 3: PORTFOLIO ECONOMY (Migration 014)
-- Products and Mining Ledger
-- ############################################################

-- =============================================================================
-- 3.1 Products (Claimed seats in the economy)
-- =============================================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID UNIQUE NOT NULL,
  card_id UUID NOT NULL REFERENCES cards(id),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  defense_loadout JSONB NOT NULL DEFAULT '{}',
  siphon_until TIMESTAMPTZ,
  siphon_rate NUMERIC NOT NULL DEFAULT 0 CHECK (siphon_rate >= 0 AND siphon_rate <= 1),
  siphon_beneficiaries UUID[] NOT NULL DEFAULT '{}',
  raid_marks INT NOT NULL DEFAULT 0,
  raid_marks_reset_at TIMESTAMPTZ,
  last_battle_at TIMESTAMPTZ,
  mined_through TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_owner ON products(owner_id);
COMMENT ON TABLE products IS 'Claimed seats. Owner mines $EVIL based on card impact.';

-- =============================================================================
-- 3.2 Mining Ledger (Immutable record of earnings)
-- =============================================================================

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

-- =============================================================================
-- 3.3 RLS for Portfolio Tables
-- =============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_read ON products;
CREATE POLICY products_read ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS ledger_read_own ON mining_ledger;
CREATE POLICY ledger_read_own ON mining_ledger FOR SELECT USING (auth.uid() = beneficiary_id);

DROP POLICY IF EXISTS products_service ON products;
CREATE POLICY products_service ON products FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ledger_service ON mining_ledger;
CREATE POLICY ledger_service ON mining_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ############################################################
-- SECTION 4: BATTLES (Migration 015)
-- Battle system tables
-- INVARIANT: battle_events is APPEND ONLY. No update/delete.
-- ############################################################

-- =============================================================================
-- 4.1 Battles
-- =============================================================================

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
COMMENT ON TABLE battles IS 'Raid and takeover battles. State machine: window->locked->resolved.';

-- =============================================================================
-- 4.2 Battle Events (APPEND ONLY)
-- =============================================================================

CREATE TABLE IF NOT EXISTS battle_events (
  battle_id UUID NOT NULL REFERENCES battles(id),
  seq INT NOT NULL,
  type TEXT NOT NULL,
  actor_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (battle_id, seq)
);
COMMENT ON TABLE battle_events IS 'Append-only event log. Reducer reads this to compute state.';

-- =============================================================================
-- 4.3 Battle Intents (Sealed moves, hidden until resolution)
-- =============================================================================

CREATE TABLE IF NOT EXISTS battle_intents (
  battle_id UUID NOT NULL REFERENCES battles(id),
  turn INT NOT NULL,
  actor_id UUID NOT NULL,
  intent JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (battle_id, turn, actor_id)
);
COMMENT ON TABLE battle_intents IS 'Sealed player intents. Never publicly readable. Hashes only broadcast.';

-- =============================================================================
-- 4.4 Battle Sentiment (Spectator votes)
-- =============================================================================

CREATE TABLE IF NOT EXISTS battle_sentiment (
  battle_id UUID NOT NULL REFERENCES battles(id),
  voter_id UUID NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('attackers','defenders')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (battle_id, voter_id)
);
COMMENT ON TABLE battle_sentiment IS 'Free spectator votes. NO paid influence path. Do not add one.';

-- =============================================================================
-- 4.5 Instance Locks (Cards in active battles)
-- =============================================================================

CREATE TABLE IF NOT EXISTS instance_locks (
  instance_id UUID PRIMARY KEY REFERENCES card_instances(id),
  battle_id UUID NOT NULL REFERENCES battles(id)
);
COMMENT ON TABLE instance_locks IS 'Cards locked into active battles cannot be used elsewhere.';

-- =============================================================================
-- 4.6 Append-Only Enforcement for battle_events
-- =============================================================================

CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'battle_events is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS battle_events_no_mutate ON battle_events;
CREATE TRIGGER battle_events_no_mutate
  BEFORE UPDATE OR DELETE ON battle_events
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- =============================================================================
-- 4.7 RLS for Battle Tables
-- =============================================================================

ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE instance_locks ENABLE ROW LEVEL SECURITY;

-- Public reads for battles (spectators can watch)
DROP POLICY IF EXISTS battles_read ON battles;
CREATE POLICY battles_read ON battles FOR SELECT USING (true);

DROP POLICY IF EXISTS events_read ON battle_events;
CREATE POLICY events_read ON battle_events FOR SELECT USING (true);

-- Intents are NEVER publicly readable. Own rows only.
DROP POLICY IF EXISTS intents_read_own ON battle_intents;
CREATE POLICY intents_read_own ON battle_intents FOR SELECT USING (auth.uid() = actor_id);

DROP POLICY IF EXISTS sentiment_read ON battle_sentiment;
CREATE POLICY sentiment_read ON battle_sentiment FOR SELECT USING (true);

DROP POLICY IF EXISTS locks_read ON instance_locks;
CREATE POLICY locks_read ON instance_locks FOR SELECT USING (true);

-- Service role writes (battle-referee is the ONLY writer)
DROP POLICY IF EXISTS battles_service ON battles;
CREATE POLICY battles_service ON battles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS events_service ON battle_events;
CREATE POLICY events_service ON battle_events FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS intents_service ON battle_intents;
CREATE POLICY intents_service ON battle_intents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sentiment_service ON battle_sentiment;
CREATE POLICY sentiment_service ON battle_sentiment FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS locks_service ON instance_locks;
CREATE POLICY locks_service ON instance_locks FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ############################################################
-- SECTION 5: QUESTS AND SCRATCH (Migration 016)
-- Quest system and scratch tickets
-- ############################################################

-- =============================================================================
-- 5.1 Quest Definitions
-- =============================================================================

CREATE TABLE IF NOT EXISTS quest_defs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('daily','side','story')),
  chapter INT CHECK (chapter BETWEEN 1 AND 6),
  trigger JSONB NOT NULL,
  reward JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  copy_key TEXT NOT NULL
);
COMMENT ON TABLE quest_defs IS 'Quest templates. Six story chapters. There is no chapter seven.';

-- =============================================================================
-- 5.2 Quest Progress
-- =============================================================================

CREATE TABLE IF NOT EXISTS quest_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  quest_id TEXT NOT NULL REFERENCES quest_defs(id),
  period DATE NOT NULL DEFAULT '1970-01-01',
  progress INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, quest_id, period)
);
COMMENT ON TABLE quest_progress IS 'Per-user quest state. Daily quests key by period date.';

-- =============================================================================
-- 5.3 Scratch Tickets
-- =============================================================================

CREATE TABLE IF NOT EXISTS scratch_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  prize JSONB NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scratched_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON scratch_tickets(user_id);
COMMENT ON TABLE scratch_tickets IS 'Prizes decided at issuance. Reveal is theater.';

-- =============================================================================
-- 5.4 Seed Quest Definitions
-- =============================================================================

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

-- =============================================================================
-- 5.5 RLS for Quest Tables
-- =============================================================================

ALTER TABLE quest_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE scratch_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quest_defs_read ON quest_defs;
CREATE POLICY quest_defs_read ON quest_defs FOR SELECT USING (active);

DROP POLICY IF EXISTS quest_progress_read_own ON quest_progress;
CREATE POLICY quest_progress_read_own ON quest_progress FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS tickets_none ON scratch_tickets;
CREATE POLICY tickets_none ON scratch_tickets FOR SELECT USING (false);

-- Service role writes
DROP POLICY IF EXISTS quest_defs_service ON quest_defs;
CREATE POLICY quest_defs_service ON quest_defs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS quest_progress_service ON quest_progress;
CREATE POLICY quest_progress_service ON quest_progress FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tickets_service ON scratch_tickets;
CREATE POLICY tickets_service ON scratch_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- 5.6 Scratch Ticket View (Hides prize until scratched)
-- =============================================================================

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


-- ############################################################
-- SECTION 6: WALLET RPCs (Migration 017)
-- Atomic wallet operations
-- Called ONLY by service-role edge functions.
-- ############################################################

-- =============================================================================
-- 6.1 Wallet Debit (Atomic, never goes negative)
-- =============================================================================

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

-- =============================================================================
-- 6.2 Wallet Credit
-- =============================================================================

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

-- =============================================================================
-- 6.3 Rate Limit Increment
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_rate_limit(p_user UUID, p_fn TEXT, p_minute TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE rate_limits
    SET calls = calls + 1
    WHERE user_id = p_user AND fn = p_fn AND minute = p_minute;
END;
$$;

COMMENT ON FUNCTION increment_rate_limit IS 'Increment rate limit counter. Used by battle-referee.';

-- =============================================================================
-- 6.4 Security: Revoke public access to wallet functions
-- =============================================================================

REVOKE EXECUTE ON FUNCTION wallet_debit FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wallet_credit FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_rate_limit FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION wallet_debit TO service_role;
GRANT EXECUTE ON FUNCTION wallet_credit TO service_role;
GRANT EXECUTE ON FUNCTION increment_rate_limit TO service_role;


-- ############################################################
-- DEPLOYMENT COMPLETE
-- ############################################################
-- All battle system migrations (012-017) have been applied.
--
-- Tables created:
--   - rate_limits, daily_limits (hardening)
--   - profiles_roles, wallets, cards, card_instances, card_events, backgrounds
--   - products, mining_ledger
--   - battles, battle_events, battle_intents, battle_sentiment, instance_locks
--   - quest_defs, quest_progress, scratch_tickets
--
-- Functions created:
--   - check_rate_limit, check_daily_limit, cleanup_rate_limits
--   - wallet_debit, wallet_credit, increment_rate_limit
--   - forbid_mutation (trigger function)
--
-- Views created:
--   - use_cases_with_votes, my_scratch_tickets
-- ############################################################
