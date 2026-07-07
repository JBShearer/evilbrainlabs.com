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
