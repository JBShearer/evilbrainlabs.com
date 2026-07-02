-- Migration 004: Enhanced Filing Form with Redaction Workflow
-- Adds URL, location, tags, architecture, data sources, and approval workflow

-- ============================================================
-- PART 1: Expand use_cases status enum
-- ============================================================

-- Drop the existing constraint
ALTER TABLE use_cases DROP CONSTRAINT IF EXISTS use_cases_status_check;

-- Add expanded status constraint
ALTER TABLE use_cases ADD CONSTRAINT use_cases_status_check
  CHECK (status IN ('pending_review', 'approved', 'active', 'duplicate', 'retired', 'rejected', 'needs_revision'));

-- Update default status for new cases
ALTER TABLE use_cases ALTER COLUMN status SET DEFAULT 'pending_review';

-- ============================================================
-- PART 2: Add redactable fields (URL and Company)
-- ============================================================

-- URL fields: raw is always stored, display is shown only when approved
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS url_raw TEXT;
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS url_display TEXT;
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS url_approved BOOLEAN DEFAULT FALSE;

-- Company name fields: same pattern
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS company_name_raw TEXT;
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS company_name_display TEXT;
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS company_approved BOOLEAN DEFAULT FALSE;

-- Extracted entities from description (for auto-redaction)
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS extracted_entities JSONB DEFAULT '[]'::JSONB;

-- ============================================================
-- PART 3: Add location fields
-- ============================================================

-- Country and region (always visible at this granularity)
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS location_country TEXT;
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS location_region TEXT;

-- Exact coordinates (NEVER shown publicly)
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

-- Region centroid (shown instead of exact coords)
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS region_centroid_lat DOUBLE PRECISION;
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS region_centroid_lng DOUBLE PRECISION;

-- ============================================================
-- PART 4: Add metadata arrays
-- ============================================================

-- Tags for free-form categorization
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Architecture components (predefined list)
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS architecture_components TEXT[] DEFAULT '{}';

-- Data sources exploited (predefined list)
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS data_sources TEXT[] DEFAULT '{}';

-- ============================================================
-- PART 5: Add approval workflow fields
-- ============================================================

-- Who reviewed and when
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Rejection/revision notes
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Redacted fields tracker (which fields were manually redacted)
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS redacted_fields TEXT[] DEFAULT '{}';

-- ============================================================
-- PART 6: Create case_relationships table
-- ============================================================

CREATE TABLE IF NOT EXISTS case_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  target_case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (
    relationship_type IN ('enables', 'same_mistake_as', 'worse_version_of', 'variant_of', 'requires')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  -- Prevent self-referential relationships
  CHECK (source_case_id <> target_case_id),

  -- Prevent duplicate relationships
  UNIQUE (source_case_id, target_case_id, relationship_type)
);

-- Indexes for relationship lookups
CREATE INDEX IF NOT EXISTS case_relationships_source_idx ON case_relationships(source_case_id);
CREATE INDEX IF NOT EXISTS case_relationships_target_idx ON case_relationships(target_case_id);
CREATE INDEX IF NOT EXISTS case_relationships_type_idx ON case_relationships(relationship_type);

-- ============================================================
-- PART 7: Add indexes for new columns
-- ============================================================

CREATE INDEX IF NOT EXISTS use_cases_status_idx ON use_cases(status);
CREATE INDEX IF NOT EXISTS use_cases_location_idx ON use_cases(location_country, location_region);
CREATE INDEX IF NOT EXISTS use_cases_tags_idx ON use_cases USING GIN(tags);
CREATE INDEX IF NOT EXISTS use_cases_arch_idx ON use_cases USING GIN(architecture_components);
CREATE INDEX IF NOT EXISTS use_cases_data_idx ON use_cases USING GIN(data_sources);
CREATE INDEX IF NOT EXISTS use_cases_url_approved_idx ON use_cases(url_approved) WHERE url_approved = TRUE;
CREATE INDEX IF NOT EXISTS use_cases_company_approved_idx ON use_cases(company_approved) WHERE company_approved = TRUE;

-- ============================================================
-- PART 8: RLS policies for redaction
-- ============================================================

-- Note: RLS policies should be added to rls_policies.sql, not in migrations
-- The actual redaction happens in the client/API layer by:
-- 1. Checking url_approved before showing url_raw
-- 2. Checking company_approved before showing company_name_raw
-- 3. Never showing location_lat/location_lng, only region-level data

-- ============================================================
-- PART 9: Update existing cases to 'active' (they're pre-approved)
-- ============================================================

-- All existing cases were manually seeded, so mark them as active/approved
UPDATE use_cases SET status = 'active' WHERE status = 'pending_review';

COMMENT ON TABLE case_relationships IS 'Links between use cases: enables, same_mistake_as, worse_version_of, variant_of, requires';
COMMENT ON COLUMN use_cases.url_raw IS 'Original submitted URL - stored but hidden until url_approved=true';
COMMENT ON COLUMN use_cases.url_display IS 'Public URL - set when admin approves';
COMMENT ON COLUMN use_cases.location_lat IS 'Exact latitude - NEVER shown publicly, internal analysis only';
COMMENT ON COLUMN use_cases.location_lng IS 'Exact longitude - NEVER shown publicly, internal analysis only';
COMMENT ON COLUMN use_cases.extracted_entities IS 'Auto-extracted entities from description: [{text, type, start_idx, end_idx, approved}]';
