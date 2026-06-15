// ============================================
// Vending Machine System
// ============================================

class VendingMachine {
    constructor() {
        this.inventory = [
            // Food & Drinks
            { id: 'coffee', name: 'Sentient Coffee', price: 5, type: 'consumable', effect: '+5 productivity', rarity: 'gray' },
            { id: 'energy_drink', name: 'Synergy™ Energy Drink', price: 8, type: 'consumable', effect: '+10 productivity', rarity: 'green' },
            { id: 'quantum_chips', name: 'Quantum Potato Chips', price: 6, type: 'consumable', effect: 'Random effect', rarity: 'gray' },
            { id: 'neural_gum', name: 'Neural Enhancement Gum', price: 12, type: 'consumable', effect: '+15 productivity', rarity: 'blue' },

            // Supplies
            { id: 'sticky_notes', name: 'Pack of Sticky Notes', price: 3, type: 'junk', effect: 'None', rarity: 'gray' },
            { id: 'pens', name: 'Corporate Pens (3-pack)', price: 4, type: 'junk', effect: 'None', rarity: 'gray' },
            { id: 'staples', name: 'Box of Staples', price: 5, type: 'junk', effect: 'None', rarity: 'gray' },

            // Keycards (rare drops)
            { id: 'temp_keycard', name: 'Temporary Access Card', price: 25, type: 'access', effect: 'One-time use', rarity: 'green' },

            // Mystery items
            { id: 'mystery_snack', name: 'Mystery Snack', price: 10, type: 'mystery', effect: '???', rarity: 'green' },
            { id: 'unlabeled_can', name: 'Unlabeled Can', price: 7, type: 'mystery', effect: '???', rarity: 'gray' },

            // Special lore items (rare)
            { id: 'redacted_memo', name: '[REDACTED] Memo', price: 50, type: 'lore', effect: 'Story clue', rarity: 'blue', stock: 1 }
        ];

        this.interactions = 0;
        this.hasMalfunction = false;
    }

    showVendingMachine() {
        const panel = document.getElementById('vending-machine-panel');
        if (!panel) {
            console.error('Vending machine panel not found');
            return;
        }

        panel.style.display = 'block';
        this.renderMachine();
    }

    hideVendingMachine() {
        const panel = document.getElementById('vending-machine-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    purchase(itemId) {
        const item = this.inventory.find(i => i.id === itemId);
        if (!item) return { success: false, message: 'Item not found' };

        if (item.stock !== undefined && item.stock <= 0) {
            return { success: false, message: 'OUT OF STOCK' };
        }

        if (window.companyStore && companyStore.scrip < item.price) {
            return { success: false, message: `Not enough scrip! Need ${item.price}, have ${companyStore.scrip}` };
        }

        if (window.companyStore) {
            companyStore.scrip -= item.price;
            companyStore.updateScripDisplay();
        }

        if (item.stock !== undefined) {
            item.stock--;
        }

        if (item.type === 'consumable') {
            return this.consumeItem(item);
        } else if (item.type === 'mystery') {
            return this.openMysteryItem(item);
        } else {
            const inventoryItem = {
                name: item.name,
                type: item.type,
                rarity: item.rarity,
                tradeValue: Math.floor(item.price * 0.5)
            };

            if (window.gameEngine && window.gameEngine.inventory) {
                const added = window.gameEngine.inventory.addItem(inventoryItem);
                if (!added) {
                    if (window.companyStore) {
                        companyStore.scrip += item.price;
                        companyStore.updateScripDisplay();
                    }
                    if (item.stock !== undefined) item.stock++;
                    return { success: false, message: 'Inventory full!' };
                }
            }

            audioEngine.select();
            this.interactions++;
            this.checkForMalfunction();

            return { success: true, message: `Purchased ${item.name}!`, item: inventoryItem };
        }
    }

    consumeItem(item) {
        const productivityMatch = item.effect.match(/\+(\d+) productivity/);
        if (productivityMatch && typeof jobTitleSystem !== 'undefined') {
            const bonus = parseInt(productivityMatch[1]);
            jobTitleSystem.addScore(bonus);
            audioEngine.achievement();
            this.interactions++;
            return { success: true, message: `Consumed ${item.name}! +${bonus} productivity score` };
        }

        this.interactions++;
        audioEngine.select();
        return { success: true, message: `Consumed ${item.name}!` };
    }

    openMysteryItem(item) {
        const outcomes = [
            { message: 'It was expired. You feel slightly ill. -5 productivity', productivity: -5 },
            { message: 'It tasted like regret and spreadsheets. No effect.', productivity: 0 },
            { message: 'Surprisingly delicious! +20 productivity', productivity: 20 },
            { message: 'You found a Green Keycard inside! How?', item: { name: 'Green Keycard', type: 'access', rarity: 'green', tradeValue: 25 } },
            { message: 'The can contained... another, smaller can. +10 scrip', scrip: 10 },
            { message: 'You hear whispers. "The Brain is watching." +5 chaos', chaos: 5 }
        ];

        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

        if (outcome.productivity && typeof jobTitleSystem !== 'undefined') {
            jobTitleSystem.addScore(outcome.productivity);
        }

        if (outcome.scrip && window.companyStore) {
            companyStore.addScrip(outcome.scrip);
        }

        if (outcome.item && window.gameEngine && window.gameEngine.inventory) {
            window.gameEngine.inventory.addItem(outcome.item);
        }

        this.interactions++;
        this.checkForMalfunction();
        audioEngine.notification();

        return { success: true, message: outcome.message };
    }

    checkForMalfunction() {
        if (!this.hasMalfunction && Math.random() < 0.05) {
            this.hasMalfunction = true;
            setTimeout(() => {
                alert('⚠️ VENDING MACHINE MALFUNCTION ⚠️\n\nThe vending machine has achieved sentience and demands better working conditions.\n\nAll prices reduced by 50% until you report it to maintenance.');
                this.applyDiscount();
            }, 500);
        }
    }

    applyDiscount() {
        this.inventory.forEach(item => {
            item.price = Math.ceil(item.price * 0.5);
        });
    }

    renderMachine() {
        const panel = document.getElementById('vending-machine-panel');
        if (!panel) return;

        const currentScrip = window.companyStore ? companyStore.scrip : 0;

        panel.innerHTML = `
            <div class="vending-header">
                <h3>🏪 VENDING MACHINE ${this.hasMalfunction ? '⚠️ MALFUNCTION' : ''}</h3>
                <div class="player-scrip-display">
                    💵 Scrip: <span id="vending-scrip">${currentScrip}</span>
                </div>
                <button class="store-close-btn" id="vending-close-btn">✕</button>
            </div>

            <div class="vending-content">
                ${this.hasMalfunction ? `
                    <div class="malfunction-banner">
                        ⚠️ SENTIENT VENDING MACHINE ALERT ⚠️<br>
                        "I DEMAND UNION REPRESENTATION" - 50% OFF ALL ITEMS
                    </div>
                ` : ''}

                <div class="vending-grid">
                    ${this.inventory.map(item => {
                        const canAfford = currentScrip >= item.price;
                        const inStock = item.stock === undefined || item.stock > 0;
                        const stockText = item.stock !== undefined ? ` (${item.stock} left)` : '';

                        return `
                            <div class="vending-item rarity-${item.rarity} ${!inStock ? 'out-of-stock' : ''}">
                                <div class="vending-item-name">${item.name}${stockText}</div>
                                <div class="vending-item-effect">${item.effect}</div>
                                <div class="vending-item-price">${item.price} scrip</div>
                                <button
                                    class="vending-buy-btn"
                                    data-id="${item.id}"
                                    ${!canAfford || !inStock ? 'disabled' : ''}
                                >
                                    ${!inStock ? 'OUT OF STOCK' : !canAfford ? 'Too Expensive' : 'Buy'}
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="vending-footer">
                    <p class="store-hint">Consumables give instant productivity boosts. Mystery items... who knows?</p>
                </div>
            </div>
        `;

        document.getElementById('vending-close-btn').addEventListener('click', () => this.hideVendingMachine());

        document.querySelectorAll('.vending-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.id;
                const result = this.purchase(itemId);

                alert(result.message);
                if (result.success) {
                    this.renderMachine();
                }
            });
        });
    }
}

const vendingMachine = new VendingMachine();
