# TASKS.md — Evil Brain Labs: The Machine + Registry

## Current State Assessment

### ✅ DONE
- [x] Registry schema (11 tables) deployed to Supabase
- [x] RLS policies configured
- [x] Edge functions deployed: `submit_use_case`, `cast_vote`, `self_flip`
- [x] The Machine game UI (complete 1,800-line single-file app)
- [x] Supabase client integration (auth, session handling)
- [x] Filing cases → writes to `use_cases` + mints coin
- [x] Voting → calls `cast_vote`, deducts braincoins
- [x] Self-flip → calls `self_flip` for owners
- [x] Magic link auth flow
- [x] Case Book loads from database
- [x] Career mode, battles, store, doom clock (local/demo)

### ❌ NOT CONNECTED / MISSING

---

## CRITICAL BUGS

### 1. Mobile Header Overflow
**Problem:** "IDEATION DIVISION" text pushes content below bottom nav on mobile
**File:** `index.html` line ~28-30, 314
**Fix:** Add responsive breakpoint to hide or shrink tagline on small screens
```css
@media (max-width: 480px) {
  h1 small { display: none; }  /* or font-size: 8px */
}
```

### 2. Autoscroll Not Working?
**Status:** Code exists (`feedScroll()` at line 731, called by `addBeat()` at 738)
**Possible issue:** `feedFollow` flag gets set to false if user scrolls up
**Debug:** Check if `typewrite()` is being called (DEMO mode) or `cloudBeat()` (needs STORY_FN)
**Current:** DEMO=true (no STORY_FN), so typewrite() should animate and autoscroll

---

## BUILD 1 GAPS (The Spine)

### 3. Inference Layer (Pencil) — NOT CONNECTED
**What it is:** Model-generated proposals shown in gray/dashed (vs ink=asserted)
**Tables exist:** `inferences` table in schema
**Missing:**
- No UI to display inferences (pencil styling exists but not wired)
- No edge function to write inferences
- No pipeline to generate them
**Scope:** This is **Build 2** per DESIGN.md — the Python pipeline feeds `inferences`
**Recommendation:** Leave empty for now; table exists for future

### 4. Triples Not Being Stored
**Problem:** When filing, `triples` array is built from slots but not written to DB
**Current:** Edge function only writes `use_cases` + `coins`, ignores triples
**Fix needed in:** `submit_use_case/index.ts` — extract and insert triples
**Requires:** Also insert entities if they don't exist

### 5. D3 Graph Page — EXISTS BUT SEPARATE
**File:** `graph.html` exists from earlier build
**Problem:** Not linked from The Machine UI
**Options:** 
  a) Add nav link to /graph.html
  b) Integrate graph into a Machine view
  c) Leave as separate tool

### 6. 50 Seed Cases
**Status:** 8 hardcoded seed cases in JS
**Need:** 42 more real bad AI use cases
**Action:** Research + write, or you provide list

### 7. Filing Rate Cap
**Status:** Not implemented
**Spec:** Limit filings per account per day; <24h accounts file as pending
**Implement in:** `submit_use_case` edge function + `profiles` table (add `filing_count_today`, `created_at`)

### 8. Terms/Privacy Pages
**Status:** Not created
**Content:** No trackers, data policy, Tribunal process
**Action:** Simple HTML pages

### 9. Public JSON Export
**Status:** Not implemented
**Spec:** Nightly dump of ink layer (use_cases, triples, entities)
**Options:** Edge function or cron job that writes to Supabase Storage

---

## BUILD 2 GAPS (The Game)

### 10. Vignette at Mint
**Spec:** Sonnet draws 2-color SVG per card at mint time
**Current:** `cardSVG()` generates deterministic geometric card (line 1697)
**Missing:** LLM call to generate unique artwork
**Fallback:** Current geometric cards work fine

### 11. Product Evolution Powers
**Q:** "Do new product segments add extra powers?"
**Current behavior:**
- `evolveProduct()` at line 1737: costs 3₿, adds random extra triple
- Stage 1→2→3 (MVP→PLATFORM→ECOSYSTEM)
- Favor increases (+1 per stage, max 3)
- NO stat changes to ATK/DEF/SPD currently

**`cardStats()` at line 1685:**
```js
atk: 2 + w*2 + Math.floor(gw/5)  // w=predicate weight, gw=grade weight
def: 2 + hashCode(subject)%4
spd: 1 + qual_bonus + hashCode(object)%2
```
**Missing:** Evolution doesn't modify stats
**Fix:** Add stage multiplier to cardStats or store evolved stats

### 12. FOIL Mints (4%)
**Status:** Not implemented
**Spec:** 4% of mints get sheen variant, pure collectability
**Where:** `submit_use_case` could set a `foil` boolean on coin

### 13. THE BINDER
**Status:** Not implemented
**Spec:** Collection view with set completion tracking

### 14. Weekly Email
**Status:** Not implemented
**Spec:** The Brain's performance review via Resend/SMTP

### 15. Party Mode / Live Battles
**Status:** PvE battles work locally
**Missing:** Multiplayer room, spectators, real opponents

### 16. Image Pipeline
**Q:** "Do we have any image pipelines?"
**A:** No. Cards use deterministic SVG (`cardSVG()`). No LLM image gen.
**ROADMAP says:** "Sonnet draws a constrained two-color SVG" — would need Claude API call

---

## PRIORITY ORDER

### Immediate (bugs)
1. **Mobile header fix** — 5 min CSS
2. **Verify autoscroll** — check if working, debug if not

### P1 Launch Blockers
3. **Triples storage** — update edge function
4. **50 seed cases** — content work
5. **Terms/Privacy** — legal pages

### P1 Nice-to-Have
6. **Link to graph.html** — add nav item
7. **Filing rate cap** — spam prevention
8. **JSON export** — press/research access

### P2 (Game Layer)
9. **Evolution powers** — stats boost per stage
10. **FOIL mints** — collectability
11. **Vignette generation** — Claude API for card art
12. **THE BINDER** — collection UI

---

## Questions for You

1. **Seed cases:** Want me to research and write 50 real bad AI use cases, or do you have a list?
2. **Evolution:** Should evolved products get +ATK/+DEF/+SPD, or just favor/card count?
3. **Image gen:** Do you want Claude API vignettes now, or ship with geometric cards?
4. **Graph page:** Link from nav, integrate as a view, or leave separate?
5. **Inference layer:** Defer to Build 2, or stub something now?
