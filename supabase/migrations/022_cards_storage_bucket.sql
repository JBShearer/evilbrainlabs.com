-- ============================================================
-- Migration 022: Create cards storage bucket for card art
-- ============================================================

-- Create the cards bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('cards', 'cards', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Public card art read" ON storage.objects;
DROP POLICY IF EXISTS "Service role card upload" ON storage.objects;
DROP POLICY IF EXISTS "Service role card update" ON storage.objects;

-- Allow public read access to card art
CREATE POLICY "Public card art read"
ON storage.objects FOR SELECT
USING (bucket_id = 'cards');

-- Allow service role to upload
CREATE POLICY "Service role card upload"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'cards');

CREATE POLICY "Service role card update"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'cards');
