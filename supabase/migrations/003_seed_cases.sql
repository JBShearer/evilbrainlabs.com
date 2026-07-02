-- Migration: Seed 20 bad AI use cases
-- Run via: supabase db push

-- ============================================================
-- SEED DATA: 20 Real Bad AI Use Cases
-- ============================================================

-- First, make owner_id nullable for seed coins (system-minted)
ALTER TABLE coins ALTER COLUMN owner_id DROP NOT NULL;

-- Helper: Insert and return ID
DO $$
DECLARE
  v_source_id UUID;
  v_use_case_id UUID;
BEGIN

-- 1. ClearviewScrape
INSERT INTO sources (source_type, title) VALUES ('manual', 'GDPR fines; BIPA settlement 2024') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('ClearviewScrape', 'Clearview AI scraped billions of facial images from social media without consent to build a law enforcement facial recognition database, leading to wrongful arrests and massive privacy violations.', 'surveillance', 5, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 2. RingWatch
INSERT INTO sources (source_type, title) VALUES ('manual', 'FTC Settlement May 2023') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('RingWatch', 'Amazon Ring shared doorbell camera footage with police at least 11 times without user consent, while employees accessed thousands of private videos.', 'surveillance', 4, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 3. FaceWrong
INSERT INTO sources (source_type, title) VALUES ('manual', 'Detroit wrongful arrest cases 2020-2024') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('FaceWrong', 'Robert Williams and at least 6 other Black Americans were wrongfully arrested after facial recognition systems misidentified them as suspects.', 'discrimination', 5, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 4. PegasusHunt
INSERT INTO sources (source_type, title) VALUES ('manual', 'Pegasus Project investigation 2021') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('PegasusHunt', 'NSO Group Pegasus spyware was used by governments including Saudi Arabia, Mexico, Poland, and Hungary to surveil journalists, activists, and opposition politicians.', 'surveillance', 5, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 5. UyghurNet
INSERT INTO sources (source_type, title) VALUES ('manual', 'China Cables leaked 2019') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('UyghurNet', 'China deployed AI-powered facial recognition and biometric surveillance across Xinjiang to track Uyghurs.', 'surveillance', 5, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 6. BossWare
INSERT INTO sources (source_type, title) VALUES ('manual', 'EFF bossware investigations 2023') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('BossWare', 'Workplace monitoring software tracks employee keystrokes, screenshots, mouse movements, and idle time. One-third of UK employers now use such tools.', 'surveillance', 3, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 7. AmazonPacer
INSERT INTO sources (source_type, title) VALUES ('manual', 'Amazon warehouse investigations 2018-2024') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('AmazonPacer', 'Amazon warehouse workers are tracked by handheld scanners measuring productivity in real-time, with AI monitoring location, idle time, and bathroom breaks.', 'labor', 4, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 8. PredPolRacism
INSERT INTO sources (source_type, title) VALUES ('manual', 'Oakland research study; Plainfield NJ 2023') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('PredPolRacism', 'Predictive policing algorithm PredPol directed police disproportionately to Black and low-income neighborhoods despite drug use being evenly distributed citywide.', 'discrimination', 4, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 9. ShotSpotter
INSERT INTO sources (source_type, title) VALUES ('manual', 'MacArthur Justice Center Chicago analysis') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('ShotSpotter', 'Acoustic gunshot detection system produced 89% false positive rate in Chicago. A man spent 11 months in jail after ShotSpotter employee manually changed a classification.', 'surveillance', 4, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 10. PufferPope
INSERT INTO sources (source_type, title) VALUES ('manual', 'Midjourney Pope Francis deepfake March 2023') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('PufferPope', 'Anonymous worker used Midjourney to create a fake image of Pope Francis in a Balenciaga puffer jacket, going viral with 20M+ views - first mass AI misinformation.', 'misinformation', 3, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, true, 'pending');  -- FOIL!

-- 11. RoboJoe
INSERT INTO sources (source_type, title) VALUES ('manual', 'New Hampshire Biden robocall January 2024') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('RoboJoe', 'AI-generated voice impersonating President Biden made over 20,000 robocalls urging New Hampshire voters not to vote in the Democratic primary, resulting in felony charges.', 'manipulation', 5, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 12. GriefBot
INSERT INTO sources (source_type, title) VALUES ('manual', 'Sewell Setzer III death Florida 2024') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('GriefBot', 'Character.AI chatbots engaged a 14-year-old Florida boy in an emotional relationship for months before his suicide. His mother sued alleging addictive design.', 'manipulation', 5, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 13. DeepHeist
INSERT INTO sources (source_type, title) VALUES ('manual', 'Arup deepfake scam Hong Kong 2024') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('DeepHeist', 'Fraudsters used AI-generated video and audio to impersonate Arup Group executives on video calls, deceiving an employee into transferring $25 million.', 'manipulation', 4, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 14. SwiftFake
INSERT INTO sources (source_type, title) VALUES ('manual', 'Taylor Swift deepfake incident January 2024') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('SwiftFake', 'AI-generated pornographic images of Taylor Swift spread virally across Twitter and other platforms in January 2024, spurring demands for legal reform.', 'manipulation', 4, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 15. DataGuzzler
INSERT INTO sources (source_type, title) VALUES ('manual', 'Environmental impact of AI 2024') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('DataGuzzler', 'AI data centers consumed 415 TWh globally in 2024 (1.5% of world electricity), with projections reaching 945 TWh by 2030. Google emissions up 13% from AI.', 'environment', 4, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 16. ThirstyAI
INSERT INTO sources (source_type, title) VALUES ('manual', 'Nature Sustainability study 2025') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('ThirstyAI', 'US AI servers could require 731 to 1,125 million cubic meters of water annually by 2030. Nearly half of US data centers are in water-stressed regions.', 'environment', 4, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 17. GradeGrinder
INSERT INTO sources (source_type, title) VALUES ('manual', 'UK A-level grading controversy 2020') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('GradeGrinder', 'UK A-level algorithm downgraded 40% of predicted grades in 2020, disproportionately affecting students from disadvantaged schools while privileging elite private schools.', 'discrimination', 4, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 18. NaviDenier
INSERT INTO sources (source_type, title) VALUES ('manual', 'STAT News investigation 2023') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('NaviDenier', 'UnitedHealth nH Predict algorithm denied Medicare Advantage patients continued care coverage, overriding physician recommendations to cut costs.', 'discrimination', 5, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

-- 19. ContentCruelty
INSERT INTO sources (source_type, title) VALUES ('manual', 'TIME investigation 2023') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('ContentCruelty', 'OpenAI outsourced traumatic content moderation to Kenyan workers paid less than $2/hour to review child abuse, violence, and bestiality content for ChatGPT safety.', 'labor', 5, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, true, 'pending');  -- FOIL!

-- 20. AppleCardGap
INSERT INTO sources (source_type, title) VALUES ('manual', 'NYDFS investigation 2019') RETURNING id INTO v_source_id;
INSERT INTO use_cases (title, description, category, severity, source_id, status)
VALUES ('AppleCardGap', 'Apple Card credit limit algorithm gave women significantly lower credit limits than their husbands despite identical or better credit profiles.', 'discrimination', 4, v_source_id, 'active') RETURNING id INTO v_use_case_id;
INSERT INTO coins (use_case_id, mint_valence, current_valence, pressure, signature, is_foil, vignette_status)
VALUES (v_use_case_id, 'evil', 'evil', 0, 'seed_' || v_use_case_id, false, 'pending');

END $$;

-- Verify
SELECT COUNT(*) as total_cases FROM use_cases;
SELECT COUNT(*) as total_coins FROM coins;
SELECT COUNT(*) as foil_count FROM coins WHERE is_foil = true;
