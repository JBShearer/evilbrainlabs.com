/**
 * EBL Battle System UI
 * 3-lane deterministic battles with deck building and spectator sentiment
 *
 * Integrates with:
 * - battle-referee edge function (all writes go through it)
 * - battle_events table (realtime subscription)
 * - shared/battle-reducer.ts (client-side state reconstruction)
 */

(function() {
  'use strict';

  // ============================================================================
  // CONSTANTS (mirror config/economy.ts)
  // ============================================================================
  const ECONOMY = {
    LANES: ['LANE_A', 'LANE_B', 'LANE_C'],
    LANE_NAMES: { LANE_A: 'MARKET', LANE_B: 'LEGAL', LANE_C: 'TECH' },
    SIDE_SIZE: 3,
    DECK_SIZE: 4,
    TURNS: 5,
    TURN_SECONDS: 15,
    JOIN_WINDOW_SECONDS: 60,
    COUNTER_BONUS: 2,
    WEAKNESS_PENALTY: 1,
    MONO_FACTION_BONUS: 1,
    LIVE_DEFENSE_BONUS: 1,
    SENTIMENT_BONUS: 1,
    BREACH_POINTS_TO_WIN: 3,
    BREACH_POINTS_AFTER_T5: 2
  };

  // Category counter ring (frozen at battle declaration)
  const DEFAULT_RING = [
    'surveillance', 'automation', 'prediction', 'content_generation',
    'personalization', 'manipulation', 'discrimination', 'efficiency'
  ];

  // ============================================================================
  // STATE
  // ============================================================================
  let battleState = null;
  let selectedDeck = [];
  let currentIntent = null;
  let turnTimer = null;
  let turnTimeLeft = 0;
  let realtimeChannel = null;
  let pollingInterval = null;

  // ============================================================================
  // SEEDED PRNG (mirror battle-reducer.ts)
  // ============================================================================
  function seedFromString(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h || 1;
  }

  function xorshift32(state) {
    let x = state >>> 0;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    return { value: x / 0xffffffff, state: x };
  }

  // ============================================================================
  // COUNTER RING LOGIC
  // ============================================================================
  function counters(ring, a, b) {
    const ia = ring.indexOf(a), ib = ring.indexOf(b);
    if (ia < 0 || ib < 0) return false;
    const n = ring.length;
    const d = (ib - ia + n) % n;
    return d === 1 || d === 2;
  }

  // ============================================================================
  // CSS INJECTION
  // ============================================================================
  const BATTLE_CSS = `
/* Battle UI Styles */
.battle-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26, 24, 23, 0.85);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.battle-container {
  background: var(--paper);
  border: 3px solid var(--ink);
  box-shadow: 6px 6px 0 var(--ink);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.battle-header {
  background: var(--manila);
  border-bottom: 3px solid var(--ink);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.battle-title {
  font-family: var(--hand);
  font-size: 20px;
  transform: rotate(-1deg);
}

.battle-status {
  font-family: var(--mono);
  font-size: 11px;
  padding: 4px 8px;
  border: 2px solid var(--ink);
  background: #fff;
}

.battle-status.window { border-color: var(--pencil); }
.battle-status.locked { border-color: var(--crayon); background: var(--crayon); color: #fff; }
.battle-status.resolved { border-color: var(--ink); background: var(--ink); color: var(--paper); }

.battle-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--pencil);
  line-height: 1;
}

.battle-close:hover { color: var(--ink); }

/* Board */
.battle-board {
  padding: 16px;
}

.battle-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  font-family: var(--mono);
  font-size: 11px;
}

.breach-counter {
  display: flex;
  gap: 4px;
}

.breach-pip {
  width: 20px;
  height: 20px;
  border: 2px solid var(--ink);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.breach-pip.filled {
  background: var(--crayon);
  color: #fff;
}

.turn-display {
  font-weight: bold;
}

.turn-timer {
  background: var(--crayon);
  color: #fff;
  padding: 2px 8px;
  font-weight: bold;
}

/* Lanes */
.lanes-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.lane {
  border: 2px solid var(--ink);
  background: #fff;
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

.lane-header {
  background: var(--manila);
  border-bottom: 2px solid var(--ink);
  padding: 8px;
  text-align: center;
  font-family: var(--hand);
  font-size: 14px;
}

.lane-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.lane-side {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 100px;
}

.lane-side.attackers {
  background: rgba(212, 43, 30, 0.05);
  border-bottom: 1px dashed var(--pencil);
}

.lane-side.defenders {
  background: rgba(46, 125, 50, 0.05);
}

.lane-side-label {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--pencil);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.lane-card {
  border: 2px solid var(--ink);
  background: var(--paper);
  padding: 6px;
  font-size: 11px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lane-card .card-name {
  font-family: var(--type);
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}

.lane-card .card-power {
  font-family: var(--mono);
  font-weight: bold;
  color: var(--crayon);
}

.lane-card.heaven { border-left: 3px solid #4CAF50; }
.lane-card.hell { border-left: 3px solid var(--crayon); }

.lane-result {
  text-align: center;
  padding: 8px;
  font-family: var(--mono);
  font-size: 11px;
  border-top: 2px solid var(--ink);
}

.lane-result.breached {
  background: var(--crayon);
  color: #fff;
}

.lane-result.held {
  background: #4CAF50;
  color: #fff;
}

/* Deck Builder */
.deck-builder {
  padding: 16px;
  border-top: 3px solid var(--ink);
  background: var(--manila);
}

.deck-builder-title {
  font-family: var(--hand);
  font-size: 16px;
  margin-bottom: 12px;
}

.card-collection {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background: #fff;
  border: 2px solid var(--ink);
}

.collection-card {
  border: 2px solid var(--ink);
  padding: 8px;
  background: var(--paper);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 11px;
}

.collection-card:hover {
  transform: translateY(-2px);
  box-shadow: 2px 2px 0 var(--ink);
}

.collection-card.selected {
  border-color: var(--crayon);
  background: rgba(212, 43, 30, 0.1);
}

.collection-card.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.collection-card .card-title {
  font-weight: bold;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collection-card .card-stats {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--pencil);
}

.selected-deck {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.deck-slot {
  flex: 1;
  border: 2px dashed var(--pencil);
  padding: 8px;
  text-align: center;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--pencil);
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.deck-slot.filled {
  border-style: solid;
  border-color: var(--ink);
  background: #fff;
  color: var(--ink);
}

/* Intent Selector */
.intent-selector {
  padding: 16px;
  border-top: 3px solid var(--ink);
  background: var(--paper-dark);
}

.intent-title {
  font-family: var(--hand);
  font-size: 16px;
  margin-bottom: 12px;
}

.intent-cards {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.intent-card {
  border: 2px solid var(--ink);
  padding: 8px;
  background: #fff;
  cursor: pointer;
  min-width: 100px;
  text-align: center;
  font-size: 11px;
}

.intent-card:hover { background: var(--manila); }
.intent-card.selected { border-color: var(--crayon); background: rgba(212, 43, 30, 0.1); }
.intent-card.played { opacity: 0.4; cursor: not-allowed; }

.intent-lanes {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.intent-lane-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid var(--ink);
  background: #fff;
  font-family: var(--type);
  font-size: 12px;
  cursor: pointer;
}

.intent-lane-btn:hover { background: var(--manila); }
.intent-lane-btn.selected { background: var(--ink); color: var(--paper); }
.intent-lane-btn.occupied { opacity: 0.4; cursor: not-allowed; }

.intent-actions {
  display: flex;
  gap: 8px;
}

.intent-submit {
  flex: 2;
  padding: 12px;
  font-family: var(--hand);
  font-size: 16px;
  background: var(--crayon);
  color: #fff;
  border: 2px solid var(--ink);
  cursor: pointer;
}

.intent-submit:disabled { opacity: 0.4; cursor: not-allowed; }

.intent-pass {
  flex: 1;
  padding: 12px;
  font-family: var(--type);
  font-size: 12px;
  background: var(--paper);
  border: 2px solid var(--ink);
  cursor: pointer;
}

/* Spectator */
.spectator-bar {
  padding: 12px 16px;
  border-top: 3px solid var(--ink);
  background: var(--manila);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sentiment-vote {
  display: flex;
  gap: 8px;
}

.sentiment-btn {
  padding: 8px 16px;
  border: 2px solid var(--ink);
  background: #fff;
  font-family: var(--type);
  font-size: 12px;
  cursor: pointer;
}

.sentiment-btn:hover { background: var(--paper-dark); }
.sentiment-btn.voted { background: var(--ink); color: var(--paper); }

.spectator-count {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--pencil);
}

/* Battle Result */
.battle-result-overlay {
  position: absolute;
  inset: 0;
  background: rgba(246, 242, 232, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.result-winner {
  font-family: var(--hand);
  font-size: 32px;
  margin-bottom: 16px;
  transform: rotate(-2deg);
}

.result-winner.attackers { color: var(--crayon); }
.result-winner.defenders { color: #4CAF50; }

.result-stats {
  font-family: var(--mono);
  font-size: 12px;
  margin-bottom: 24px;
}

.result-close {
  padding: 12px 32px;
  font-family: var(--hand);
  font-size: 18px;
  background: var(--ink);
  color: var(--paper);
  border: 2px solid var(--ink);
  cursor: pointer;
}

/* Battle List */
.battle-list {
  padding: 16px;
}

.battle-list-item {
  border: 2px solid var(--ink);
  padding: 12px;
  margin-bottom: 8px;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.battle-list-item:hover { background: var(--manila); }

.battle-list-info {
  font-family: var(--type);
  font-size: 13px;
}

.battle-list-meta {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--pencil);
}

.battle-list-action {
  padding: 6px 12px;
  border: 2px solid var(--ink);
  background: var(--paper);
  font-family: var(--type);
  font-size: 11px;
  cursor: pointer;
}

.battle-list-action:hover { background: var(--manila); }

/* Join Modal */
.join-modal {
  padding: 24px;
}

.join-title {
  font-family: var(--hand);
  font-size: 20px;
  margin-bottom: 16px;
}

.join-sides {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.join-side-btn {
  flex: 1;
  padding: 24px;
  border: 3px solid var(--ink);
  background: #fff;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
}

.join-side-btn:hover { transform: translateY(-2px); box-shadow: 4px 4px 0 var(--ink); }
.join-side-btn.selected { border-color: var(--crayon); background: rgba(212, 43, 30, 0.1); }

.join-side-btn .side-name {
  font-family: var(--hand);
  font-size: 18px;
  margin-bottom: 8px;
}

.join-side-btn .side-count {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--pencil);
}

@media (max-width: 600px) {
  .lanes-container {
    grid-template-columns: 1fr;
  }

  .lane {
    min-height: 200px;
  }

  .card-collection {
    grid-template-columns: repeat(2, 1fr);
  }

  .selected-deck {
    flex-wrap: wrap;
  }

  .deck-slot {
    flex: 1 1 45%;
  }
}
`;

  // Inject CSS
  function injectStyles() {
    if (document.getElementById('battle-styles')) return;
    const style = document.createElement('style');
    style.id = 'battle-styles';
    style.textContent = BATTLE_CSS;
    document.head.appendChild(style);
  }

  // ============================================================================
  // HTML TEMPLATES
  // ============================================================================
  function battleOverlayHTML() {
    return `
      <div class="battle-overlay" id="battle-overlay">
        <div class="battle-container" id="battle-container">
          <div class="battle-header">
            <span class="battle-title">⚔️ BATTLE ARENA</span>
            <span class="battle-status" id="battle-status">JOINING</span>
            <button class="battle-close" id="battle-close">&times;</button>
          </div>
          <div id="battle-content">
            <!-- Dynamic content -->
          </div>
        </div>
      </div>
    `;
  }

  function deckBuilderHTML(cards) {
    const cardItems = cards.map((c, i) => `
      <div class="collection-card ${selectedDeck.includes(i) ? 'selected' : ''}"
           data-idx="${i}" onclick="BattleUI.toggleCard(${i})">
        <div class="card-title">${escapeHtml(c.name || c.title || 'Product')}</div>
        <div class="card-stats">
          PWR: ${c.power || 5} | ${c.category || 'other'}
        </div>
      </div>
    `).join('');

    const deckSlots = Array(ECONOMY.DECK_SIZE).fill(0).map((_, i) => {
      const card = selectedDeck[i] !== undefined ? cards[selectedDeck[i]] : null;
      return `
        <div class="deck-slot ${card ? 'filled' : ''}">
          ${card ? escapeHtml(card.name || card.title || 'Product') : `Slot ${i + 1}`}
        </div>
      `;
    }).join('');

    return `
      <div class="deck-builder">
        <div class="deck-builder-title">SELECT YOUR DECK (${selectedDeck.length}/${ECONOMY.DECK_SIZE})</div>
        <div class="card-collection">${cardItems}</div>
        <div class="selected-deck">${deckSlots}</div>
        <button class="intent-submit" id="confirm-deck-btn"
                ${selectedDeck.length !== ECONOMY.DECK_SIZE ? 'disabled' : ''}
                onclick="BattleUI.confirmDeck()">
          CONFIRM DECK
        </button>
      </div>
    `;
  }

  function battleBoardHTML(state) {
    if (!state) return '<div class="loading">Loading battle...</div>';

    const breachPips = Array(ECONOMY.BREACH_POINTS_TO_WIN).fill(0).map((_, i) => `
      <div class="breach-pip ${i < state.breachPoints ? 'filled' : ''}">${i < state.breachPoints ? '×' : ''}</div>
    `).join('');

    const lanesHTML = ECONOMY.LANES.map(lane => {
      const laneName = ECONOMY.LANE_NAMES[lane] || lane;
      const attackerCards = state.placements
        .filter(p => p.lane === lane && p.side === 'attackers')
        .map(p => {
          const found = findCardInState(state, p.instanceId);
          return found ? cardInLaneHTML(found.card) : '';
        }).join('');

      const defenderCards = state.placements
        .filter(p => p.lane === lane && p.side === 'defenders')
        .map(p => {
          const found = findCardInState(state, p.instanceId);
          return found ? cardInLaneHTML(found.card) : '';
        }).join('');

      const turnLog = state.turnLogs[state.turnLogs.length - 1];
      const laneResult = turnLog?.lanes?.find(l => l.lane === lane);
      const resultHTML = laneResult ? `
        <div class="lane-result ${laneResult.breached ? 'breached' : 'held'}">
          ${laneResult.breached ? 'BREACHED' : 'HELD'}
          (${laneResult.attackerPower} vs ${laneResult.defenderPower})
        </div>
      ` : '';

      return `
        <div class="lane" data-lane="${lane}">
          <div class="lane-header">${laneName}</div>
          <div class="lane-body">
            <div class="lane-side attackers">
              <div class="lane-side-label">Attackers</div>
              ${attackerCards || '<div style="color:var(--pencil);font-size:10px">Empty</div>'}
            </div>
            <div class="lane-side defenders">
              <div class="lane-side-label">Defenders</div>
              ${defenderCards || '<div style="color:var(--pencil);font-size:10px">Empty</div>'}
            </div>
          </div>
          ${resultHTML}
        </div>
      `;
    }).join('');

    return `
      <div class="battle-board">
        <div class="battle-info">
          <div class="breach-counter">
            <span style="margin-right:8px">BREACH:</span>
            ${breachPips}
          </div>
          <div class="turn-display">
            TURN ${state.turn || 0} / ${ECONOMY.TURNS}
          </div>
          <div class="turn-timer" id="turn-timer">
            ${turnTimeLeft > 0 ? turnTimeLeft + 's' : '--'}
          </div>
        </div>
        <div class="lanes-container">
          ${lanesHTML}
        </div>
      </div>
      ${state.phase === 'resolved' ? battleResultHTML(state) : ''}
    `;
  }

  function cardInLaneHTML(card) {
    return `
      <div class="lane-card ${card.faction || 'hell'}">
        <span class="card-name">${escapeHtml(card.name || 'Card')}</span>
        <span class="card-power">${card.power || 5}</span>
      </div>
    `;
  }

  function intentSelectorHTML(state, myDeck, myPlacements) {
    if (!state || state.phase !== 'locked') return '';

    const playedIds = myPlacements.map(p => p.instanceId);
    const availableCards = myDeck.filter(c => !playedIds.includes(c.instanceId));

    const cardButtons = availableCards.map(c => `
      <div class="intent-card ${currentIntent?.instanceId === c.instanceId ? 'selected' : ''}"
           data-id="${c.instanceId}" onclick="BattleUI.selectIntentCard('${c.instanceId}')">
        <div style="font-weight:bold">${escapeHtml(c.name || 'Card')}</div>
        <div style="font-family:var(--mono);font-size:10px">PWR: ${c.power}</div>
      </div>
    `).join('');

    const myOccupiedLanes = myPlacements.map(p => p.lane);
    const laneButtons = ECONOMY.LANES.map(lane => {
      const occupied = myOccupiedLanes.includes(lane);
      return `
        <button class="intent-lane-btn ${currentIntent?.lane === lane ? 'selected' : ''} ${occupied ? 'occupied' : ''}"
                data-lane="${lane}"
                ${occupied ? 'disabled' : ''}
                onclick="BattleUI.selectIntentLane('${lane}')">
          ${ECONOMY.LANE_NAMES[lane] || lane}
          ${occupied ? '(occupied)' : ''}
        </button>
      `;
    }).join('');

    const canSubmit = currentIntent?.instanceId && currentIntent?.lane && !myOccupiedLanes.includes(currentIntent.lane);

    return `
      <div class="intent-selector">
        <div class="intent-title">YOUR MOVE (${turnTimeLeft}s)</div>
        <div class="intent-cards">${cardButtons || '<div style="color:var(--pencil)">All cards played</div>'}</div>
        <div class="intent-lanes">${laneButtons}</div>
        <div class="intent-actions">
          <button class="intent-submit" ${canSubmit ? '' : 'disabled'} onclick="BattleUI.submitIntent()">
            PLAY CARD
          </button>
          <button class="intent-pass" onclick="BattleUI.submitPass()">
            PASS
          </button>
        </div>
      </div>
    `;
  }

  function battleResultHTML(state) {
    if (!state || state.phase !== 'resolved') return '';

    return `
      <div class="battle-result-overlay">
        <div class="result-winner ${state.winner}">
          ${state.winner === 'attackers' ? '⚔️ ATTACKERS WIN!' : '🛡️ DEFENDERS HOLD!'}
        </div>
        <div class="result-stats">
          Breach Points: ${state.breachPoints} / ${ECONOMY.BREACH_POINTS_TO_WIN}<br>
          Turns: ${state.turn} / ${ECONOMY.TURNS}
        </div>
        <button class="result-close" onclick="BattleUI.close()">CLOSE</button>
      </div>
    `;
  }

  function spectatorBarHTML(state) {
    return `
      <div class="spectator-bar">
        <div class="sentiment-vote">
          <span style="margin-right:8px;font-family:var(--mono);font-size:11px">SENTIMENT:</span>
          <button class="sentiment-btn" onclick="BattleUI.voteSentiment('attackers')">⚔️ Attack</button>
          <button class="sentiment-btn" onclick="BattleUI.voteSentiment('defenders')">🛡️ Defend</button>
        </div>
        <div class="spectator-count">
          ${state?.combatants?.length || 0} combatants
        </div>
      </div>
    `;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[c]);
  }

  function findCardInState(state, instanceId) {
    for (const c of state.combatants) {
      const card = c.deck.find(d => d.instanceId === instanceId);
      if (card) return { card, owner: c };
    }
    return null;
  }

  function getMyDeck() {
    if (!battleState) return [];
    const uid = window.S?.uid;
    if (!uid) return [];
    const me = battleState.combatants.find(c => c.userId === uid);
    return me?.deck || [];
  }

  function getMyPlacements() {
    if (!battleState) return [];
    const uid = window.S?.uid;
    if (!uid) return [];
    return battleState.placements.filter(p => p.owner === uid);
  }

  function getMySide() {
    if (!battleState) return null;
    const uid = window.S?.uid;
    if (!uid) return null;
    const me = battleState.combatants.find(c => c.userId === uid);
    return me?.side || null;
  }

  // ============================================================================
  // API CALLS
  // ============================================================================
  async function fetchBattle(battleId) {
    const sb = window.sb || window.supabaseClient;
    if (!sb) return null;

    const { data: events } = await sb
      .from('battle_events')
      .select('*')
      .eq('battle_id', battleId)
      .order('seq', { ascending: true });

    if (!events) return null;

    // Reconstruct state from events (simplified reducer)
    return reconstructState(battleId, events);
  }

  function reconstructState(battleId, events) {
    const state = {
      battleId,
      kind: 'raid',
      phase: 'window',
      ring: DEFAULT_RING,
      strategy: 'none',
      combatants: [],
      placements: [],
      turn: 0,
      breachPoints: 0,
      breachContribution: {},
      turnLogs: [],
      sentimentSide: null,
      winner: null,
      seed: seedFromString(battleId)
    };

    for (const ev of events) {
      switch (ev.type) {
        case 'battle_declared':
          state.kind = ev.payload.kind || 'raid';
          state.ring = ev.payload.ring || DEFAULT_RING;
          state.strategy = ev.payload.strategy || 'none';
          break;
        case 'combatant_joined':
          if (state.combatants.length < ECONOMY.SIDE_SIZE * 2) {
            state.combatants.push({
              userId: ev.actor_id,
              side: ev.payload.side,
              deck: ev.payload.deck || [],
              isBot: !!ev.payload.isBot,
              isOwner: !!ev.payload.isOwner
            });
          }
          break;
        case 'window_locked':
          state.phase = 'locked';
          break;
        case 'turn_opened':
          state.turn = ev.payload.turn;
          break;
        case 'turn_resolved':
          // Apply placements from intents
          if (ev.payload.intents) {
            for (const { actor, intent } of ev.payload.intents) {
              if (intent.action === 'play') {
                state.placements.push({
                  instanceId: intent.instanceId,
                  lane: intent.lane,
                  owner: actor,
                  side: state.combatants.find(c => c.userId === actor)?.side || 'attackers'
                });
              }
            }
          }
          // Record turn results
          if (ev.payload.lanes) {
            const breachCount = ev.payload.lanes.filter(l => l.breached).length;
            if (breachCount >= 2) state.breachPoints++;
            state.turnLogs.push({
              turn: ev.payload.turn,
              lanes: ev.payload.lanes,
              breachPoint: breachCount >= 2
            });
          }
          break;
        case 'sentiment_final':
          state.sentimentSide = ev.payload.side;
          break;
        case 'battle_ended':
          state.phase = 'resolved';
          state.winner = ev.payload.winner;
          break;
        case 'battle_cancelled':
          state.phase = 'cancelled';
          break;
      }
    }

    return state;
  }

  async function callReferee(action, payload) {
    const sb = window.sb || window.supabaseClient;
    if (!sb) throw new Error('No Supabase client');

    const { data, error } = await sb.functions.invoke('battle-referee', {
      body: { action, ...payload }
    });

    if (error) throw error;
    return data;
  }

  // ============================================================================
  // UI FUNCTIONS
  // ============================================================================
  function render() {
    const content = document.getElementById('battle-content');
    if (!content) return;

    const statusEl = document.getElementById('battle-status');
    if (statusEl && battleState) {
      statusEl.textContent = battleState.phase.toUpperCase();
      statusEl.className = 'battle-status ' + battleState.phase;
    }

    let html = '';

    if (battleState) {
      html += battleBoardHTML(battleState);

      const mySide = getMySide();
      if (mySide && battleState.phase === 'locked') {
        html += intentSelectorHTML(battleState, getMyDeck(), getMyPlacements());
      }

      if (!mySide && battleState.phase !== 'resolved') {
        html += spectatorBarHTML(battleState);
      }
    }

    content.innerHTML = html;
  }

  function startTurnTimer(seconds) {
    clearInterval(turnTimer);
    turnTimeLeft = seconds;
    turnTimer = setInterval(() => {
      turnTimeLeft--;
      const timerEl = document.getElementById('turn-timer');
      if (timerEl) timerEl.textContent = turnTimeLeft > 0 ? turnTimeLeft + 's' : '--';
      if (turnTimeLeft <= 0) {
        clearInterval(turnTimer);
      }
    }, 1000);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  const BattleUI = {
    // Open battle UI
    open: async function(battleId) {
      injectStyles();

      // Create overlay if not exists
      if (!document.getElementById('battle-overlay')) {
        document.body.insertAdjacentHTML('beforeend', battleOverlayHTML());
        document.getElementById('battle-close').onclick = BattleUI.close;
      }

      document.getElementById('battle-overlay').style.display = 'flex';

      if (battleId) {
        battleState = await fetchBattle(battleId);
        render();
        this.subscribe(battleId);
      }
    },

    // Close battle UI
    close: function() {
      const overlay = document.getElementById('battle-overlay');
      if (overlay) overlay.style.display = 'none';

      battleState = null;
      selectedDeck = [];
      currentIntent = null;
      clearInterval(turnTimer);

      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
        realtimeChannel = null;
      }
      clearInterval(pollingInterval);
    },

    // Show deck builder
    showDeckBuilder: function(cards) {
      injectStyles();

      if (!document.getElementById('battle-overlay')) {
        document.body.insertAdjacentHTML('beforeend', battleOverlayHTML());
        document.getElementById('battle-close').onclick = BattleUI.close;
      }

      document.getElementById('battle-overlay').style.display = 'flex';
      document.getElementById('battle-status').textContent = 'DECK BUILDER';
      document.getElementById('battle-content').innerHTML = deckBuilderHTML(cards);
    },

    // Toggle card in deck
    toggleCard: function(idx) {
      const i = selectedDeck.indexOf(idx);
      if (i >= 0) {
        selectedDeck.splice(i, 1);
      } else if (selectedDeck.length < ECONOMY.DECK_SIZE) {
        selectedDeck.push(idx);
      }
      // Re-render deck builder
      const cards = window.S?.cardInstances || window.S?.portfolio || [];
      document.getElementById('battle-content').innerHTML = deckBuilderHTML(cards);
    },

    // Confirm deck selection
    confirmDeck: async function() {
      if (selectedDeck.length !== ECONOMY.DECK_SIZE) return;

      const cards = window.S?.cardInstances || window.S?.portfolio || [];
      const deck = selectedDeck.map(i => {
        const c = cards[i];
        return {
          instanceId: c.id || `card-${i}`,
          cardId: c.card_id || c.id,
          name: c.name || c.title || 'Product',
          category: c.category || 'other',
          faction: c.faction || 'hell',
          power: c.power || 5
        };
      });

      // Store for joining
      window._selectedBattleDeck = deck;
      alert('Deck selected! Now join a battle.');
      BattleUI.close();
    },

    // Join a battle
    join: async function(battleId, side) {
      const deck = window._selectedBattleDeck;
      if (!deck || deck.length !== ECONOMY.DECK_SIZE) {
        alert('Please select a deck first');
        return;
      }

      try {
        await callReferee('join', { battleId, side, deck });
        await BattleUI.open(battleId);
      } catch (e) {
        console.error('Join failed:', e);
        alert('Failed to join: ' + e.message);
      }
    },

    // Intent selection
    selectIntentCard: function(instanceId) {
      currentIntent = currentIntent || {};
      currentIntent.instanceId = instanceId;
      render();
    },

    selectIntentLane: function(lane) {
      const myOccupiedLanes = getMyPlacements().map(p => p.lane);
      if (myOccupiedLanes.includes(lane)) return;

      currentIntent = currentIntent || {};
      currentIntent.lane = lane;
      render();
    },

    submitIntent: async function() {
      if (!currentIntent?.instanceId || !currentIntent?.lane) return;
      if (!battleState) return;

      try {
        await callReferee('intent', {
          battleId: battleState.battleId,
          turn: battleState.turn,
          intent: {
            action: 'play',
            instanceId: currentIntent.instanceId,
            lane: currentIntent.lane
          }
        });
        currentIntent = null;
        render();
      } catch (e) {
        console.error('Intent failed:', e);
        alert('Failed to submit: ' + e.message);
      }
    },

    submitPass: async function() {
      if (!battleState) return;

      try {
        await callReferee('intent', {
          battleId: battleState.battleId,
          turn: battleState.turn,
          intent: { action: 'pass' }
        });
        currentIntent = null;
        render();
      } catch (e) {
        console.error('Pass failed:', e);
      }
    },

    // Spectator sentiment
    voteSentiment: async function(side) {
      if (!battleState) return;

      try {
        const sb = window.sb || window.supabaseClient;
        await sb.from('battle_sentiment').upsert({
          battle_id: battleState.battleId,
          user_id: window.S?.uid,
          side: side
        });
      } catch (e) {
        console.error('Sentiment vote failed:', e);
      }
    },

    // Subscribe to battle updates
    subscribe: function(battleId) {
      const sb = window.sb || window.supabaseClient;
      if (!sb) return;

      // Realtime subscription
      realtimeChannel = sb
        .channel(`battle:${battleId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_events',
          filter: `battle_id=eq.${battleId}`
        }, async () => {
          battleState = await fetchBattle(battleId);
          render();
        })
        .subscribe();

      // Also poll every 2 seconds as backup
      pollingInterval = setInterval(async () => {
        battleState = await fetchBattle(battleId);
        render();
      }, 2000);
    },

    // Create new battle (for testing)
    create: async function(productId, kind = 'raid') {
      try {
        const result = await callReferee('declare', { productId, kind });
        console.log('Battle created:', result);
        return result.battleId;
      } catch (e) {
        console.error('Create failed:', e);
        alert('Failed to create battle: ' + e.message);
      }
    },

    // List active battles
    listActive: async function() {
      const sb = window.sb || window.supabaseClient;
      if (!sb) return [];

      const { data } = await sb
        .from('battles')
        .select('*')
        .in('state', ['window', 'locked'])
        .order('created_at', { ascending: false })
        .limit(20);

      return data || [];
    }
  };

  // Expose to window
  window.BattleUI = BattleUI;

  console.log('BattleUI loaded');
})();
