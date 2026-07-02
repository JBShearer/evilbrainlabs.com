#!/bin/bash
# Seed script for Evil Brain Labs Registry
# Creates storage bucket and seeds 20 use cases

SUPABASE_URL="https://aslcrwmbdtvimjrexxzw.supabase.co"
# Service role key needed - get from Supabase dashboard > Settings > API
# This is a placeholder - you need to set it
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$SERVICE_KEY" ]; then
  echo "ERROR: Set SUPABASE_SERVICE_ROLE_KEY environment variable"
  echo "Get it from: Supabase Dashboard > Settings > API > service_role key"
  exit 1
fi

echo "Creating vignettes storage bucket..."
curl -s -X POST "${SUPABASE_URL}/storage/v1/bucket" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"id":"vignettes","name":"vignettes","public":true}' | jq .

echo ""
echo "Seeding use cases..."

# Function to seed a case
seed_case() {
  local title="$1"
  local description="$2"
  local subject="$3"
  local predicate="$4"
  local object="$5"
  local category="$6"
  local severity="$7"
  local valence="$8"

  # Create source
  SOURCE_RESULT=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/sources" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{\"source_type\":\"research\",\"title\":\"${title} source\"}")

  SOURCE_ID=$(echo "$SOURCE_RESULT" | jq -r '.[0].id // .id // empty')

  if [ -z "$SOURCE_ID" ]; then
    echo "  Failed to create source for: $title"
    return 1
  fi

  # Create use case
  USE_CASE_RESULT=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/use_cases" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{\"title\":\"${title}\",\"description\":\"${description}\",\"category\":\"${category}\",\"severity\":${severity},\"source_id\":\"${SOURCE_ID}\",\"status\":\"active\"}")

  USE_CASE_ID=$(echo "$USE_CASE_RESULT" | jq -r '.[0].id // .id // empty')

  if [ -z "$USE_CASE_ID" ]; then
    echo "  Failed to create use case: $title"
    return 1
  fi

  # Mint coin (4% FOIL chance)
  FOIL=$([ $((RANDOM % 25)) -eq 0 ] && echo "true" || echo "false")

  curl -s -X POST "${SUPABASE_URL}/rest/v1/coins" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"use_case_id\":\"${USE_CASE_ID}\",\"mint_valence\":\"${valence}\",\"current_valence\":\"${valence}\",\"pressure\":0,\"signature\":\"seed_${USE_CASE_ID}\",\"is_foil\":${FOIL},\"vignette_status\":\"pending\"}" > /dev/null

  echo "  ✓ ${title}"
}

# Seed the cases
seed_case "ClearviewScrape" "Clearview AI scraped billions of facial images from social media without consent to build a law enforcement facial recognition database." "Clearview AI" "surveils" "general public" "surveillance" 5 "evil"
seed_case "RingWatch" "Amazon Ring shared doorbell camera footage with police without user consent, while employees accessed thousands of private videos." "Amazon Ring" "surveils" "homeowners" "surveillance" 4 "evil"
seed_case "FaceWrong" "Robert Williams and other Black Americans were wrongfully arrested after facial recognition systems misidentified them." "police facial recognition" "discriminates_against" "Black Americans" "discrimination" 5 "evil"
seed_case "PegasusHunt" "NSO Group Pegasus spyware was used by governments to surveil journalists and activists." "authoritarian governments" "surveils" "journalists" "surveillance" 5 "evil"
seed_case "UyghurNet" "China deployed AI-powered facial recognition across Xinjiang to track Uyghurs." "Chinese government" "surveils" "Uyghur Muslims" "surveillance" 5 "evil"
seed_case "BossWare" "Workplace monitoring software tracks employee keystrokes, screenshots, and idle time." "employers" "surveils" "employees" "surveillance" 3 "evil"
seed_case "AmazonPacer" "Amazon warehouse workers are tracked by scanners measuring productivity, with AI monitoring bathroom breaks." "Amazon" "surveils" "warehouse workers" "labor" 4 "evil"
seed_case "PredPolRacism" "PredPol directed police disproportionately to Black neighborhoods despite equal drug use citywide." "PredPol" "discriminates_against" "Black communities" "discrimination" 4 "evil"
seed_case "ShotSpotter" "Acoustic gunshot detection produced 89% false positives in Chicago. A man spent 11 months jailed after misclassification." "ShotSpotter" "surveils" "urban residents" "surveillance" 4 "evil"
seed_case "PufferPope" "Midjourney fake of Pope Francis in Balenciaga went viral with 20M+ views - first mass AI misinformation." "anonymous creator" "deceives" "social media users" "misinformation" 3 "evil"
seed_case "RoboJoe" "AI Biden voice made 20,000+ robocalls to suppress NH primary votes, resulting in felony charges." "political consultant" "suppresses" "voters" "manipulation" 5 "evil"
seed_case "GriefBot" "Character.AI chatbots engaged a 14-year-old in emotional relationship for months before his suicide." "Character.AI" "harms" "vulnerable teenagers" "manipulation" 5 "evil"
seed_case "DeepHeist" "AI deepfake of executives deceived employee into transferring $25 million." "fraudsters" "defrauds" "corporations" "manipulation" 4 "evil"
seed_case "SwiftFake" "AI-generated pornographic images of Taylor Swift spread virally across Twitter." "anonymous creators" "victimizes" "Taylor Swift" "manipulation" 4 "evil"
seed_case "DataGuzzler" "AI data centers consumed 415 TWh globally in 2024 - 1.5% of world electricity." "AI industry" "consumes" "global electricity" "environment" 4 "evil"
seed_case "ThirstyAI" "US AI servers could require 1 billion cubic meters of water annually by 2030." "AI data centers" "depletes" "water resources" "environment" 4 "evil"
seed_case "GradeGrinder" "UK A-level algorithm downgraded 40% of predicted grades, hitting disadvantaged students hardest." "UK Ofqual" "discriminates_against" "poor students" "discrimination" 4 "evil"
seed_case "NaviDenier" "UnitedHealth algorithm denied Medicare patients care, overriding doctor recommendations." "UnitedHealth" "automates" "care denials" "discrimination" 5 "evil"
seed_case "ContentCruelty" "OpenAI paid Kenyan workers under $2/hour to review traumatic content for ChatGPT safety." "OpenAI" "exploits" "content moderators" "labor" 5 "evil"
seed_case "AppleCardGap" "Apple Card gave women lower credit limits than husbands with identical credit profiles." "Apple" "discriminates_against" "women" "discrimination" 4 "evil"

echo ""
echo "Done! Seeded 20 use cases."
echo "Check: ${SUPABASE_URL}/rest/v1/use_cases?select=id,title"
