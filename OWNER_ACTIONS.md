# OWNER ACTIONS - Evil Brain Labs Complete Checklist

**Generated:** 2026-07-06  
**Project ID:** aslcrwmbdtvimjrexxzw  
**References:** UCAR_REGISTRY_BUILD_PLAN.md, SHOW_LAUNCH_RUNBOOK.md, MODEL_STEWARD_SPEC.md, CONTENT_TODO.md

---

## DEPLOYED EDGE FUNCTIONS (16 Active)

| Function | Status | Purpose |
|----------|--------|---------|
| `submit-use-case` | ACTIVE | Original case submission |
| `submit_use_case` | ACTIVE | Updated case submission |
| `cast-vote` | ACTIVE | Vote on cases |
| `self-flip` | ACTIVE | Owner flips their coin |
| `generate_vignette` | ACTIVE | Claude SVG card art |
| `classify_case` | ACTIVE | AI classification |
| `generate_scene` | ACTIVE | Scene generation |
| `generate_narrative` | ACTIVE | Narrative generation |
| `track_engagement` | ACTIVE | Engagement tracking |
| `generate_broadcast` | ACTIVE | Broadcast generation |
| `battle-referee` | ACTIVE | Battle state management |
| `claim-product` | ACTIVE | Seat purchase |
| `settle-mining` | ACTIVE | Mining settlement |
| `mint-card` | ACTIVE | Deterministic card minting |
| `sync-alignment` | ACTIVE | Nightly faction sync |
| `quests` | ACTIVE | Quest/scratch system |

---

## IMMEDIATE (Before Any Testing)

### 1. Run Database Migrations

**Dashboard Path:** Supabase Dashboard > SQL Editor > New Query

Run migrations in this order (or use the combined file):

**Option A: Single Combined File**
```
supabase/DEPLOY_ALL_MIGRATIONS.sql
```
This includes all 18 migrations (002-020).

**Option B: Run Individually (if issues)**
```
supabase/migrations/012_phase0_hardening.sql
supabase/migrations/013_battle_system_foundation.sql
supabase/migrations/014_portfolio.sql
supabase/migrations/015_battles.sql
supabase/migrations/016_quests_scratch.sql
supabase/migrations/017_wallet_rpcs.sql
supabase/migrations/018_ucar_feed_verification.sql
supabase/migrations/019_model_steward.sql
supabase/migrations/020_show_episodes.sql
```

### 2. Set Required Secrets

**Dashboard Path:** Supabase Dashboard > Project Settings > Edge Functions > Secrets

| Secret Name | How to Generate | Purpose |
|-------------|-----------------|---------|
| `CRON_KEY` | `openssl rand -hex 32` | Cron job authentication |
| `INTERNAL_KEY` | `openssl rand -hex 32` | Service-to-service calls |
| `ANTHROPIC_API_KEY` | From Anthropic Console | AI vignette/steward calls |

**Terminal commands to generate:**
```bash
echo "CRON_KEY: $(openssl rand -hex 32)"
echo "INTERNAL_KEY: $(openssl rand -hex 32)"
```

### 3. Set Feature Flags (Secrets)

**Dashboard Path:** Supabase Dashboard > Project Settings > Edge Functions > Secrets

| Flag | Initial Value | Notes |
|------|---------------|-------|
| `FLAG_MINT_V2` | `on` | Enable card minting |
| `FLAG_PORTFOLIO` | `on` | Enable claim-product and settle-mining |
| `FLAG_BATTLES` | `off` | Keep OFF until frontend ready |
| `FLAG_QUESTS` | `on` | Enable quest system |
| `FLAG_SCRATCH` | `on` | Enable scratch tickets |
| `FLAG_REALTIME` | `off` | Phase 4, keep off for now |
| `FLAG_FEED` | `on` | Enable UCAR feed |
| `FLAG_AUTOVERIFY` | `on` | Enable auto-verification |
| `FLAG_COMPLAINTS` | `off` | Keep off until T-7 |

### 4. Create Storage Buckets

**Dashboard Path:** Supabase Dashboard > Storage > New Bucket

| Bucket Name | Public | Purpose |
|-------------|--------|---------|
| `vignettes` | Yes | Card vignette SVGs |
| `cards` | Yes | Card art PNGs |
| `backgrounds` | Yes | Card background library |
| `replays` | Yes | Battle replay bundles (Phase 6) |

**For each bucket, add these policies:**

Via SQL Editor:
```sql
-- Repeat for each bucket: vignettes, cards, backgrounds, replays
INSERT INTO storage.buckets (id, name, public)
VALUES ('vignettes', 'vignettes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('cards', 'cards', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('replays', 'replays', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for all
CREATE POLICY "Public read all buckets" ON storage.objects 
FOR SELECT USING (bucket_id IN ('vignettes', 'cards', 'backgrounds', 'replays'));

-- Service role write for all  
CREATE POLICY "Service role write all buckets" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id IN ('vignettes', 'cards', 'backgrounds', 'replays'));

CREATE POLICY "Service role update all buckets" ON storage.objects 
FOR UPDATE USING (bucket_id IN ('vignettes', 'cards', 'backgrounds', 'replays'));
```

### 5. Enable Realtime on Tables

**Dashboard Path:** Supabase Dashboard > Database > Replication

Enable realtime on these tables:
- [ ] `battle_events` - Live battle updates
- [ ] `battles` - Battle state changes
- [ ] `votes` - Live vote counts (for feed)

---

## BEFORE TESTING (This Week)

### 6. Enable pg_cron Extension

**Dashboard Path:** Supabase Dashboard > Database > Extensions

Search for `pg_cron` and enable it.  
Search for `pg_net` and enable it (for HTTP calls from cron).

### 7. Set Up Cron Jobs

**Dashboard Path:** SQL Editor

Replace `YOUR_CRON_KEY_HERE` with your actual CRON_KEY:

```sql
-- Battle tick every minute (consider external cron for 5s tick)
SELECT cron.schedule(
  'battle-tick',
  '* * * * *',
  $$SELECT net.http_post(
    url := 'https://aslcrwmbdtvimjrexxzw.supabase.co/functions/v1/battle-referee?action=tick',
    headers := '{"x-cron-key": "YOUR_CRON_KEY_HERE"}'::jsonb
  )$$
);

-- Settle mining hourly (at :07 to avoid peak)
SELECT cron.schedule(
  'settle-mining',
  '7 * * * *',
  $$SELECT net.http_post(
    url := 'https://aslcrwmbdtvimjrexxzw.supabase.co/functions/v1/settle-mining?mode=cron',
    headers := '{"x-cron-key": "YOUR_CRON_KEY_HERE"}'::jsonb
  )$$
);

-- Sync alignment nightly at 3:17 AM UTC
SELECT cron.schedule(
  'sync-alignment',
  '17 3 * * *',
  $$SELECT net.http_post(
    url := 'https://aslcrwmbdtvimjrexxzw.supabase.co/functions/v1/sync-alignment',
    headers := '{"x-cron-key": "YOUR_CRON_KEY_HERE"}'::jsonb
  )$$
);

-- Rate limit cleanup daily at 4:07 AM UTC
SELECT cron.schedule(
  'cleanup-rate-limits',
  '7 4 * * *',
  $$SELECT cleanup_rate_limits()$$
);

-- Vote counter reconciliation nightly at 5:23 AM UTC
SELECT cron.schedule(
  'reconcile-votes',
  '23 5 * * *',
  $$SELECT reconcile_vote_counts()$$
);

-- Dead link recheck (rolling window) daily at 6:11 AM UTC
SELECT cron.schedule(
  'recheck-dead-links',
  '11 6 * * *',
  $$SELECT net.http_post(
    url := 'https://aslcrwmbdtvimjrexxzw.supabase.co/functions/v1/sync-alignment?mode=link-check',
    headers := '{"x-cron-key": "YOUR_CRON_KEY_HERE"}'::jsonb
  )$$
);
```

### 8. Upload Background Assets

Upload to `backgrounds` bucket:
- [ ] `fallback_black.png` - Default black background
- [ ] `fallback_red.png` - Evil faction background  
- [ ] `fallback_bone.png` - Neutral background

---

## T-14 DAYS (Before Launch)

### 9. Wire Case Submission to Mint

In `submit_use_case` edge function, after registry write succeeds, add:

```typescript
// Non-blocking mint - queue on error
await supabase.functions.invoke('mint-card', {
  body: { case_id: newCase.id },
  headers: { 'x-internal-key': Deno.env.get('INTERNAL_KEY') }
}).catch(err => console.error('Mint failed, will retry:', err));
```

### 10. Run Backfill Script

Mint cards for all existing approved cases:

```bash
cd /Users/I530341/Documents/Evil\ Brain\ Production/evilbrainlabs.com
npx tsx scripts/backfill_mint.ts
```

### 11. Verify Phase U1 (Feed)
- [ ] First paint contains 20 cards (no client fetch needed)
- [ ] One vote per user, changeable
- [ ] Shared case unfurls with card PNG on X
- [ ] Feed delta arrives via Realtime within 2s

### 12. Verify Phase U2 (Autoverify)
- [ ] Dead source routes to needs_human
- [ ] Duplicate URL merges properly
- [ ] Every stage produces verifications + model_actions rows
- [ ] p95 pipeline latency under 2 minutes

### 13. Standards Page Draft

Create `usecasearmsrace.com/standards.html` with:
1. What the registry is
2. What MACHINE VERIFIED means
3. Who judges Good/Evil (community votes)
4. How to complain (form, process, SLA)
5. Corrections log (public status history)
6. AI disclosure (link to steward registry entry)
7. Satire notice (review with counsel)

### 14. Freeze Steward Prompts

Create `steward/prompts/` directory with versioned prompts:
- [ ] `verifier.md` - V1 frozen
- [ ] `triage.md` - V1 frozen
- [ ] `taxonomist.md` - V1 frozen
- [ ] `researcher.md` - V1 frozen
- [ ] `reconciler.md` - V1 frozen

Run hostile-input fixtures in CI before freezing.

---

## T-7 DAYS (Week Before Launch)

### 15. Enable Complaints System

Set flag:
```
FLAG_COMPLAINTS = on
```

### 16. Stage End-to-End Complaint Test
- [ ] File test complaint against a test case
- [ ] Verify immediate suspension
- [ ] Verify EBL card blocked from claiming
- [ ] Verify human review queue populates
- [ ] Test reinstate flow
- [ ] Test retract flow (50% refund)

### 17. File the Steward's Own Registry Entry

**This is mandatory before launch.**

File a case:
- **Title:** "Use Case Arms Race: Automated Verification System"
- **Description:** AI model performs first-pass verification and complaint triage
- **Source:** Link to standards page
- **Category:** Documentation / Audit

Let it go through normal verification flow.

### 18. Prepare Episode Buffer
- [ ] Six episodes of Case of the Day candidates shortlisted
- [ ] Two full dress-rehearsal episodes produced
- [ ] One episode includes staged battle replay

### 19. Verify Social Unfurls
Test on:
- [ ] X/Twitter card validator
- [ ] LinkedIn post preview
- [ ] Discord embed preview

### 20. Admin Paging Test
- [ ] File named-party complaint
- [ ] Verify admin email received
- [ ] Verify auto-suspend works

---

## T-1 DAY (Day Before Launch)

### 21. Episode 1 Pre-Flight
- [ ] Episode 1 recorded
- [ ] Episode gated (not published)
- [ ] Episode row created in `episodes` table with `featured_case_id`

### 22. Rollback Rehearsal

Test emergency procedures:
```sql
-- Disable complaints without touching feed
UPDATE vault.secrets SET value = 'off' WHERE name = 'FLAG_COMPLAINTS';

-- Disable battles
UPDATE vault.secrets SET value = 'off' WHERE name = 'FLAG_BATTLES';
```

### 23. Final Checklist
- [ ] Featured case is machine_verified (not under_review)
- [ ] Source URL still live (steward rechecked in brief)
- [ ] Card art is current
- [ ] No [COPY] placeholders visible
- [ ] Episode row exists in database

---

## LAUNCH DAY

### 24. Publish Episode 1
- [ ] Set `published_at` on episode row
- [ ] Verify Card of the Day flag on EBL
- [ ] Verify feed pin on UCAR
- [ ] Verify watch notifications sent

### 25. Monitor First 6 Hours
- [ ] Watch review queue for spikes
- [ ] Monitor rate limit triggers
- [ ] Check edge function logs for errors
- [ ] Note any copy gaps found live

---

## CONTENT TASKS (Owner Only)

**Full list in `CONTENT_TODO.md`**

### Critical Copy Needed

**Lane Names (3):**
- [ ] DEV - Development lane final name
- [ ] LEGAL - Legal lane final name  
- [ ] MARKET - Marketing lane final name

**Rival PM Characters (3):**
- [ ] RIVAL_PM_1 - Name + personality
- [ ] RIVAL_PM_2 - Name + personality
- [ ] RIVAL_PM_3 - Name + personality

**Defense Strategy Flavor Text (4):**
- [ ] `legal_team` - Flavor description
- [ ] `pr_spin` - Flavor description
- [ ] `compliance_theater` - Flavor description
- [ ] `vaporware_pivot` - Flavor description

**Quest/Story Copy (9):**
- [ ] Chapter 1-6 quest copy
- [ ] Daily Quest 1-3 text

**Standards Page Copy:**
- [ ] Verification badge tooltip
- [ ] Under review banner text
- [ ] Named party warning
- [ ] Satire notice (with counsel review)

**Show Copy:**
- [ ] Cold open format guidelines
- [ ] Ticker format spec
- [ ] Episode call to action
- [ ] Dark day notice (no day seven explanation)
- [ ] About page copy
- [ ] Schedule page copy

**Complaint Flow Copy:**
- [ ] Complaint type descriptions
- [ ] Filing instructions
- [ ] Relationship declaration warning
- [ ] Triage outcome messages
- [ ] Review SLA notice

---

## OPTIONAL ENHANCEMENTS (Post-Launch)

### Performance
- [ ] External 5-second cron for battle tick (pg_cron min is 1 minute)
- [ ] Redis cache for hot feed queries
- [ ] CDN for card images

### Features
- [ ] Battle replays (Phase 6)
- [ ] Multiplayer battles (FLAG_REALTIME)
- [ ] X API cross-posting (API cost/ToS review needed)
- [ ] User follows (v2)

### Monitoring
- [ ] Weekly model audit dashboard (20 random model_actions per role)
- [ ] Override rate alerting (>10% triggers prompt review)
- [ ] Budget alerts for daily token usage

---

## ARCHITECTURE INVARIANTS (Never Break)

1. **EBL never writes registry tables** - SELECT only
2. **battle-referee is the ONLY writer** of battles/battle_events
3. **Sentiment is free** - NO paid influence path ever
4. **No logos or brand imagery** in generated art
5. **Retraction is human-only** - Model can suspend, not retract
6. **Real names must be REDACTED** unless authorized
7. **A complaint suspends use, not visibility** - Cases stay readable
8. **One case, one canonical record** - Duplicates merge, never fork

---

## EMERGENCY PROCEDURES

### Disable All Battle Features
```sql
UPDATE vault.secrets SET value = 'off' 
WHERE name IN ('FLAG_BATTLES', 'FLAG_REALTIME');
```

### Clear Stuck Battles
```sql
DELETE FROM instance_locks;
UPDATE battles SET state = 'cancelled' WHERE state IN ('window', 'locked');
```

### View Function Errors
```bash
supabase functions list
supabase logs --function-name <name>
```

### Rollback Complaints (Keep Feed)
```sql
UPDATE vault.secrets SET value = 'off' WHERE name = 'FLAG_COMPLAINTS';
```

---

## FILE REFERENCE

| File | Purpose |
|------|---------|
| `supabase/DEPLOY_ALL_MIGRATIONS.sql` | Combined migrations 002-020 |
| `supabase/DEPLOY_BATTLE_SYSTEM.sql` | Battle migrations only (012-017) |
| `CONTENT_TODO.md` | Full placeholder copy tracker |
| `TASKS.md` | Development task status |
| `/UCAR/UCAR_REGISTRY_BUILD_PLAN.md` | Feed, autoverify, complaints spec |
| `/UCAR/SHOW_LAUNCH_RUNBOOK.md` | Episode format, launch checklist |
| `/UCAR/MODEL_STEWARD_SPEC.md` | AI steward roles and mechanics |
