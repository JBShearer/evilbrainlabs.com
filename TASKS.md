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

### ❌ NOT YET STARTED

#### Build 1 Remaining
- [ ] **Triples storage** - edge function writes triples from slots
- [ ] **Filing rate cap** - limit submissions per day per account
- [ ] **Public JSON export** - nightly dump of ink layer

#### Build 2 (The Game)
- [ ] **THE BINDER** - collection view with set completion tracking
- [ ] **Weekly email** - Brain's performance review via Resend
- [ ] **Party mode** - multiplayer rooms, spectators, live battles
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
