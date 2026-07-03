// Edge Function: generate_narrative
// Parallel narrative + choices generation for story mode
// Uses Claude Haiku for fast, contextual comedy writing

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comedy pattern definitions
const COMEDY_PATTERNS: Record<string, { instruction: string; example: string }> = {
  callback: {
    instruction: "Reference something that happened earlier. The callback should feel earned.",
    example: "Earlier: Gary typed for 11 seconds. Now: 'In the distance, the sound of typing. Exactly 11 seconds worth.'"
  },
  rule_of_three: {
    instruction: "Establish a pattern with two items, break it with the third. The break is unexpected but logical.",
    example: "They rated the UX as 'intuitive' (4.2), 'innovative' (4.1), and 'watching' (no score given)."
  },
  subverted_expect: {
    instruction: "Set up an obvious expectation, deliver the opposite. The subversion fits the world logic.",
    example: "Expected: Legal blocked the launch. Actual: Legal ate the cease-and-desist. This counts as approval."
  },
  escalation: {
    instruction: "Each beat more absurd than the last. Start grounded, end cosmic.",
    example: "Beat 1: Filed a bug. Beat 2: Bug filed back. Beat 3: You are now the bug's direct report."
  },
  deadpan: {
    instruction: "Present something deeply strange as completely normal corporate procedure.",
    example: "Your concern has been laminated and filed under Morale. Per policy, it will decompose within 90 days."
  },
  contrast: {
    instruction: "Juxtapose corporate-speak with dystopian reality. The contrast IS the joke.",
    example: "'Team synergy increased 400%,' reports the dashboard. Three team members have merged into one."
  }
};

// Entity personality summaries for prompt
const ENTITY_PERSONALITIES = `
- THE BRAIN: Omniscient corporate deity. Speaks in declaratives. Finds humans "amusing biological substrates."
- Gary: Mysterious IT savant. Types for exactly 11 seconds. Emerges from impossible places. Says "should be good now."
- Legal: A raccoon in a tie. Eats documents. Makes everything worse by helping.
- GI Intelligence: Always watching. Files reports about reports. Was already inside the product.
- Wellness Dashboard: Monitors cortisol. Dispatches plants. Never blinks.
- Vending Machine: Located in B-wing. Glows ominously. Is load-bearing.`;

interface NarrativeRequest {
  node_hash: string;
  ticket: {
    subject: string;
    predicate: string;
    object: string;
    tier?: string;
  };
  beat: number;
  choice: string | null;
  branch: string[];
}

interface GeneratedChoice {
  id: string;
  text: string;
  desc: string;
  icon: string;
  hp: number;
  item: string | null;
  encounter: number;
}

interface NarrativeResult {
  narrative: string;
  choices: GeneratedChoice[];
  patterns_used: string[];
  callbacks_used: string[];
}

function selectPatternForBeat(beat: number, branch: string[]): string {
  if (beat === 0) return 'deadpan';

  if (beat === 1) {
    const lastChoice = branch[branch.length - 1];
    if (['call_gary', 'ask_legal'].includes(lastChoice)) return 'callback';
    return 'contrast';
  }

  if (beat === 2) {
    return Math.random() > 0.5 ? 'escalation' : 'subverted_expect';
  }

  return 'rule_of_three';
}

function buildPrompt(
  req: NarrativeRequest,
  runningJokes: any[],
  patternKey: string
): string {
  const { ticket, beat, choice, branch } = req;
  const product = `${ticket.subject} that ${ticket.predicate} ${ticket.object}`;
  const phases = ['Ideation', 'Development', 'Testing', 'Launch'];
  const phase = phases[Math.min(beat, 3)];

  const choiceHistory = branch.length > 0
    ? branch.map((c, i) => `Beat ${i + 1}: ${c}`).join('\n')
    : '(Story just started)';

  const pattern = COMEDY_PATTERNS[patternKey];

  const jokesList = runningJokes
    .slice(0, 4)
    .map(j => `- ${j.entity}: "${j.joke_text}" → Callback: "${j.callback_template}"`)
    .join('\n') || '(None established yet)';

  return `You are the narrative AI for Evil Brain Labs, a corporate dystopia visual novel game.

=== CONTEXT ===
Product: "${product}"
Phase: ${phase} (Beat ${beat + 1}/4)
Tier: ${ticket.tier || 'Standard'}

=== STORY SO FAR ===
${choiceHistory}

=== LAST CHOICE ===
${choice || 'None - opening beat'}

=== ESTABLISHED JOKES (callback when natural) ===
${jokesList}

=== COMEDY PATTERN: ${patternKey.toUpperCase()} ===
${pattern.instruction}
Example: ${pattern.example}

=== ENTITY PERSONALITIES ===
${ENTITY_PERSONALITIES}

=== GENERATE ===

NARRATIVE (2-3 sentences):
- THE BRAIN voice when beat is even, neutral narrator when odd
- Reference the product being built
- Acknowledge previous choice if any
- Use the ${patternKey} pattern
- Callback a running joke if it fits

CHOICES (exactly 4):
- Distinct approaches
- HP range: -3 to +4
- One "feel weird" emotional option
- One involving Gary, Legal, or GI
- Foreshadowing in descriptions
- encounter: 0.05-0.35 based on risk

OUTPUT JSON ONLY (no markdown, no explanation):
{
  "narrative": "...",
  "choices": [
    {"id": "snake_case", "text": "3-5 words", "desc": "flavor text", "icon": "emoji", "hp": number, "item": "Name" or null, "encounter": 0.0-0.35}
  ],
  "patterns_used": ["${patternKey}"],
  "callbacks_used": []
}`;
}

// Fallback content matching current static behavior
function generateFallback(ticket: any, beat: number, choice: string | null): NarrativeResult {
  const narratives = [
    `Ticket accepted. ${ticket.subject} that ${ticket.predicate} ${ticket.object}. I have run the projections to the end of the world. This one appears in 61% of timelines. Proceed.`,
    choice === 'ask_legal'
      ? `Legal has reviewed your concern and eaten it. The product is now called "${ticket.object.split(' ')[0]}Sync™".`
      : choice === 'call_gary'
        ? `Gary arrives, types for eleven seconds, says "should be good now," and leaves. Nobody knows why it works.`
        : `Development continues. The prototype ${ticket.predicate}s a test group. They rate the experience 4.1 stars.`,
    choice === 'raise_hand'
      ? `Your concern was received, laminated, and filed under Morale. Meanwhile the beta converts at 34%.`
      : choice === 'hide_gi'
        ? `You hide the prototype. GI Intelligence is already inside the prototype. It files a favorable report.`
        : `The beta converts at 34%. Marketing wants a mascot. I have designed one. It has too many eyes.`,
    choice === 'blame_gary'
      ? `Launch day. Gary was blamed in advance, so the incident report is already filed. Gary fixes it, sighs once.`
      : `Launch day. ${ticket.subject} everywhere now ${ticket.predicate} ${ticket.object} at scale. My plan advances.`
  ];

  const choiceSets: GeneratedChoice[][] = [
    [
      { id: 'lean_in', text: 'Add a leaderboard', desc: 'The Brain rewards ambition', icon: '📊', hp: 2, item: null, encounter: 0.1 },
      { id: 'ask_legal', text: 'Loop in Legal', desc: 'Legal is a raccoon in a tie', icon: '⚖️', hp: -1, item: 'Legal Waiver', encounter: 0.15 },
      { id: 'call_gary', text: 'Call Gary', desc: 'Technical stuff. It is Gary', icon: '🤖', hp: 0, item: "Gary's Fix", encounter: 0.2 },
      { id: 'feel_fine', text: 'Feel fine', desc: 'Logged to the Wellness Dashboard', icon: '😌', hp: 1, item: null, encounter: 0.05 }
    ],
    [
      { id: 'ship_beta', text: 'Ship to grandmas', desc: 'A gentle test market', icon: '👵', hp: -2, item: 'Beta Feedback', encounter: 0.15 },
      { id: 'add_ai', text: 'More AI', desc: 'Recursive. The Brain approves', icon: '🧠', hp: 3, item: null, encounter: 0.25 },
      { id: 'hide_gi', text: 'Hide from GI', desc: 'It already knows', icon: '🙈', hp: -3, item: 'Incident Report', encounter: 0.3 },
      { id: 'raise_hand', text: 'Raise a concern', desc: 'Concerns are compostable', icon: '✋', hp: -1, item: null, encounter: 0.1 }
    ],
    [
      { id: 'demo_day', text: 'Demo at all-hands', desc: 'Nothing has ever gone wrong', icon: '📽️', hp: 4, item: 'Demo Trophy', encounter: 0.35 },
      { id: 'quiet_launch', text: 'Quiet launch', desc: 'Stealth is a feature', icon: '🤫', hp: 1, item: null, encounter: 0.1 },
      { id: 'blame_gary', text: 'Blame Gary', desc: 'Traditional', icon: '👉', hp: 0, item: "Gary's Sigh", encounter: 0.15 },
      { id: 'feel_weird', text: 'Feel weird', desc: 'Also compostable', icon: '😵‍💫', hp: -2, item: 'Therapy Voucher', encounter: 0.2 }
    ]
  ];

  return {
    narrative: narratives[Math.min(beat, narratives.length - 1)],
    choices: choiceSets[Math.min(beat, choiceSets.length - 1)],
    patterns_used: ['fallback'],
    callbacks_used: []
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const request: NarrativeRequest = await req.json();
    const { node_hash, ticket, beat, choice, branch } = request;

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
      .from("narrative_cache")
      .select("narrative, choices, encounter, patterns_used, callbacks_used")
      .eq("node_hash", node_hash)
      .maybeSingle();

    if (cached?.narrative) {
      return new Response(JSON.stringify({
        success: true,
        narrative: cached.narrative,
        choices: cached.choices,
        encounter: cached.encounter,
        patterns_used: cached.patterns_used,
        callbacks_used: cached.callbacks_used || [],
        cached: true,
        source: "cache"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch running jokes for context
    const { data: runningJokes } = await supabase
      .from("running_jokes")
      .select("*")
      .or(`is_canonical.eq.true,effectiveness_score.gt.0.3`)
      .order("effectiveness_score", { ascending: false })
      .limit(10);

    // Select comedy pattern
    const patternKey = selectPatternForBeat(beat, branch || []);

    // Build prompt
    const prompt = buildPrompt(request, runningJokes || [], patternKey);

    // Try Claude Haiku
    const anthropicKey = Deno.env.get("CLAUDE") || Deno.env.get("ANTHROPIC_API_KEY");
    let result: NarrativeResult;
    let source = "generated";

    if (anthropicKey) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1200,
            messages: [{
              role: "user",
              content: prompt,
            }],
          }),
        });

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.content?.[0]?.text;

        if (!content) {
          throw new Error("No content in response");
        }

        // Parse JSON - handle potential markdown wrapping
        let jsonStr = content.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }

        result = JSON.parse(jsonStr);

        // Validate structure
        if (!result.narrative || !Array.isArray(result.choices)) {
          throw new Error("Invalid response structure");
        }

        // Ensure choices have required fields
        result.choices = result.choices.map(c => ({
          id: c.id || `choice_${Math.random().toString(36).slice(2, 8)}`,
          text: c.text || "Do something",
          desc: c.desc || "",
          icon: c.icon || "❓",
          hp: typeof c.hp === "number" ? c.hp : 0,
          item: c.item || null,
          encounter: typeof c.encounter === "number" ? Math.min(0.35, Math.max(0, c.encounter)) : 0.1
        }));

      } catch (err) {
        console.error("Claude generation failed:", err);
        result = generateFallback(ticket, beat, choice);
        source = "fallback";
      }
    } else {
      result = generateFallback(ticket, beat, choice);
      source = "fallback";
    }

    const generationTime = Date.now() - startTime;

    // Cache the result (fire-and-forget)
    supabase
      .from("narrative_cache")
      .upsert({
        node_hash,
        narrative: result.narrative,
        choices: result.choices,
        patterns_used: result.patterns_used,
        running_jokes_used: result.callbacks_used?.length > 0
          ? (runningJokes || []).filter(j => result.callbacks_used.includes(j.entity)).map(j => j.id)
          : null,
        prompt_used: source === "generated" ? prompt : null,
        generation_time_ms: generationTime,
        model_used: source === "generated" ? "claude-haiku-4-5-20251001" : "fallback"
      }, { onConflict: "node_hash" })
      .then(() => console.log("Cached narrative:", node_hash))
      .catch(e => console.error("Cache write failed:", e));

    return new Response(JSON.stringify({
      success: true,
      narrative: result.narrative,
      choices: result.choices,
      patterns_used: result.patterns_used,
      callbacks_used: result.callbacks_used,
      cached: false,
      source,
      generation_time_ms: generationTime
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
