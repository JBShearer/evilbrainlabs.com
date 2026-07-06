/**
 * Evil Brain Labs - Economy Configuration
 *
 * All tunable constants for the game economy.
 * Compatible with Deno edge functions and browser ES modules.
 *
 * Reference: Build Plan Section 11 - Tunable Defaults
 */

// ============================================================================
// CORE ECONOMY CONSTANTS
// ============================================================================

export const ECONOMY = {
  // --- Section 5.2: Starting Balance & Claims ---
  /** Starting $EVIL balance for new users */
  STARTING_BALANCE: 100,

  /** Base cost for first seat claim */
  CLAIM_BASE: 50,

  /** Exponential growth factor for claim costs */
  CLAIM_GROWTH: 1.6,

  /** Maximum seats a player can hold */
  SEAT_CAP: 6,

  /** $EVIL earned per impact hour when mining */
  MINE_PER_IMPACT_HOUR: 1,

  // --- Section 5.3: Portfolio ---
  /** Efficiency reduction per additional seat (5% = 0.05) */
  PORTFOLIO_EFFICIENCY_STEP: 0.05,

  /** Exponent for weighted random seat selection */
  SLOT_WEIGHT_EXPONENT: 2,

  // --- Section 6.4: Raiding & Siphoning ---
  /** Fraction of mining yield siphoned by raiders */
  SIPHON_RATE: 0.25,

  /** Duration of siphon effect in hours */
  SIPHON_HOURS: 12,

  /** Number of marks required for hostile takeover */
  RAID_MARKS_FOR_TAKEOVER: 3,

  /** Window in hours for marks to accumulate */
  MARK_WINDOW_HOURS: 72,

  /** $EVIL cost per impact point to initiate raid */
  RAID_COST_PER_IMPACT: 3,

  /** Cooldown between raids in hours */
  RAID_COOLDOWN_HOURS: 6,

  /** $EVIL bounty per impact for successful defense */
  DEFENDER_BOUNTY_PER_IMPACT: 5,

  // --- Section 6.4, 6.5, 7: Combat Bonuses ---
  /** Bonus for counter-element advantage */
  COUNTER_BONUS: 2,

  /** Penalty for weakness matchup */
  WEAKNESS_PENALTY: -1,

  /** Bonus for mono-faction team composition */
  MONO_FACTION_BONUS: 1,

  /** Bonus for live active defense */
  LIVE_DEFENSE_BONUS: 1,

  /** Bonus from community sentiment */
  SENTIMENT_BONUS: 1,

  // --- Section 6.4, 7: Battle Timing ---
  /** Seconds to join a battle */
  JOIN_WINDOW_SECONDS: 60,

  /** Seconds per turn */
  TURN_SECONDS: 15,

  /** Total turns per battle */
  TURNS: 5,

  // --- Section 8.2: Scratch Cards ---
  /** Maximum scratch cards per week */
  SCRATCH_WEEKLY_CAP: 10,

  /** Odds distribution for scratch tiers [common, uncommon, rare, legendary] */
  SCRATCH_ODDS: [60, 30, 9, 1] as const,

  // --- Section 3: Rate Limiting ---
  /** API requests allowed per minute */
  RATE_LIMIT_PER_MINUTE: 30,
} as const;

// Type export for the economy config
export type EconomyConfig = typeof ECONOMY;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the $EVIL cost to claim an additional seat.
 * Formula: CLAIM_BASE * (CLAIM_GROWTH ^ seatCount)
 *
 * @param seatCount - Current number of seats held (0-5)
 * @returns Cost in $EVIL to claim next seat
 *
 * Reference: Section 5.2
 *
 * @example
 * claimCost(0) // 50 (first seat)
 * claimCost(1) // 80 (second seat)
 * claimCost(5) // 524 (sixth/final seat)
 */
export function claimCost(seatCount: number): number {
  if (seatCount >= ECONOMY.SEAT_CAP) {
    return Infinity; // Cannot claim more than cap
  }
  return Math.floor(ECONOMY.CLAIM_BASE * Math.pow(ECONOMY.CLAIM_GROWTH, seatCount));
}

/**
 * Calculate the effective mining rate for a player.
 * Rate scales with total impact across portfolio, modified by efficiency.
 *
 * @param impact - Total impact points from all held seats
 * @param seatCount - Number of seats held
 * @returns $EVIL earned per hour
 *
 * Reference: Section 5.2
 *
 * @example
 * miningRate(100, 1) // 100 (full efficiency with 1 seat)
 * miningRate(100, 3) // 90 (90% efficiency with 3 seats)
 */
export function miningRate(impact: number, seatCount: number): number {
  const efficiency = portfolioEfficiency(seatCount);
  return impact * ECONOMY.MINE_PER_IMPACT_HOUR * efficiency;
}

/**
 * Calculate portfolio efficiency based on number of seats held.
 * Efficiency decreases by PORTFOLIO_EFFICIENCY_STEP for each seat beyond the first.
 *
 * @param seatCount - Number of seats held (1-6)
 * @returns Efficiency multiplier (0.0 - 1.0)
 *
 * Reference: Section 5.2
 *
 * @example
 * portfolioEfficiency(1) // 1.0 (100%)
 * portfolioEfficiency(3) // 0.9 (90%)
 * portfolioEfficiency(6) // 0.75 (75%)
 */
export function portfolioEfficiency(seatCount: number): number {
  if (seatCount <= 0) return 0;
  if (seatCount > ECONOMY.SEAT_CAP) seatCount = ECONOMY.SEAT_CAP;

  // First seat is 100% efficient, each additional reduces by step
  const reduction = (seatCount - 1) * ECONOMY.PORTFOLIO_EFFICIENCY_STEP;
  return Math.max(0, 1 - reduction);
}

/**
 * Calculate the cost to initiate a raid on a seat.
 *
 * @param targetImpact - Impact value of the target seat
 * @returns $EVIL cost to raid
 *
 * Reference: Section 6.4
 */
export function raidCost(targetImpact: number): number {
  return targetImpact * ECONOMY.RAID_COST_PER_IMPACT;
}

/**
 * Calculate defender bounty for successful defense.
 *
 * @param seatImpact - Impact value of defended seat
 * @returns $EVIL bounty earned
 *
 * Reference: Section 6.4
 */
export function defenderBounty(seatImpact: number): number {
  return seatImpact * ECONOMY.DEFENDER_BOUNTY_PER_IMPACT;
}

/**
 * Calculate siphon amount from a seat.
 *
 * @param miningYield - Base mining yield of the seat
 * @returns Amount siphoned per hour
 *
 * Reference: Section 6.4
 */
export function siphonAmount(miningYield: number): number {
  return miningYield * ECONOMY.SIPHON_RATE;
}

/**
 * Get random scratch card tier based on odds distribution.
 *
 * @returns Tier index (0=common, 1=uncommon, 2=rare, 3=legendary)
 *
 * Reference: Section 8.2
 */
export function rollScratchTier(): number {
  const roll = Math.random() * 100;
  let cumulative = 0;

  for (let i = 0; i < ECONOMY.SCRATCH_ODDS.length; i++) {
    cumulative += ECONOMY.SCRATCH_ODDS[i];
    if (roll < cumulative) return i;
  }

  return 0; // Fallback to common
}

/**
 * Calculate weighted random selection probability for a seat slot.
 * Higher slots have lower probability based on SLOT_WEIGHT_EXPONENT.
 *
 * @param slotIndex - Zero-based slot index
 * @param totalSlots - Total number of slots
 * @returns Weight for this slot (higher = more likely)
 *
 * Reference: Section 5.3
 */
export function slotWeight(slotIndex: number, totalSlots: number): number {
  // Weight decreases exponentially with slot index
  // Slot 0 has highest weight, last slot has lowest
  const position = totalSlots - slotIndex;
  return Math.pow(position, ECONOMY.SLOT_WEIGHT_EXPONENT);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default ECONOMY;
