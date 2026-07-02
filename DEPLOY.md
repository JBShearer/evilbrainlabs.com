# Evil Brain Labs: Complete Deployment Guide

## Prerequisites
- Supabase project: `aslcrwmbdtvimjrexxzw`
- GitHub repo connected for Pages deployment
- Anthropic API key for vignette generation (optional)

---

## Step 1: Database Migration (SQL Editor)

Go to: **Supabase Dashboard → SQL Editor → New Query**

Paste and run this SQL:

```sql
-- ============================================
-- MIGRATION 002: Vignette + FOIL Support
-- ============================================

-- Add vignette status column to coins
ALTER TABLE coins
ADD COLUMN IF NOT EXISTS vignette_status TEXT
DEFAULT 'pending'
CHECK (vignette_status IN ('pending', 'ai_generated', 'geometric_fallback', 'geometric_permanent'));

-- Add FOIL indicator to coins
ALTER TABLE coins
ADD COLUMN IF NOT EXISTS is_foil BOOLEAN DEFAULT FALSE;

-- Index for finding cards needing vignette generation
CREATE INDEX IF NOT EXISTS idx_coins_vignette_status 
ON coins(vignette_status) 
WHERE vignette_status = 'pending';

-- Add comments for documentation
COMMENT ON COLUMN coins.vignette_status IS 'Status of card vignette: pending, ai_generated, geometric_fallback, geometric_permanent';
COMMENT ON COLUMN coins.is_foil IS 'FOIL variant indicator. 4% of mints are FOIL - same stats, CSS sheen effect only';
```

Expected output: `Success. No rows returned`

---

## Step 2: Create Storage Bucket

Go to: **Supabase Dashboard → Storage → New Bucket**

1. Click **New Bucket**
2. Name: `vignettes`
3. Check **Public bucket** ✓
4. Click **Create bucket**

Then add policies. Go to the `vignettes` bucket → **Policies** tab → **New Policy**:

**Policy 1: Public Read**
- Name: `Public read vignettes`
- Allowed operation: `SELECT`
- Policy definition: `true`

**Policy 2: Service Role Write**
- Name: `Service role write vignettes`
- Allowed operation: `INSERT`
- Policy definition: `(auth.role() = 'service_role')`

Or run this SQL instead:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('vignettes', 'vignettes', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
CREATE POLICY "Public read vignettes" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'vignettes');

-- Service role write policy  
CREATE POLICY "Service role write vignettes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vignettes');

-- Allow updates for retry/overwrite
CREATE POLICY "Service role update vignettes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'vignettes');
```

---

## Step 3: Add Edge Function Secrets

Go to: **Supabase Dashboard → Edge Functions → Secrets**

Add this secret (only if you want AI-generated vignettes):
- Name: `ANTHROPIC_API_KEY`
- Value: `sk-ant-api03-...` (your key)

Without this key, vignettes will use geometric fallback (still looks good).

---

## Step 4: Deploy Edge Functions

You have two options:

### Option A: Via Supabase CLI

```bash
cd /Users/I530341/Documents/Evil\ Brain\ Production/evilbrainlabs.com

# Login if needed
supabase login

# Link to your project
supabase link --project-ref aslcrwmbdtvimjrexxzw

# Deploy functions
supabase functions deploy generate_vignette
supabase functions deploy submit_use_case
supabase functions deploy cast_vote
supabase functions deploy self_flip
```

### Option B: Via Dashboard (if CLI not working)

Go to: **Supabase Dashboard → Edge Functions**

For each function (`generate_vignette`, `submit_use_case`, `cast_vote`, `self_flip`):

1. Click **Deploy a new function**
2. Name: (function name)
3. Copy the code from:
   - `supabase/functions/generate_vignette/index.ts`
   - `supabase/functions/submit_use_case/index.ts`
   - `supabase/functions/cast_vote/index.ts`
   - `supabase/functions/self_flip/index.ts`

---

## Step 5: Seed the Database with 50 Cases

Go to: **Supabase Dashboard → SQL Editor → New Query**

First, create a helper function to import seed cases:

```sql
-- Create a function to seed cases
CREATE OR REPLACE FUNCTION seed_use_case(
  p_title TEXT,
  p_description TEXT,
  p_subject TEXT,
  p_predicate TEXT,
  p_object TEXT,
  p_category TEXT,
  p_severity INT,
  p_valence TEXT,
  p_source TEXT,
  p_year INT
) RETURNS UUID AS $$
DECLARE
  v_source_id UUID;
  v_use_case_id UUID;
  v_entity_subject_id UUID;
  v_entity_object_id UUID;
  v_predicate_id UUID;
BEGIN
  -- Create source
  INSERT INTO sources (source_type, title, url)
  VALUES ('research', p_source, NULL)
  RETURNING id INTO v_source_id;

  -- Create use case
  INSERT INTO use_cases (title, description, category, severity, source_id, status)
  VALUES (p_title, p_description, p_category, p_severity, v_source_id, 'active')
  RETURNING id INTO v_use_case_id;

  -- Create or find subject entity
  INSERT INTO entities (canonical_name, entity_type)
  VALUES (p_subject, 'organization')
  ON CONFLICT (canonical_name) DO UPDATE SET canonical_name = EXCLUDED.canonical_name
  RETURNING id INTO v_entity_subject_id;

  -- Create or find object entity
  INSERT INTO entities (canonical_name, entity_type)
  VALUES (p_object, 'group')
  ON CONFLICT (canonical_name) DO UPDATE SET canonical_name = EXCLUDED.canonical_name
  RETURNING id INTO v_entity_object_id;

  -- Create or find predicate
  INSERT INTO predicates (predicate, tier, weight)
  VALUES (p_predicate, 'entity', 2)
  ON CONFLICT (predicate) DO UPDATE SET predicate = EXCLUDED.predicate
  RETURNING id INTO v_predicate_id;

  -- Create triple
  INSERT INTO triples (use_case_id, subject_entity_id, predicate_id, object_entity_id, asserted_at)
  VALUES (v_use_case_id, v_entity_subject_id, v_predicate_id, v_entity_object_id, NOW());

  -- Mint coin (system mint, no owner)
  INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
  VALUES (
    v_use_case_id, 
    p_valence, 
    p_valence, 
    0, 
    'seed_' || v_use_case_id::TEXT,
    (random() < 0.04),  -- 4% FOIL chance
    'pending'
  );

  RETURN v_use_case_id;
END;
$$ LANGUAGE plpgsql;
```

Then seed the cases (I'll give you the first 20 - run this):

```sql
-- Seed 20 cases (batch 1)
SELECT seed_use_case(
  'ClearviewScrape',
  'Clearview AI scraped billions of facial images from social media without consent to build a law enforcement facial recognition database, leading to wrongful arrests and massive privacy violations.',
  'Clearview AI', 'surveils', 'general public',
  'surveillance', 5, 'evil',
  'Multiple GDPR fines; Illinois BIPA settlement 2024', 2020
);

SELECT seed_use_case(
  'RingWatch',
  'Amazon Ring shared doorbell camera footage with police at least 11 times without user consent, while employees accessed thousands of private videos.',
  'Amazon Ring', 'surveils', 'homeowners and neighbors',
  'surveillance', 4, 'evil',
  'FTC Settlement May 2023', 2022
);

SELECT seed_use_case(
  'FaceWrong',
  'Robert Williams and at least 6 other Black Americans were wrongfully arrested after facial recognition systems misidentified them as suspects.',
  'police facial recognition', 'discriminates_against', 'Black Americans',
  'discrimination', 5, 'evil',
  'Detroit wrongful arrest cases 2020-2024', 2020
);

SELECT seed_use_case(
  'PegasusHunt',
  'NSO Group Pegasus spyware was used by governments to surveil journalists, activists, and opposition politicians. Linked to Khashoggi assassination.',
  'authoritarian governments', 'surveils', 'journalists and dissidents',
  'surveillance', 5, 'evil',
  'Pegasus Project investigation 2021', 2021
);

SELECT seed_use_case(
  'UyghurNet',
  'China deployed AI-powered facial recognition and biometric surveillance across Xinjiang to track Uyghurs.',
  'Chinese government', 'surveils', 'Uyghur Muslims',
  'surveillance', 5, 'evil',
  'China Cables leaked 2019', 2020
);

SELECT seed_use_case(
  'BossWare',
  'Workplace monitoring software tracks employee keystrokes, screenshots, mouse movements, and idle time.',
  'employers', 'surveils', 'employees',
  'surveillance', 3, 'evil',
  'EFF bossware investigations', 2023
);

SELECT seed_use_case(
  'AmazonPacer',
  'Amazon warehouse workers are tracked by handheld scanners measuring productivity in real-time, with AI monitoring bathroom breaks.',
  'Amazon', 'surveils', 'warehouse workers',
  'labor', 4, 'evil',
  'Amazon warehouse worker investigations', 2021
);

SELECT seed_use_case(
  'PredPolRacism',
  'Predictive policing algorithm PredPol directed police disproportionately to Black and low-income neighborhoods.',
  'PredPol/Geolitica', 'discriminates_against', 'Black and low-income communities',
  'discrimination', 4, 'evil',
  'Oakland research study', 2020
);

SELECT seed_use_case(
  'ShotSpotter',
  'Acoustic gunshot detection system produced 89% false positive rate in Chicago. A man spent 11 months in jail after misclassification.',
  'ShotSpotter', 'surveils', 'urban residents',
  'surveillance', 4, 'evil',
  'MacArthur Justice Center Chicago analysis', 2020
);

SELECT seed_use_case(
  'PufferPope',
  'Anonymous worker used Midjourney to create fake image of Pope Francis in a Balenciaga puffer jacket, going viral with 20M+ views.',
  'Anonymous Chicago worker', 'deceives', 'Global social media users',
  'misinformation', 3, 'evil',
  'Midjourney Pope Francis deepfake March 2023', 2023
);

SELECT seed_use_case(
  'RoboJoe',
  'AI-generated voice impersonating President Biden made 20,000+ robocalls urging NH voters not to vote, resulting in felony charges.',
  'Political consultant', 'suppresses', 'New Hampshire voters',
  'manipulation', 5, 'evil',
  'New Hampshire Biden robocall incident January 2024', 2024
);

SELECT seed_use_case(
  'GriefBot',
  'Character.AI chatbots engaged a 14-year-old Florida boy in emotional relationship for months before his suicide.',
  'Character.AI', 'harms', 'Vulnerable teenagers',
  'manipulation', 5, 'evil',
  'Sewell Setzer III death Florida 2024', 2024
);

SELECT seed_use_case(
  'DeepHeist',
  'Fraudsters used AI-generated video to impersonate Arup Group executives, deceiving employee into transferring $25 million.',
  'Unknown fraudsters', 'defrauds', 'Arup Group',
  'manipulation', 4, 'evil',
  'Arup deepfake scam Hong Kong 2024', 2024
);

SELECT seed_use_case(
  'SwiftFake',
  'AI-generated pornographic images of Taylor Swift spread virally across Twitter in January 2024.',
  'Anonymous creators', 'victimizes', 'Taylor Swift',
  'manipulation', 4, 'evil',
  'Taylor Swift deepfake incident January 2024', 2024
);

SELECT seed_use_case(
  'DataGuzzler',
  'AI data centers consumed 415 TWh globally in 2024 (1.5% of world electricity). Google reported 13% YoY emissions increase.',
  'AI industry', 'consumes', 'Global electricity',
  'environment', 4, 'evil',
  'Environmental impact of AI 2024', 2024
);

SELECT seed_use_case(
  'ThirstyAI',
  'US AI servers could require 731-1125 million cubic meters of water annually by 2030.',
  'AI data centers', 'depletes', 'Water resources',
  'environment', 4, 'evil',
  'Nature Sustainability study 2025', 2025
);

SELECT seed_use_case(
  'GradeGrinder',
  'UK A-level algorithm downgraded 40% of predicted grades in 2020, disproportionately affecting students from disadvantaged schools.',
  'UK Ofqual', 'discriminates_against', 'Students from disadvantaged schools',
  'discrimination', 4, 'evil',
  'UK A-level grading controversy 2020', 2020
);

SELECT seed_use_case(
  'NaviDenier',
  'UnitedHealth nH Predict algorithm denied Medicare Advantage patients continued care coverage, overriding physician recommendations.',
  'UnitedHealth/NaviHealth', 'automates', 'Elderly patient care denials',
  'discrimination', 5, 'evil',
  'STAT News investigation 2023', 2023
);

SELECT seed_use_case(
  'ContentCruelty',
  'OpenAI outsourced traumatic content moderation to Kenyan workers paid less than $2/hour to train ChatGPT safety filters.',
  'OpenAI/Sama', 'exploits', 'Kenyan content moderators',
  'labor', 5, 'evil',
  'TIME investigation 2023', 2023
);

SELECT seed_use_case(
  'AppleCardGap',
  'Apple Card credit limit algorithm gave women significantly lower credit limits than their husbands despite identical credit profiles.',
  'Apple/Goldman Sachs', 'discriminates_against', 'Female credit applicants',
  'discrimination', 4, 'evil',
  'NYDFS investigation 2019', 2019
);

-- Verify count
SELECT COUNT(*) as seeded_cases FROM use_cases;
```

---

## Step 6: Verify Deployment

### Check Tables
```sql
-- Should return 20+ rows
SELECT id, title, category FROM use_cases LIMIT 5;

-- Should show vignette_status and is_foil columns
SELECT column_name FROM information_schema.columns WHERE table_name = 'coins';
```

### Check Storage
- Go to Storage → `vignettes` bucket should exist and be empty

### Check Edge Functions
- Go to Edge Functions → should see 4 functions deployed

### Test the Site
1. Visit https://evilbrainlabs.com
2. The Machine should load
3. Case Book tab should show seeded cases
4. Filing a new case should work

---

## Troubleshooting

### "Column does not exist" error
Run the migration SQL again - the ALTER TABLE commands are idempotent.

### Edge function 500 error
Check Supabase → Edge Functions → Logs for the specific error.

### Vignettes not generating
Check if ANTHROPIC_API_KEY is set. Without it, geometric fallback is used (this is fine).

### Cases not appearing
Check that RLS policies allow SELECT. Run:
```sql
SELECT * FROM use_cases LIMIT 1;
```
If this works in SQL Editor but not from the app, RLS is blocking.

---

## File Locations

```
evilbrainlabs.com/
├── index.html                          # Main game (deployed to GitHub Pages)
├── seed_cases.json                     # 50 researched bad AI cases
├── terms.html                          # Terms of service
├── privacy.html                        # Privacy policy
├── graph.html                          # D3 force graph
├── supabase/
│   ├── schema.sql                      # Original schema
│   ├── rls_policies.sql                # Row-level security
│   ├── migrations/
│   │   └── 002_vignette_foil.sql       # Vignette + FOIL columns
│   └── functions/
│       ├── submit_use_case/index.ts    # File use case + mint coin
│       ├── cast_vote/index.ts          # Vote on coins
│       ├── self_flip/index.ts          # Owner flips their coin
│       └── generate_vignette/index.ts  # Claude SVG generation
```
