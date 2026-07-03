-- ============================================================
-- SEED ENTITIES AND PREDICATES FROM EXISTING USE CASES
-- Migration 008 | Extract triples from seed data
-- ============================================================

-- First, seed the predicates (verbs) - these are the controlled vocabulary
INSERT INTO predicates (label, tier, status) VALUES
  ('surveils', 'entity', 'approved'),
  ('discriminates_against', 'entity', 'approved'),
  ('monetizes', 'entity', 'approved'),
  ('manipulates', 'entity', 'approved'),
  ('exploits', 'entity', 'approved'),
  ('tracks', 'entity', 'approved'),
  ('deanonymizes', 'entity', 'approved'),
  ('deceives', 'entity', 'approved'),
  ('harms', 'entity', 'approved'),
  ('automates', 'entity', 'approved'),
  ('classifies', 'entity', 'approved'),
  ('consumes', 'entity', 'approved'),
  ('defames', 'entity', 'approved'),
  ('defrauds', 'entity', 'approved'),
  ('encourages', 'entity', 'approved'),
  ('exposes', 'entity', 'approved'),
  ('leaks', 'entity', 'approved'),
  ('suppresses', 'entity', 'approved'),
  ('victimizes', 'entity', 'approved'),
  -- Additional common predicates for the game
  ('gamifies', 'entity', 'approved'),
  ('upsells', 'entity', 'approved'),
  ('predicts', 'entity', 'approved'),
  ('recommends', 'entity', 'approved'),
  ('optimizes', 'entity', 'approved'),
  ('generates', 'entity', 'approved'),
  ('replaces', 'entity', 'approved'),
  ('influences', 'entity', 'approved'),
  ('a_b_tests', 'entity', 'approved'),
  ('subscription_locks', 'entity', 'approved'),
  ('sentiment_scores', 'entity', 'approved'),
  ('biometrically_greets', 'entity', 'approved'),
  ('emotionally_profiles', 'entity', 'approved'),
  ('predictively_evicts', 'entity', 'approved'),
  ('auto_negotiates_with', 'entity', 'approved')
ON CONFLICT (label, tier) DO NOTHING;

-- Seed entities - SUBJECTS (companies, products, actors)
INSERT INTO entities (canonical_name, entity_kind) VALUES
  -- Tech Giants
  ('Amazon', 'org'),
  ('Amazon Alexa', 'product'),
  ('Amazon Ring', 'product'),
  ('Amazon Rekognition', 'product'),
  ('Meta Platforms', 'org'),
  ('Facebook', 'org'),
  ('Apple', 'org'),
  ('Google', 'org'),
  ('Microsoft', 'org'),
  ('OpenAI', 'org'),
  ('IBM', 'org'),
  ('Palantir', 'org'),
  ('Clearview AI', 'org'),
  ('Character.AI', 'org'),
  ('TikTok', 'product'),

  -- Surveillance/Security
  ('police facial recognition systems', 'tech'),
  ('predictive policing algorithms', 'tech'),
  ('workplace monitoring software', 'tech'),
  ('AI hiring systems', 'tech'),
  ('tenant screening algorithms', 'tech'),
  ('credit scoring algorithms', 'tech'),
  ('content moderation AI', 'tech'),
  ('recommendation algorithms', 'tech'),

  -- Government/Institutional
  ('authoritarian governments', 'org'),
  ('Chinese government', 'org'),
  ('Department of Homeland Security', 'org'),
  ('law enforcement agencies', 'org'),
  ('insurance companies', 'org'),
  ('employers', 'org'),
  ('landlords', 'org'),
  ('banks', 'org'),
  ('hospitals', 'org'),

  -- Game-specific fun entities
  ('dating apps', 'product'),
  ('smart fridges', 'product'),
  ('gym mirrors', 'product'),
  ('the DMV', 'org'),
  ('your HOA', 'org'),
  ('middle managers', 'person_class'),
  ('toddler influencers', 'person_class'),
  ('insurance adjusters', 'person_class'),
  ('wedding planners', 'person_class'),
  ('vending machines', 'product'),
  ('wellness dashboards', 'product'),
  ('fleet of drones', 'product')
ON CONFLICT (lower(canonical_name)) DO NOTHING;

-- Seed entities - OBJECTS (people, groups affected)
INSERT INTO entities (canonical_name, entity_kind) VALUES
  -- Demographics
  ('general public', 'person_class'),
  ('Black Americans', 'person_class'),
  ('Black patients', 'person_class'),
  ('Black defendants', 'person_class'),
  ('immigrants', 'person_class'),
  ('Uyghur Muslims', 'person_class'),
  ('journalists and dissidents', 'person_class'),
  ('gig workers', 'person_class'),
  ('warehouse workers', 'person_class'),
  ('content moderators', 'person_class'),
  ('job applicants', 'person_class'),
  ('tenants', 'person_class'),
  ('patients', 'person_class'),
  ('students', 'person_class'),
  ('elderly patients', 'person_class'),
  ('women', 'person_class'),
  ('low-income communities', 'person_class'),

  -- Specific groups
  ('employees', 'person_class'),
  ('homeowners and neighbors', 'person_class'),
  ('social media users', 'person_class'),
  ('children', 'person_class'),
  ('teenagers', 'person_class'),
  ('family members', 'person_class'),
  ('creators', 'person_class'),

  -- Game-specific fun objects
  ('support group members', 'person_class'),
  ('your ex', 'person_class'),
  ('grandmothers', 'person_class'),
  ('first dates', 'person_class'),
  ('the neighborhood watch', 'person_class'),
  ('unpaid interns', 'person_class'),
  ('houseplants', 'person_class'),
  ('funeral guests', 'person_class'),
  ('parole officers', 'person_class'),
  ('book clubs', 'person_class'),
  ('emotional support animals', 'person_class'),
  ('city council', 'person_class')
ON CONFLICT (lower(canonical_name)) DO NOTHING;

-- Create a view for the slot machine that returns properly formatted vocab
CREATE OR REPLACE VIEW slot_machine_vocab AS
SELECT
  'subject' as slot_type,
  e.canonical_name as term,
  CASE
    WHEN e.entity_kind = 'org' THEN 3
    WHEN e.entity_kind = 'product' THEN 2
    ELSE 1
  END as weight
FROM entities e
WHERE e.entity_kind IN ('org', 'product', 'tech')

UNION ALL

SELECT
  'predicate' as slot_type,
  p.label as term,
  2 as weight
FROM predicates p
WHERE p.tier = 'entity' AND p.status = 'approved'

UNION ALL

SELECT
  'object' as slot_type,
  e.canonical_name as term,
  CASE
    WHEN e.canonical_name LIKE '%public%' THEN 3
    WHEN e.entity_kind = 'person_class' THEN 2
    ELSE 1
  END as weight
FROM entities e
WHERE e.entity_kind = 'person_class';

COMMENT ON VIEW slot_machine_vocab IS 'Formatted vocabulary for the Evil Brain Labs slot machine';
