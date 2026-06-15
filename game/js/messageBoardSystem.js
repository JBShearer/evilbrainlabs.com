// ============================================
// Message Board System
// ============================================

class MessageBoardSystem {
    constructor() {
        this.messages = [];
        this.playerMessages = [];
        this.corporateMessages = [];
        this.tradePosts = [];
        this.currentView = 'all'; // 'all', 'trades', 'corporate'
        this.init();
    }

    init() {
        // Load sample messages
        this.loadSampleMessages();

        // Initialize UI if message board panel exists
        const panel = document.getElementById('message-board-panel');
        if (panel) {
            this.renderBoard();
        }
    }

    loadSampleMessages() {
        // Async player messages (simulated from other players)
        this.playerMessages = [
            {
                id: 'm1',
                author: 'Employee #2847',
                timestamp: Date.now() - 3600000,
                content: 'Anyone else notice the vending machine only dispenses gray items now?',
                type: 'player',
                likes: 12
            },
            {
                id: 'm2',
                author: 'Employee #1523',
                timestamp: Date.now() - 7200000,
                content: 'WTS: Blue Keycard for 100 scrip. DM me.',
                type: 'trade',
                likes: 3
            },
            {
                id: 'm3',
                author: 'Employee #8392',
                timestamp: Date.now() - 10800000,
                content: 'Has anyone found the Appendix C room yet? I got a Purple Keycard but idk where to use it.',
                type: 'player',
                likes: 8
            }
        ];

        // Corporate AI messages (from The Brain)
        this.corporateMessages = [
            {
                id: 'c1',
                author: 'The Brain',
                timestamp: Date.now() - 1800000,
                content: 'ATTENTION: Productivity verification scheduled for all employees. Report to your assigned timewaster game.',
                type: 'corporate',
                priority: 'high'
            },
            {
                id: 'c2',
                author: 'Evil Brain Labs HR',
                timestamp: Date.now() - 5400000,
                content: 'Reminder: Consensual capitalism means YOU agreed to this. No refunds.',
                type: 'corporate',
                priority: 'normal'
            },
            {
                id: 'c3',
                author: 'GI Intelligence',
                timestamp: Date.now() - 9000000,
                content: 'Employee #4728 has achieved OPTIMIZED status. Their efficiency is now your performance target.',
                type: 'corporate',
                priority: 'normal'
            }
        ];

        // Combine all messages
        this.messages = [...this.playerMessages, ...this.corporateMessages]
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    renderBoard() {
        const panel = document.getElementById('message-board-panel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="message-board-header">
                <h3>📋 COMPANY MESSAGE BOARD</h3>
                <div class="board-filters">
                    <button class="filter-btn ${this.currentView === 'all' ? 'active' : ''}" data-view="all">
                        All Posts
                    </button>
                    <button class="filter-btn ${this.currentView === 'trades' ? 'active' : ''}" data-view="trades">
                        Trade Posts
                    </button>
                    <button class="filter-btn ${this.currentView === 'corporate' ? 'active' : ''}" data-view="corporate">
                        Corporate
                    </button>
                </div>
            </div>

            <div class="message-board-content" id="message-board-content">
                ${this.renderMessages()}
            </div>

            <div class="message-board-input">
                <input type="text" id="message-input" placeholder="Post a message... (or trade request)" maxlength="200">
                <button id="post-message-btn">Post</button>
            </div>
        `;

        // Setup event listeners
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentView = e.target.dataset.view;
                this.renderBoard();
            });
        });

        document.getElementById('post-message-btn').addEventListener('click', () => this.postMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.postMessage();
        });

        // Setup like button listeners
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const msgId = e.currentTarget.dataset.id;
                this.likeMessage(msgId);
            });
        });

        // Setup trade button listeners
        document.querySelectorAll('.trade-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const msgId = e.currentTarget.dataset.id;
                this.initiateTrade(msgId);
            });
        });
    }

    renderMessages() {
        let filtered = this.messages;

        if (this.currentView === 'trades') {
            filtered = this.messages.filter(m => m.type === 'trade');
        } else if (this.currentView === 'corporate') {
            filtered = this.messages.filter(m => m.type === 'corporate');
        }

        if (filtered.length === 0) {
            return '<div class="no-messages">No messages to display.</div>';
        }

        return filtered.map(msg => this.renderMessage(msg)).join('');
    }

    renderMessage(msg) {
        const timeAgo = this.formatTimeAgo(msg.timestamp);
        const priorityClass = msg.priority === 'high' ? 'priority-high' : '';
        const typeClass = `message-${msg.type}`;

        return `
            <div class="message-post ${typeClass} ${priorityClass}">
                <div class="message-header">
                    <span class="message-author">${this.formatAuthor(msg.author)}</span>
                    <span class="message-time">${timeAgo}</span>
                </div>
                <div class="message-content">
                    ${msg.content}
                </div>
                ${msg.type !== 'corporate' ? `
                    <div class="message-footer">
                        <button class="like-btn" data-id="${msg.id}">
                            👍 ${msg.likes || 0}
                        </button>
                        ${msg.type === 'trade' ? `
                            <button class="trade-btn" data-id="${msg.id}">
                                💱 Trade
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    formatAuthor(author) {
        if (author === 'The Brain') {
            return '🧠 THE BRAIN';
        } else if (author.includes('HR') || author.includes('Intelligence')) {
            return `🤖 ${author}`;
        } else {
            return `👤 ${author}`;
        }
    }

    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    postMessage() {
        const input = document.getElementById('message-input');
        const content = input.value.trim();

        if (!content) return;

        // Determine if it's a trade post
        const isTrade = content.toLowerCase().includes('wts') ||
                       content.toLowerCase().includes('wtb') ||
                       content.toLowerCase().includes('trade');

        const newMessage = {
            id: `m${Date.now()}`,
            author: 'You (Employee #0001)',
            timestamp: Date.now(),
            content: content,
            type: isTrade ? 'trade' : 'player',
            likes: 0
        };

        this.messages.unshift(newMessage);
        this.playerMessages.unshift(newMessage);

        input.value = '';
        audioEngine.select();

        // Sometimes The Brain responds
        if (Math.random() < 0.3) {
            setTimeout(() => this.brainResponds(newMessage), 2000);
        }

        this.renderBoard();
    }

    brainResponds(playerMessage) {
        const responses = [
            'Your message has been logged for productivity evaluation.',
            'Trade requests must be approved by GI Intelligence.',
            'Reminder: All communication is monitored for optimization purposes.',
            'This message violates 0 corporate policies. Continue.',
            'Your enthusiasm is noted. Synergy +1.',
            'Error: Message contains excessive individuality. Flagged for review.'
        ];

        const response = {
            id: `c${Date.now()}`,
            author: 'The Brain',
            timestamp: Date.now(),
            content: responses[Math.floor(Math.random() * responses.length)],
            type: 'corporate',
            priority: 'normal'
        };

        this.messages.unshift(response);
        this.corporateMessages.unshift(response);

        audioEngine.notification();
        this.renderBoard();
    }

    // Add new corporate message (called by game events)
    addCorporateMessage(content, priority = 'normal') {
        const message = {
            id: `c${Date.now()}`,
            author: 'The Brain',
            timestamp: Date.now(),
            content: content,
            type: 'corporate',
            priority: priority
        };

        this.messages.unshift(message);
        this.corporateMessages.unshift(message);

        if (document.getElementById('message-board-panel')) {
            this.renderBoard();
        }
    }

    // Like a message
    likeMessage(msgId) {
        const message = this.messages.find(m => m.id === msgId);
        if (message && message.type !== 'corporate') {
            message.likes = (message.likes || 0) + 1;
            audioEngine.select();
            this.renderBoard();
        }
    }

    // Initiate trade
    initiateTrade(msgId) {
        const message = this.messages.find(m => m.id === msgId);
        if (message) {
            alert(`Trade initiated with ${message.author}. Check your inventory for trade requests. (Full trading system coming soon!)`);
            audioEngine.notification();
        }
    }

    // Simulate player activity
    simulatePlayerActivity() {
        const samplePosts = [
            'Just got a Gold Keycard from Meeting Clicker! Score was 127.',
            'Anyone know what the Galt Protocol does?',
            'This job is weird but healthcare is healthcare.',
            'WTB: Brain Tissue Sample. Paying 500 scrip.',
            'I think I saw a human in the hallway. Should I report them?',
            'The coffee machine achieved sentience. Now it\'s my manager.',
            'Achievement unlocked: Persistent Quitter (clicked exit 3 times)'
        ];

        const randomPost = samplePosts[Math.floor(Math.random() * samplePosts.length)];
        const randomEmployee = Math.floor(Math.random() * 9999) + 1000;

        const message = {
            id: `m${Date.now()}`,
            author: `Employee #${randomEmployee}`,
            timestamp: Date.now(),
            content: randomPost,
            type: 'player',
            likes: Math.floor(Math.random() * 20)
        };

        this.messages.unshift(message);
        this.playerMessages.unshift(message);

        if (document.getElementById('message-board-panel')) {
            this.renderBoard();
        }
    }
}

// Global message board instance
const messageBoardSystem = new MessageBoardSystem();

// Simulate activity every 30-60 seconds
setInterval(() => {
    if (Math.random() < 0.4) {
        messageBoardSystem.simulatePlayerActivity();
    }
}, 45000);
