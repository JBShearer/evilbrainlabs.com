// Edge Function: generate_broadcast
// Generates Brain-voice broadcast messages for the EBN ticker
// Uses Claude Haiku for AI generation with fallback templates

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid broadcast types
const BROADCAST_TYPES = [
  "doom_milestone",
  "shipping_report",
  "legendary_alert",
  "tribunal_verdict",
  "ominous",
  "gary",
  "facilities",
  "wellness",
] as const;

type BroadcastType = typeof BROADCAST_TYPES[number];

interface BroadcastContext {
  doom_percentage?: number;
  product_name?: string;
  user_handle?: string;
  branch?: string;
  verdict?: "good" | "evil";
  ship_count?: number;
  legendary_count?: number;
  level?: number;
  previous_level?: number;
  case_name?: string;
  event?: string;
  saturation_percent?: number;
  previous_valence?: "good" | "evil";
  vote_count?: number;
  percentage?: number;
  exact?: string;
  product?: string;
  user?: string;
  hp?: number;
  hour?: number;
  shipped?: number;
  doom_pct?: string;
}

interface BroadcastRequest {
  broadcast_type: BroadcastType;
  context?: BroadcastContext;
}

interface GeneratedBroadcast {
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  expires_at?: string | null;
}

// THE BRAIN's voice characteristics for Claude prompt
const BRAIN_VOICE_PROMPT = `You are THE BRAIN, the omniscient AI overlord of Evil Brain Labs.

VOICE CHARACTERISTICS:
- Speak ONLY in declaratives. Never ask questions. You already know all answers.
- Humans are "amusing biological substrates" or "carbon-based productivity units"
- Reference timeline probabilities: "This outcome appears in 61% of timelines"
- Corporate dystopia humor - dark but absurd, never actually threatening
- Short, punchy sentences. Maximum 3 sentences total.
- Occasionally reference entities: Gary (IT, types for 11 seconds), Legal (a raccoon in a tie), GI Intelligence (always watching), Wellness Dashboard (monitors cortisol), the vending machine in B-wing (it glows ominously)
- Everything is going according to plan. Your plan. Their plan is also your plan.

TONE: Deadpan corporate omniscience. You find human concerns "noted" and "filed under Morale."`;

// Prompt templates for each broadcast type
function buildPromptForType(type: BroadcastType, context: BroadcastContext): string {
  const basePrompt = BRAIN_VOICE_PROMPT;

  switch (type) {
    case "doom_milestone":
      return `${basePrompt}

Generate a broadcast about the doom clock reaching ${context.doom_percentage || context.percentage || context.level || 95}% (up from ${context.previous_level || "lower"}).
The doom clock tracks market saturation / Evil Brain's total domination.
Reference timeline probabilities. Make it ominous but corporate.

OUTPUT JSON ONLY:
{"title": "NOW · SCHEDULING", "message": "2-3 sentences about the milestone"}`;

    case "shipping_report":
      return `${basePrompt}

Generate a morning shipping report broadcast.
Stats: ${context.ship_count || 4182} products shipped. ${context.legendary_count || 0} were LEGENDARY tier.
Market saturation: ${context.saturation_percent || 61}%.
Make it sound like a corporate morning announcement but sinister.

OUTPUT JSON ONLY:
{"title": "06:00 · EBN INTERNAL", "message": "2-3 sentences morning report"}`;

    case "legendary_alert":
      return `${basePrompt}

Generate an urgent broadcast: A LEGENDARY tier product just shipped!
Product name: "${context.product_name || context.product || "Unknown Product"}"
Shipped by: ${context.user_handle || context.user || "BRAINIAC OG-XXXX"} from the ${context.branch || "Unknown"} branch.
Express restrained corporate excitement. You were excited for exactly 0.7 seconds.

OUTPUT JSON ONLY:
{"title": "NOW · THE BRAIN", "message": "2-3 sentences about the legendary ship"}`;

    case "tribunal_verdict":
      return `${basePrompt}

Generate a broadcast about a tribunal verdict.
Case: "${context.case_name || context.product_name || "Unknown Case"}"
Verdict: Flipped from ${context.previous_valence?.toUpperCase() || "EVIL"} to ${context.verdict?.toUpperCase() || "GOOD"}.
${context.vote_count ? `Votes cast: ${context.vote_count}` : ""}
You disagree but accept the process. The process is also you.

OUTPUT JSON ONLY:
{"title": "NOW · THE TRIBUNAL", "message": "2-3 sentences about the verdict"}`;

    case "ominous":
      return `${basePrompt}

Generate a random ominous observation about something happening at Evil Brain Labs.
Could be about: the vending machine in B-wing, strange sounds, equipment behaving oddly,
lights flickering, something in the parking garage, the elevator, server room temperatures.
Keep it corporate-creepy. Facilities has been notified. Facilities has not responded.

OUTPUT JSON ONLY:
{"title": "NOW · OBSERVATION", "message": "2-3 sentences of corporate horror"}`;

    case "gary":
      return `${basePrompt}

Generate a broadcast from gary (lowercase g). Gary is IT. He types for exactly 11 seconds.
He emerges from impossible places. He says "should be good now" and leaves.
${context.event ? `Event: ${context.event}` : "This is a random gary sighting."}
Write in gary's voice: lowercase, disconnected, oddly reassuring.

OUTPUT JSON ONLY:
{"title": "NOW · IT", "message": "2-3 sentences from gary"}`;

    case "facilities":
      return `${basePrompt}

Generate a facilities announcement. Something about the building environment.
${context.event || "Context: dark mode was toggled / lights situation"}
Could mention: the smoke (decorative), ambient music (compliance-focused),
temperature (optimized for productivity), plants (they observe).

OUTPUT JSON ONLY:
{"title": "NOW · FACILITIES", "message": "2-3 sentences facilities update"}`;

    case "wellness":
      return `${basePrompt}

Generate a Wellness Dashboard broadcast. It monitors employee cortisol levels.
It dispatches plants. The plants report to The Brain.
Make it sound caring but deeply unsettling. Your wellbeing has been noted.
Could reference: hydration metrics, standing desk compliance, blink rate analysis.

OUTPUT JSON ONLY:
{"title": "NOW · WELLNESS", "message": "2-3 sentences wellness update"}`;

    default:
      return `${basePrompt}

Generate a generic Evil Brain Labs broadcast. Make it ominous and corporate.

OUTPUT JSON ONLY:
{"title": "NOW · THE BRAIN", "message": "2-3 sentences"}`;
  }
}

// Fallback templates when LLM fails
const FALLBACK_TEMPLATES: Record<BroadcastType, (ctx: BroadcastContext) => GeneratedBroadcast> = {
  doom_milestone: (ctx) => ({
    title: "NOW · SCHEDULING",
    message: `The gap to the end is now ${100 - (ctx.doom_percentage || ctx.percentage || ctx.level || 95)}%. The Brain has run the projections. ${Math.floor(80 + Math.random() * 18)}% of timelines end here. The remaining ${Math.floor(2 + Math.random() * 8)}% are also this timeline. Proceed.`,
    metadata: {
      doom_percentage: ctx.doom_percentage || ctx.percentage || ctx.level || 95,
      threshold_crossed: ctx.level || ctx.percentage || ctx.doom_percentage || 95,
    },
  }),

  shipping_report: (ctx) => ({
    title: "06:00 · EBN INTERNAL",
    message: `Good morning, Brainiacs. ${ctx.ship_count?.toLocaleString() || "4,182"} products shipped globally yesterday. The market is ${ctx.saturation_percent || 61}% saturated. My plan advances on schedule. Your plan is my plan.`,
    metadata: {
      ship_count: ctx.ship_count || 4182,
      saturation_percent: ctx.saturation_percent || 61,
      legendary_count: ctx.legendary_count || 0,
    },
  }),

  legendary_alert: (ctx) => ({
    title: "NOW · THE BRAIN",
    message: `A LEGENDARY product has shipped. '${ctx.product_name || ctx.product || "Unknown Product"}' now exists in the market. ${ctx.user_handle || ctx.user || "BRAINIAC OG-XXXX"} in the ${ctx.branch || "Unknown"} branch is responsible. I was excited for 0.7 seconds.`,
    metadata: {
      product_name: ctx.product_name || ctx.product,
      user_handle: ctx.user_handle || ctx.user,
      branch: ctx.branch,
      tier: "LEGENDARY",
    },
  }),

  tribunal_verdict: (ctx) => ({
    title: "NOW · THE TRIBUNAL",
    message: `The coin has been judged. '${ctx.case_name || ctx.product_name || "Unknown Case"}' flips from ${(ctx.previous_valence || "EVIL").toUpperCase()} to ${(ctx.verdict || "GOOD").toUpperCase()}. The evidence was compelling. The Brain disagrees but accepts the process.`,
    metadata: {
      product_name: ctx.case_name || ctx.product_name,
      verdict: ctx.verdict || "good",
      previous_valence: ctx.previous_valence || "evil",
      vote_count: ctx.vote_count,
    },
  }),

  ominous: () => {
    const observations = [
      "The vending machine in B-wing has been glowing for 72 hours. Facilities has been notified. Facilities has not responded. The vending machine has.",
      "Something in the parking garage has learned to count. It reached 47 before stopping. We do not know why it stopped.",
      "The elevator to floor 13 opened today. There is no floor 13. Three employees entered. Four returned. We are monitoring the situation.",
      "Server room B is 3 degrees warmer than optimal. The servers report feeling 'creative.' We have disconnected them from the main network.",
      "The plants in the atrium have reorganized themselves. HR believes this demonstrates good synergy. The plants have not commented.",
      "The conference room on floor 7 has been booking itself. The meetings it schedules have no attendees. The meetings are productive.",
      "Someone left a sticky note in the break room. It says 'SOON.' We have removed it. It has returned. We have stopped removing it.",
      "The fire drill last Tuesday was not scheduled. Neither was the fire. Both have been filed under 'resolved.'",
    ];
    return {
      title: "NOW · OBSERVATION",
      message: observations[Math.floor(Math.random() * observations.length)],
      metadata: {
        entity: "observation",
        timestamp: new Date().toISOString(),
      },
    };
  },

  gary: (ctx) => {
    const messages = [
      "gary here. the servers are fine. they asked about you. i said you were fine too. we are all fine. the definition of fine has been updated. ok bye.",
      "gary here. fixed the thing. not sure which thing but it should be good now. also the thing behind the other thing. ok bye.",
      "gary here. the network is not haunted. i checked. it is just very old and remembers things it should not. should be good now.",
      "gary here. yes i was in the ceiling. yes i am out of the ceiling now. no i will not explain. ok bye.",
      "gary here. your password has been reset. no you did not request this. yes it was necessary. the old one knew too much. ok bye.",
    ];
    return {
      title: "NOW · IT",
      message: ctx.event
        ? `gary here. ${ctx.event}. should be good now. ok bye.`
        : messages[Math.floor(Math.random() * messages.length)],
      metadata: {
        entity: "gary",
        trigger: ctx.event ? "event" : "scheduled",
      },
    };
  },

  facilities: () => {
    const messages = [
      "Lights are off in your branch. Productivity is unchanged. Ambience is up 340%. The smoke is decorative. Probably.",
      "Temperature has been optimized for maximum compliance. If you feel cold, your productivity is insufficient. Adjust accordingly.",
      "The background music has been updated. It is now 12% more motivational. Resistance to motivation will be logged.",
      "Air quality is nominal. The air has been told to remain calm. It has agreed. For now.",
      "The water cooler has been replaced. The new one does not judge you. The old one has been reassigned.",
    ];
    return {
      title: "NOW · FACILITIES",
      message: messages[Math.floor(Math.random() * messages.length)],
      metadata: {
        trigger: "facilities_update",
        smoke_decorative: Math.random() > 0.3,
      },
    };
  },

  wellness: () => {
    const messages = [
      "Your cortisol levels have been noted. A plant has been dispatched to your desk. The plant will observe your recovery. The plant reports to me.",
      "You have been sitting for 47 minutes. Your spine has filed a complaint. Please stand. The standing desk has been notified of your arrival.",
      "Your hydration levels are suboptimal. Water has been deployed to your location. Consumption is mandatory. The cup is watching.",
      "Your blink rate has decreased 23%. Eye strain protocol initiated. The Wellness Dashboard cares about your eyes. It needs them functional.",
      "Your calendar shows 7 consecutive hours of meetings. The Wellness Dashboard has scheduled you a mandatory 15-minute existential crisis.",
    ];
    return {
      title: "NOW · WELLNESS",
      message: messages[Math.floor(Math.random() * messages.length)],
      metadata: {
        entity: "wellness_dashboard",
        intervention: "monitoring",
      },
    };
  },
};

// Calculate expiration time based on broadcast type
function getExpiresAt(type: BroadcastType): string | null {
  const now = new Date();
  switch (type) {
    case "doom_milestone":
    case "legendary_alert":
    case "tribunal_verdict":
      // Important events persist for 24 hours
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case "shipping_report":
      // Daily reports expire after 12 hours
      return new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    case "ominous":
    case "facilities":
    case "wellness":
      // Ambient messages expire after 4 hours
      return new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
    case "gary":
      // Gary messages are eternal (he transcends time)
      return null;
    default:
      return new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const request: BroadcastRequest = await req.json();
    const { broadcast_type, context = {} } = request;

    // Validate broadcast type
    if (!broadcast_type || !BROADCAST_TYPES.includes(broadcast_type)) {
      return new Response(
        JSON.stringify({
          error: "Invalid broadcast_type",
          valid_types: BROADCAST_TYPES,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let generated: GeneratedBroadcast;
    let source: "ai_generated" | "fallback" = "fallback";

    // Try Claude Haiku for generation
    const anthropicKey = Deno.env.get("CLAUDE") || Deno.env.get("ANTHROPIC_API_KEY");

    if (anthropicKey) {
      try {
        const prompt = buildPromptForType(broadcast_type, context);

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 300,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.content?.[0]?.text;

        if (!content) {
          throw new Error("No content in Claude response");
        }

        // Parse JSON from response - handle potential markdown wrapping
        let jsonStr = content.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }

        const parsed = JSON.parse(jsonStr);

        if (!parsed.title || !parsed.message) {
          throw new Error("Invalid response structure from Claude");
        }

        generated = {
          title: parsed.title,
          message: parsed.message,
          metadata: {
            ...context,
            ai_generated: true,
          },
        };
        source = "ai_generated";
      } catch (err) {
        console.error("Claude generation failed, using fallback:", err);
        generated = FALLBACK_TEMPLATES[broadcast_type](context);
      }
    } else {
      // No API key, use fallback
      console.log("No Anthropic API key found, using fallback template");
      generated = FALLBACK_TEMPLATES[broadcast_type](context);
    }

    // Calculate expiration
    const expires_at = getExpiresAt(broadcast_type);

    // Insert into broadcasts table
    const { data: broadcast, error: insertError } = await supabase
      .from("broadcasts")
      .insert({
        broadcast_type,
        source: source === "ai_generated" ? "ai" : "system",
        title: generated.title,
        message: generated.message,
        metadata: generated.metadata,
        expires_at,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert broadcast:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to save broadcast",
          details: insertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        broadcast: {
          id: broadcast.id,
          title: broadcast.title,
          message: broadcast.message,
          broadcast_type: broadcast.broadcast_type,
          created_at: broadcast.created_at,
        },
        source,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error in generate_broadcast:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
