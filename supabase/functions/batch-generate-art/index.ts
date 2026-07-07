// Edge Function: batch-generate-art
// Generates card art for all cards with art_url = 'pending'
// Uses Claude to create 2-color SVG vignettes, stores in Supabase storage

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Category to visual motif mapping for registry cases
const CATEGORY_MOTIFS: Record<string, string> = {
  "surveillance": "an eye with radiating lines, or a camera lens, or tracking crosshairs",
  "discrimination": "an unbalanced scale, or a divided path, or contrasting silhouettes",
  "healthcare": "a heart with a pulse line, or medical cross, or stethoscope outline",
  "automation": "interlocking gears, or a robotic arm, or conveyor belt",
  "prediction": "a crystal ball, or ascending chart arrows, or a forward-pointing compass",
  "labor": "a clock with hands spinning, or a figure at a desk, or assembly line",
  "finance": "stacked coins, or a graph with dollar signs, or a vault door",
  "education": "an open book, or graduation cap, or lightbulb",
  "security": "a shield, or lock and key, or fortress walls",
  "transportation": "wheels in motion, or a road/path, or vehicle silhouette",
  "environment": "a leaf, or waves, or sun/earth symbol",
  "communication": "speech bubbles, or signal waves, or connected nodes",
  "legal": "a gavel, or balanced scales, or document with seal",
  "military": "a star insignia, or radar sweep, or strategic map pins",
  "research": "a magnifying glass, or test tubes, or data points",
};

function getMotifForCategory(category: string): string {
  const normalized = category?.toLowerCase() || "";
  for (const [key, motif] of Object.entries(CATEGORY_MOTIFS)) {
    if (normalized.includes(key)) return motif;
  }
  return "an abstract geometric pattern suggesting technology and data flow";
}

// Deterministic hash for seed
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function buildCardArtPrompt(card: {
  name: string;
  category: string;
  faction: string;
  rarity: string;
  power: number;
}, seed: string): string {
  const motif = getMotifForCategory(card.category);
  const factionStyle = card.faction === 'heaven'
    ? "clean, orderly, with upward-pointing elements suggesting hope or progress"
    : "sharp, angular, with downward or chaotic elements suggesting danger or concern";

  const rarityComplexity = {
    'common': "simple, 2-3 basic shapes",
    'uncommon': "moderate complexity, 3-4 shapes with some detail",
    'rare': "detailed, 4-5 shapes with fine linework",
    'legendary': "intricate, 5+ shapes with elaborate detail and flourishes"
  }[card.rarity] || "moderate complexity";

  return `You are generating a card vignette SVG for a collectible trading card game about AI ethics.

**STRICT CONSTRAINTS:**
- ViewBox: exactly "0 0 100 100"
- Colors: ONLY use these two colors:
  - #1A1817 (ink black) for primary elements
  - #D42B1E (crayon red) for accent only (max 15-20% of visual)
- NO gradients, NO opacity/transparency, NO blur filters, NO images
- Style: Hand-drawn aesthetic, slightly imperfect lines (use small variations)
- Strokes: 2-3px width
- Must be recognizable at 120x120 pixels

**CARD INFO:**
Title: "${card.name}"
Category: ${card.category}
Faction: ${card.faction} (${factionStyle})
Rarity: ${card.rarity} (${rarityComplexity})
Power: ${card.power}

**VISUAL DIRECTION:**
Create a symbolic vignette representing: ${motif}

The mood should feel ${card.faction === 'heaven' ? 'cautiously optimistic' : 'ominously concerning'}.

**SEED FOR VARIATION:** ${seed}
Use this to add subtle uniqueness: rotation angles (1-8 degrees), shape proportions, decorative elements.

**OUTPUT FORMAT:**
Return ONLY valid SVG code. Start with <svg and end with </svg>. No markdown, no explanation, no code blocks.`;
}

// Geometric fallback when Claude fails
function geometricFallback(seed: string, faction: string): string {
  const seedNum = parseInt(seed.slice(0, 8), 16);
  const shapes: string[] = [];

  let s = seedNum;
  const rng = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const accentColor = '#D42B1E';
  const mainColor = '#1A1817';

  // Background pattern based on faction
  if (faction === 'heaven') {
    // Upward chevrons
    for (let i = 0; i < 3; i++) {
      const y = 30 + i * 25;
      const color = i === 1 ? accentColor : mainColor;
      shapes.push(`<path d="M20 ${y + 15} L50 ${y} L80 ${y + 15}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>`);
    }
  } else {
    // Downward/chaotic lines
    for (let i = 0; i < 4; i++) {
      const x1 = 15 + rng() * 30;
      const x2 = 55 + rng() * 30;
      const y1 = 20 + i * 20;
      const y2 = 25 + i * 20 + rng() * 10;
      const color = rng() > 0.7 ? accentColor : mainColor;
      shapes.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>`);
    }
  }

  // Central symbol
  const cx = 50, cy = 50;
  shapes.push(`<circle cx="${cx}" cy="${cy}" r="18" fill="none" stroke="${mainColor}" stroke-width="3"/>`);
  shapes.push(`<circle cx="${cx}" cy="${cy}" r="8" fill="${accentColor}"/>`);

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${shapes.join('')}</svg>`;
}

function validateSVG(svg: string): { valid: boolean; error?: string } {
  if (!svg.trim().startsWith('<svg')) return { valid: false, error: 'Must start with <svg' };
  if (!svg.trim().endsWith('</svg>')) return { valid: false, error: 'Must end with </svg>' };
  if (!svg.includes('viewBox')) return { valid: false, error: 'Missing viewBox' };
  if (svg.includes('<script') || svg.includes('javascript:')) return { valid: false, error: 'Forbidden script' };
  if (svg.includes('<foreignObject')) return { valid: false, error: 'Forbidden foreignObject' };
  return { valid: true };
}

async function generateCardArt(
  supabase: any,
  anthropicKey: string,
  card: { id: string; name: string; category: string; faction: string; rarity: string; power: number; art_seed: string }
): Promise<{ success: boolean; url?: string; error?: string; method: string }> {

  const seed = card.art_seed || hashString(card.id);
  let svg: string;
  let method = 'ai_generated';

  try {
    // Try Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: buildCardArtPrompt(card, seed),
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0];

    if (content?.type === "text") {
      svg = content.text.trim();
      // Extract SVG if wrapped
      const svgMatch = svg.match(/<svg[\s\S]*<\/svg>/i);
      if (svgMatch) svg = svgMatch[0];

      const validation = validateSVG(svg);
      if (!validation.valid) {
        console.log(`Invalid SVG for ${card.id}: ${validation.error}`);
        svg = geometricFallback(seed, card.faction);
        method = 'geometric_fallback';
      }
    } else {
      svg = geometricFallback(seed, card.faction);
      method = 'geometric_fallback';
    }
  } catch (err) {
    console.error(`Claude error for ${card.id}:`, err);
    svg = geometricFallback(seed, card.faction);
    method = 'geometric_fallback';
  }

  // Upload to storage
  const filename = `${card.id}.svg`;
  const { error: uploadErr } = await supabase.storage
    .from("cards")
    .upload(filename, svg, {
      contentType: "image/svg+xml",
      upsert: true,
      cacheControl: "public, max-age=31536000, immutable",
    });

  if (uploadErr) {
    return { success: false, error: `Upload failed: ${uploadErr.message}`, method };
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("cards").getPublicUrl(filename);
  const publicUrl = urlData.publicUrl;

  // Update card record
  const { error: updateErr } = await supabase
    .from("cards")
    .update({ art_url: publicUrl })
    .eq("id", card.id);

  if (updateErr) {
    return { success: false, error: `DB update failed: ${updateErr.message}`, method };
  }

  return { success: true, url: publicUrl, method };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batch_size = 10, dry_run = false } = await req.json().catch(() => ({}));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anthropicKey = Deno.env.get("CLAUDE") || Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({
        error: "No Claude API key configured",
        hint: "Set CLAUDE or ANTHROPIC_API_KEY in edge function secrets"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get cards with pending art
    const { data: pendingCards, error: fetchErr } = await supabase
      .from("cards")
      .select("id, name, category, faction, rarity, power, art_seed")
      .or("art_url.eq.pending,art_url.is.null")
      .limit(batch_size);

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingCards || pendingCards.length === 0) {
      return new Response(JSON.stringify({
        message: "No pending cards found",
        total_pending: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get total pending count
    const { count: totalPending } = await supabase
      .from("cards")
      .select("id", { count: 'exact', head: true })
      .or("art_url.eq.pending,art_url.is.null");

    if (dry_run) {
      return new Response(JSON.stringify({
        dry_run: true,
        batch_size,
        would_process: pendingCards.length,
        total_pending: totalPending,
        sample_cards: pendingCards.slice(0, 3).map(c => ({ id: c.id, name: c.name, category: c.category }))
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process batch
    const results: any[] = [];
    for (const card of pendingCards) {
      const result = await generateCardArt(supabase, anthropicKey, card);
      results.push({
        card_id: card.id,
        name: card.name,
        ...result
      });

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const aiGenerated = results.filter(r => r.method === 'ai_generated').length;
    const fallback = results.filter(r => r.method === 'geometric_fallback').length;

    return new Response(JSON.stringify({
      processed: results.length,
      successful,
      failed,
      ai_generated: aiGenerated,
      geometric_fallback: fallback,
      remaining: (totalPending || 0) - successful,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
