-- ============================================================
-- EVIL BRAIN LABS: THE REGISTRY
-- Row Level Security Policies
-- Run AFTER schema.sql
-- ============================================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table sources enable row level security;
alter table entities enable row level security;
alter table entity_links enable row level security;
alter table predicates enable row level security;
alter table use_cases enable row level security;
alter table triples enable row level security;
alter table meta_edges enable row level security;
alter table coins enable row level security;
alter table flips enable row level security;
alter table votes enable row level security;
alter table inferences enable row level security;

-- ------------------------------------------------------------
-- PROFILES
-- ------------------------------------------------------------

-- Anyone can read handles (public leaderboard, coin ownership display)
create policy "Profiles are viewable by everyone"
  on profiles for select
  using (true);

-- Users can only update their own profile (but NOT braincoin_balance)
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Profile created on signup via trigger (see below)
create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- ------------------------------------------------------------
-- SOURCES
-- ------------------------------------------------------------

-- Public read
create policy "Sources are viewable by everyone"
  on sources for select
  using (true);

-- Authenticated users can create sources (via edge function primarily)
create policy "Authenticated users can create sources"
  on sources for insert
  with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- ENTITIES
-- ------------------------------------------------------------

-- Public read
create policy "Entities are viewable by everyone"
  on entities for select
  using (true);

-- Authenticated users can create entities
create policy "Authenticated users can create entities"
  on entities for insert
  with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- ENTITY_LINKS
-- ------------------------------------------------------------

-- Public read
create policy "Entity links are viewable by everyone"
  on entity_links for select
  using (true);

-- ------------------------------------------------------------
-- PREDICATES
-- ------------------------------------------------------------

-- Public read (approved predicates only for anon, all for authenticated)
create policy "Approved predicates are viewable by everyone"
  on predicates for select
  using (status = 'approved' or auth.role() = 'authenticated');

-- Authenticated users can propose predicates
create policy "Authenticated users can propose predicates"
  on predicates for insert
  with check (auth.role() = 'authenticated' and status = 'proposed');

-- ------------------------------------------------------------
-- USE_CASES
-- ------------------------------------------------------------

-- Public read (active only)
create policy "Active use cases are viewable by everyone"
  on use_cases for select
  using (status = 'active');

-- Insert only via edge function (service role), but allow authenticated as fallback
create policy "Authenticated users can submit use cases"
  on use_cases for insert
  with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- TRIPLES
-- ------------------------------------------------------------

-- Public read
create policy "Triples are viewable by everyone"
  on triples for select
  using (true);

-- Authenticated users can create triples
create policy "Authenticated users can create triples"
  on triples for insert
  with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- META_EDGES
-- ------------------------------------------------------------

-- Public read
create policy "Meta edges are viewable by everyone"
  on meta_edges for select
  using (true);

-- Authenticated users can create meta edges
create policy "Authenticated users can create meta edges"
  on meta_edges for insert
  with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- COINS
-- ------------------------------------------------------------

-- Public read (see all coins)
create policy "Coins are viewable by everyone"
  on coins for select
  using (true);

-- NO direct insert/update from client - only via edge function with service role
-- Owner can update current_valence for self-flip (handled via edge function)

-- ------------------------------------------------------------
-- FLIPS
-- ------------------------------------------------------------

-- Public read (flip history is public provenance)
create policy "Flips are viewable by everyone"
  on flips for select
  using (true);

-- NO direct insert from client - only via edge function

-- ------------------------------------------------------------
-- VOTES
-- ------------------------------------------------------------

-- Users can see their own votes
create policy "Users can view own votes"
  on votes for select
  using (auth.uid() = voter_id);

-- Public can see vote counts (but not who voted) - handled in queries

-- NO direct insert from client - only via edge function

-- ------------------------------------------------------------
-- INFERENCES
-- ------------------------------------------------------------

-- Public read (active inferences only - the pencil layer)
create policy "Active inferences are viewable by everyone"
  on inferences for select
  using (status = 'active');

-- ------------------------------------------------------------
-- PROFILE CREATION TRIGGER
-- ------------------------------------------------------------

-- Automatically create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, handle, braincoin_balance)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'handle', 'user_' || substr(new.id::text, 1, 8)),
    3  -- starter grant
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
