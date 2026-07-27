#!/usr/bin/env node
// Run: node scripts/generate-art-local.js
// Generates card art locally using Hyperspace proxy (localhost:6655)

const SUPABASE_URL = "https://aslcrwmbdtvimjrexxzw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbGNyd21iZHR2aW1qcmV4eHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNDA0NjgsImV4cCI6MjA5NjcxNjQ2OH0.XYG0LrgA_92h7dGjw0aamX53WIrwQaqPHNHQLe8p9ls";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Hyperspace proxy (from ClauseCockpit) - no API key needed
const HYPERSPACE_URL = process.env.HYPERSPACE_BASE_URL || "http://localhost:6655/anthropic";
const HYPERSPACE_MODEL = process.env.HYPERSPACE_MODEL || "anthropic--claude-4.5-sonnet";

const DELAY_MS = 1000;  // 1 second between cards (proxy handles rate limiting)

// Category to visual motif
const CATEGORY_MOTIFS = {
  "surveillance": "an eye with radiating lines, or camera lens, or tracking crosshairs",
  "discrimination": "an unbalanced scale, or divided path, or contrasting silhouettes",
  "healthcare": "a heart with pulse line, or medical cross, or stethoscope",
  "automation": "interlocking gears, or robotic arm, or conveyor belt",
  "prediction": "crystal ball, or ascending chart arrows, or compass",
  "labor": "clock with spinning hands, or figure at desk, or assembly line",
  "finance": "stacked coins, or graph with dollar signs, or vault door",
  "education": "open book, or graduation cap, or lightbulb",
  "security": "shield, or lock and key, or fortress walls",
  "transportation": "wheels in motion, or road/path, or vehicle silhouette",
  "environment": "leaf, or waves, or sun/earth symbol",
  "communication": "speech bubbles, or signal waves, or connected nodes",
  "legal": "gavel, or balanced scales, or document with seal",
  "military": "star insignia, or radar sweep, or strategic map pins",
  "research": "magnifying glass, or test tubes, or data points",
};

function getMotif(category) {
  const normalized = (category || "").toLowerCase();
  for (const [key, motif] of Object.entries(CATEGORY_MOTIFS)) {
    if (normalized.includes(key)) return motif;
  }
  return "abstract geometric pattern suggesting technology and data";
}

function buildPrompt(card, seed) {
  const motif = getMotif(card.category);
  const factionStyle = card.faction === 'heaven'
    ? "clean, orderly, upward-pointing elements suggesting hope"
    : "sharp, angular, chaotic elements suggesting danger";

  return `Generate a card vignette SVG for a collectible card game about AI ethics.

STRICT CONSTRAINTS:
- ViewBox: "0 0 100 100"
- Colors: ONLY #1A1817 (ink) and #D42B1E (red accent, max 20%)
- NO gradients, NO opacity, NO blur, NO images
- Hand-drawn aesthetic, slightly imperfect lines
- Strokes: 2-3px width
- Must be recognizable at 120x120 pixels

CARD: "${card.name}"
Category: ${card.category}
Faction: ${card.faction} (${factionStyle})
Rarity: ${card.rarity}

VISUAL: ${motif}

SEED: ${seed} (use for subtle variation in angles/positions)

Return ONLY valid SVG code. Start with <svg, end with </svg>. No markdown, no explanation.`;
}

function geometricFallback(seed, faction) {
  const seedNum = parseInt(seed.slice(0, 8), 16) || 12345;
  let s = seedNum;
  const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

  const shapes = [];
  const accent = '#D42B1E', main = '#1A1817';

  if (faction === 'heaven') {
    for (let i = 0; i < 3; i++) {
      const y = 30 + i * 25;
      shapes.push(`<path d="M20 ${y + 15} L50 ${y} L80 ${y + 15}" fill="none" stroke="${i === 1 ? accent : main}" stroke-width="2.5"/>`);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const x1 = 15 + rng() * 30, x2 = 55 + rng() * 30;
      const y1 = 20 + i * 20, y2 = 25 + i * 20 + rng() * 10;
      shapes.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${rng() > 0.7 ? accent : main}" stroke-width="2.5"/>`);
    }
  }
  shapes.push(`<circle cx="50" cy="50" r="18" fill="none" stroke="${main}" stroke-width="3"/>`);
  shapes.push(`<circle cx="50" cy="50" r="8" fill="${accent}"/>`);

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${shapes.join('')}</svg>`;
}

async function generateArt(card) {
  const seed = card.art_seed || card.id.replace(/-/g, '').slice(0, 16);

  try {
    // Use Hyperspace proxy - no API key needed
    const response = await fetch(`${HYPERSPACE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        // Hyperspace handles auth via keychain - token optional
        "x-api-key": "hyperspace-token",
      },
      body: JSON.stringify({
        model: HYPERSPACE_MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: buildPrompt(card, seed) }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log(`    Hyperspace error: ${response.status} - ${errText.slice(0, 100)}`);
      return { svg: geometricFallback(seed, card.faction), method: 'geometric_fallback' };
    }

    const data = await response.json();
    let svg = data.content?.[0]?.text?.trim() || '';
    const match = svg.match(/<svg[\s\S]*<\/svg>/i);
    if (match) svg = match[0];

    if (!svg.startsWith('<svg') || !svg.endsWith('</svg>')) {
      return { svg: geometricFallback(seed, card.faction), method: 'geometric_fallback' };
    }

    return { svg, method: 'ai_generated' };
  } catch (err) {
    console.log(`    Error: ${err.message}`);
    return { svg: geometricFallback(seed, card.faction), method: 'geometric_fallback' };
  }
}

async function uploadToSupabase(cardId, svg) {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

  // Upload SVG to storage
  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/cards/${cardId}.svg`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'image/svg+xml',
      'x-upsert': 'true',
    },
    body: svg,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Upload failed: ${uploadRes.status} ${text}`);
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/cards/${cardId}.svg`;

  // Update card record
  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/cards?id=eq.${cardId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${key}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ art_url: publicUrl }),
  });

  if (!updateRes.ok) {
    const text = await updateRes.text();
    throw new Error(`DB update failed: ${updateRes.status} ${text}`);
  }

  return publicUrl;
}

async function main() {
  console.log('🎨 Local Art Generator (via Hyperspace proxy)\n');
  console.log(`   Proxy: ${HYPERSPACE_URL}`);
  console.log(`   Model: ${HYPERSPACE_MODEL}\n`);

  // Test proxy connection
  try {
    const testRes = await fetch(`${HYPERSPACE_URL.replace('/anthropic', '')}/health`).catch(() => null);
    if (!testRes?.ok) {
      console.log('⚠️  Hyperspace proxy may not be running at localhost:6655');
      console.log('   Start ClauseCockpit or run: hyperspace start\n');
    }
  } catch { /* ignore */ }

  // Fetch pending cards
  const cardsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/cards?or=(art_url.eq.pending,art_url.is.null)&select=id,name,category,faction,rarity,art_seed&limit=1000`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!cardsRes.ok) {
    console.error('Failed to fetch cards:', await cardsRes.text());
    process.exit(1);
  }

  const cards = await cardsRes.json();
  console.log(`📋 Found ${cards.length} cards needing art\n`);

  if (cards.length === 0) {
    console.log('✅ All cards have art!');
    return;
  }

  let success = 0, failed = 0, ai = 0, fallback = 0;

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    console.log(`[${i + 1}/${cards.length}] ${card.name.slice(0, 40)}...`);

    try {
      const { svg, method } = await generateArt(card);
      await uploadToSupabase(card.id, svg);

      success++;
      if (method === 'ai_generated') ai++;
      else fallback++;

      console.log(`    ✅ ${method}`);
    } catch (err) {
      failed++;
      console.log(`    ❌ ${err.message}`);
    }

    // Delay between cards
    if (i < cards.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n📊 Done!`);
  console.log(`   Success: ${success}, Failed: ${failed}`);
  console.log(`   AI: ${ai}, Fallback: ${fallback}`);
}

main().catch(console.error);
