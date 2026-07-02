// Edge Function: generate_vignette
// Generates 2-color SVG vignettes for registry cards using Claude Sonnet

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.25.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Predicate to visual motif mapping
const PREDICATE_MOTIFS: Record<string, string> = {
  surveils: "an eye with iris/pupil, watching",
  deanonymizes: "a mask being lifted or fingerprint",
  tracks: "footprints or a dotted trail line",
  reports: "a clipboard or document with checkmarks",
  monetizes: "dollar signs or coins stacked",
  upsells: "an arrow pointing up with $ symbol",
  gamifies: "dice or a game controller outline",
  "a/b tests": "a toggle switch or split arrow",
  predicts: "a crystal ball or chart arrow pointing forward",
  influences: "puppet strings or broadcasting waves",
  manipulates: "puppet strings descending from above",
  automates: "gears interlocking or a robot arm",
  replaces: "a person silhouette with X and robot outline",
  generates: "a sparkle or creation burst",
  classifies: "filing cabinet drawers or tag labels",
  recommends: "a pointing hand or thumbs up",
  optimizes: "ascending graph bars",
  discriminates_against: "a scale tipped unfairly to one side",
  exploits: "a hook or grabbing hand",
  deceives: "a two-faced mask",
  suppresses: "a hand pressing down or mute symbol",
  harms: "a warning triangle",
  exposes: "an open box or revealed secret",
  defrauds: "broken piggy bank",
  victimizes: "crosshairs or target",
  defames: "speech bubble with scribbles",
  leaks: "dripping water or broken pipe",
  consumes: "open mouth or vacuum",
  depletes: "emptying hourglass",
  pollutes: "smoke stack or toxic symbol",
};

function getMotifDescription(predicate: string): string {
  const normalized = predicate.toLowerCase().replace(/_/g, " ");
  return PREDICATE_MOTIFS[normalized] || PREDICATE_MOTIFS[predicate] || "an abstract symbol representing the action";
}

// Simple hash function for determinism
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function buildPrompt(subject: string, predicate: string, object: string, seed: string): string {
  const motif = getMotifDescription(predicate);

  return `You are generating a small vignette SVG for a collectible card. The card represents a use case from the AI Ethics Registry.

**CONSTRAINTS (MUST FOLLOW):**
- ViewBox: 0 0 100 100
- Colors: ONLY #1A1817 (ink black) and #D42B1E (crayon red)
- No gradients, no opacity, no blur filters
- Crayon red is ACCENT ONLY (max 20% of visual elements)
- Style: Hand-drawn, slightly wobbly lines, paper/sketch aesthetic
- Strokes: 2-3px width, imperfect circles and lines (use small random offsets)
- Elements: Simple, iconic, recognizable at small size

**THE TRIPLE:**
Subject: ${subject}
Predicate: ${predicate}
Object: ${object}

**STYLE SEED:** ${seed}
Use this seed to add subtle variation: wobble direction, element rotation (1-5 degrees), decorative dots/hatching placement.

**VISUAL DIRECTION:**
The predicate "${predicate}" should be represented as: ${motif}

Keep the subject "${subject}" in mind but don't try to write text - use symbolic representation only.

**OUTPUT:**
Return ONLY valid SVG code starting with \`<svg\` and ending with \`</svg>\`. No explanation, no markdown code blocks, no comments. The SVG must render correctly when embedded directly in HTML.`;
}

// Validate SVG response
function validateSVG(svg: string): { valid: boolean; error?: string } {
  if (!svg.trim().startsWith('<svg')) {
    return { valid: false, error: 'SVG must start with <svg' };
  }
  if (!svg.trim().endsWith('</svg>')) {
    return { valid: false, error: 'SVG must end with </svg>' };
  }
  if (!svg.includes('viewBox')) {
    return { valid: false, error: 'SVG must have viewBox attribute' };
  }
  // Security checks
  if (svg.includes('<script') || svg.includes('javascript:')) {
    return { valid: false, error: 'SVG contains forbidden script elements' };
  }
  if (svg.includes('<foreignObject')) {
    return { valid: false, error: 'SVG contains forbidden foreignObject' };
  }
  return { valid: true };
}

// Geometric fallback
function geometricFallback(seed: string): string {
  const seedNum = parseInt(seed.slice(0, 8), 16);
  const shapes: string[] = [];

  // Seeded random
  let s = seedNum;
  const rng = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  // Generate deterministic shapes
  for (let i = 0; i < 5; i++) {
    const x = 15 + rng() * 70;
    const y = 15 + rng() * 70;
    const r = 8 + rng() * 15;
    const color = rng() > 0.75 ? '#D42B1E' : '#1A1817';
    const type = rng();

    if (type < 0.33) {
      shapes.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="2.5"/>`);
    } else if (type < 0.66) {
      const w = r * 1.5;
      const h = r;
      shapes.push(`<rect x="${(x - w/2).toFixed(1)}" y="${(y - h/2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="none" stroke="${color}" stroke-width="2.5" transform="rotate(${(rng() * 20 - 10).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
    } else {
      const points = [];
      for (let j = 0; j < 3 + Math.floor(rng() * 3); j++) {
        const angle = (j / (3 + Math.floor(rng() * 3))) * Math.PI * 2;
        const pr = r * (0.7 + rng() * 0.3);
        points.push(`${(x + Math.cos(angle) * pr).toFixed(1)},${(y + Math.sin(angle) * pr).toFixed(1)}`);
      }
      shapes.push(`<polygon points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>`);
    }
  }

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${shapes.join('')}</svg>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { use_case_id, retry = false } = await req.json();

    if (!use_case_id) {
      return new Response(JSON.stringify({ error: "use_case_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch use case and its triples
    const { data: useCase, error: ucErr } = await supabase
      .from("use_cases")
      .select("id, title, triples(subject, predicate, object)")
      .eq("id", use_case_id)
      .single();

    if (ucErr || !useCase) {
      return new Response(JSON.stringify({ error: "Use case not found", details: ucErr }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get triple or fallback to title parsing
    let subject: string, predicate: string, object: string;

    if (useCase.triples && useCase.triples.length > 0) {
      const triple = useCase.triples[0];
      subject = triple.subject;
      predicate = triple.predicate;
      object = triple.object;
    } else {
      // Fallback: parse title
      const words = useCase.title.split(/\s+/);
      subject = words[0] || "AI";
      predicate = "generates";
      object = words.slice(1).join(" ") || "harm";
    }

    // Generate deterministic seed
    const tripleStr = `${subject}${predicate}${object}`.toLowerCase().trim();
    const seed = hashString(tripleStr);

    // Check if we already have a vignette (and not retrying)
    if (!retry) {
      const { data: existingFile } = await supabase.storage
        .from("vignettes")
        .list("", { search: use_case_id });

      if (existingFile && existingFile.length > 0) {
        const publicUrl = supabase.storage.from("vignettes").getPublicUrl(`${use_case_id}.svg`);
        return new Response(JSON.stringify({
          success: true,
          vignette_url: publicUrl.data.publicUrl,
          cached: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let svg: string;
    let vignette_status = "ai_generated";

    // Try Claude API
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (anthropicKey) {
      try {
        const anthropic = new Anthropic({ apiKey: anthropicKey });

        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          temperature: 0,
          messages: [{
            role: "user",
            content: buildPrompt(subject, predicate, object, seed),
          }],
        });

        const content = response.content[0];
        if (content.type === "text") {
          svg = content.text.trim();

          // Extract SVG if wrapped in code block
          const svgMatch = svg.match(/<svg[\s\S]*<\/svg>/i);
          if (svgMatch) {
            svg = svgMatch[0];
          }

          const validation = validateSVG(svg);
          if (!validation.valid) {
            console.error("Invalid SVG:", validation.error);
            svg = geometricFallback(seed);
            vignette_status = "geometric_fallback";
          }
        } else {
          svg = geometricFallback(seed);
          vignette_status = "geometric_fallback";
        }
      } catch (apiErr) {
        console.error("Claude API error:", apiErr);
        svg = geometricFallback(seed);
        vignette_status = "geometric_fallback";
      }
    } else {
      // No API key, use fallback
      svg = geometricFallback(seed);
      vignette_status = "geometric_fallback";
    }

    // Upload to storage
    const { error: uploadErr } = await supabase.storage
      .from("vignettes")
      .upload(`${use_case_id}.svg`, svg, {
        contentType: "image/svg+xml",
        upsert: true,
        cacheControl: "public, max-age=31536000, immutable",
      });

    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      // Return the SVG inline if upload fails
      return new Response(JSON.stringify({
        success: true,
        svg_inline: svg,
        vignette_status,
        upload_failed: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update coin record if it exists
    await supabase
      .from("coins")
      .update({ vignette_status })
      .eq("use_case_id", use_case_id);

    const publicUrl = supabase.storage.from("vignettes").getPublicUrl(`${use_case_id}.svg`);

    return new Response(JSON.stringify({
      success: true,
      vignette_url: publicUrl.data.publicUrl,
      vignette_status,
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
