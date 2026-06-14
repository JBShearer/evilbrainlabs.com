// ============================================
// Save Manager - LocalStorage Persistence
// ============================================

const SAVE_KEY_PREFIX = 'aiProductGame_';
const SAVES_KEY = SAVE_KEY_PREFIX + 'saves';
const SETTINGS_KEY = SAVE_KEY_PREFIX + 'settings';

class SaveManager {
    constructor() {
        this.saves = this.loadAllSaves();
        this.settings = this.loadSettings();
    }

    // Load all saves from localStorage
    loadAllSaves() {
        try {
            const data = localStorage.getItem(SAVES_KEY);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Failed to load saves:', error);
            return {};
        }
    }

    // Load settings
    loadSettings() {
        try {
            const data = localStorage.getItem(SETTINGS_KEY);
            return data ? JSON.parse(data) : { soundEnabled: true };
        } catch (error) {
            console.error('Failed to load settings:', error);
            return { soundEnabled: true };
        }
    }

    // Create save state from current game
    createSaveState(gameState) {
        return {
            version: 1,
            timestamp: Date.now(),
            gameState: {
                currentNodeId: gameState.currentNodeId,
                nodeHistory: gameState.nodeHistory,
                visitedNodes: Array.from(gameState.visitedNodes.entries()),
                playerChoices: Array.from(gameState.playerChoices),
                stats: { ...gameState.stats },
                hiddenVariables: { ...gameState.hiddenVariables },
                achievements: Array.from(gameState.achievements),
                playTime: gameState.playTime,
                loopCount: gameState.loopCount
            }
        };
    }

    // Save to specific slot
    saveToSlot(slotNumber, gameState) {
        try {
            const saveData = this.createSaveState(gameState);
            this.saves[slotNumber] = saveData;
            localStorage.setItem(SAVES_KEY, JSON.stringify(this.saves));
            return true;
        } catch (error) {
            console.error('Failed to save:', error);
            return false;
        }
    }

    // Load from specific slot
    loadFromSlot(slotNumber) {
        try {
            const saveData = this.saves[slotNumber];
            if (!saveData) return null;

            // Convert arrays back to Sets/Maps
            const gameState = {
                ...saveData.gameState,
                visitedNodes: new Map(saveData.gameState.visitedNodes),
                playerChoices: new Set(saveData.gameState.playerChoices),
                achievements: new Set(saveData.gameState.achievements)
            };

            return gameState;
        } catch (error) {
            console.error('Failed to load save:', error);
            return null;
        }
    }

    // Delete save slot
    deleteSlot(slotNumber) {
        try {
            delete this.saves[slotNumber];
            localStorage.setItem(SAVES_KEY, JSON.stringify(this.saves));
            return true;
        } catch (error) {
            console.error('Failed to delete save:', error);
            return false;
        }
    }

    // Get save info for UI
    getSaveInfo(slotNumber) {
        const save = this.saves[slotNumber];
        if (!save) return null;

        return {
            slotNumber,
            timestamp: save.timestamp,
            currentNode: save.gameState.currentNodeId,
            stats: save.gameState.stats,
            playTime: save.gameState.playTime,
            loopCount: save.gameState.loopCount
        };
    }

    // Get all save info
    getAllSaveInfo() {
        return Object.keys(this.saves).map(slot => this.getSaveInfo(slot));
    }

    // Save settings
    saveSettings(settings) {
        try {
            this.settings = settings;
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    // Auto-save
    autoSave(gameState) {
        return this.saveToSlot('autosave', gameState);
    }

    // Format timestamp for display
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Format playtime for display
    formatPlayTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }
}

// Global save manager instance
const saveManager = new SaveManager();
