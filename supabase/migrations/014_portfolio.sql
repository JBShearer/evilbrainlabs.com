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
