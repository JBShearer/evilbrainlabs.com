// Edge Function: track_engagement
// Fire-and-forget engagement signal collection
// Used for pattern discovery and effectiveness scoring

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EngagementRequest {
  session_id: string;
  user_id?: string;
  triple_hash: string;
  beat: number;
  choice_id: string;
  time_to_choose_ms: number;
  choices_presented: string[];
  hover_sequence?: string[];
  hp_before?: number;
  hp_after?: number;
  item_received?: string;
  encounter_triggered?: boolean;
  patterns_shown?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: EngagementRequest = await req.json();

    // Validate required fields
    if (!data.session_id || !data.triple_hash || data.beat === undefined || !data.choice_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert engagement record
    const { error } = await supabase
      .from("user_choices")
      .insert({
        session_id: data.session_id,
        user_id: data.user_id || null,
        triple_hash: data.triple_hash,
        beat: data.beat,
        choice_id: data.choice_id,
        time_to_choose_ms: data.time_to_choose_ms,
        choices_presented: data.choices_presented,
        hover_sequence: data.hover_sequence || null,
        hp_before: data.hp_before,
        hp_after: data.hp_after,
        item_received: data.item_received || null,
        encounter_triggered: data.encounter_triggered || false,
        joke_patterns_shown: data.patterns_shown || null
      });

    if (error) {
      console.error("Insert error:", error);
      // Don't fail the request - engagement tracking is non-critical
    }

    // Update pattern effectiveness if patterns were shown
    if (data.patterns_shown?.length && data.time_to_choose_ms) {
      // Calculate engagement score from hesitation
      const engagementScore = hesitationToScore(data.time_to_choose_ms);

      // Update each pattern's stats (fire-and-forget)
      for (const patternId of data.patterns_shown) {
        supabase.rpc("update_pattern_stats", {
          p_pattern_id: patternId,
          p_engagement_score: engagementScore
        }).catch(e => console.error("Pattern update failed:", e));
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    // Return success anyway - don't let tracking failures affect gameplay
    return new Response(JSON.stringify({ success: true, note: "partial" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function hesitationToScore(ms: number): number {
  const seconds = ms / 1000;

  if (seconds < 1) return 0.2;
  if (seconds < 2) return 0.5;
  if (seconds < 4) return 0.9;
  if (seconds < 8) return 1.0;
  if (seconds < 12) return 0.7;
  if (seconds < 20) return 0.4;
  return 0.1;
}
