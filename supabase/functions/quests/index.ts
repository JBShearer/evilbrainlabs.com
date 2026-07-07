// quests: progress tracking, reward claims, scratch issuance and reveal.
// Plan section 8. Actions: event | claim | scratch | list
// INVARIANT: scratch prize decided AT ISSUANCE. The animation is theater.

import { createClient } from "npm:@supabase/supabase-js@2";
import { ECONOMY } from "../../../config/economy.ts";
import { corsHeaders } from "../_shared/utils.ts";

const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const FLAG_QUESTS = Deno.env.get("FLAG_QUESTS") === "on";
const FLAG_SCRATCH = Deno.env.get("FLAG_SCRATCH") === "on";

const EPOCH = "1970-01-01";
function today(): string { return new Date().toISOString().slice(0, 10); }

// ---------- progress ----------
async function recordEvent(userId: string, event: string) {
  const { data: defs } = await supa.from("quest_defs").select("*").eq("active", true);
  for (const q of defs ?? []) {
    if (q.trigger?.event !== event) continue;
    // Story gating: chapter N requires chapter N-1 claimed (8.2).
    if (q.kind === "story" && q.chapter > 1) {
      const { data: prev } = await supa.from("quest_progress")
        .select("claimed_at").eq("user_id", userId)
        .eq("quest_id", `story_ch${q.chapter - 1}`).eq("period", EPOCH).maybeSingle();
      if (!prev?.claimed_at) continue;
    }
    const period = q.kind === "daily" ? today() : EPOCH;
    const { data: row } = await supa.from("quest_progress")
      .upsert({ user_id: userId, quest_id: q.id, period },
        { onConflict: "user_id,quest_id,period", ignoreDuplicates: true })
      .select().maybeSingle();
    const { data: current } = await supa.from("quest_progress").select("*")
      .eq("user_id", userId).eq("quest_id", q.id).eq("period", period).single();
    if (current.completed_at) continue;
    const progress = current.progress + 1;
    const done = progress >= (q.trigger.count ?? 1);
    await supa.from("quest_progress").update({
      progress, ...(done ? { completed_at: new Date().toISOString() } : {}),
    }).eq("user_id", userId).eq("quest_id", q.id).eq("period", period);
  }
}

// ---------- claim reward ----------
async function claimReward(userId: string, questId: string, period: string) {
  const { data: q } = await supa.from("quest_defs").select("*").eq("id", questId).single();
  if (!q) return json(404, { error: "unknown quest" });
  const p = q.kind === "daily" ? period : EPOCH;
  const { data: row } = await supa.from("quest_progress").select("*")
    .eq("user_id", userId).eq("quest_id", questId).eq("period", p).single();
  if (!row?.completed_at) return json(409, { error: "not completed" });
  if (row.claimed_at) return json(409, { error: "already claimed" });
  // Daily grace: claimable for 24h after the period day ends (8.2).
  if (q.kind === "daily") {
    const cutoff = new Date(p + "T00:00:00Z");
    cutoff.setUTCHours(24 + ECONOMY.DAILY_GRACE_HOURS);
    if (new Date() > cutoff) return json(409, { error: "claim window closed" });
  }
  const { data: locked } = await supa.from("quest_progress")
    .update({ claimed_at: new Date().toISOString() })
    .eq("user_id", userId).eq("quest_id", questId).eq("period", p)
    .is("claimed_at", null).select();
  if (!locked?.length) return json(409, { error: "already claimed" }); // race guard

  const reward = q.reward ?? {};
  if (reward.bc) await supa.rpc("wallet_credit", { p_user: userId, p_amount: reward.bc });
  const tickets: string[] = [];
  for (let i = 0; i < (reward.scratch ?? 0); i++) {
    const t = await issueTicket(userId);
    if (t) tickets.push(t);
  }
  return json(200, { bc: reward.bc ?? 0, tickets });
}

// ---------- scratch (8.2): prize decided at issuance ----------
async function issueTicket(userId: string): Promise<string | null> {
  // Weekly cap, server enforced.
  const weekStart = isoWeekStart(new Date());
  const { count } = await supa.from("scratch_tickets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId).gte("issued_at", weekStart.toISOString());
  if ((count ?? 0) >= ECONOMY.SCRATCH_WEEKLY_CAP) return null;

  const prize = await rollPrize();
  const { data } = await supa.from("scratch_tickets")
    .insert({ user_id: userId, prize }).select().single();
  return data?.id ?? null;
}

async function rollPrize(): Promise<Record<string, unknown>> {
  const r = crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff;
  const o = ECONOMY.SCRATCH_ODDS;
  if (r < o.coins) {
    const span = ECONOMY.SCRATCH_COIN_MAX - ECONOMY.SCRATCH_COIN_MIN;
    const r2 = crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff;
    return { type: "coins", amount: ECONOMY.SCRATCH_COIN_MIN + Math.floor(r2 * (span + 1)) };
  }
  if (r < o.coins + o.common) return { type: "card", tier: "common", maxImpact: 3, foil: "none" };
  if (r < o.coins + o.common + o.rare) return { type: "card", tier: "rare", impact: 4, foil: "none" };
  return { type: "card", tier: "legendary", impact: 5, foil: "holo" };
}

async function scratchTicket(userId: string, ticketId: string) {
  if (!FLAG_SCRATCH) return json(503, { error: "scratch disabled" });
  // Idempotent reveal: set scratched_at only if null, apply prize once.
  const { data: t } = await supa.from("scratch_tickets")
    .update({ scratched_at: new Date().toISOString() })
    .eq("id", ticketId).eq("user_id", userId).is("scratched_at", null)
    .select().maybeSingle();
  if (!t) return json(409, { error: "already scratched or not yours" });

  const prize = t.prize as Record<string, unknown>;
  if (prize.type === "coins") {
    await supa.rpc("wallet_credit", { p_user: userId, p_amount: prize.amount });
  } else {
    // Mint an instance: random eligible card, next serial, source 'scratch'.
    let q = supa.from("cards").select("id");
    if (prize.maxImpact) q = q.lte("impact", prize.maxImpact as number);
    if (prize.impact) q = q.eq("impact", prize.impact as number);
    const { data: pool } = await q;
    if (pool?.length) {
      const pick = pool[Math.floor(
        (crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff) * pool.length
      ) % pool.length];
      const { data: top } = await supa.from("card_instances").select("serial")
        .eq("card_id", pick.id).order("serial", { ascending: false }).limit(1);
      await supa.from("card_instances").insert({
        card_id: pick.id, owner_id: userId, serial: (top?.[0]?.serial ?? 0) + 1,
        foil: (prize.foil as string) ?? "none", source: "scratch",
      });
      prize.card_id = pick.id;
    } else {
      // Empty pool fallback: coins at max.
      await supa.rpc("wallet_credit", { p_user: userId, p_amount: ECONOMY.SCRATCH_COIN_MAX });
      prize.fallback = "coins";
    }
  }
  return json(200, { prize });
}

function isoWeekStart(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() - day + 1);
  return x;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!FLAG_QUESTS) return json(503, { error: "quests disabled" });
  const body = await req.json().catch(() => ({}));
  const action = new URL(req.url).searchParams.get("action") ?? "event";

  // Internal event path (from other functions, service key implied by invoke).
  if (action === "event" && body.user_id && body.event) {
    await recordEvent(body.user_id, body.event);
    return json(200, { ok: true });
  }
  // User-facing paths need auth.
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  const { data: auth } = await supa.auth.getUser(jwt ?? "");
  const userId = auth.user?.id;
  if (!userId) return json(401, { error: "auth required" });

  switch (action) {
    case "claim": return await claimReward(userId, body.quest_id, body.period ?? today());
    case "scratch": return await scratchTicket(userId, body.ticket_id);
    case "list": {
      const { data: defs } = await supa.from("quest_defs").select("*").eq("active", true);
      const { data: prog } = await supa.from("quest_progress").select("*")
        .eq("user_id", userId).in("period", [today(), EPOCH]);
      return json(200, { quests: defs, progress: prog });
    }
    default: return json(400, { error: "unknown action" });
  }
});
