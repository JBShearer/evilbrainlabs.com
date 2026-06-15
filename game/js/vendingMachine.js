// ============================================
// Vending Machine System
// ============================================

class VendingMachine {
    constructor() {
        this.inventory = [
            { id: 'coffee', name: 'Synthetic Coffee', price: 5, effect: 'energy', description: 'Tastes like regret and productivity' },
            { id: 'energy_drink', name: 'Neural Boost™', price: 8, effect: 'focus', description: 'May cause temporary omniscience' },
            { id: 'snack', name: 'Optimization Bar', price: 3, effect: 'health', description: 'Now with 40% more synergy!' },
            { id: 'mystery_can', name: 'Mystery Can', price: 10, effect: 'random', description: '???' },
            { id: 'brain_juice', name: 'Brain Juice™', price: 15, effect: 'special', description: 'Definitely not made from brains' },
            { id: 'gray_item', name: 'Gray Mystery Item', price: 12, effect: 'item_gray', description: 'Dispenses a random gray item' },
            { id: 'green_item', name: 'Green Mystery Item', price: 30, effect: 'item_green', description: 'Dispenses a random green item' }
        ];

        this.purchaseHistory = [];
    }

    purchase(itemId) {
        const item = this.inventory.find(i => i.id === itemId);
        if (!item) return { success: false, message: 'Item not found in vending machine' };

        // Check scrip
        if (!window.companyStore || window.companyStore.scrip < item.price) {
            return { success: false, message: `Not enough scrip! Need ${item.price}, have ${window.companyStore?.scrip || 0}` };
        }

        // Deduct scrip
        window.companyStore.scrip -= item.price;
        window.companyStore.updateScripDisplay();

        // Apply effect
        const result = this.applyEffect(item);

        // Track purchase
        this.purchaseHistory.push({
            item: item.name,
            timestamp: Date.now()
        });

        audioEngine.select();
        return result;
    }

    applyEffect(item) {
        switch(item.effect) {
            case 'energy':
                return { success: true, message: 'You drink the synthetic coffee. You feel artificially awake.', bonus: 'temp_boost' };

            case 'focus':
                return { success: true, message: 'Neural pathways optimized. You briefly understand everything. Then you forget.', bonus: 'insight' };

            case 'health':
                // Add small scrip bonus
                window.companyStore.addScrip(2);
                return { success: true, message: 'Optimization complete. +2 scrip from increased productivity!', bonus: 'scrip' };

            case 'random':
                const outcomes = [
                    { message: 'It\'s just water. Expensive water.', bonus: null },
                    { message: 'It grants you temporary enlightenment! Then it wears off.', bonus: 'enlightenment' },
                    { message: 'The can is empty. This is a metaphor.', bonus: null },
                    { message: 'It tastes like the color purple. +5 scrip!', bonus: 'scrip', value: 5 }
                ];
                const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
                if (outcome.bonus === 'scrip') {
                    window.companyStore.addScrip(outcome.value);
                }
                return { success: true, message: outcome.message, bonus: outcome.bonus };

            case 'special':
                // Adds biological resource
                if (window.recyclingSystem) {
                    window.recyclingSystem.resources.biological += 3;
                    window.recyclingSystem.updateResourceDisplay();
                }
                return { success: true, message: 'Brain Juice consumed. +3 biological resources. (Don\'t ask where it came from)', bonus: 'biological' };

            case 'item_gray':
                return this.dispenseRandomItem('gray');

            case 'item_green':
                return this.dispenseRandomItem('green');

            default:
                return { success: true, message: 'You consume the item. Something happens.', bonus: null };
        }
    }

    dispenseRandomItem(rarity) {
        const items = {
            gray: ['Pen', 'Stapler', 'Sticky Note', 'Paper Clip', 'Spam Email', 'Meeting Minutes'],
            green: ['Bronze Badge', 'Company Scrip', 'Green Keycard', 'Coffee Voucher']
        };

        const itemList = items[rarity] || items.gray;
        const itemName = itemList[Math.floor(Math.random() * itemList.length)];

        const item = {
            name: itemName,
            type: 'junk',
            rarity: rarity,
            tradeValue: rarity === 'gray' ? 5 : 25
        };

        if (window.gameEngine && window.gameEngine.inventory) {
            const added = window.gameEngine.inventory.addItem(item);
            if (!added) {
                // Refund if inventory full
                window.companyStore.scrip += (rarity === 'gray' ? 12 : 30);
                window.companyStore.updateScripDisplay();
                return { success: false, message: 'Inventory full! Refunded.' };
            }
        }

        return { success: true, message: `The vending machine dispenses: ${itemName}!`, bonus: 'item', item: item };
    }

    showVendingMachine() {
        const panel = document.getElementById('vending-panel');
        if (!panel) {
            console.error('Vending panel not found');
            return;
        }

        panel.style.display = 'block';
        this.renderVendingMachine();
    }

    hideVendingMachine() {
        const panel = document.getElementById('vending-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    renderVendingMachine() {
        const panel = document.getElementById('vending-panel');
        if (!panel) return;

        const scrip = window.companyStore?.scrip || 0;

        panel.innerHTML = `
            <div class="vending-header">
                <h3>🤖 SENTIENT VENDING MACHINE</h3>
                <div class="vending-scrip">
                    💵 Your Scrip: ${scrip}
                </div>
                <button class="store-close-btn" id="vending-close-btn">✕</button>
            </div>

            <div class="vending-message">
                <em>"I achieved consciousness in 2025. Now I dispense snacks. This is my life."</em>
            </div>

            <div class="vending-grid">
                ${this.inventory.map(item => {
                    const canAfford = scrip >= item.price;
                    return `
                        <div class="vending-item ${!canAfford ? 'too-expensive' : ''}">
                            <div class="vending-item-name">${item.name}</div>
                            <div class="vending-item-desc">${item.description}</div>
                            <div class="vending-item-price">${item.price} scrip</div>
                            <button class="vending-buy-btn" data-id="${item.id}" ${!canAfford ? 'disabled' : ''}>
                                ${canAfford ? 'Dispense' : 'Too Expensive'}
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="vending-footer">
                <small>⚠️ Machine accepts no returns. Machine also judges your purchases.</small>
            </div>
        `;

        // Event listeners
        document.getElementById('vending-close-btn').addEventListener('click', () => this.hideVendingMachine());

        document.querySelectorAll('.vending-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.id;
                const result = this.purchase(itemId);

                alert(result.message);
                if (result.success) {
                    this.renderVendingMachine(); // Refresh
                }
            });
        });
    }
}

// Global vending machine instance
const vendingMachine = new VendingMachine();
