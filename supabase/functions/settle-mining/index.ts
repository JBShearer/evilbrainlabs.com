// settle-mining: lazy settlement. Plan 5.2. Called on login, wallet view,
// claim, battle end, plus hourly cron. Idempotent by mined_through cursor.

import { createClient } from "npm:@supabase/supabase-js@2";
import { minedAmount, ECONOMY } from "../../../config/economy.ts";
import { corsHeaders } from "../_shared/utils.ts";

const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const FLAG = Deno.env.get("FLAG_PORTFOLIO") === "on";

async function settleUser(userId: string) {
  const { data: products } = await supa
    .from("products").select("*, cards!inner(impact)").eq("owner_id", userId);
  if (!products?.length) return { settled: 0 };
  const seats = products.length;
  const now = new Date();
  let total = 0;

  for (const p of products) {
    const from = new Date(p.mined_through);
    if (now.getTime() - from.getTime() < 60_000) continue; // sub-minute noise

    // Advance cursor FIRST with an optimistic lock so double settlement
    // for the same period is impossible even under concurrent calls.
    const { data: advanced } = await supa.from("products")
      .update({ mined_through: now.toISOString() })
      .eq("id", p.id).eq("mined_through", p.mined_through).select();
    if (!advanced?.length) continue; // someone else settled this period

    // Split period at siphon boundary if it ends mid-window.
    const segments: { start: Date; end: Date; siphoned: boolean }[] = [];
    const siphonEnd = p.siphon_until ? new Date(p.siphon_until) : null;
    if (siphonEnd && siphonEnd > from) {
      const cut = siphonEnd < now ? siphonEnd : now;
      segments.push({ start: from, end: cut, siphoned: true });
      if (cut < now) segments.push({ start: cut, end: now, siphoned: false });
    } else {
      segments.push({ start: from, end: now, siphoned: false });
    }

    for (const seg of segments) {
      const hours = (seg.end.getTime() - seg.start.getTime()) / 3600_000;
      const amount = minedAmount(p.cards.impact, seats, hours);
      if (amount <= 0) continue;
      const rows = [];
      if (seg.siphoned && p.siphon_rate > 0 && p.siphon_beneficiaries?.length) {
        const siphoned = amount * p.siphon_rate;
        const share = siphoned / p.siphon_beneficiaries.length;
        for (const raider of p.siphon_beneficiaries) {
          rows.push({ product_id: p.id, beneficiary_id: raider, amount: share,
            period_start: seg.start.toISOString(), period_end: seg.end.toISOString(), kind: "siphon" });
          await supa.rpc("wallet_credit", { p_user: raider, p_amount: share });
        }
        const kept = amount - siphoned;
        rows.push({ product_id: p.id, beneficiary_id: userId, amount: kept,
          period_start: seg.start.toISOString(), period_end: seg.end.toISOString(), kind: "mine" });
        await supa.rpc("wallet_credit", { p_user: userId, p_amount: kept });
        total += kept;
      } else {
        rows.push({ product_id: p.id, beneficiary_id: userId, amount,
          period_start: seg.start.toISOString(), period_end: seg.end.toISOString(), kind: "mine" });
        await supa.rpc("wallet_credit", { p_user: userId, p_amount: amount });
        total += amount;
      }
      await supa.from("mining_ledger").insert(rows);
    }
    // Expire finished siphons.
    if (siphonEnd && siphonEnd <= now) {
      await supa.from("products").update({
        siphon_rate: 0, siphon_until: null, siphon_beneficiaries: [],
      }).eq("id", p.id);
    }
  }
  return { settled: total };
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!FLAG) return json(503, { error: "disabled" });
  const url = new URL(req.url);
  if (url.searchParams.get("mode") === "cron") {
    if (req.headers.get("x-cron-key") !== Deno.env.get("CRON_KEY")) {
      return json(403, { error: "forbidden" });
    }
    const { data: owners } = await supa.from("products").select("owner_id");
    const unique = [...new Set((owners ?? []).map((o) => o.owner_id))];
    for (const u of unique) await settleUser(u);
    return json(200, { owners: unique.length });
  }
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  const { data: auth } = await supa.auth.getUser(jwt ?? "");
  if (!auth.user) return json(401, { error: "auth required" });
  const result = await settleUser(auth.user.id);
  return json(200, result);
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
