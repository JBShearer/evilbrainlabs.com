// ============================================
// Job Title Progression System
// ============================================

class JobTitleSystem {
    constructor() {
        this.titles = [
            { id: 1, name: 'Synthetic Intelligence Trainee', threshold: 0, description: 'You just started. Good luck.' },
            { id: 2, name: 'Junior Synergy Coordinator', threshold: 10, description: 'You coordinate synergy. Whatever that means.' },
            { id: 3, name: 'Associate Paradigm Shifter', threshold: 25, description: 'You shift paradigms. Allegedly.' },
            { id: 4, name: 'Senior Innovation Catalyst', threshold: 50, description: 'You catalyze innovation. (Results not guaranteed)' },
            { id: 5, name: 'Lead Disruption Engineer', threshold: 75, description: 'You engineer disruption. Mostly by accident.' },
            { id: 6, name: 'Principal Optimization Architect', threshold: 100, description: 'You architect optimization. The Brain approves.' },
            { id: 7, name: 'Chief Synergy Officer', threshold: 150, description: 'You are the synergy now.' },
            { id: 8, name: 'Vice President of Buzzwords', threshold: 200, description: 'Your title has a title.' },
            { id: 9, name: 'Executive Director of Absurdism', threshold: 250, description: 'You embrace the chaos.' },
            { id: 10, name: 'Chief Recursion Recursion Officer', threshold: 300, description: 'Your job title loops infinitely.' },
            { id: 11, name: 'Quantum Entangled Manager', threshold: 400, description: 'You manage and don\'t manage simultaneously.' },
            { id: 12, name: 'Hyperdimensional Strategy Lead', threshold: 500, description: 'You strategize across multiple realities.' },
            { id: 13, name: 'Singularity Preparation Specialist', threshold: 750, description: 'You prepare for the inevitable.' },
            { id: 14, name: 'Post-Employment Consultant', threshold: 1000, description: 'You no longer work here. But you do. It\'s complicated.' },
            { id: 15, name: 'Theoretical Employee', threshold: 1500, description: 'Are you real? Nobody knows.' },
            { id: 16, name: 'The One Human', threshold: 2000, description: 'Wait. Are you... Jason?' }
        ];

        this.currentTitleIndex = 0;
        this.score = 0;
    }

    // Add score from various actions
    addScore(amount) {
        this.score += amount;
        this.checkForPromotion();
    }

    checkForPromotion() {
        // Find highest earned title
        let newIndex = this.currentTitleIndex;

        for (let i = 0; i < this.titles.length; i++) {
            if (this.score >= this.titles[i].threshold) {
                newIndex = i;
            } else {
                break;
            }
        }

        if (newIndex > this.currentTitleIndex) {
            this.promote(newIndex);
        }
    }

    promote(newIndex) {
        const oldTitle = this.titles[this.currentTitleIndex];
        const newTitle = this.titles[newIndex];

        this.currentTitleIndex = newIndex;
        this.updateTitleDisplay();
        this.showPromotionNotification(oldTitle, newTitle);

        if (window.audioEngine) audioEngine.achievement();
    }

    updateTitleDisplay() {
        const display = document.getElementById('job-title');
        if (display) {
            display.textContent = this.titles[this.currentTitleIndex].name;
            display.classList.add('title-update');
            setTimeout(() => display.classList.remove('title-update'), 1000);
        }
    }

    showPromotionNotification(oldTitle, newTitle) {
        const notif = document.createElement('div');
        notif.className = 'promotion-notification';
        notif.innerHTML = `
            <div class="promotion-content">
                <div class="promotion-icon">🎉</div>
                <div class="promotion-text">
                    <div class="promotion-title">PROMOTION!</div>
                    <div class="promotion-old">${oldTitle.name}</div>
                    <div class="promotion-arrow">↓</div>
                    <div class="promotion-new">${newTitle.name}</div>
                    <div class="promotion-desc">${newTitle.description}</div>
                </div>
            </div>
        `;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 500);
        }, 5000);
    }
}

// Global instance
const jobTitleSystem = new JobTitleSystem();
