// mint-card: deterministic minting at case submission. Plan 4.2 to 4.4.
// Invoked by the UCAR case-submission function post-commit (never blocking
// the registry write), and by scripts/backfill_mint.ts. Idempotent.
// INVARIANT: reads registry, writes only EBL tables (cards, card_events).

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  ECONOMY, derivePower, deriveRarity, deriveFaction,
} from "../../../config/economy.ts";
import { corsHeaders } from "../_shared/utils.ts";

const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const FLAG = Deno.env.get("FLAG_MINT_V2") === "on";

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Deterministic weighted background pick (4.4): same case, same background.
export function pickBackground(
  seedHex: string, rows: { id: number; storage_path: string; weight: number }[],
): string {
  const total = rows.reduce((s, r) => s + r.weight, 0);
  let n = parseInt(seedHex.slice(0, 8), 16) % total;
  for (const r of rows) { n -= r.weight; if (n < 0) return r.storage_path; }
  return rows[rows.length - 1].storage_path;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!FLAG) return json(503, { error: "minting disabled" });
  // Internal-only: called service-to-service.
  if (req.headers.get("x-internal-key") !== Deno.env.get("INTERNAL_KEY")) {
    return json(403, { error: "forbidden" });
  }
  const { case_id } = await req.json();

  // Idempotency: skip if already minted (unique case_id also guards races).
  const { data: existing } = await supa.from("cards").select("id").eq("case_id", case_id).maybeSingle();
  if (existing) return json(200, { card_id: existing.id, skipped: true });

  // Read from use_cases_with_votes view which provides good_votes/evil_votes
  // Falls back to use_cases if view doesn't exist
  let uc;
  const { data: ucView, error: viewErr } = await supa.from("use_cases_with_votes")
    .select("id,title,category,impact,good_votes,evil_votes,source_url,status")
    .eq("id", case_id).single();

  if (viewErr || !ucView) {
    // Fallback to base table with default votes
    const { data: ucBase, error: baseErr } = await supa.from("use_cases")
      .select("id,title,category,impact,status")
      .eq("id", case_id).single();
    if (baseErr || !ucBase) return json(404, { error: "case not found" });
    uc = { ...ucBase, good_votes: 0, evil_votes: 0, source_url: "" };
  } else {
    uc = ucView;
  }

  // Allow minting for 'active' status (our schema) or 'approved' (Part 2 expects)
  if (uc.status !== "active" && uc.status !== "approved") {
    return json(409, { error: "case not active/approved" });
  }

  const seed = await sha256hex(case_id);
  const { data: bgs } = await supa.from("backgrounds").select("id,storage_path,weight").eq("active", true);
  const background = pickBackground(seed, bgs ?? [{ id: 0, storage_path: "backgrounds/fallback_black.png", weight: 1 }]);

  const good = uc.good_votes ?? 0, evil = uc.evil_votes ?? 0;
  const faction = deriveFaction(good, evil);
  const impact = uc.impact ?? 3; // Default to 3 if not set
  const card = {
    case_id, name: uc.title, category: uc.category ?? "uncategorized", impact,
    power: derivePower(impact), rarity: deriveRarity(impact),
    faction, alignment_ratio: good / Math.max(good + evil, 1),
    art_seed: seed, source_url: uc.source_url ?? "",
    // Art render: call the EXISTING repo SVG renderer here, rasterize to PNG,
    // upload to storage://cards/{id}.png. Adapter documented in README section
    // "Renderer integration". Until wired, art_url points at the SVG endpoint.
    art_url: `cards/pending_${seed.slice(0, 12)}.png`,
  };
  const { data: inserted, error: iErr } = await supa.from("cards").insert(card).select().single();
  if (iErr) {
    // Race on unique(case_id): treat as success.
    const { data: raced } = await supa.from("cards").select("id").eq("case_id", case_id).single();
    return json(200, { card_id: raced?.id, skipped: true });
  }
  await supa.from("card_events").insert({
    card_id: inserted.id, type: "minted",
    payload: { faction, background, seed: seed.slice(0, 12) },
  });
  return json(200, { card_id: inserted.id, faction, background });
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
