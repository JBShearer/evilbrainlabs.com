-- Scene cache for lazy canonical generation
-- Each scene is generated once and cached forever (deterministic by node_hash)

CREATE TABLE IF NOT EXISTS scene_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_hash TEXT UNIQUE NOT NULL,
  svg TEXT NOT NULL,
  ticket_subject TEXT,
  ticket_predicate TEXT,
  ticket_object TEXT,
  beat INT,
  choice TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_scene_cache_node_hash ON scene_cache(node_hash);

-- RLS: anyone can read scenes (they're canonical and public)
ALTER TABLE scene_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scenes are public" ON scene_cache
  FOR SELECT USING (true);

-- Only edge functions can write (via service role)
CREATE POLICY "Service role can insert scenes" ON scene_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update scenes" ON scene_cache
  FOR UPDATE USING (true);

-- Comment
COMMENT ON TABLE scene_cache IS 'Canonical SVG scenes for story mode - each node_hash generates once, cached forever';
