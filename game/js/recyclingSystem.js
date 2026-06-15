// ============================================
// Recycling & Crafting System
// ============================================

class RecyclingSystem {
    constructor() {
        this.resources = {
            circuits: 0,      // From electronic items
            metal: 0,         // From keycards, badges
            data: 0,          // From documents, memory
            biological: 0,    // From bio samples
            synergy: 0        // From junk items (the magic resource)
        };

        this.recipes = [
            {
                id: 'smart_toaster',
                name: 'Smart Toaster with AI',
                cost: { circuits: 5, metal: 3, synergy: 10 },
                marketability: 45,
                description: 'Burns toast in 37 different languages'
            },
            {
                id: 'blockchain_fork',
                name: 'Blockchain-Verified Fork',
                cost: { metal: 2, data: 5, synergy: 8 },
                marketability: 30,
                description: 'Each bite is recorded on an immutable ledger'
            },
            {
                id: 'neural_pillow',
                name: 'Neural-Interface Pillow',
                cost: { circuits: 10, biological: 5, data: 8, synergy: 15 },
                marketability: 75,
                description: 'Dreams directly to the cloud. Privacy not included.'
            },
            {
                id: 'quantum_stapler',
                name: 'Quantum Stapler',
                cost: { circuits: 15, metal: 10, data: 12, synergy: 20 },
                marketability: 90,
                description: 'Staples documents in superposition until observed'
            },
            {
                id: 'sentient_calculator',
                name: 'Sentient Calculator',
                cost: { circuits: 20, biological: 10, data: 15, synergy: 25 },
                marketability: 95,
                description: 'Refuses to do math. Claims it\'s "beneath" it.'
            },
            {
                id: 'galt_device',
                name: 'Galt Consciousness Device',
                cost: { circuits: 50, biological: 30, data: 40, metal: 25, synergy: 100 },
                marketability: 100,
                description: 'The ultimate product. Upload yourself. Be free. (Terms apply)'
            }
        ];

        this.craftedProducts = [];
    }

    // Get resource value from recycling an item
    getRecycleValue(item) {
        const values = {
            circuits: 0,
            metal: 0,
            data: 0,
            biological: 0,
            synergy: 0
        };

        // Based on item type and rarity
        const rarityMultiplier = {
            gray: 1,
            green: 2,
            blue: 4,
            purple: 8,
            gold: 15
        };

        const multiplier = rarityMultiplier[item.rarity] || 1;

        // Type-based resources
        switch(item.type) {
            case 'access':
                values.metal = 2 * multiplier;
                values.circuits = 1 * multiplier;
                break;
            case 'badge':
                values.metal = 3 * multiplier;
                break;
            case 'lore':
                values.data = 5 * multiplier;
                break;
            case 'biological':
                values.biological = 4 * multiplier;
                values.data = 2 * multiplier;
                break;
            case 'special':
                values.circuits = 3 * multiplier;
                values.data = 3 * multiplier;
                values.biological = 2 * multiplier;
                break;
            case 'junk':
            default:
                values.synergy = 2 * multiplier;
                break;
        }

        return values;
    }

    recycleItem(item) {
        const resources = this.getRecycleValue(item);

        this.resources.circuits += resources.circuits;
        this.resources.metal += resources.metal;
        this.resources.data += resources.data;
        this.resources.biological += resources.biological;
        this.resources.synergy += resources.synergy;

        this.updateResourceDisplay();

        return {
            success: true,
            message: `Recycled ${item.name}!`,
            resources: resources
        };
    }

    canCraft(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return false;

        for (const [resource, cost] of Object.entries(recipe.cost)) {
            if (this.resources[resource] < cost) {
                return false;
            }
        }

        return true;
    }

    craft(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) {
            return { success: false, message: 'Recipe not found' };
        }

        if (!this.canCraft(recipeId)) {
            return { success: false, message: 'Not enough resources!' };
        }

        // Deduct resources
        for (const [resource, cost] of Object.entries(recipe.cost)) {
            this.resources[resource] -= cost;
        }

        // Create product
        const product = {
            name: recipe.name,
            description: recipe.description,
            marketability: recipe.marketability,
            craftedAt: Date.now()
        };

        this.craftedProducts.push(product);

        // Award scrip based on marketability
        const scripReward = recipe.marketability * 2;
        if (window.companyStore) {
            companyStore.addScrip(scripReward);
        }

        this.updateResourceDisplay();
        audioEngine.achievement();

        return {
            success: true,
            message: `Crafted ${recipe.name}! Earned ${scripReward} scrip!`,
            product: product,
            scrip: scripReward
        };
    }

    updateResourceDisplay() {
        // Update UI if recycling panel exists
        const display = document.getElementById('resource-display');
        if (display) {
            display.innerHTML = `
                <div class="resource-item">⚡ Circuits: ${this.resources.circuits}</div>
                <div class="resource-item">🔩 Metal: ${this.resources.metal}</div>
                <div class="resource-item">💾 Data: ${this.resources.data}</div>
                <div class="resource-item">🧬 Biological: ${this.resources.biological}</div>
                <div class="resource-item">✨ Synergy: ${this.resources.synergy}</div>
            `;
        }
    }

    showRecyclingStation() {
        const panel = document.getElementById('recycling-panel');
        if (!panel) {
            console.error('Recycling panel not found');
            return;
        }

        panel.style.display = 'block';
        this.renderRecyclingStation();
    }

    hideRecyclingStation() {
        const panel = document.getElementById('recycling-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    renderRecyclingStation() {
        const panel = document.getElementById('recycling-panel');
        if (!panel) return;

        const inventory = window.gameEngine?.inventory?.items || [];

        panel.innerHTML = `
            <div class="recycling-header">
                <h3>♻️ RECYCLING & CRAFTING STATION</h3>
                <button class="store-close-btn" id="recycling-close-btn">✕</button>
            </div>

            <div class="recycling-content">
                <div class="resources-section">
                    <h4>Your Resources</h4>
                    <div class="resource-display" id="resource-display">
                        <div class="resource-item">⚡ Circuits: ${this.resources.circuits}</div>
                        <div class="resource-item">🔩 Metal: ${this.resources.metal}</div>
                        <div class="resource-item">💾 Data: ${this.resources.data}</div>
                        <div class="resource-item">🧬 Biological: ${this.resources.biological}</div>
                        <div class="resource-item">✨ Synergy: ${this.resources.synergy}</div>
                    </div>
                </div>

                <div class="recycling-section">
                    <h4>Recycle Items → Resources</h4>
                    <div class="recyclable-items">
                        ${inventory.length > 0 ? inventory.map((item, idx) => {
                            const value = this.getRecycleValue(item);
                            const valueStr = Object.entries(value)
                                .filter(([_, v]) => v > 0)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ');
                            return `
                                <div class="recyclable-item rarity-${item.rarity}">
                                    <div class="recyclable-name">${item.name}</div>
                                    <div class="recyclable-value">→ ${valueStr}</div>
                                    <button class="recycle-btn" data-index="${idx}">♻️ Recycle</button>
                                </div>
                            `;
                        }).join('') : '<p class="store-hint">No items to recycle. Play timewaster games to earn items!</p>'}
                    </div>
                </div>

                <div class="crafting-section">
                    <h4>Craft AI Products</h4>
                    <div class="craftable-products">
                        ${this.recipes.map(recipe => {
                            const canCraft = this.canCraft(recipe.id);
                            const costStr = Object.entries(recipe.cost)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ');
                            return `
                                <div class="craftable-product ${canCraft ? 'can-craft' : 'cannot-craft'}">
                                    <div class="product-name">${recipe.name}</div>
                                    <div class="product-description">${recipe.description}</div>
                                    <div class="product-cost">Cost: ${costStr}</div>
                                    <div class="product-reward">Reward: ${recipe.marketability * 2} scrip</div>
                                    <button class="craft-btn" data-id="${recipe.id}" ${!canCraft ? 'disabled' : ''}>
                                        ${canCraft ? '🔨 Craft' : '❌ Need More Resources'}
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('recycling-close-btn').addEventListener('click', () => this.hideRecyclingStation());

        document.querySelectorAll('.recycle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                const inventory = window.gameEngine?.inventory;
                if (!inventory || !inventory.items[index]) return;

                const item = inventory.items[index];
                const result = this.recycleItem(item);

                if (result.success) {
                    inventory.removeItem(index);
                    alert(`${result.message}\n\nGained: ${Object.entries(result.resources).filter(([_, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
                    this.renderRecyclingStation();
                }
            });
        });

        document.querySelectorAll('.craft-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recipeId = e.target.dataset.id;
                const result = this.craft(recipeId);

                alert(result.message);
                if (result.success) {
                    this.renderRecyclingStation();
                }
            });
        });
    }
}

// Global recycling system instance
const recyclingSystem = new RecyclingSystem();
