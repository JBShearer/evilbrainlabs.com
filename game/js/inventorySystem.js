// ============================================
// Inventory System
// ============================================

class InventorySystem {
    constructor() {
        this.items = [];
        this.maxSlots = 20;
        this.init();
    }

    init() {
        // Create 20 inventory slots
        const grid = document.getElementById('inventory-grid');
        for (let i = 0; i < this.maxSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot empty';
            slot.id = `slot-${i}`;
            slot.addEventListener('click', () => this.handleSlotClick(i));
            grid.appendChild(slot);
        }
    }

    addItem(item) {
        if (this.items.length >= this.maxSlots) {
            alert('Inventory full! Discard an item or visit the Company Store.');
            return false;
        }

        this.items.push(item);
        this.updateDisplay();
        return true;
    }

    removeItem(index) {
        if (index >= 0 && index < this.items.length) {
            const removed = this.items.splice(index, 1)[0];
            this.updateDisplay();
            return removed;
        }
        return null;
    }

    hasItem(itemName) {
        return this.items.some(item => item.name === itemName);
    }

    getItemsByType(type) {
        return this.items.filter(item => item.type === type);
    }

    getItemsByRarity(rarity) {
        return this.items.filter(item => item.rarity === rarity);
    }

    getTotalValue() {
        return this.items.reduce((sum, item) => sum + item.tradeValue, 0);
    }

    updateDisplay() {
        // Update count
        document.getElementById('inventory-count').textContent = this.items.length;

        // Clear all slots
        for (let i = 0; i < this.maxSlots; i++) {
            const slot = document.getElementById(`slot-${i}`);
            slot.className = 'inventory-slot empty';
            slot.innerHTML = '';
        }

        // Fill slots with items
        this.items.forEach((item, index) => {
            const slot = document.getElementById(`slot-${index}`);
            slot.className = `inventory-slot filled rarity-${item.rarity}`;

            const rarityColors = {
                gray: '#888888',
                green: '#00ff00',
                blue: '#00aaff',
                purple: '#aa00ff',
                gold: '#ffaa00'
            };

            slot.innerHTML = `
                <div class="item-icon" style="border-color: ${rarityColors[item.rarity]};">
                    ${this.getItemIcon(item)}
                </div>
                <div class="item-tooltip">
                    <div class="item-name" style="color: ${rarityColors[item.rarity]};">${item.name}</div>
                    <div class="item-type">${item.type.toUpperCase()}</div>
                    <div class="item-value">Value: ${item.tradeValue} scrip</div>
                </div>
            `;
        });
    }

    getItemIcon(item) {
        const icons = {
            // Access items
            'Green Keycard': '🟢🔑',
            'Blue Keycard': '🔵🔑',
            'Purple Keycard': '🟣🔑',
            'Gold Keycard': '🟡🔑',

            // Badge items
            'Bronze Badge': '🥉',

            // Lore items
            'Redacted Document': '📄',
            'Timeline Evidence': '📜',
            'Founder Code Fragment': '💾',

            // Biological items
            'Bio Sample': '🧬',
            'Brain Tissue Sample': '🧠',
            'Surgical Gloves': '🧤',

            // Junk items
            'Pen': '🖊️',
            'Stapler': '📎',
            'Sticky Note': '📝',
            'Paper Clip': '📎',
            'Spam Email': '📧',
            'Meeting Minutes': '📋',

            // Special items
            'Company Scrip': '💵',
            'Coffee Voucher': '☕',
            'Neural Cable': '🔌',
            'Galt Protocol': '📖',
            'Memory Module': '💿'
        };

        return icons[item.name] || '❓';
    }

    handleSlotClick(index) {
        if (index >= this.items.length) return;

        const item = this.items[index];

        // Show item details modal or action menu
        if (confirm(`${item.name}\nType: ${item.type}\nRarity: ${item.rarity.toUpperCase()}\nValue: ${item.tradeValue} scrip\n\nDiscard this item?`)) {
            this.removeItem(index);
            audioEngine.click();
        }
    }

    // Save/Load support
    serialize() {
        return {
            items: this.items,
            maxSlots: this.maxSlots
        };
    }

    deserialize(data) {
        this.items = data.items || [];
        this.maxSlots = data.maxSlots || 20;
        this.updateDisplay();
    }
}

// Global inventory instance
const inventorySystem = new InventorySystem();
