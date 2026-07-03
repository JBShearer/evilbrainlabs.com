-- Clear old narrative cache to force fresh LLM generation
-- Migration: 011_clear_narrative_cache.sql

DELETE FROM narrative_cache;

-- Also update the patterns_used column to use text[] instead of uuid[]
-- since we're storing pattern names like 'deadpan', not UUIDs
ALTER TABLE narrative_cache
  ALTER COLUMN patterns_used TYPE text[] USING patterns_used::text[];
