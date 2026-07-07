// EBL battle reducer. Plan section 6.3, 6.4.
// PURE. No I/O, no Date.now(), no Math.random(). The only randomness is a
// seeded xorshift32 PRNG derived from battle_id. reduce(events) must produce
// identical state everywhere: referee, replay page, tests.

import { ECONOMY } from "../config/economy.ts";

export type Side = "attackers" | "defenders";
export type Faction = "heaven" | "hell";

export interface BattleCard {
  instanceId: string;
  cardId: string;
  name: string;
  category: string;
  faction: Faction;
  power: number;
}

export interface Combatant {
  userId: string;       // bots use "bot:{archetype}:{n}"
  side: Side;
  deck: BattleCard[];
  isBot: boolean;
  isOwner: boolean;     // live product owner defending
}

export interface Placement { instanceId: string; lane: string; owner: string; side: Side; }

export type Intent =
  | { action: "play"; instanceId: string; lane: string }
  | { action: "shift"; instanceId: string; lane: string }
  | { action: "pass" };

export interface BattleEvent {
  seq: number;
  type: string;
  actor_id: string | null;
  payload: Record<string, unknown>;
}

export interface LaneResult {
  lane: string;
  attackerPower: number;
  defenderPower: number;
  breached: boolean;
}

export interface TurnLog { turn: number; lanes: LaneResult[]; breachPoint: boolean; }

export interface BattleState {
  battleId: string;
  kind: "raid" | "takeover";
  phase: "window" | "locked" | "resolved" | "cancelled";
  ring: string[];                       // frozen category ring
  strategy: string;                     // defense strategy slug
  combatants: Combatant[];
  placements: Placement[];
  turn: number;                         // current turn number, 1-based once locked
  breachPoints: number;
  breachContribution: Record<string, number>; // attacker userId -> lanes breached
  turnLogs: TurnLog[];
  sentimentSide: Side | null;
  complianceTheaterUsed: boolean;
  prSpinLane: string | null;            // lane getting pr_spin +1 this turn
  winner: Side | null;
  seed: number;
}

// ---------- seeded PRNG ----------
export function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}
export function xorshift32(state: number): { value: number; state: number } {
  let x = state >>> 0;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5; x >>>= 0;
  return { value: x / 0xffffffff, state: x };
}

// ---------- counter ring ----------
// Card A counters the next 2 categories clockwise, is weak to the previous 2.
export function counters(ring: string[], a: string, b: string): boolean {
  const ia = ring.indexOf(a), ib = ring.indexOf(b);
  if (ia < 0 || ib < 0) return false;
  const n = ring.length;
  const d = (ib - ia + n) % n;
  return d === 1 || d === 2;
}

function initialState(battleId: string): BattleState {
  return {
    battleId, kind: "raid", phase: "window", ring: [], strategy: "none",
    combatants: [], placements: [], turn: 0, breachPoints: 0,
    breachContribution: {}, turnLogs: [], sentimentSide: null,
    complianceTheaterUsed: false, prSpinLane: null, winner: null,
    seed: seedFromString(battleId),
  };
}

function findCard(state: BattleState, instanceId: string):
  { card: BattleCard; owner: Combatant } | null {
  for (const c of state.combatants) {
    const card = c.deck.find((d) => d.instanceId === instanceId);
    if (card) return { card, owner: c };
  }
  return null;
}

// ---------- lane resolution (section 6.4, exact) ----------
function resolveLane(state: BattleState, lane: string, isFinalTurn: boolean): LaneResult {
  const here = state.placements.filter((p) => p.lane === lane);
  const sideCards = (side: Side) =>
    here.filter((p) => p.side === side)
        .map((p) => findCard(state, p.instanceId)!.card);

  const atk = sideCards("attackers");
  const def = sideCards("defenders");

  const powerFor = (own: BattleCard[], opp: BattleCard[]): number => {
    let p = own.reduce((s, c) => s + c.power, 0);
    for (const c of own) {
      for (const o of opp) {
        if (counters(state.ring, c.category, o.category)) p += ECONOMY.COUNTER_BONUS;
        if (counters(state.ring, o.category, c.category)) p -= ECONOMY.WEAKNESS_PENALTY;
      }
    }
    if (own.length > 0 && own.every((c) => c.faction === own[0].faction)) {
      p += ECONOMY.MONO_FACTION_BONUS;
    }
    return p;
  };

  let attackerPower = powerFor(atk, def);
  let defenderPower = powerFor(def, atk);

  // Defense strategy modifiers (6.5)
  if (state.strategy === "legal_team" && lane === ECONOMY.LANES[1]) {
    defenderPower += 2; // +2 in the LEGAL lane (LANE_B by convention)
  }
  if (state.strategy === "pr_spin" && state.prSpinLane === lane) {
    defenderPower += 1;
  }
  // Live defense bonus (6.5): any live (non-bot, non-scripted) defender present
  const liveDefender = state.combatants.some((c) => c.side === "defenders" && !c.isBot);
  if (liveDefender) defenderPower += ECONOMY.LIVE_DEFENSE_BONUS;

  // Sentiment (7): final turn, one lane, deterministic pick handled by caller flag
  if (isFinalTurn && state.sentimentSide && lane === pickSentimentLane(state)) {
    if (state.sentimentSide === "attackers") attackerPower += ECONOMY.SENTIMENT_BONUS;
    else defenderPower += ECONOMY.SENTIMENT_BONUS;
  }

  // Ties go to defenders.
  return { lane, attackerPower, defenderPower, breached: attackerPower > defenderPower };
}

// Deterministic sentiment lane: lowest-index lane contested by both sides,
// else lowest-index lane with any card, else first lane.
export function pickSentimentLane(state: BattleState): string {
  for (const lane of ECONOMY.LANES) {
    const here = state.placements.filter((p) => p.lane === lane);
    if (here.some((p) => p.side === "attackers") && here.some((p) => p.side === "defenders")) {
      return lane;
    }
  }
  for (const lane of ECONOMY.LANES) {
    if (state.placements.some((p) => p.lane === lane)) return lane;
  }
  return ECONOMY.LANES[0];
}

function applyIntent(state: BattleState, actorId: string, intent: Intent): void {
  const combatant = state.combatants.find((c) => c.userId === actorId);
  if (!combatant || intent.action === "pass") return;
  const owned = combatant.deck.some((d) => d.instanceId === intent.instanceId);
  if (!owned) return; // invalid intents resolve as pass; referee validates upstream too
  const lane = intent.lane;
  if (!(ECONOMY.LANES as readonly string[]).includes(lane)) return;
  const existing = state.placements.find((p) => p.instanceId === intent.instanceId);

  if (intent.action === "play") {
    if (existing) return; // already on board: invalid, pass
    const laneOccupied = state.placements.some(
      (p) => p.owner === actorId && p.lane === lane
    );
    if (laneOccupied) return; // one card per player per lane
    state.placements.push({
      instanceId: intent.instanceId, lane, owner: actorId, side: combatant.side,
    });
  } else if (intent.action === "shift") {
    if (!existing) return;
    const laneOccupied = state.placements.some(
      (p) => p.owner === actorId && p.lane === lane && p.instanceId !== intent.instanceId
    );
    if (laneOccupied) return;
    existing.lane = lane;
  }
}

// ---------- the reducer ----------
export function reduce(battleId: string, events: BattleEvent[]): BattleState {
  const state = initialState(battleId);
  const sorted = [...events].sort((a, b) => a.seq - b.seq);

  for (const ev of sorted) {
    if (state.phase === "resolved" || state.phase === "cancelled") break;

    switch (ev.type) {
      case "battle_declared": {
        const p = ev.payload as {
          kind: "raid" | "takeover"; ring: string[]; strategy: string;
        };
        state.kind = p.kind;
        state.ring = p.ring;              // frozen at declaration (6.4.2)
        state.strategy = p.strategy || "none";
        break;
      }
      case "combatant_joined": {
        const p = ev.payload as {
          side: Side; deck: BattleCard[]; isBot?: boolean; isOwner?: boolean;
        };
        if (state.combatants.filter((c) => c.side === p.side).length >= ECONOMY.SIDE_SIZE) break;
        if (state.combatants.some((c) => c.userId === ev.actor_id)) break;
        state.combatants.push({
          userId: ev.actor_id!, side: p.side,
          deck: p.deck.slice(0, ECONOMY.DECK_SIZE),
          isBot: !!p.isBot, isOwner: !!p.isOwner,
        });
        break;
      }
      case "window_locked": {
        // vaporware_pivot (6.5): battle auto-resolves defenders-win.
        if (state.strategy === "vaporware_pivot") {
          state.phase = "resolved";
          state.winner = "defenders";
          state.turnLogs.push({ turn: 0, lanes: [], breachPoint: false });
        } else {
          state.phase = "locked";
        }
        break;
      }
      case "turn_opened": {
        state.turn = (ev.payload as { turn: number }).turn;
        break;
      }
      case "sentiment_final": {
        state.sentimentSide = (ev.payload as { side: Side }).side;
        break;
      }
      case "turn_resolved": {
        const p = ev.payload as { turn: number; intents: { actor: string; intent: Intent }[] };
        // Apply intents in deterministic order: sorted by actor id.
        const ordered = [...p.intents].sort((a, b) => a.actor.localeCompare(b.actor));
        for (const { actor, intent } of ordered) applyIntent(state, actor, intent);

        const isFinal = p.turn === ECONOMY.TURNS;
        const lanes = ECONOMY.LANES.map((l) => resolveLane(state, l, isFinal));

        // compliance_theater (6.5): first breach turn is negated once.
        let breachedLanes = lanes.filter((l) => l.breached);
        if (
          state.strategy === "compliance_theater" &&
          !state.complianceTheaterUsed &&
          breachedLanes.length >= 2
        ) {
          state.complianceTheaterUsed = true;
          breachedLanes = []; // resolves as HOLD
          lanes.forEach((l) => (l.breached = false));
        }

        const breachPoint = breachedLanes.length >= 2;
        if (breachPoint) {
          state.breachPoints += 1;
          for (const l of breachedLanes) {
            for (const pl of state.placements.filter(
              (x) => x.lane === l.lane && x.side === "attackers"
            )) {
              state.breachContribution[pl.owner] =
                (state.breachContribution[pl.owner] || 0) + 1;
            }
          }
        }

        // pr_spin (6.5): +1 next turn in most recently breached lane.
        state.prSpinLane =
          state.strategy === "pr_spin" && breachedLanes.length > 0
            ? breachedLanes[breachedLanes.length - 1].lane
            : null;

        state.turnLogs.push({ turn: p.turn, lanes, breachPoint });

        // End conditions (6.4)
        if (state.breachPoints >= ECONOMY.BREACH_POINTS_TO_WIN) {
          state.phase = "resolved"; state.winner = "attackers";
        } else if (p.turn >= ECONOMY.TURNS) {
          state.phase = "resolved";
          state.winner =
            state.breachPoints >= ECONOMY.BREACH_POINTS_AFTER_T5 ? "attackers" : "defenders";
        }
        break;
      }
      case "battle_cancelled": {
        state.phase = "cancelled";
        break;
      }
      case "battle_ended": {
        // Verification event: reducer-derived winner is authoritative.
        break;
      }
    }
  }
  return state;
}

// Takeover seat recipient (6.4): attacker with most breach contribution;
// deterministic tiebreak by userId sort.
export function takeoverWinner(state: BattleState): string | null {
  const attackers = state.combatants.filter((c) => c.side === "attackers" && !c.isBot);
  if (attackers.length === 0) return null;
  return attackers
    .map((a) => ({ id: a.userId, n: state.breachContribution[a.userId] || 0 }))
    .sort((x, y) => y.n - x.n || x.id.localeCompare(y.id))[0].id;
}
