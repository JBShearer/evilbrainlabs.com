// ============================================
// Achievements System
// ============================================

const ACHIEVEMENTS = {
    first_choice: {
        id: 'first_choice',
        title: 'First Steps',
        description: 'Made your first choice',
        icon: '🚶',
        condition: (state) => state.playerChoices.size >= 1
    },
    deja_vu: {
        id: 'deja_vu',
        title: 'Déjà Vu',
        description: 'Experienced your first narrative loop',
        icon: '🌀',
        condition: (state) => state.loopCount >= 1
    },
    loop_master: {
        id: 'loop_master',
        title: 'Loop Master',
        description: 'Get caught in loops 5 times',
        icon: '♾️',
        condition: (state) => state.loopCount >= 5
    },
    explorer: {
        id: 'explorer',
        title: 'Explorer',
        description: 'Visit 10 different nodes',
        icon: '🗺️',
        condition: (state) => state.visitedNodes.size >= 10
    },
    completionist: {
        id: 'completionist',
        title: 'Completionist',
        description: 'Visit 30 different nodes',
        icon: '📖',
        condition: (state) => state.visitedNodes.size >= 30
    },
    peak_absurdism: {
        id: 'peak_absurdism',
        title: 'Peak Absurdity',
        description: 'Reach 50 absurdism points',
        icon: '🎲',
        condition: (state) => state.stats.absurdism >= 50
    },
    professional: {
        id: 'professional',
        title: 'Corporate Clone',
        description: 'Reach 50 professionalism points',
        icon: '💼',
        condition: (state) => state.stats.professionalism >= 50
    },
    agent_of_chaos: {
        id: 'agent_of_chaos',
        title: 'Agent of Chaos',
        description: 'Reach 50 chaos points',
        icon: '🔥',
        condition: (state) => state.stats.chaos >= 50
    },
    balanced: {
        id: 'balanced',
        title: 'Perfectly Balanced',
        description: 'Have all three stats above 25',
        icon: '⚖️',
        condition: (state) =>
            state.stats.absurdism >= 25 &&
            state.stats.professionalism >= 25 &&
            state.stats.chaos >= 25
    },
    secret_sauce: {
        id: 'secret_sauce',
        title: 'Secret Sauce',
        description: 'Discovered the Konami code path',
        icon: '🥚',
        condition: (state) => state.hiddenVariables.konamiActivated
    },
    persistent: {
        id: 'persistent',
        title: 'Persistent Quitter',
        description: 'Clicked Exit 3 times without leaving',
        icon: '🚪',
        condition: (state) => state.hiddenVariables.exitClicks >= 3
    },
    lucky_seven: {
        id: 'lucky_seven',
        title: 'Lucky Seven',
        description: 'Visit the same node 7 times',
        icon: '🎰',
        condition: (state) => {
            return Array.from(state.visitedNodes.values()).some(count => count >= 7);
        }
    },
    speedrunner: {
        id: 'speedrunner',
        title: 'Speedrunner',
        description: 'Reach an ending in under 5 minutes',
        icon: '⚡',
        condition: (state) =>
            state.hiddenVariables.reachedEnding && state.playTime < 300
    },
    product_genius: {
        id: 'product_genius',
        title: 'Product Genius',
        description: 'Create 10 AI products',
        icon: '🧠',
        condition: (state) => state.hiddenVariables.productsCreated >= 10
    },
    meta_aware: {
        id: 'meta_aware',
        title: 'Meta Aware',
        description: 'Break the fourth wall',
        icon: '🎭',
        condition: (state) => state.hiddenVariables.brokeFourthWall
    }
};

class AchievementTracker {
    constructor() {
        this.unlockedAchievements = new Set();
        this.notificationQueue = [];
    }

    // Check all achievements against current state
    checkAchievements(gameState) {
        const newlyUnlocked = [];

        Object.values(ACHIEVEMENTS).forEach(achievement => {
            if (!this.unlockedAchievements.has(achievement.id) &&
                achievement.condition(gameState)) {
                this.unlockAchievement(achievement.id);
                newlyUnlocked.push(achievement);
            }
        });

        return newlyUnlocked;
    }

    // Unlock achievement
    unlockAchievement(achievementId) {
        if (this.unlockedAchievements.has(achievementId)) return false;

        this.unlockedAchievements.add(achievementId);
        audioEngine.achievement();
        this.showNotification(achievementId);
        return true;
    }

    // Show achievement notification
    showNotification(achievementId) {
        const achievement = ACHIEVEMENTS[achievementId];
        if (!achievement) return;

        const notification = document.getElementById('achievement-notification');
        const title = document.getElementById('achievement-title');
        const desc = document.getElementById('achievement-desc');

        title.textContent = achievement.icon + ' ' + achievement.title;
        desc.textContent = achievement.description;

        notification.style.display = 'block';

        // Hide after 4 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 4000);
    }

    // Get achievement progress
    getProgress() {
        const total = Object.keys(ACHIEVEMENTS).length;
        const unlocked = this.unlockedAchievements.size;
        return {
            unlocked,
            total,
            percentage: Math.round((unlocked / total) * 100)
        };
    }

    // Get all achievements with locked/unlocked status
    getAllAchievements() {
        return Object.values(ACHIEVEMENTS).map(achievement => ({
            ...achievement,
            unlocked: this.unlockedAchievements.has(achievement.id)
        }));
    }

    // Load achievements from save
    loadAchievements(achievements) {
        this.unlockedAchievements = new Set(achievements);
    }

    // Export achievements for save
    exportAchievements() {
        return Array.from(this.unlockedAchievements);
    }
}

// Global achievement tracker instance
const achievementTracker = new AchievementTracker();
