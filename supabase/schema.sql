-- ============================================================
-- EVIL BRAIN LABS: THE REGISTRY
-- Schema v1.0 | Supabase / Postgres
-- Eleven tables. Three layers. Ink and pencil never mix.
-- Modified: Removed pgvector/embeddings for keyword search
-- ============================================================

-- pgcrypto for UUIDs
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- FOUNDATION
-- ------------------------------------------------------------

-- Users. Linked to Supabase auth. Braincoin balance is the
-- fungible currency, distinct from registry coin artifacts.
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        text unique not null,
  braincoin_balance integer not null default 3,  -- starter grant
  created_at    timestamptz not null default now()
);

-- Provenance registry. Every asserted fact points here.
create table sources (
  id            uuid primary key default gen_random_uuid(),
  source_type   text not null check (source_type in
                  ('manual','text','audio','video','ruling')),
  url           text,
  title         text,
  transcript_ref text,          -- storage path if pipeline-ingested
  submitted_by  uuid references profiles(id),
  created_at    timestamptz not null default now()
);

-- Entities. One row per thing. Roles are NOT stored here.
-- Roles emerge from the triples an entity participates in.
create table entities (
  id            uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  entity_kind   text,            -- coarse browse layer only: person_class,
                                 -- org, product, tech, data_type, event
  sprite_ref    text,            -- composer art asset, nullable until drawn
  created_at    timestamptz not null default now()
);
create unique index entities_canonical_idx
  on entities (lower(canonical_name));

-- Entity resolution. Reversible links, never hard merges.
create table entity_links (
  id            uuid primary key default gen_random_uuid(),
  entity_a      uuid not null references entities(id),
  entity_b      uuid not null references entities(id),
  confidence    real not null check (confidence between 0 and 1),
  method        text not null,   -- 'llm_pass','embedding_cluster','manual'
  status        text not null default 'proposed'
                  check (status in ('proposed','ratified','rejected')),
  created_at    timestamptz not null default now(),
  check (entity_a <> entity_b)
);

-- Controlled vocabulary. Both tiers, one governance process.
-- tier='entity': tracks, reports, monetizes, deanonymizes, requires...
-- tier='logic':  therefore, enables, requires, prevents, escalates,
--                contradicts, parent_of, same_as
create table predicates (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  tier          text not null check (tier in ('entity','logic')),
  status        text not null default 'proposed'
                  check (status in ('proposed','approved','rejected')),
  proposed_by   uuid references profiles(id),
  connector_ref text,            -- composer connector art, logic tier mostly
  created_at    timestamptz not null default now(),
  unique (label, tier)
);

-- ------------------------------------------------------------
-- ASSERTED LAYER (INK)
-- ------------------------------------------------------------

-- Use cases. The registry's unit of record. One coin each.
create table use_cases (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text not null,
  category      text,            -- coarse browse tag, UI convenience only
  severity      smallint check (severity between 1 and 5),
  source_id     uuid references sources(id),
  submitted_by  uuid references profiles(id),
  status        text not null default 'active'
                  check (status in ('active','duplicate','retired')),
  duplicate_of  uuid references use_cases(id),
  created_at    timestamptz not null default now()
);

-- Full-text search index for keyword search
create index use_cases_title_idx on use_cases using gin(to_tsvector('english', title));
create index use_cases_description_idx on use_cases using gin(to_tsvector('english', description));
create index use_cases_category_idx on use_cases (category);
create index use_cases_severity_idx on use_cases (severity);

-- Facts. Subject verb object. Never wider. When a sentence
-- will not fit, write more triples.
create table triples (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references entities(id),
  predicate_id  uuid not null references predicates(id),
  object_id     uuid not null references entities(id),
  use_case_id   uuid references use_cases(id),
  source_id     uuid not null references sources(id),
  created_at    timestamptz not null default now()
);
create index triples_subject_idx on triples (subject_id);
create index triples_object_idx  on triples (object_id);
create index triples_usecase_idx on triples (use_case_id);

-- Facts about facts. Triple-to-triple, two levels only in v1.
-- The 'therefore' lives here.
create table meta_edges (
  id            uuid primary key default gen_random_uuid(),
  triple_a      uuid not null references triples(id),
  logic_predicate_id uuid not null references predicates(id),
  triple_b      uuid not null references triples(id),
  source_id     uuid not null references sources(id),
  created_at    timestamptz not null default now(),
  check (triple_a <> triple_b)
);

-- ------------------------------------------------------------
-- ECONOMY
-- ------------------------------------------------------------

-- Registry coins. Unique artifacts, one per use case.
-- NOT the fungible currency. Never merge the two.
create table coins (
  id            uuid primary key default gen_random_uuid(),
  use_case_id   uuid unique not null references use_cases(id),
  owner_id      uuid not null references profiles(id),
  mint_valence  text not null check (mint_valence in ('good','evil')),
  current_valence text not null check (current_valence in ('good','evil')),
  pressure      real not null default 0,
  signature     text,            -- Ed25519 over payload, Evil Brain issuer key
  minted_at     timestamptz not null default now()
);

-- Flip provenance. The full history stays on the coin.
-- Self-flips are free and logged. History is the penalty.
create table flips (
  id            uuid primary key default gen_random_uuid(),
  coin_id       uuid not null references coins(id),
  from_valence  text not null check (from_valence in ('good','evil')),
  to_valence    text not null check (to_valence in ('good','evil')),
  is_self_flip  boolean not null default false,
  ruling_text   text,            -- required for tribunal flips
  evidence_url  text,
  flipped_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index flips_coin_idx on flips (coin_id);

-- Staked votes. Third parties only. Minters flip free.
-- Wrong votes burn on ruling.
create table votes (
  id            uuid primary key default gen_random_uuid(),
  coin_id       uuid not null references coins(id),
  voter_id      uuid not null references profiles(id),
  direction     text not null check (direction in ('toward_good','toward_evil')),
  stake         integer not null default 1 check (stake > 0),
  is_evidence   boolean not null default false,  -- 10x pressure or straight
  evidence_url  text,                            -- to tribunal
  status        text not null default 'pending'
                  check (status in ('pending','returned','burned')),
  created_at    timestamptz not null default now(),
  unique (coin_id, voter_id, created_at)
);
create index votes_coin_idx on votes (coin_id);

-- ------------------------------------------------------------
-- INFERRED LAYER (PENCIL)
-- ------------------------------------------------------------

-- Everything the model believes. Fully regenerable. If dropping
-- this table loses information, something is in the wrong tier.
-- Promotion writes a real triple with the ruling as source,
-- then retires the inference.
create table inferences (
  id            uuid primary key default gen_random_uuid(),
  target_kind   text not null check (target_kind in
                  ('use_case','entity','triple','meta')),
  target_id     uuid not null,   -- polymorphic, resolved by target_kind
  inferred_label text not null,  -- cluster name, proposed role, proposed edge
  payload       jsonb,           -- proposed triple/meta-edge structure if any
  confidence    real not null check (confidence between 0 and 1),
  method        text not null,   -- 'hdbscan','community_detect','llm_meta_pass'
  run_id        text not null,   -- batch identifier, enables clean re-runs
  status        text not null default 'active'
                  check (status in ('active','promoted','retired')),
  created_at    timestamptz not null default now()
);
create index inferences_target_idx on inferences (target_kind, target_id);
create index inferences_run_idx on inferences (run_id);

-- ------------------------------------------------------------
-- SEED DATA: Initial Predicates
-- ------------------------------------------------------------

-- Entity predicates (verbs for triples)
insert into predicates (label, tier, status) values
  ('tracks', 'entity', 'approved'),
  ('reports', 'entity', 'approved'),
  ('monetizes', 'entity', 'approved'),
  ('deanonymizes', 'entity', 'approved'),
  ('surveils', 'entity', 'approved'),
  ('predicts', 'entity', 'approved'),
  ('influences', 'entity', 'approved'),
  ('automates', 'entity', 'approved'),
  ('replaces', 'entity', 'approved'),
  ('generates', 'entity', 'approved'),
  ('classifies', 'entity', 'approved'),
  ('recommends', 'entity', 'approved'),
  ('optimizes', 'entity', 'approved'),
  ('discriminates_against', 'entity', 'approved'),
  ('exploits', 'entity', 'approved');

-- Logic predicates (for meta-edges)
insert into predicates (label, tier, status) values
  ('therefore', 'logic', 'approved'),
  ('enables', 'logic', 'approved'),
  ('requires', 'logic', 'approved'),
  ('prevents', 'logic', 'approved'),
  ('escalates', 'logic', 'approved'),
  ('contradicts', 'logic', 'approved'),
  ('parent_of', 'logic', 'approved'),
  ('same_as', 'logic', 'approved');

-- ------------------------------------------------------------
-- FUNCTIONS
-- ------------------------------------------------------------

-- Full-text search function for use cases
create or replace function search_use_cases(search_query text)
returns setof use_cases as $$
  select *
  from use_cases
  where status = 'active'
    and (
      to_tsvector('english', title) @@ plainto_tsquery('english', search_query)
      or to_tsvector('english', description) @@ plainto_tsquery('english', search_query)
      or title ilike '%' || search_query || '%'
      or description ilike '%' || search_query || '%'
    )
  order by created_at desc;
$$ language sql stable;

-- Check for duplicate use case by exact title match
create or replace function check_duplicate_title(new_title text)
returns uuid as $$
  select id
  from use_cases
  where status = 'active'
    and lower(trim(title)) = lower(trim(new_title))
  limit 1;
$$ language sql stable;
