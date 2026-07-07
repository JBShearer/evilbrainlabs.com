// claim-product: seat purchase. Plan 5.3. Server validates everything.

import { createClient } from "npm:@supabase/supabase-js@2";
import { ECONOMY, claimCost } from "../../../config/economy.ts";
import { corsHeaders } from "../_shared/utils.ts";

const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const FLAG = Deno.env.get("FLAG_PORTFOLIO") === "on";

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!FLAG) return json(503, { error: "portfolio disabled" });
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  const { data: auth } = await supa.auth.getUser(jwt ?? "");
  const userId = auth.user?.id;
  if (!userId) return json(401, { error: "auth required" });

  const { case_id } = await req.json();

  // Card must exist (minted) and case must be unclaimed.
  const { data: card } = await supa.from("cards").select("id, impact").eq("case_id", case_id).single();
  if (!card) return json(404, { error: "no card for case" });
  const { data: claimed } = await supa.from("products").select("id").eq("case_id", case_id).maybeSingle();
  if (claimed) return json(409, { error: "already claimed" });

  // Seat cap, hard server check (5.2).
  const { count } = await supa.from("products")
    .select("id", { count: "exact", head: true }).eq("owner_id", userId);
  const seats = count ?? 0;
  if (seats >= ECONOMY.SEAT_CAP) return json(409, { error: "seat cap reached", cap: ECONOMY.SEAT_CAP });

  const cost = claimCost(seats);
  const { data: paid } = await supa.rpc("wallet_debit", { p_user: userId, p_amount: cost });
  if (paid !== true) return json(402, { error: "insufficient balance", cost });

  const { data: product, error } = await supa.from("products").insert({
    case_id, card_id: card.id, owner_id: userId,
  }).select().single();
  if (error) {
    // Race: refund and report conflict.
    await supa.rpc("wallet_credit", { p_user: userId, p_amount: cost });
    return json(409, { error: "claimed by someone else first" });
  }
  // PM gets instance serial of the card (source 'claim').
  const { data: top } = await supa.from("card_instances").select("serial")
    .eq("card_id", card.id).order("serial", { ascending: false }).limit(1);
  await supa.from("card_instances").insert({
    card_id: card.id, owner_id: userId, serial: (top?.[0]?.serial ?? 0) + 1, source: "claim",
  });
  await supa.functions.invoke("quests", {
    body: { user_id: userId, event: "product_claimed" },
  }).catch(() => {});
  return json(200, { product_id: product.id, cost, seats: seats + 1 });
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
