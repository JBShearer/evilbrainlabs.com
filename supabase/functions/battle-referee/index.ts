// battle-referee: the ONLY writer to battles / battle_events. Plan 6.2, 7.
// Actions: declare | join | commit_intent | vote_sentiment | tick
// Deploy: supabase functions deploy battle-referee
// Cron: call {url}?action=tick every 5s via pg_cron + pg_net

import { createClient } from "npm:@supabase/supabase-js@2";
import { ECONOMY } from "../../../config/economy.ts";
import {
  reduce, BattleEvent, BattleState, takeoverWinner, seedFromString,
} from "../../../shared/battle-reducer.ts";
import { botIntent, BOT_ARCHETYPES } from "../../../shared/bots.ts";
import { corsHeaders } from "../_shared/utils.ts";

const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const FLAG_BATTLES = Deno.env.get("FLAG_BATTLES") === "on";
const FLAG_REALTIME = Deno.env.get("FLAG_REALTIME") === "on";

async function loadEvents(battleId: string): Promise<BattleEvent[]> {
  const { data, error } = await supa
    .from("battle_events").select("seq,type,actor_id,payload")
    .eq("battle_id", battleId).order("seq");
  if (error) throw error;
  return data as BattleEvent[];
}

async function append(battleId: string, events: Omit<BattleEvent, "seq">[], lastSeq: number) {
  // Sequential seq; PK (battle_id, seq) guards against races. On conflict, caller retries.
  const rows = events.map((e, i) => ({ battle_id: battleId, seq: lastSeq + 1 + i, ...e }));
  const { error } = await supa.from("battle_events").insert(rows);
  if (error) throw error;
}

async function rateLimit(userId: string, fn: string): Promise<boolean> {
  const minute = new Date(); minute.setSeconds(0, 0);
  const { data } = await supa.from("rate_limits")
    .upsert({ user_id: userId, fn, minute: minute.toISOString(), calls: 1 },
      { onConflict: "user_id,fn,minute", ignoreDuplicates: true }).select();
  if (data && data.length > 0) return true;
  const { data: row } = await supa.from("rate_limits").select("calls")
    .eq("user_id", userId).eq("fn", fn).eq("minute", minute.toISOString()).single();
  if ((row?.calls ?? 0) >= ECONOMY.RATE_LIMIT_PER_MIN) return false;
  await supa.rpc("increment_rate_limit", { p_user: userId, p_fn: fn, p_minute: minute.toISOString() });
  return true;
}

async function authedUser(req: Request): Promise<string | null> {
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return null;
  const { data } = await supa.auth.getUser(jwt);
  return data.user?.id ?? null;
}

// ---------- actions ----------

async function declare(userId: string, body: { product_id: string }) {
  const { data: product, error } = await supa.from("products")
    .select("*, cards!inner(impact)").eq("id", body.product_id).single();
  if (error || !product) return json(404, { error: "product not found" });
  if (product.owner_id === userId) return json(400, { error: "cannot raid your own product" });

  const cooldownMs = ECONOMY.RAID_COOLDOWN_HOURS * 3600_000;
  if (product.last_battle_at &&
      Date.now() - new Date(product.last_battle_at).getTime() < cooldownMs) {
    return json(429, { error: "product on cooldown" });
  }
  const { data: open } = await supa.from("battles").select("id")
    .eq("product_id", body.product_id).in("state", ["window", "locked"]).limit(1);
  if (open && open.length) return json(409, { error: "battle already active" });

  const impact = product.cards.impact as number;
  const cost = impact * ECONOMY.RAID_COST_PER_IMPACT;
  const paid = await debit(userId, cost); // burned, not transferred (6.4)
  if (!paid) return json(402, { error: "insufficient balance", cost });

  const kind = product.raid_marks >= ECONOMY.RAID_MARKS_FOR_TAKEOVER ? "takeover" : "raid";
  const ring = await buildRing();
  const strategy = (product.defense_loadout?.strategy as string) ?? "none";

  const { data: battle, error: bErr } = await supa.from("battles").insert({
    product_id: body.product_id, kind,
    window_ends_at: new Date(Date.now() + ECONOMY.JOIN_WINDOW_SECONDS * 1000).toISOString(),
    created_by: userId,
  }).select().single();
  if (bErr) throw bErr;

  await append(battle.id, [{
    type: "battle_declared", actor_id: userId,
    payload: { kind, ring, strategy, product_id: body.product_id, impact },
  }], 0);

  // Declarer auto-joins as attacker with their submitted deck in a follow-up
  // join call from the client. Scripted defenders join at lock time.
  return json(200, { battle_id: battle.id, kind, window_seconds: ECONOMY.JOIN_WINDOW_SECONDS });
}

async function join(userId: string, body: {
  battle_id: string; side: "attackers" | "defenders"; instance_ids: string[];
}) {
  const events = await loadEvents(body.battle_id);
  const state = reduce(body.battle_id, events);
  if (state.phase !== "window") return json(409, { error: "join window closed" });
  if (state.combatants.filter((c) => c.side === body.side).length >= ECONOMY.SIDE_SIZE) {
    return json(409, { error: "side full" });
  }
  if (body.instance_ids.length !== ECONOMY.DECK_SIZE) {
    return json(400, { error: `deck must be exactly ${ECONOMY.DECK_SIZE} cards` });
  }
  // Ownership + lock check
  const { data: instances, error } = await supa.from("card_instances")
    .select("id, owner_id, cards!inner(id, name, category, faction, power)")
    .in("id", body.instance_ids);
  if (error || !instances || instances.length !== ECONOMY.DECK_SIZE ||
      instances.some((i) => i.owner_id !== userId)) {
    return json(403, { error: "deck must be card instances you own" });
  }
  const { data: locked } = await supa.from("instance_locks")
    .select("instance_id").in("instance_id", body.instance_ids);
  if (locked && locked.length) return json(409, { error: "card already in an active battle" });
  await supa.from("instance_locks").insert(
    body.instance_ids.map((id) => ({ instance_id: id, battle_id: body.battle_id })));

  const { data: battle } = await supa.from("battles")
    .select("product_id, products!inner(owner_id)").eq("id", body.battle_id).single();
  const isOwner = battle?.products?.owner_id === userId && body.side === "defenders";

  const deck = instances.map((i) => ({
    instanceId: i.id, cardId: i.cards.id, name: i.cards.name,
    category: i.cards.category, faction: i.cards.faction, power: i.cards.power,
  }));
  await append(body.battle_id, [{
    type: "combatant_joined", actor_id: userId,
    payload: { side: body.side, deck, isOwner },
  }], events[events.length - 1].seq);

  // Lock early if both sides full
  const after = reduce(body.battle_id, await loadEvents(body.battle_id));
  if (after.combatants.filter((c) => c.side === "attackers").length >= ECONOMY.SIDE_SIZE &&
      after.combatants.filter((c) => c.side === "defenders").length >= ECONOMY.SIDE_SIZE) {
    await lockBattle(body.battle_id);
  }
  return json(200, { joined: body.side });
}

async function commitIntent(userId: string, body: {
  battle_id: string; intent: unknown;
}) {
  const events = await loadEvents(body.battle_id);
  const state = reduce(body.battle_id, events);
  if (state.phase !== "locked") return json(409, { error: "no active turn" });
  if (!state.combatants.some((c) => c.userId === userId)) {
    return json(403, { error: "not a combatant" });
  }
  // Raw intent stays server-side (battle_intents). Only a hash is broadcast.
  const { error } = await supa.from("battle_intents").upsert({
    battle_id: body.battle_id, turn: state.turn, actor_id: userId, intent: body.intent,
  });
  if (error) throw error;
  const hash = await sha256(JSON.stringify({ t: state.turn, i: body.intent, u: userId }));
  await append(body.battle_id, [{
    type: "intent_committed", actor_id: userId, payload: { turn: state.turn, hash },
  }], events[events.length - 1].seq);

  // Resolve early if all live combatants committed
  const live = state.combatants.filter((c) => !c.isBot).map((c) => c.userId);
  const { data: committed } = await supa.from("battle_intents")
    .select("actor_id").eq("battle_id", body.battle_id).eq("turn", state.turn);
  const done = new Set((committed ?? []).map((r) => r.actor_id));
  if (live.every((u) => done.has(u))) await resolveTurn(body.battle_id);
  return json(200, { committed: true, turn: state.turn });
}

async function voteSentiment(userId: string, body: {
  battle_id: string; side: "attackers" | "defenders";
}) {
  const events = await loadEvents(body.battle_id);
  const state = reduce(body.battle_id, events);
  if (state.phase === "resolved") return json(409, { error: "battle over" });
  if (state.combatants.some((c) => c.userId === userId)) {
    return json(403, { error: "combatants cannot vote sentiment" });
  }
  // Free. One per battle (PK). There is intentionally NO paid influence path.
  const { error } = await supa.from("battle_sentiment").insert({
    battle_id: body.battle_id, voter_id: userId, side: body.side,
  });
  if (error) return json(409, { error: "already voted" });
  return json(200, { voted: body.side });
}

// tick: driven by cron. Locks expired windows, resolves expired turns.
async function tick() {
  const now = new Date().toISOString();
  const { data: windows } = await supa.from("battles")
    .select("id").eq("state", "window").lt("window_ends_at", now);
  for (const b of windows ?? []) await lockBattle(b.id);

  const { data: turns } = await supa.from("battles")
    .select("id").eq("state", "locked").lt("turn_ends_at", now);
  for (const b of turns ?? []) await resolveTurn(b.id);
  return json(200, { ticked: (windows?.length ?? 0) + (turns?.length ?? 0) });
}

// ---------- internals ----------

async function lockBattle(battleId: string) {
  const events = await loadEvents(battleId);
  let state = reduce(battleId, events);
  if (state.phase !== "window") return;

  const toAppend: Omit<BattleEvent, "seq">[] = [];
  // No attackers joined: cancel, no marks, no cost refund (burned on declare).
  if (state.combatants.filter((c) => c.side === "attackers").length === 0) {
    toAppend.push({ type: "battle_cancelled", actor_id: null, payload: {} });
    await append(battleId, toAppend, events[events.length - 1].seq);
    await supa.from("battles").update({ state: "cancelled" }).eq("id", battleId);
    await supa.from("instance_locks").delete().eq("battle_id", battleId);
    return;
  }
  // Bots backfill DEFENDER slots only (7). Scripted loadout defenders come first.
  const defenders = state.combatants.filter((c) => c.side === "defenders").length;
  let prng = seedFromString(battleId + ":botfill");
  for (let i = defenders; i < ECONOMY.SIDE_SIZE; i++) {
    const arch = BOT_ARCHETYPES[i % BOT_ARCHETYPES.length];
    const deck = await scriptedDefenderDeck(battleId, i);
    toAppend.push({
      type: "combatant_joined", actor_id: `bot:${arch}:${i}`,
      payload: { side: "defenders", deck, isBot: true },
    });
  }
  toAppend.push({ type: "window_locked", actor_id: null, payload: {} });
  await append(battleId, toAppend, events[events.length - 1].seq);

  state = reduce(battleId, await loadEvents(battleId));
  if (state.phase === "resolved") { await finalize(battleId, state); return; } // vaporware_pivot
  await openTurn(battleId, 1);
}

async function scriptedDefenderDeck(battleId: string, slot: number) {
  // Defense loadout defenders fill slot 0; remaining bot slots draw system
  // instances from the product's own card plus impact<=3 commons. Simplified:
  // duplicate the product card as system instances (source 'admin', owner null).
  const { data: battle } = await supa.from("battles")
    .select("product_id, products!inner(card_id, defense_loadout)")
    .eq("id", battleId).single();
  const loadoutIds: string[] = battle?.products?.defense_loadout?.defenders ?? [];
  if (slot === 0 && loadoutIds.length) {
    const { data } = await supa.from("card_instances")
      .select("id, cards!inner(id,name,category,faction,power)").in("id", loadoutIds);
    if (data?.length) {
      return data.slice(0, ECONOMY.DECK_SIZE).map((i) => ({
        instanceId: i.id, cardId: i.cards.id, name: i.cards.name,
        category: i.cards.category, faction: i.cards.faction, power: i.cards.power,
      }));
    }
  }
  const { data: card } = await supa.from("cards")
    .select("id,name,category,faction,power")
    .eq("id", battle!.products.card_id).single();
  return Array.from({ length: ECONOMY.DECK_SIZE }, (_, n) => ({
    instanceId: `system:${battleId}:${slot}:${n}`, cardId: card!.id, name: card!.name,
    category: card!.category, faction: card!.faction, power: card!.power,
  }));
}

async function openTurn(battleId: string, turn: number) {
  const events = await loadEvents(battleId);
  const toAppend: Omit<BattleEvent, "seq">[] = [];
  // Sentiment applies at final-turn open (7).
  if (turn === ECONOMY.TURNS) {
    const { data: votes } = await supa.from("battle_sentiment")
      .select("side").eq("battle_id", battleId);
    if (votes && votes.length) {
      const a = votes.filter((v) => v.side === "attackers").length;
      const d = votes.length - a;
      if (a !== d) {
        toAppend.push({
          type: "sentiment_final", actor_id: null,
          payload: { side: a > d ? "attackers" : "defenders" },
        });
      }
    }
  }
  toAppend.push({ type: "turn_opened", actor_id: null, payload: { turn } });
  await append(battleId, toAppend, events[events.length - 1].seq);
  await supa.from("battles").update({
    current_turn: turn,
    turn_ends_at: new Date(Date.now() + ECONOMY.TURN_SECONDS * 1000).toISOString(),
  }).eq("id", battleId);
}

async function resolveTurn(battleId: string) {
  const events = await loadEvents(battleId);
  const state = reduce(battleId, events);
  if (state.phase !== "locked") return;
  const turn = state.turn;

  const { data: rows } = await supa.from("battle_intents")
    .select("actor_id,intent").eq("battle_id", battleId).eq("turn", turn);
  const committed = new Map((rows ?? []).map((r) => [r.actor_id, r.intent]));

  let prng = seedFromString(battleId + ":turn:" + turn);
  const intents = state.combatants.map((c) => {
    if (c.isBot) {
      const r = botIntent(state, c.userId, prng);
      prng = r.prngState;
      return { actor: c.userId, intent: r.intent };
    }
    // Missing human commit resolves as pass (7).
    return { actor: c.userId, intent: committed.get(c.userId) ?? { action: "pass" } };
  });

  await append(battleId, [{
    type: "turn_resolved", actor_id: null, payload: { turn, intents },
  }], events[events.length - 1].seq);

  const after = reduce(battleId, await loadEvents(battleId));
  if (after.phase === "resolved") await finalize(battleId, after);
  else await openTurn(battleId, turn + 1);
}

async function finalize(battleId: string, state: BattleState) {
  const events = await loadEvents(battleId);
  await append(battleId, [{
    type: "battle_ended", actor_id: null, payload: { winner: state.winner },
  }], events[events.length - 1].seq);
  await supa.from("battles").update({ state: "resolved", winner: state.winner })
    .eq("id", battleId);
  await supa.from("instance_locks").delete().eq("battle_id", battleId);

  const { data: battle } = await supa.from("battles")
    .select("product_id, kind, products!inner(owner_id, raid_marks, raid_marks_reset_at, cards!inner(impact))")
    .eq("id", battleId).single();
  if (!battle) return;
  const impact = battle.products.cards.impact as number;
  const attackers = state.combatants.filter((c) => c.side === "attackers" && !c.isBot);
  const defenders = state.combatants.filter((c) => c.side === "defenders" && !c.isBot);

  if (state.winner === "attackers") {
    if (battle.kind === "takeover") {
      const newOwner = takeoverWinner(state);
      if (newOwner) {
        await supa.from("products").update({
          owner_id: newOwner, raid_marks: 0, raid_marks_reset_at: null,
          siphon_rate: 0, siphon_until: null, siphon_beneficiaries: [],
          last_battle_at: new Date().toISOString(),
        }).eq("id", battle.product_id);
        await supa.from("card_instances").insert({
          card_id: (await productCardId(battle.product_id)), owner_id: newOwner,
          serial: await nextSerial(await productCardId(battle.product_id)),
          source: "takeover",
        });
      }
    } else {
      const windowMs = ECONOMY.MARK_WINDOW_HOURS * 3600_000;
      const resetAt = battle.products.raid_marks_reset_at;
      const marks = resetAt && new Date(resetAt).getTime() > Date.now()
        ? battle.products.raid_marks + 1 : 1;
      await supa.from("products").update({
        siphon_rate: ECONOMY.SIPHON_RATE,
        siphon_until: new Date(Date.now() + ECONOMY.SIPHON_HOURS * 3600_000).toISOString(),
        siphon_beneficiaries: attackers.map((a) => a.userId),
        raid_marks: marks,
        raid_marks_reset_at: new Date(Date.now() + windowMs).toISOString(),
        last_battle_at: new Date().toISOString(),
      }).eq("id", battle.product_id);
    }
  } else if (state.winner === "defenders") {
    await supa.from("products").update({
      last_battle_at: new Date().toISOString(),
      ...(battle.kind === "takeover" ? { raid_marks: 0, raid_marks_reset_at: null } : {}),
    }).eq("id", battle.product_id);
    // Defender bounty (6.4), system mint, includes mercenaries.
    for (const d of defenders) {
      await credit(d.userId, impact * ECONOMY.DEFENDER_BOUNTY_PER_IMPACT,
        battle.product_id, "bounty");
    }
  }
  // Quest hooks
  for (const c of [...attackers, ...defenders]) {
    await questEvent(c.userId, "battle_played");
  }
  const winners = state.winner === "attackers" ? attackers : defenders;
  for (const w of winners) {
    await questEvent(w.userId, state.winner === "attackers" ? "battle_won" : "defense_won");
    if (battle.kind === "takeover" && state.winner === "attackers") {
      await questEvent(w.userId, "takeover_won");
    }
  }
}

// ---------- helpers ----------
async function productCardId(productId: string): Promise<string> {
  const { data } = await supa.from("products").select("card_id").eq("id", productId).single();
  return data!.card_id;
}
async function nextSerial(cardId: string): Promise<number> {
  const { data } = await supa.from("card_instances").select("serial")
    .eq("card_id", cardId).order("serial", { ascending: false }).limit(1);
  return (data?.[0]?.serial ?? 0) + 1;
}
async function debit(userId: string, amount: number): Promise<boolean> {
  const { data, error } = await supa.rpc("wallet_debit", { p_user: userId, p_amount: amount });
  return !error && data === true;
}
async function credit(userId: string, amount: number, productId: string, kind: string) {
  await supa.rpc("wallet_credit", { p_user: userId, p_amount: amount });
  await supa.from("mining_ledger").insert({
    product_id: productId, beneficiary_id: userId, amount,
    period_start: new Date().toISOString(), period_end: new Date().toISOString(), kind,
  });
}
async function questEvent(userId: string, event: string) {
  await supa.functions.invoke("quests", { body: { user_id: userId, event } })
    .catch(() => {}); // quest failures never break battles
}
async function buildRing(): Promise<string[]> {
  // Alphabetical ring from the registry category column (6.4.2). READ ONLY.
  // Uses use_cases table directly (no FK, just SELECT)
  const { data } = await supa.from("use_cases").select("category");
  const cats = [...new Set((data ?? []).map((r) => r.category).filter(Boolean))].sort();
  return cats.length >= 4 ? cats : ["CAT_A", "CAT_B", "CAT_C", "CAT_D"];
}
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- router ----------
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!FLAG_BATTLES) return json(503, { error: "battles disabled" });
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  if (action === "tick") {
    // Cron path authenticated by service key header
    if (req.headers.get("x-cron-key") !== Deno.env.get("CRON_KEY")) {
      return json(403, { error: "forbidden" });
    }
    return await tick();
  }
  const userId = await authedUser(req);
  if (!userId) return json(401, { error: "auth required" });
  if (!(await rateLimit(userId, "battle-referee"))) return json(429, { error: "rate limited" });
  const body = await req.json().catch(() => ({}));
  try {
    switch (action) {
      case "declare": return await declare(userId, body);
      case "join":
        if (!FLAG_REALTIME && body.side === "defenders") {
          // Phase 3: single-player vs scripted defense; humans attack only.
        }
        return await join(userId, body);
      case "commit_intent": return await commitIntent(userId, body);
      case "vote_sentiment": return await voteSentiment(userId, body);
      default: return json(400, { error: "unknown action" });
    }
  } catch (e) {
    // PK conflict on seq = concurrent append; client should retry.
    return json(409, { error: "conflict, retry", detail: String(e) });
  }
});
