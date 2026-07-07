// sync-alignment: nightly faction flip check. Plan 4.3.
// Stats never change on flip. Only faction and frame. Hysteresis: 0.05.

import { createClient } from "npm:@supabase/supabase-js@2";
import { factionFlip } from "../../../config/economy.ts";
import { corsHeaders } from "../_shared/utils.ts";

const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.headers.get("x-cron-key") !== Deno.env.get("CRON_KEY")) {
    return json(403, { error: "forbidden" });
  }

  const { data: cards } = await supa.from("cards").select("id, case_id, faction");
  let flips = 0;

  for (const card of cards ?? []) {
    // Try to get votes from view first, fall back to base table
    let good = 0, evil = 0;
    const { data: ucView } = await supa.from("use_cases_with_votes")
      .select("good_votes, evil_votes").eq("id", card.case_id).single();

    if (ucView) {
      good = ucView.good_votes ?? 0;
      evil = ucView.evil_votes ?? 0;
    } else {
      // Fallback: count from case_votes table if view doesn't exist
      const { count: goodCount } = await supa.from("case_votes")
        .select("id", { count: "exact", head: true })
        .eq("case_id", card.case_id).eq("vote_type", "good");
      const { count: evilCount } = await supa.from("case_votes")
        .select("id", { count: "exact", head: true })
        .eq("case_id", card.case_id).eq("vote_type", "evil");
      good = goodCount ?? 0;
      evil = evilCount ?? 0;
    }

    const next = factionFlip(card.faction as "heaven" | "hell", good, evil);
    const ratio = good / Math.max(good + evil, 1);

    // Always update alignment_ratio
    await supa.from("cards").update({ alignment_ratio: ratio }).eq("id", card.id);

    if (next) {
      flips++;
      await supa.from("cards").update({
        faction: next, faction_flipped_at: new Date().toISOString(),
      }).eq("id", card.id);
      await supa.from("card_events").insert({
        card_id: card.id, type: "faction_flipped",
        payload: { from: card.faction, to: next, ratio },
      });
      // Story chapter 5 hook: owners of instances of a flipped card.
      const { data: owners } = await supa.from("card_instances")
        .select("owner_id").eq("card_id", card.id).not("owner_id", "is", null);
      for (const o of new Set((owners ?? []).map((r) => r.owner_id))) {
        await supa.functions.invoke("quests", {
          body: { user_id: o, event: "card_flipped_owned" },
        }).catch(() => {});
      }
    }
  }
  return json(200, { checked: cards?.length ?? 0, flips });
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
