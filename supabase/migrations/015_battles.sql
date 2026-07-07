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
