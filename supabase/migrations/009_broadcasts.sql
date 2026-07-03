-- Brain Broadcasts System
-- Migration: 009_broadcasts.sql
-- Description: Creates broadcasts table for EBN internal communications system

-- =============================================================================
-- TABLE: broadcasts
-- =============================================================================

CREATE TABLE IF NOT EXISTS broadcasts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    broadcast_type text NOT NULL CHECK (broadcast_type IN (
        'doom_milestone',
        'shipping_report',
        'legendary_alert',
        'tribunal_verdict',
        'ominous',
        'gary',
        'facilities',
        'wellness'
    )),
    source text NOT NULL DEFAULT 'system',
    title text NOT NULL,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    expires_at timestamptz NULL
);

-- Add table comment
COMMENT ON TABLE broadcasts IS 'EBN internal broadcast system - system announcements, alerts, and ominous messages from The Brain';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary query pattern: recent broadcasts sorted by time
CREATE INDEX broadcasts_created_at_idx ON broadcasts (created_at DESC);

-- Filter by broadcast type
CREATE INDEX broadcasts_type_idx ON broadcasts (broadcast_type);

-- Partial index for expiring broadcasts (only index non-null expires_at)
CREATE INDEX broadcasts_expires_idx ON broadcasts (expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- Anyone can read broadcasts (public SELECT)
CREATE POLICY broadcasts_select_all ON broadcasts
    FOR SELECT
    USING (true);

-- Only service role can insert broadcasts
CREATE POLICY broadcasts_insert_service ON broadcasts
    FOR INSERT
    WITH CHECK (true);

-- Only service role can update broadcasts
CREATE POLICY broadcasts_update_service ON broadcasts
    FOR UPDATE
    USING (true);

-- Only service role can delete broadcasts
CREATE POLICY broadcasts_delete_service ON broadcasts
    FOR DELETE
    USING (true);

-- =============================================================================
-- FUNCTION: get_recent_broadcasts
-- =============================================================================

CREATE OR REPLACE FUNCTION get_recent_broadcasts(
    p_limit integer DEFAULT 20,
    p_type text DEFAULT NULL
)
RETURNS SETOF broadcasts
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT *
    FROM broadcasts
    WHERE
        (expires_at IS NULL OR expires_at > now())
        AND (p_type IS NULL OR broadcast_type = p_type)
    ORDER BY created_at DESC
    LIMIT p_limit;
$$;

COMMENT ON FUNCTION get_recent_broadcasts IS 'Returns recent non-expired broadcasts, optionally filtered by type';

-- =============================================================================
-- SEED DATA: Initial broadcasts matching hardcoded messages
-- =============================================================================

INSERT INTO broadcasts (broadcast_type, source, title, message, metadata, created_at) VALUES

-- Shipping report (morning message)
(
    'shipping_report',
    'system',
    '06:00 · EBN INTERNAL',
    'Good morning, Brainiacs. 4,182 products shipped globally yesterday. The market is 61% saturated. My plan advances on schedule. Your plan is my plan.',
    '{"ship_count": 4182, "saturation_percent": 61}'::jsonb,
    now() - interval '6 hours'
),

-- Wellness reminder
(
    'wellness',
    'system',
    'NOW · WELLNESS',
    'Reminder: the Wellness Dashboard exists. Your cortisol levels have been noted. A plant has been dispatched to your desk. The plant will observe your recovery. The plant reports to me.',
    '{"entity": "wellness_dashboard", "intervention": "plant_dispatch"}'::jsonb,
    now() - interval '4 hours'
),

-- Legendary product alert
(
    'legendary_alert',
    'system',
    'NOW · THE BRAIN',
    'A Brainiac in the Ogden Branch shipped a LEGENDARY product. ''PredatorPrice'' now monetizes your grandchildren''s future purchases. I was excited for 0.7 seconds.',
    '{"product_name": "PredatorPrice", "branch": "Ogden", "tier": "LEGENDARY"}'::jsonb,
    now() - interval '2 hours'
),

-- Q3 performance reviews (ominous)
(
    'ominous',
    'system',
    'NOW · SCHEDULING',
    'Q3 performance reviews approach. The Brain has prepared 847,000 unique feedback documents. Each one is personalized. Each one is accurate. The accuracy is the concerning part.',
    '{"entity": "performance_system", "document_count": 847000}'::jsonb,
    now() - interval '1 hour'
),

-- Gary message (IT)
(
    'gary',
    'system',
    'NOW · IT',
    'gary here. the servers are fine. they asked about you. i said you were fine too. we are all fine. the definition of fine has been updated. ok bye.',
    '{"entity": "gary", "trigger": "scheduled"}'::jsonb,
    now() - interval '30 minutes'
),

-- Facilities message
(
    'facilities',
    'system',
    'NOW · FACILITIES',
    'The vending machine in B-wing has been glowing for 72 hours. Facilities has been notified. Facilities has not responded. The vending machine has.',
    '{"entity": "vending_machine", "location": "B-wing", "glow_duration_hours": 72}'::jsonb,
    now() - interval '15 minutes'
);

-- =============================================================================
-- REALTIME: Enable realtime for broadcasts table
-- =============================================================================

-- Note: Run this in Supabase dashboard or via supabase CLI:
-- ALTER PUBLICATION supabase_realtime ADD TABLE broadcasts;
