# TASKS.md — Evil Brain Labs: The Machine + Registry

## Build Status: Moving to Build 2

### ✅ COMPLETED

#### Infrastructure
- [x] Registry schema (11 tables) deployed to Supabase
- [x] RLS policies configured
- [x] Edge functions deployed: `submit_use_case`, `cast_vote`, `self_flip`
- [x] The Machine game UI (complete 1,800-line single-file app)
- [x] Supabase client integration (auth, session handling)
- [x] Magic link auth flow

#### Registry Features
- [x] Filing cases → writes to `use_cases` + mints coin
- [x] Voting → calls `cast_vote`, deducts braincoins
- [x] Self-flip → calls `self_flip` for owners
- [x] Case Book loads from database
- [x] **50 seed cases researched** - real bad AI use cases from 2020-2026

#### Game Features  
- [x] Career mode, battles, store, doom clock (local/demo)
- [x] **Evolution stat bonuses** - Stage 2: +1/+1/+1, Stage 3: +3/+2/+2 + "Wins ties"
- [x] Mobile header fix (tagline hidden on small screens)
- [x] Graph page linked from nav

#### Legal/UX
- [x] Terms page (`terms.html`)
- [x] Privacy page (`privacy.html`) - "No trackers, proud of it"
- [x] Footer with legal links

#### Graphics Pipeline (NEW)
- [x] `generate_vignette` edge function created
- [x] Claude Sonnet generates 2-color SVG vignettes
- [x] Deterministic via hash seed (same triple = same image)
- [x] Geometric fallback if API fails
- [x] Predicate-to-motif mapping defined

#### FOIL System (NEW)
- [x] 4% of mints are FOIL
- [x] `is_foil` column in coins table
- [x] CSS sheen animation
- [x] submit_use_case triggers FOIL determination

---

### 🔄 IN PROGRESS

#### Deployment Tasks
- [ ] Run migration 002_vignette_foil.sql in Supabase
- [ ] Create 'vignettes' storage bucket in Supabase
- [ ] Set ANTHROPIC_API_KEY secret for edge function
- [ ] Deploy updated edge functions to Supabase
- [ ] Upload seed_cases.json to database (write seed script)

---

### 🚀 BATTLE SYSTEM MERGE (ebl-battler package)

**Source**: `filesdddd/ebl-battler/` — Part 2 drop-in package
**Reference**: `EBL_BATTLER_BUILD_PLAN.md` phases 0-5

#### Phase 0/1: Database Migrations ✅ COMPLETE
- [x] Review Part 2 package contents (2026-07-06)
- [x] Phase 0 hardening migration created (012_phase0_hardening.sql)
- [x] Create `profiles_roles` table (013_battle_system_foundation.sql)
- [x] Add `impact` column to use_cases + create `use_cases_with_votes` view
- [x] Migration 013: cards, wallets, card_instances, card_events, backgrounds
- [x] Migration 014: products, mining_ledger
- [x] Migration 015: battles, battle_events, battle_intents, battle_sentiment, instance_locks
- [x] Migration 016: quest_defs, quest_progress, scratch_tickets
- [x] Migration 017: wallet_debit, wallet_credit, increment_rate_limit RPCs

#### Phase 1: Edge Functions ✅ COMPLETE
- [x] Copy `shared/battle-reducer.ts` and `shared/bots.ts`
- [x] Merge Part 2 `config/economy.ts` with existing (added LANES, SIDE_SIZE, DECK_SIZE, etc.)
- [x] Create battle-referee edge function (aligned to existing schema)
- [x] Create claim-product edge function
- [x] Create mint-card edge function (reads use_cases_with_votes view)
- [x] Create settle-mining edge function
- [x] Create sync-alignment edge function
- [x] Create quests edge function

#### Phase 2: Frontend Integration
- [ ] Copy `BattleClient.jsx` and `ScratchTicket.jsx`
- [ ] Wire existing SVG card renderer to mint-card
- [ ] Hook case submission to mint-card (non-blocking)
- [ ] Update slot machine for CLAIM button

#### Phase 3: Cron & Backfill
- [ ] Set up cron: tick (5s), settle-mining (hourly), sync-alignment (nightly)
- [ ] Run `backfill_mint.ts` for existing approved cases

#### Deployment (OWNER ACTION REQUIRED)
```bash
# Run migrations 012-017 in Supabase SQL Editor (in order)
# Set secrets:
supabase secrets set FLAG_MINT_V2=on FLAG_PORTFOLIO=on FLAG_BATTLES=off
supabase secrets set CRON_KEY=... INTERNAL_KEY=...

# Deploy new edge functions:
supabase functions deploy battle-referee
supabase functions deploy claim-product
supabase functions deploy settle-mining
supabase functions deploy mint-card
supabase functions deploy sync-alignment
supabase functions deploy quests
```

#### Architecture Invariants
1. EBL never writes registry tables (SELECT only)
2. battle-referee is the ONLY writer of battles/battle_events
3. Sentiment is free — NO paid influence path
4. No logos or brand imagery in art

---

### ❌ NOT YET STARTED

#### Build 1 Remaining
- [ ] **Triples storage** - edge function writes triples from slots
- [ ] **Filing rate cap** - limit submissions per day per account
- [ ] **Public JSON export** - nightly dump of ink layer

#### Build 2 (The Game)
- [ ] **THE BINDER** - collection view with set completion tracking
- [ ] **Weekly email** - Brain's performance review via Resend
- [ ] ~~**Party mode**~~ → Superseded by battle system merge
- [ ] **Doom Prior chart** - circulation-weighted graph permalink

#### Build 3 (The Composer)
- [ ] K'Dee sprite library for canonical entities
- [ ] Paper-doll product builder
- [ ] Python inference pipeline (Whisper, LLM extraction)

---

## Deployment Checklist

```bash
# 1. Run migration
# In Supabase SQL Editor, paste contents of:
# supabase/migrations/002_vignette_foil.sql

# 2. Create storage bucket
# Dashboard → Storage → New Bucket: "vignettes"
# Set to public

# 3. Add Anthropic secret
# Dashboard → Edge Functions → Secrets
# Add: ANTHROPIC_API_KEY

# 4. Deploy edge functions
supabase functions deploy generate_vignette
supabase functions deploy submit_use_case

# 5. Seed cases (manual for now)
# Import seed_cases.json via Supabase dashboard or custom script
```

---

## Architecture Decisions Made

1. **Keyword search over semantic** - deferred embeddings to Build 2 Python pipeline
2. **Evolution boosts stats** - Stage 3 is meaningfully powerful (+3/+2/+2)
3. **Claude generates vignettes** - deterministic via hash, geometric fallback
4. **FOIL is CSS-only** - 4% chance, no stat difference, pure collectability
5. **Inference layer deferred** - table exists, no UI until pipeline ready

---

## Session Summary (2025-07-02)

- Researched 54 real bad AI use cases via workflow (kept 50)
- Implemented evolution stat system with special abilities
- Built graphics pipeline with Claude Sonnet integration
- Added FOIL mint system (4% rarity)
- Created Terms/Privacy pages
- Fixed mobile header overflow
- Added Graph nav link and footer
