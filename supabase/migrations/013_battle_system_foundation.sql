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
-- Note: use_cases already has good_votes/evil_votes columns from 005_voting.sql
-- This view is a pass-through; the counters are maintained by triggers
-- ============================================================

CREATE OR REPLACE VIEW use_cases_with_votes AS
SELECT
  uc.id,
  uc.title,
  uc.description,
  uc.category,
  uc.severity,
  uc.source_id,
  uc.submitted_by,
  uc.status,
  uc.duplicate_of,
  uc.created_at,
  uc.impact,
  COALESCE(uc.good_votes, 0) AS good_votes,
  COALESCE(uc.evil_votes, 0) AS evil_votes
FROM use_cases uc;

COMMENT ON VIEW use_cases_with_votes IS 'Read-only view of use_cases with vote counts. For mint-card and sync-alignment.';
