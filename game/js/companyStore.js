// ============================================
// Company Store System
// ============================================

class CompanyStore {
    constructor() {
        this.scrip = 50; // Starting scrip
        this.inventory = [
            { id: 'coffee', name: 'Coffee Voucher', price: 10, type: 'consumable', rarity: 'gray' },
            { id: 'keycard_green', name: 'Green Keycard', price: 50, type: 'access', rarity: 'green' },
            { id: 'keycard_blue', name: 'Blue Keycard', price: 150, type: 'access', rarity: 'blue' },
            { id: 'keycard_purple', name: 'Purple Keycard', price: 500, type: 'access', rarity: 'purple' },
            { id: 'keycard_gold', name: 'Gold Keycard', price: 1500, type: 'access', rarity: 'gold' },
            { id: 'mystery_box', name: 'Mystery Box', price: 25, type: 'consumable', rarity: 'green' },
            { id: 'scrip_pack', name: 'Scrip Pack (50)', price: 0, type: 'currency', rarity: 'gray' }
        ];
    }

    addScrip(amount) {
        this.scrip += amount;
        this.updateScripDisplay();
    }

    purchase(itemId) {
        const item = this.inventory.find(i => i.id === itemId);
        if (!item) return { success: false, message: 'Item not found' };

        if (this.scrip < item.price) {
            return { success: false, message: `Not enough scrip! Need ${item.price}, have ${this.scrip}` };
        }

        this.scrip -= item.price;

        // Handle special items
        if (itemId === 'mystery_box') {
            return this.openMysteryBox();
        } else if (itemId === 'scrip_pack') {
            return { success: false, message: 'Nice try. Scrip cannot be purchased with scrip.' };
        } else {
            // Add to inventory
            const inventoryItem = {
                name: item.name,
                type: item.type,
                rarity: item.rarity,
                tradeValue: Math.floor(item.price * 0.5)
            };

            if (window.gameEngine && window.gameEngine.inventory) {
                const added = window.gameEngine.inventory.addItem(inventoryItem);
                if (!added) {
                    this.scrip += item.price; // Refund
                    return { success: false, message: 'Inventory full!' };
                }
            }

            this.updateScripDisplay();
            audioEngine.select();
            return { success: true, message: `Purchased ${item.name}!`, item: inventoryItem };
        }
    }

    sell(inventoryIndex) {
        if (window.gameEngine && window.gameEngine.inventory) {
            const item = window.gameEngine.inventory.items[inventoryIndex];
            if (!item) return { success: false, message: 'Item not found' };

            const sellPrice = item.tradeValue || 5;
            window.gameEngine.inventory.removeItem(inventoryIndex);
            this.addScrip(sellPrice);

            audioEngine.select();
            return { success: true, message: `Sold ${item.name} for ${sellPrice} scrip!`, amount: sellPrice };
        }

        return { success: false, message: 'Inventory system not available' };
    }

    openMysteryBox() {
        const possibleItems = [
            { name: 'Company Scrip', rarity: 'gray', type: 'currency', value: 15 },
            { name: 'Bronze Badge', rarity: 'green', type: 'badge', value: 25 },
            { name: 'Redacted Document', rarity: 'blue', type: 'lore', value: 50 },
            { name: 'Memory Module', rarity: 'purple', type: 'special', value: 150 },
            { name: 'Founder Code Fragment', rarity: 'gold', type: 'lore', value: 500 }
        ];

        const roll = Math.random();
        let wonItem;

        if (roll < 0.5) wonItem = possibleItems[0]; // 50% gray
        else if (roll < 0.8) wonItem = possibleItems[1]; // 30% green
        else if (roll < 0.95) wonItem = possibleItems[2]; // 15% blue
        else if (roll < 0.99) wonItem = possibleItems[3]; // 4% purple
        else wonItem = possibleItems[4]; // 1% gold

        if (wonItem.type === 'currency') {
            this.addScrip(wonItem.value);
            this.updateScripDisplay();
            return { success: true, message: `Mystery Box opened! You got ${wonItem.value} scrip!` };
        } else {
            const item = {
                name: wonItem.name,
                type: wonItem.type,
                rarity: wonItem.rarity,
                tradeValue: wonItem.value
            };

            if (window.gameEngine && window.gameEngine.inventory) {
                const added = window.gameEngine.inventory.addItem(item);
                if (!added) {
                    this.addScrip(25); // Refund
                    return { success: false, message: 'Inventory full! Refunded.' };
                }
            }

            this.updateScripDisplay();
            audioEngine.achievement();
            return { success: true, message: `Mystery Box opened! You got: ${wonItem.name} (${wonItem.rarity.toUpperCase()})!`, item: item };
        }
    }

    updateScripDisplay() {
        const display = document.getElementById('player-scrip');
        if (display) {
            display.textContent = this.scrip;
        }
    }

    showStore() {
        const panel = document.getElementById('company-store-panel');
        if (!panel) {
            console.error('Store panel not found');
            return;
        }

        panel.style.display = 'block';
        this.renderStore();
    }

    hideStore() {
        const panel = document.getElementById('company-store-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    renderStore() {
        const panel = document.getElementById('company-store-panel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="store-header">
                <h3>🏪 COMPANY STORE</h3>
                <div class="player-scrip-display">
                    💵 Scrip: <span id="player-scrip">${this.scrip}</span>
                </div>
                <button class="store-close-btn" id="store-close-btn">✕</button>
            </div>

            <div class="store-content">
                <div class="store-inventory">
                    <h4>BUY</h4>
                    <div class="store-items">
                        ${this.inventory.map(item => `
                            <div class="store-item rarity-${item.rarity}">
                                <div class="store-item-name">${item.name}</div>
                                <div class="store-item-price">${item.price} scrip</div>
                                <button class="store-buy-btn" data-id="${item.id}" ${this.scrip < item.price ? 'disabled' : ''}>
                                    ${this.scrip < item.price ? 'Too Expensive' : 'Buy'}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="store-sell">
                    <h4>SELL (50% value)</h4>
                    <p class="store-hint">Click items in your inventory to sell them</p>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('store-close-btn').addEventListener('click', () => this.hideStore());

        document.querySelectorAll('.store-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.id;
                const result = this.purchase(itemId);

                if (result.success) {
                    alert(result.message);
                    this.renderStore(); // Refresh
                } else {
                    alert(result.message);
                }
            });
        });
    }
}

// Global store instance
const companyStore = new CompanyStore();
