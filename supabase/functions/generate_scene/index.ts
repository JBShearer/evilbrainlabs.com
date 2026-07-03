// Edge Function: generate_scene
// Lazy canonical SVG scene generation for story mode
// Uses Claude Haiku for fast 2-color SVG scenes

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Phase-specific scene elements
const PHASE_ELEMENTS: Record<number, string> = {
  0: "ideation room: desks, filing cabinets, a whiteboard with scribbles, coffee cups, industrial ceiling lights",
  1: "development lab: monitors showing code, server racks, tangled cables, a person typing furiously",
  2: "testing arena: multiple screens with metrics, focus group figures, checkboxes being marked",
  3: "launch pad: a stage with spotlights, rising rocket or ascending graph, celebration confetti",
};

// Choice-specific modifiers
const CHOICE_MODIFIERS: Record<string, string> = {
  lean_in: "add a leaderboard display on a wall monitor",
  ask_legal: "include a raccoon in a tie looking skeptical, holding papers",
  call_gary: "show a mysterious figure emerging from server room shadows",
  feel_fine: "add a wellness dashboard with happy face metrics",
  ship_beta: "show elderly figures testing devices with confused expressions",
  add_ai: "recursive brain symbols, nested screens within screens",
  hide_gi: "show hiding behind a desk, with surveillance camera in corner",
  raise_hand: "show a hand raised timidly among cubicles",
  demo_day: "all-hands meeting room with rows of observers, presentation screen",
  quiet_launch: "empty hallway with single glowing 'LIVE' sign",
  blame_gary: "a pointing finger and a sigh cloud",
  feel_weird: "swirling abstract shapes suggesting unease",
};

function buildScenePrompt(ticket: any, beat: number, choice: string | null): string {
  const phase = PHASE_ELEMENTS[Math.min(beat, 3)] || PHASE_ELEMENTS[3];
  const modifier = choice ? (CHOICE_MODIFIERS[choice] || "") : "";

  return `Draw a scene for a corporate villain visual novel game. Style: hand-drawn sketch, corporate dystopia.

SCENE CONTEXT:
- Product being built: "${ticket.subject} that ${ticket.predicate} ${ticket.object}"
- Phase: ${['Ideation', 'Development', 'Testing', 'Launch'][Math.min(beat, 3)]}
- Setting: ${phase}
${modifier ? `- Special detail: ${modifier}` : ''}

STRICT SVG RULES:
1. Output ONLY valid SVG code, nothing else
2. viewBox="0 0 400 300"
3. EXACTLY TWO COLORS: ink black #1A1817, crayon red #D42B1E
4. Background: #F6F2E8 (paper cream)
5. Hand-drawn style: slightly wobbly lines, imperfect shapes
6. Elements MUST be ordered BACK-TO-FRONT (background first, foreground last)
7. Simple shapes: 10-20 elements maximum
8. No gradients, no opacity, no blur, no text, no script tags

Start directly with <svg and end with </svg>. No explanation.`;
}

// Sanitize SVG - remove dangerous elements
function sanitizeSVG(svg: string): string | null {
  // Remove script tags, event handlers, foreignObject, external hrefs
  let clean = svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/href\s*=\s*["'](?!#)[^"']*["']/gi, '')
    .replace(/xlink:href\s*=\s*["'](?!#)[^"']*["']/gi, '');

  // Extract just the SVG if there's other content
  const match = clean.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) return null;

  clean = match[0];

  // Validate basic structure
  if (!clean.includes('viewBox')) return null;

  return clean;
}

// Geometric fallback scene
function geometricFallback(beat: number, seed: number): string {
  const rng = (n: number) => Math.abs(((seed * (n + 1) * 9301 + 49297) % 233280)) / 233280;
  const ink = '#1A1817';
  const red = '#D42B1E';
  const bg = '#F6F2E8';

  const scenes = [
    // Beat 0: Ideation
    `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <rect fill="${bg}" width="400" height="300"/>
      <rect x="50" y="160" width="300" height="120" fill="${ink}" rx="4"/>
      <rect x="70" y="80" width="120" height="100" fill="none" stroke="${ink}" stroke-width="6"/>
      <circle cx="130" cy="130" r="30" fill="${red}"/>
      <rect x="260" y="100" width="60" height="80" fill="${ink}"/>
      <text x="200" y="260" font-size="16" font-family="monospace" fill="${bg}" text-anchor="middle">IDEATION</text>
    </svg>`,
    // Beat 1: Development
    `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <rect fill="${bg}" width="400" height="300"/>
      <rect x="60" y="40" width="280" height="180" fill="none" stroke="${ink}" stroke-width="8"/>
      <line x1="60" y1="80" x2="340" y2="80" stroke="${ink}" stroke-width="4"/>
      <circle cx="200" cy="150" r="50" fill="${red}"/>
      <text x="200" y="160" font-size="40" fill="${bg}" text-anchor="middle" font-family="serif">β</text>
      <rect x="100" y="240" width="200" height="30" fill="${ink}"/>
    </svg>`,
    // Beat 2: Testing
    `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <rect fill="${bg}" width="400" height="300"/>
      <circle cx="100" cy="100" r="50" fill="none" stroke="${ink}" stroke-width="6"/>
      <circle cx="200" cy="100" r="50" fill="none" stroke="${ink}" stroke-width="6"/>
      <circle cx="300" cy="100" r="50" fill="none" stroke="${red}" stroke-width="6"/>
      <path d="M50 200 Q200 270 350 200" fill="none" stroke="${ink}" stroke-width="4"/>
      <text x="200" y="260" font-size="14" fill="${ink}" text-anchor="middle" font-family="monospace">TESTING</text>
    </svg>`,
    // Beat 3: Launch
    `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <rect fill="${bg}" width="400" height="300"/>
      <polygon points="200,30 260,120 140,120" fill="${red}"/>
      <rect x="170" y="120" width="60" height="100" fill="${ink}"/>
      <circle cx="200" cy="260" r="30" fill="none" stroke="${red}" stroke-width="6"/>
      <circle cx="200" cy="260" r="15" fill="${red}"/>
    </svg>`
  ];

  return scenes[Math.min(beat, scenes.length - 1)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { node_hash, ticket, beat, choice, prompt } = await req.json();

    if (!node_hash || !ticket) {
      return new Response(JSON.stringify({ error: "node_hash and ticket required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache first
    const { data: cached } = await supabase
      .from("scene_cache")
      .select("svg")
      .eq("node_hash", node_hash)
      .single();

    if (cached?.svg) {
      return new Response(JSON.stringify({
        success: true,
        svg: cached.svg,
        cached: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let svg: string;
    let source = "generated";

    // Try Claude Haiku for fast generation
    const anthropicKey = Deno.env.get("CLAUDE") || Deno.env.get("ANTHROPIC_API_KEY");

    if (anthropicKey) {
      try {
        const scenePrompt = prompt || buildScenePrompt(ticket, beat || 0, choice);

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001", // Fast model for scene generation
            max_tokens: 1500,
            messages: [{
              role: "user",
              content: scenePrompt,
            }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.content?.[0];

          if (content?.type === "text") {
            const sanitized = sanitizeSVG(content.text);
            if (sanitized) {
              svg = sanitized;
            } else {
              throw new Error("Invalid SVG response");
            }
          } else {
            throw new Error("No text content in response");
          }
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      } catch (err) {
        console.error("Claude API error:", err);
        // Fallback to geometric
        const seed = parseInt(node_hash.replace(/\D/g, '').slice(0, 8) || '12345', 10);
        svg = geometricFallback(beat || 0, seed);
        source = "fallback";
      }
    } else {
      // No API key - geometric fallback
      const seed = parseInt(node_hash.replace(/\D/g, '').slice(0, 8) || '12345', 10);
      svg = geometricFallback(beat || 0, seed);
      source = "fallback";
    }

    // Cache the result
    await supabase
      .from("scene_cache")
      .upsert({
        node_hash,
        svg,
        created_at: new Date().toISOString(),
        ticket_subject: ticket.subject,
        ticket_predicate: ticket.predicate,
        ticket_object: ticket.object,
        beat,
        choice,
      }, { onConflict: 'node_hash' });

    return new Response(JSON.stringify({
      success: true,
      svg,
      source,
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
