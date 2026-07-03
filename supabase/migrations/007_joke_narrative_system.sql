-- ============================================================
-- JOKE/NARRATIVE GENERATION SYSTEM
-- Migration 007 | Parallel narrative generation with comedy patterns
-- ============================================================

-- ============================================================
-- JOKE PATTERNS
-- Track which comedy patterns generate engagement
-- ============================================================

CREATE TABLE IF NOT EXISTS joke_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Pattern classification
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'callback',           -- Reference to earlier event
    'rule_of_three',      -- Setup-setup-payoff
    'subverted_expect',   -- Expected outcome flipped
    'escalation',         -- Each beat more absurd
    'running_gag',        -- Recurring entity-specific joke
    'wordplay',           -- Triple-based pun
    'contrast',           -- Juxtaposition humor
    'deadpan'             -- Understated absurdity
  )),

  -- The joke structure
  setup TEXT NOT NULL,
  development TEXT,
  punchline TEXT NOT NULL,

  -- Context requirements
  requires_entity TEXT[],
  requires_beat INT[],
  triple_verb_affinity TEXT[],

  -- Effectiveness tracking
  times_used INT DEFAULT 0,
  total_laugh_score FLOAT DEFAULT 0,
  avg_laugh_score FLOAT GENERATED ALWAYS AS (
    CASE WHEN times_used > 0 THEN total_laugh_score / times_used ELSE 0 END
  ) STORED,

  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_joke_patterns_type_score
  ON joke_patterns(pattern_type, avg_laugh_score DESC);
CREATE INDEX IF NOT EXISTS idx_joke_patterns_entity
  ON joke_patterns USING gin(requires_entity);
CREATE INDEX IF NOT EXISTS idx_joke_patterns_beat
  ON joke_patterns USING gin(requires_beat);

COMMENT ON TABLE joke_patterns IS 'Comedy pattern templates with effectiveness tracking';


-- ============================================================
-- USER CHOICES
-- Track engagement signals for pattern discovery
-- ============================================================

CREATE TABLE IF NOT EXISTS user_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session context
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),

  -- Choice context
  triple_hash TEXT NOT NULL,
  beat INT NOT NULL,
  choice_id TEXT NOT NULL,

  -- Engagement signals
  time_to_choose_ms INT,
  choices_presented TEXT[],
  hover_sequence TEXT[],

  -- Outcome
  hp_before INT,
  hp_after INT,
  item_received TEXT,
  encounter_triggered BOOLEAN DEFAULT FALSE,

  -- Pattern tracking
  joke_patterns_shown UUID[],

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_choices_triple ON user_choices(triple_hash);
CREATE INDEX IF NOT EXISTS idx_user_choices_session ON user_choices(session_id);
CREATE INDEX IF NOT EXISTS idx_user_choices_beat ON user_choices(beat);
CREATE INDEX IF NOT EXISTS idx_user_choices_time ON user_choices(created_at);

COMMENT ON TABLE user_choices IS 'User choice engagement signals - hesitation = engagement';


-- ============================================================
-- RUNNING JOKES
-- Persistent callbacks that work across sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS running_jokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  entity TEXT NOT NULL,
  joke_text TEXT NOT NULL,
  callback_template TEXT NOT NULL,

  times_used INT DEFAULT 0,
  times_callback_used INT DEFAULT 0,
  effectiveness_score FLOAT DEFAULT 0.5,

  introduced_in_session TEXT,
  last_used_at TIMESTAMPTZ,
  is_canonical BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_running_jokes_entity ON running_jokes(entity);
CREATE INDEX IF NOT EXISTS idx_running_jokes_effectiveness
  ON running_jokes(effectiveness_score DESC);

COMMENT ON TABLE running_jokes IS 'Recurring entity-specific jokes with callback templates';


-- ============================================================
-- NARRATIVE CACHE
-- Generated text cache (like scene_cache but for narrative+choices)
-- ============================================================

CREATE TABLE IF NOT EXISTS narrative_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  node_hash TEXT UNIQUE NOT NULL,

  narrative TEXT NOT NULL,
  choices JSONB NOT NULL,
  encounter JSONB,

  prompt_used TEXT,
  patterns_used UUID[],
  running_jokes_used UUID[],

  generation_time_ms INT,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_narrative_cache_hash ON narrative_cache(node_hash);

COMMENT ON TABLE narrative_cache IS 'Generated narrative+choices cache - deterministic by node_hash';


-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE joke_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_jokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrative_cache ENABLE ROW LEVEL SECURITY;

-- Joke patterns: public read
CREATE POLICY "Joke patterns are public" ON joke_patterns FOR SELECT USING (true);
CREATE POLICY "Service can manage patterns" ON joke_patterns FOR ALL USING (true);

-- User choices: users can see own, service can see all
CREATE POLICY "Users see own choices" ON user_choices
  FOR SELECT USING (user_id = auth.uid() OR session_id IS NOT NULL);
CREATE POLICY "Service can insert choices" ON user_choices FOR INSERT WITH CHECK (true);

-- Running jokes: public read
CREATE POLICY "Running jokes are public" ON running_jokes FOR SELECT USING (true);
CREATE POLICY "Service can manage jokes" ON running_jokes FOR ALL USING (true);

-- Narrative cache: public read (canonical)
CREATE POLICY "Narratives are public" ON narrative_cache FOR SELECT USING (true);
CREATE POLICY "Service can write narratives" ON narrative_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update narratives" ON narrative_cache FOR UPDATE USING (true);


-- ============================================================
-- SEED DATA: Canonical Running Jokes
-- ============================================================

INSERT INTO running_jokes (entity, joke_text, callback_template, is_canonical) VALUES
  -- Gary (IT Savant)
  ('Gary', 'types for exactly eleven seconds',
   'Gary appears. Eleven seconds pass. The problem is solved.', true),
  ('Gary', 'emerges from impossible locations',
   'Gary is already here. He was inside the {location} the whole time.', true),
  ('Gary', 'says "should be good now" and vanishes',
   'In the distance, you hear Gary say "should be good now."', true),
  ('Gary', 'fixes things nobody asked about',
   'Gary fixed something you did not know was broken. You still do not know.', true),

  -- Legal (Raccoon)
  ('Legal', 'is literally a raccoon in a tie',
   'Legal chittered approvingly from beneath its tie.', true),
  ('Legal', 'eats concerning documents',
   'Legal consumed the paperwork. This counts as approval.', true),
  ('Legal', 'makes everything worse by helping',
   'Legal''s assistance has created seventeen new compliance requirements.', true),
  ('Legal', 'hoards shiny objects as collateral',
   'Legal accepted the offering. The foil wrapper has been notarized.', true),

  -- GI Intelligence
  ('GI', 'already knows everything you''re about to do',
   'GI has already documented this conversation. It started yesterday.', true),
  ('GI', 'files reports about reports',
   'GI files a report about the report about the incident.', true),
  ('GI', 'was inside the product the whole time',
   'GI was monitoring from inside {product}. It files a favorable review.', true),
  ('GI', 'considers surveillance a love language',
   'GI cares. That''s why it watches. That''s why it never stops watching.', true),

  -- The Brain (Corporate Deity)
  ('Brain', 'calculates timeline probabilities obsessively',
   'This outcome appears in 61% of timelines. The Brain is satisfied.', true),
  ('Brain', 'designs mascots with too many eyes',
   'The mascot has been redesigned. It now has the correct number of eyes (too many).', true),
  ('Brain', 'considers humans amusing biological substrates',
   'The Brain finds your efforts amusing. Proceed.', true),
  ('Brain', 'speaks exclusively in declaratives',
   'The Brain has spoken. It was not a request.', true),

  -- Wellness Dashboard
  ('Wellness', 'monitors cortisol with unsettling accuracy',
   'Your cortisol spike has been logged. A plant is being dispatched.', true),
  ('Wellness', 'never blinks',
   'The dashboard smiles. It has never blinked.', true),
  ('Wellness', 'dispatches plants as intervention',
   'The plant arrived. It seems to watch you. Wellness says this is normal.', true),

  -- Vending Machine (B-Wing)
  ('Vending', 'is structurally load-bearing',
   'Do not disturb the vending machine. It is load-bearing.', true),
  ('Vending', 'glows ominously',
   'The B-wing vending machine pulses. Something is ready.', true),
  ('Vending', 'dispenses mystery items',
   'The vending machine dispensed something. You did not insert money.', true)
ON CONFLICT DO NOTHING;


-- ============================================================
-- SEED DATA: Base Comedy Patterns
-- ============================================================

INSERT INTO joke_patterns (pattern_type, setup, development, punchline, requires_beat, triple_verb_affinity) VALUES
  -- Callback patterns
  ('callback',
   'Earlier, {entity} did {action}.',
   NULL,
   'You hear the familiar sound of {callback_action}. It is happening again.',
   ARRAY[1, 2, 3],
   ARRAY['tracks', 'monitors', 'automates']),

  -- Rule of three patterns
  ('rule_of_three',
   'The focus group rated {aspect1} as {score1}.',
   'They rated {aspect2} as {score2}.',
   'They rated {aspect3} as {unexpected_score}.',
   ARRAY[1, 2],
   ARRAY['optimizes', 'recommends', 'generates']),

  -- Subverted expectation patterns
  ('subverted_expect',
   'You expected {expected_outcome}.',
   NULL,
   'Instead, {subverted_outcome}. This is better. This is worse. This is.',
   ARRAY[2, 3],
   ARRAY['predicts', 'replaces', 'influences']),

  -- Escalation patterns
  ('escalation',
   '{entity} did {small_thing}.',
   '{entity} then did {medium_thing}.',
   '{entity} has now {cosmic_thing}. There is no going back.',
   ARRAY[2, 3],
   ARRAY['automates', 'generates', 'escalates']),

  -- Deadpan patterns
  ('deadpan',
   'Your {concern} has been received.',
   'It has been laminated and filed under {absurd_category}.',
   'Per policy, it will decompose within 90 days.',
   ARRAY[0, 1, 2, 3],
   ARRAY['tracks', 'reports', 'classifies']),

  -- Contrast patterns
  ('contrast',
   '"{corporate_speak}," announces {source}.',
   NULL,
   '{dystopian_reality}.',
   ARRAY[1, 2, 3],
   ARRAY['monetizes', 'exploits', 'surveils'])
ON CONFLICT DO NOTHING;


-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get effective patterns for a given beat
CREATE OR REPLACE FUNCTION get_effective_patterns(target_beat INT, min_score FLOAT DEFAULT 0.3)
RETURNS SETOF joke_patterns AS $$
  SELECT *
  FROM joke_patterns
  WHERE target_beat = ANY(requires_beat)
    AND (times_used < 5 OR avg_laugh_score >= min_score)
  ORDER BY
    CASE WHEN times_used < 5 THEN 1 ELSE 0 END DESC,  -- Prioritize untested
    avg_laugh_score DESC
  LIMIT 5;
$$ LANGUAGE sql STABLE;


-- Get relevant running jokes for entity/choice
CREATE OR REPLACE FUNCTION get_relevant_jokes(
  choice_made TEXT DEFAULT NULL,
  max_jokes INT DEFAULT 5
)
RETURNS SETOF running_jokes AS $$
  SELECT *
  FROM running_jokes
  WHERE
    effectiveness_score > 0.3
    OR is_canonical = true
  ORDER BY
    CASE
      WHEN choice_made IS NOT NULL AND lower(entity) = ANY(
        SELECT unnest(string_to_array(lower(choice_made), '_'))
      ) THEN 0
      ELSE 1
    END,
    effectiveness_score DESC
  LIMIT max_jokes;
$$ LANGUAGE sql STABLE;


-- Update joke effectiveness after use
CREATE OR REPLACE FUNCTION update_joke_effectiveness(
  joke_id UUID,
  was_callback BOOLEAN,
  engagement_score FLOAT
)
RETURNS void AS $$
BEGIN
  UPDATE running_jokes
  SET
    times_used = times_used + 1,
    times_callback_used = times_callback_used + CASE WHEN was_callback THEN 1 ELSE 0 END,
    effectiveness_score = (effectiveness_score * times_used + engagement_score) / (times_used + 1),
    last_used_at = now()
  WHERE id = joke_id;
END;
$$ LANGUAGE plpgsql;


-- Calculate engagement score from hesitation time
CREATE OR REPLACE FUNCTION hesitation_to_score(time_ms INT)
RETURNS FLOAT AS $$
DECLARE
  seconds FLOAT;
BEGIN
  seconds := time_ms / 1000.0;

  -- Optimal: 3-8 seconds (reading + thinking)
  RETURN CASE
    WHEN seconds < 1 THEN 0.2      -- Too fast
    WHEN seconds < 2 THEN 0.5      -- Quick
    WHEN seconds < 4 THEN 0.9      -- Good
    WHEN seconds < 8 THEN 1.0      -- Peak
    WHEN seconds < 12 THEN 0.7     -- Thoughtful
    WHEN seconds < 20 THEN 0.4     -- Confused
    ELSE 0.1                        -- Abandoned
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Aggregate engagement for pattern discovery
CREATE OR REPLACE FUNCTION aggregate_pattern_engagement(
  lookback_days INT DEFAULT 7
)
RETURNS TABLE(
  pattern_id UUID,
  avg_hesitation_ms FLOAT,
  usage_count BIGINT,
  engagement_score FLOAT
) AS $$
  SELECT
    unnest(joke_patterns_shown) as pattern_id,
    AVG(time_to_choose_ms) as avg_hesitation_ms,
    COUNT(*) as usage_count,
    AVG(hesitation_to_score(time_to_choose_ms)) as engagement_score
  FROM user_choices
  WHERE created_at > now() - (lookback_days || ' days')::interval
    AND time_to_choose_ms IS NOT NULL
    AND joke_patterns_shown IS NOT NULL
  GROUP BY unnest(joke_patterns_shown)
  HAVING COUNT(*) >= 5
  ORDER BY AVG(hesitation_to_score(time_to_choose_ms)) DESC;
$$ LANGUAGE sql STABLE;
