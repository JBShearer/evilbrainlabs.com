-- ============================================================
-- SHOW EPISODES ENHANCEMENT
-- Migration 020 | Add UCAR show fields to existing episodes table
-- From SHOW_LAUNCH_RUNBOOK.md section 2
-- ============================================================

-- Add new columns to existing episodes table
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS air_date DATE;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS featured_case_id UUID REFERENCES use_cases(id);
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS ticker_case_ids UUID[] DEFAULT '{}';
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS battle_replay_id UUID;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_episodes_featured_case ON episodes(featured_case_id) WHERE featured_case_id IS NOT NULL;

COMMENT ON COLUMN episodes.air_date IS 'Scheduled air date for the episode';
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
  e.episode_number,
  e.published_at,
  e.published_at + INTERVAL '24 hours' AS expires_at
FROM episodes e
JOIN cards c ON c.case_id = e.featured_case_id
WHERE e.published_at IS NOT NULL
  AND e.featured_case_id IS NOT NULL
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
  AND e.featured_case_id IS NOT NULL
  AND e.published_at + INTERVAL '24 hours' > NOW();

COMMENT ON VIEW feed_pins IS 'Cases pinned to feed top from recent episode publications';

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

  IF v_episode.featured_case_id IS NULL THEN
    RETURN jsonb_build_object('error', 'no featured case set');
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
    'episode_number', v_episode.episode_number
  ));

  RETURN jsonb_build_object(
    'success', true,
    'episode_id', p_episode_id,
    'episode_number', v_episode.episode_number,
    'card_id', v_card_id,
    'card_of_the_day_expires', NOW() + INTERVAL '24 hours'
  );
END;
$$;

COMMENT ON FUNCTION publish_episode IS 'Publish an episode - triggers Card of the Day, feed pin, notifications';

-- Revoke public access
REVOKE EXECUTE ON FUNCTION publish_episode FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION publish_episode TO service_role;
