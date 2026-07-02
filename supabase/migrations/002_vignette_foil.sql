-- Migration: Add vignette and FOIL support to coins table
-- Run this in Supabase SQL Editor

-- Add vignette status column
ALTER TABLE coins
ADD COLUMN IF NOT EXISTS vignette_status TEXT
DEFAULT 'pending'
CHECK (vignette_status IN ('pending', 'ai_generated', 'geometric_fallback', 'geometric_permanent'));

-- Add FOIL indicator
ALTER TABLE coins
ADD COLUMN IF NOT EXISTS is_foil BOOLEAN DEFAULT FALSE;

-- Create index for finding cards needing vignette generation
CREATE INDEX IF NOT EXISTS idx_coins_vignette_status ON coins(vignette_status) WHERE vignette_status = 'pending';

-- Create the vignettes storage bucket (run this manually or via dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('vignettes', 'vignettes', true);

-- Storage policy for public read access
-- CREATE POLICY "Public read vignettes" ON storage.objects FOR SELECT USING (bucket_id = 'vignettes');

-- Storage policy for service role write
-- CREATE POLICY "Service role write vignettes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vignettes' AND auth.role() = 'service_role');

COMMENT ON COLUMN coins.vignette_status IS 'Status of card vignette: pending (not generated), ai_generated (Claude made it), geometric_fallback (API failed, using shapes), geometric_permanent (3 retries failed)';
COMMENT ON COLUMN coins.is_foil IS 'FOIL variant indicator. 4% of mints are FOIL - same stats, CSS sheen effect only';
