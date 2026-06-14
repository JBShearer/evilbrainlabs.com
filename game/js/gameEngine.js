// ============================================
// Game Engine - State Machine & Logic
// ============================================

class GameEngine {
    constructor() {
        this.gameState = {
            currentNodeId: 'start',
            nodeHistory: [],
            visitedNodes: new Map(),
            playerChoices: new Set(),
            stats: {
                absurdism: 0,
                professionalism: 0,
                chaos: 0
            },
            hiddenVariables: {
                exitClicks: 0,
                konamiActivated: false,
                brokeF ourthWall: false,
                productsCreated: 0,
                reachedEnding: false
            },
            achievements: new Set(),
            playTime: 0,
            loopCount: 0,
            startTime: Date.now()
        };

        this.narrative = null;
        this.autoSaveInterval = null;
        this.konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        this.konamiProgress = 0;

        this.init();
    }

    async init() {
        // Load narrative data
        await this.loadNarrative();

        // Setup event listeners
        this.setupEventListeners();

        // Setup konami code detector
        this.setupKonamiCode();

        // Start auto-save
        this.startAutoSave();

        // Load autosave if exists
        const autosave = saveManager.loadFromSlot('autosave');
        if (autosave) {
            if (confirm('Continue from autosave?')) {
                this.loadGameState(autosave);
            }
        }

        // Display first node
        await this.goToNode(this.gameState.currentNodeId);
    }

    async loadNarrative() {
        try {
            const response = await fetch('data/narrative.json');
            this.narrative = await response.json();
        } catch (error) {
            console.error('Failed to load narrative:', error);
        }
    }

    setupEventListeners() {
        // Control buttons
        document.getElementById('btn-save').addEventListener('click', () => this.showSaveModal());
        document.getElementById('btn-load').addEventListener('click', () => this.showLoadModal());
        document.getElementById('btn-achievements').addEventListener('click', () => this.showAchievementsModal());
        document.getElementById('btn-restart').addEventListener('click', () => this.restart());
        document.getElementById('btn-sound').addEventListener('click', () => this.toggleSound());
        document.getElementById('btn-exit').addEventListener('click', () => this.handleExit());

        // Modal close buttons
        document.getElementById('modal-close').addEventListener('click', () => this.hideModal('save-load-modal'));
        document.getElementById('achievements-close').addEventListener('click', () => this.hideModal('achievements-modal'));

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    setupKonamiCode() {
        document.addEventListener('keydown', (e) => {
            const key = e.key === 'b' || e.key === 'a' ? e.key : e.code;

            if (key === this.konamiSequence[this.konamiProgress]) {
                this.konamiProgress++;

                if (this.konamiProgress === this.konamiSequence.length) {
                    this.activateKonamiCode();
                    this.konamiProgress = 0;
                }
            } else {
                this.konamiProgress = 0;
            }
        });
    }

    activateKonamiCode() {
        if (this.gameState.hiddenVariables.konamiActivated) return;

        this.gameState.hiddenVariables.konamiActivated = true;
        audioEngine.unlock();
        this.checkAchievements();

        // Go to secret node
        if (this.narrative.konami_secret) {
            this.goToNode('konami_secret');
        } else {
            alert('🎮 KONAMI CODE ACTIVATED! Secret achievement unlocked!');
        }
    }

    async goToNode(nodeId, fromChoice = false) {
        // Show loading
        this.showLoading(true);

        // Get node data
        const node = this.narrative[nodeId];
        if (!node) {
            console.error('Node not found:', nodeId);
            this.showLoading(false);
            return;
        }

        // Update visited nodes
        const visitCount = (this.gameState.visitedNodes.get(nodeId) || 0) + 1;
        this.gameState.visitedNodes.set(nodeId, visitCount);

        // Check for loopback
        if (node.loopback && node.loopback.enabled && visitCount >= (node.loopback.minVisits || 2)) {
            const loopChance = node.loopback.probability || 0.3;

            if (Math.random() < loopChance) {
                // Trigger loopback
                const targets = node.loopback.targets || ['start'];
                const targetId = targets[Math.floor(Math.random() * targets.length)];

                this.gameState.loopCount++;
                audioEngine.loopback();

                // Show loopback message
                const loopMessage = document.getElementById('loopback-message');
                loopMessage.style.display = 'block';
                loopMessage.querySelector('.glitch').textContent =
                    node.loopback.message || '⚠️ TEMPORAL ANOMALY DETECTED ⚠️';

                // Wait 2 seconds then jump to target
                await new Promise(resolve => setTimeout(resolve, 2000));
                loopMessage.style.display = 'none';

                this.goToNode(targetId);
                return;
            }
        }

        // Add to history
        this.gameState.nodeHistory.push(nodeId);
        this.gameState.currentNodeId = nodeId;

        // Apply state effects
        if (node.effects) {
            this.applyEffects(node.effects);
        }

        // Check for special hooks
        if (node.onEnter) {
            this.executeHook(node.onEnter);
        }

        // Render node
        this.renderNode(node);

        // Play sound
        if (fromChoice) {
            audioEngine.transition();
        }

        // Check achievements
        this.checkAchievements();

        // Hide loading
        this.showLoading(false);
    }

    renderNode(node) {
        // Update ASCII art
        const asciiDisplay = document.getElementById('ascii-display');
        if (node.ascii) {
            asciiDisplay.innerHTML = `<pre class="ascii-art">${node.ascii}</pre>`;
        }

        // Update narrative text
        const narrativeText = document.getElementById('narrative-text');
        narrativeText.innerHTML = `<p>${node.text}</p>`;

        // Render choices
        this.renderChoices(node.choices || []);

        // Update stats display
        this.updateStatsDisplay();
    }

    renderChoices(choices) {
        const container = document.getElementById('choices-container');
        container.innerHTML = '';

        choices.forEach((choice, index) => {
            // Check if choice is available
            const available = this.checkChoiceConditions(choice.conditions);

            const button = document.createElement('button');
            button.className = 'choice-button' + (available ? '' : ' disabled');
            button.textContent = choice.text;

            if (available) {
                button.addEventListener('click', () => {
                    audioEngine.select();
                    this.makeChoice(choice);
                });

                button.addEventListener('mouseenter', () => {
                    audioEngine.hover();
                });
            }

            container.appendChild(button);
        });
    }

    checkChoiceConditions(conditions) {
        if (!conditions) return true;

        // Check required stats
        if (conditions.minStats) {
            for (const [stat, value] of Object.entries(conditions.minStats)) {
                if (this.gameState.stats[stat] < value) return false;
            }
        }

        // Check required choices
        if (conditions.requires) {
            for (const choiceId of conditions.requires) {
                if (!this.gameState.playerChoices.has(choiceId)) return false;
            }
        }

        // Check excluded choices
        if (conditions.excludes) {
            for (const choiceId of conditions.excludes) {
                if (this.gameState.playerChoices.has(choiceId)) return false;
            }
        }

        return true;
    }

    makeChoice(choice) {
        // Record choice
        if (choice.id) {
            this.gameState.playerChoices.add(choice.id);
        }

        // Apply effects
        if (choice.effects) {
            this.applyEffects(choice.effects);
        }

        // Go to target node
        this.goToNode(choice.target, true);
    }

    applyEffects(effects) {
        // Update stats
        if (effects.stats) {
            for (const [stat, value] of Object.entries(effects.stats)) {
                this.gameState.stats[stat] = (this.gameState.stats[stat] || 0) + value;
            }
        }

        // Update hidden variables
        if (effects.hiddenVars) {
            for (const [key, value] of Object.entries(effects.hiddenVars)) {
                this.gameState.hiddenVariables[key] = value;
            }
        }

        // Unlock achievements
        if (effects.achievements) {
            effects.achievements.forEach(achId => {
                achievementTracker.unlockAchievement(achId);
            });
        }
    }

    executeHook(hookName) {
        // Special node hooks
        const hooks = {
            checkKonami: () => {
                if (this.gameState.hiddenVariables.konamiActivated) {
                    // Unlock special path
                }
            },
            endingReached: () => {
                this.gameState.hiddenVariables.reachedEnding = true;
            },
            productCreated: () => {
                this.gameState.hiddenVariables.productsCreated++;
            }
        };

        if (hooks[hookName]) {
            hooks[hookName]();
        }
    }

    checkAchievements() {
        const newlyUnlocked = achievementTracker.checkAchievements(this.gameState);

        // Update achievement count display
        const count = achievementTracker.getProgress().unlocked;
        document.getElementById('achievement-count').textContent = count;
    }

    updateStatsDisplay() {
        document.getElementById('stat-absurdism').textContent = this.gameState.stats.absurdism;
        document.getElementById('stat-professionalism').textContent = this.gameState.stats.professionalism;
        document.getElementById('stat-chaos').textContent = this.gameState.stats.chaos;
        document.getElementById('stat-loops').textContent = this.gameState.loopCount;
    }

    showLoading(show) {
        document.getElementById('loading-indicator').style.display = show ? 'block' : 'none';
        document.getElementById('choices-container').style.display = show ? 'none' : 'flex';
    }

    // Save/Load
    showSaveModal() {
        this.renderSaveSlots('save');
        document.getElementById('modal-title').textContent = 'Save Game';
        document.getElementById('save-load-modal').style.display = 'flex';
    }

    showLoadModal() {
        this.renderSaveSlots('load');
        document.getElementById('modal-title').textContent = 'Load Game';
        document.getElementById('save-load-modal').style.display = 'flex';
    }

    renderSaveSlots(mode) {
        const container = document.getElementById('save-slots');
        container.innerHTML = '';

        const slots = ['slot1', 'slot2', 'slot3', 'autosave'];

        slots.forEach(slotId => {
            const saveInfo = saveManager.getSaveInfo(slotId);
            const slot = document.createElement('div');
            slot.className = 'save-slot' + (saveInfo ? '' : ' empty');

            if (saveInfo) {
                slot.innerHTML = `
                    <div class="save-slot-title">${slotId === 'autosave' ? '💾 Auto Save' : '💾 Save ' + slotId.slice(-1)}</div>
                    <div class="save-slot-info">
                        ${saveManager.formatTimestamp(saveInfo.timestamp)}<br>
                        Absurdism: ${saveInfo.stats.absurdism} | Loops: ${saveInfo.loopCount}
                    </div>
                `;
            } else {
                slot.innerHTML = `
                    <div class="save-slot-title">${slotId === 'autosave' ? '💾 Auto Save' : '💾 Save ' + slotId.slice(-1)}</div>
                    <div class="save-slot-info">Empty Slot</div>
                `;
            }

            slot.addEventListener('click', () => {
                if (mode === 'save') {
                    this.saveGame(slotId);
                } else if (mode === 'load' && saveInfo) {
                    this.loadGame(slotId);
                }
            });

            container.appendChild(slot);
        });
    }

    saveGame(slotId) {
        const success = saveManager.saveToSlot(slotId, this.gameState);
        if (success) {
            audioEngine.click();
            alert('Game saved!');
            this.hideModal('save-load-modal');
        } else {
            audioEngine.error();
            alert('Failed to save game.');
        }
    }

    loadGame(slotId) {
        const gameState = saveManager.loadFromSlot(slotId);
        if (gameState) {
            this.loadGameState(gameState);
            audioEngine.click();
            this.hideModal('save-load-modal');
        } else {
            audioEngine.error();
            alert('Failed to load game.');
        }
    }

    loadGameState(gameState) {
        this.gameState = gameState;
        achievementTracker.loadAchievements(gameState.achievements);
        this.goToNode(gameState.currentNodeId);
        this.updateStatsDisplay();
        this.checkAchievements();
    }

    showAchievementsModal() {
        const container = document.getElementById('achievements-list');
        container.innerHTML = '';

        const achievements = achievementTracker.getAllAchievements();
        achievements.forEach(ach => {
            const item = document.createElement('div');
            item.className = 'achievement-item' + (ach.unlocked ? '' : ' locked');
            item.innerHTML = `
                <div class="achievement-item-icon">${ach.unlocked ? ach.icon : '🔒'}</div>
                <div>
                    <div class="achievement-item-title">${ach.title}</div>
                    <div class="achievement-item-desc">${ach.description}</div>
                </div>
            `;
            container.appendChild(item);
        });

        document.getElementById('achievements-modal').style.display = 'flex';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    restart() {
        if (confirm('Are you sure you want to restart? All progress will be lost.')) {
            this.gameState = {
                currentNodeId: 'start',
                nodeHistory: [],
                visitedNodes: new Map(),
                playerChoices: new Set(),
                stats: { absurdism: 0, professionalism: 0, chaos: 0 },
                hiddenVariables: {
                    exitClicks: 0,
                    konamiActivated: false,
                    brokeF ourthWall: false,
                    productsCreated: 0,
                    reachedEnding: false
                },
                achievements: new Set(),
                playTime: 0,
                loopCount: 0,
                startTime: Date.now()
            };

            this.goToNode('start');
            audioEngine.click();
        }
    }

    toggleSound() {
        const enabled = audioEngine.toggleSound();
        document.getElementById('sound-status').textContent = enabled ? 'ON' : 'OFF';
        audioEngine.click();
    }

    handleExit() {
        this.gameState.hiddenVariables.exitClicks++;
        this.checkAchievements();

        if (this.gameState.hiddenVariables.exitClicks >= 3) {
            if (confirm('Achievement unlocked: Persistent Quitter! Really exit?')) {
                window.location.href = '/';
            }
        } else {
            if (confirm('Exit to main site?')) {
                window.location.href = '/';
            }
        }
    }

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.gameState.playTime = Math.floor((Date.now() - this.gameState.startTime) / 1000);
            saveManager.autoSave(this.gameState);
        }, 30000); // Every 30 seconds
    }
}

// Initialize game when DOM is ready
let gameEngine;
document.addEventListener('DOMContentLoaded', () => {
    gameEngine = new GameEngine();
});
