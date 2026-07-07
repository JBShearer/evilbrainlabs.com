// Bot archetypes. Plan 6.5. Deterministic given battle seed + state.
// Display identities are OWNER (Rival PM characters): RIVAL_PM_1..3 placeholders.

import { ECONOMY } from "../config/economy.ts";
import {
  BattleState, BattleCard, Intent, counters, xorshift32,
} from "./battle-reducer.ts";

export type Archetype = "aggressive" | "counter_picker" | "staller";
export const BOT_ARCHETYPES: Archetype[] = ["aggressive", "counter_picker", "staller"];

function unplayed(state: BattleState, botId: string): BattleCard[] {
  const bot = state.combatants.find((c) => c.userId === botId);
  if (!bot) return [];
  const placed = new Set(state.placements.map((p) => p.instanceId));
  return bot.deck.filter((d) => !placed.has(d.instanceId));
}

function openLanes(state: BattleState, botId: string): string[] {
  return (ECONOMY.LANES as readonly string[]).filter(
    (l) => !state.placements.some((p) => p.owner === botId && p.lane === l)
  );
}

export function botIntent(state: BattleState, botId: string, prngState: number):
  { intent: Intent; prngState: number } {
  const arch = botId.split(":")[1] as Archetype;
  const hand = unplayed(state, botId);
  const lanes = openLanes(state, botId);
  if (hand.length === 0 || lanes.length === 0) {
    return { intent: { action: "pass" }, prngState };
  }
  const bot = state.combatants.find((c) => c.userId === botId)!;
  const oppSide = bot.side === "attackers" ? "defenders" : "attackers";

  if (arch === "aggressive") {
    // Highest power card into the lane with the most enemy power.
    const card = [...hand].sort((a, b) => b.power - a.power || a.instanceId.localeCompare(b.instanceId))[0];
    const lane = [...lanes].sort((a, b) => enemyPower(state, b, oppSide) - enemyPower(state, a, oppSide) || a.localeCompare(b))[0];
    return { intent: { action: "play", instanceId: card.instanceId, lane }, prngState };
  }

  if (arch === "counter_picker") {
    // Maximize ring counter bonus against enemies on board.
    let best: { card: BattleCard; lane: string; score: number } | null = null;
    for (const card of hand) {
      for (const lane of lanes) {
        const enemies = state.placements
          .filter((p) => p.lane === lane && p.side === oppSide)
          .map((p) => state.combatants.flatMap((c) => c.deck).find((d) => d.instanceId === p.instanceId)!);
        let score = card.power;
        for (const e of enemies) {
          if (counters(state.ring, card.category, e.category)) score += ECONOMY.COUNTER_BONUS;
          if (counters(state.ring, e.category, card.category)) score -= ECONOMY.WEAKNESS_PENALTY;
        }
        if (!best || score > best.score ||
            (score === best.score && card.instanceId < best.card.instanceId)) {
          best = { card, lane, score };
        }
      }
    }
    return { intent: { action: "play", instanceId: best!.card.instanceId, lane: best!.lane }, prngState };
  }

  // staller: spread lanes, seeded-random card, prefers emptiest lane.
  const r = xorshift32(prngState);
  const card = hand[Math.floor(r.value * hand.length) % hand.length];
  const lane = [...lanes].sort(
    (a, b) => laneCount(state, a) - laneCount(state, b) || a.localeCompare(b)
  )[0];
  return { intent: { action: "play", instanceId: card.instanceId, lane }, prngState: r.state };
}

function enemyPower(state: BattleState, lane: string, oppSide: string): number {
  return state.placements
    .filter((p) => p.lane === lane && p.side === oppSide)
    .map((p) => state.combatants.flatMap((c) => c.deck).find((d) => d.instanceId === p.instanceId)!.power)
    .reduce((a, b) => a + b, 0);
}
function laneCount(state: BattleState, lane: string): number {
  return state.placements.filter((p) => p.lane === lane).length;
}
