// ============================================
// Timewaster Mini-Games Engine
// ============================================

class TimewasterEngine {
    constructor() {
        this.currentGame = null;
        this.score = 0;
        this.timeRemaining = 60;
        this.gameActive = false;
        this.interval = null;
    }

    // Start a timewaster game
    startGame(gameType) {
        this.currentGame = gameType;
        this.score = 0;
        this.timeRemaining = 60;
        this.gameActive = true;

        // Game-specific setup
        const games = {
            'meeting_clicker': () => this.setupMeetingClicker(),
            'buzzword_bingo': () => this.setupBuzzwordBingo(),
            'email_sorter': () => this.setupEmailSorter()
        };

        if (games[gameType]) {
            games[gameType]();
            this.startTimer();
        }
    }

    startTimer() {
        this.interval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    endGame() {
        this.gameActive = false;
        clearInterval(this.interval);

        // Clear bingo interval if active
        if (this.bingoCallInterval) {
            clearInterval(this.bingoCallInterval);
        }

        // Calculate items earned
        const items = this.rollForItems();

        // Show results
        this.showResults(items);
    }

    updateTimerDisplay() {
        const timerEl = document.getElementById('timewaster-timer');
        if (timerEl) {
            timerEl.textContent = `Time: ${this.timeRemaining}s`;
        }
    }

    // Meeting Clicker Game
    setupMeetingClicker() {
        const container = document.getElementById('timewaster-container');
        container.innerHTML = `
            <div class="timewaster-game">
                <h2>MEETING CLICKER</h2>
                <p class="timewaster-instructions">Click to generate SYNERGY POINTS!</p>

                <div class="timewaster-stats">
                    <div id="timewaster-timer">Time: 60s</div>
                    <div id="timewaster-score">Synergy: 0</div>
                </div>

                <div class="clicker-area">
                    <button id="synergy-button" class="clicker-button">
                        <span class="clicker-text">SYNERGY</span>
                    </button>
                </div>

                <div class="clicker-feedback" id="clicker-feedback"></div>

                <div class="timewaster-commentary" id="timewaster-commentary">
                    Click to begin generating synergy...
                </div>
            </div>
        `;

        // Setup click handler
        const button = document.getElementById('synergy-button');
        button.addEventListener('click', () => this.handleSynergyClick());
    }

    handleSynergyClick() {
        if (!this.gameActive) return;

        this.score++;
        audioEngine.click();

        // Update score display
        document.getElementById('timewaster-score').textContent = `Synergy: ${this.score}`;

        // Show feedback animation
        this.showClickFeedback();

        // Random corporate commentary
        if (this.score % 10 === 0) {
            this.showCommentary();
        }
    }

    showClickFeedback() {
        const feedback = document.getElementById('clicker-feedback');
        const plusOne = document.createElement('div');
        plusOne.className = 'click-feedback-text';
        plusOne.textContent = '+1';
        plusOne.style.left = (Math.random() * 200 + 50) + 'px';
        plusOne.style.top = (Math.random() * 100 + 50) + 'px';
        feedback.appendChild(plusOne);

        setTimeout(() => plusOne.remove(), 1000);
    }

    showCommentary() {
        const commentary = [
            'Synergy achieved: +10 units',
            'Productivity detected!',
            'Optimization in progress...',
            'The Brain is pleased.',
            'Paradigm shift imminent.',
            'Leveraging best practices!',
            'Disruption: Successful',
            'Consensus reached!',
            'Bandwidth optimized.',
            'Low-hanging fruit harvested.'
        ];

        const text = commentary[Math.floor(Math.random() * commentary.length)];
        document.getElementById('timewaster-commentary').textContent = text;
    }

    // Item drop system
    rollForItems() {
        const items = [];

        // Calculate drop chances based on score
        const performance = this.score;

        // GRAY items (90% chance, 1-3 items)
        const grayCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < grayCount; i++) {
            if (Math.random() < 0.9) {
                items.push(this.generateItem('gray'));
            }
        }

        // GREEN items (7% chance if score > 20)
        if (performance > 20 && Math.random() < 0.07) {
            items.push(this.generateItem('green'));
        }

        // BLUE items (2% chance if score > 50)
        if (performance > 50 && Math.random() < 0.02) {
            items.push(this.generateItem('blue'));
        }

        // PURPLE items (0.9% chance if score > 80)
        if (performance > 80 && Math.random() < 0.009) {
            items.push(this.generateItem('purple'));
        }

        // GOLD items (0.1% chance if score > 100)
        if (performance > 100 && Math.random() < 0.001) {
            items.push(this.generateItem('gold'));
        }

        return items;
    }

    generateItem(rarity) {
        const itemTypes = {
            gray: ['Pen', 'Stapler', 'Sticky Note', 'Paper Clip', 'Spam Email', 'Meeting Minutes'],
            green: ['Bronze Badge', 'Company Scrip', 'Green Keycard', 'Coffee Voucher'],
            blue: ['Blue Keycard', 'Surgical Gloves', 'Neural Cable', 'Redacted Document'],
            purple: ['Purple Keycard', 'Bio Sample', 'Founder Code Fragment', 'Memory Module'],
            gold: ['Gold Keycard', 'Timeline Evidence', 'Galt Protocol', 'Brain Tissue Sample']
        };

        const names = itemTypes[rarity];
        const name = names[Math.floor(Math.random() * names.length)];

        return {
            id: `${rarity}_${Date.now()}_${Math.random()}`,
            name: name,
            rarity: rarity,
            type: this.getItemType(name),
            tradeValue: this.getTradeValue(rarity)
        };
    }

    getItemType(name) {
        if (name.includes('Keycard')) return 'access';
        if (name.includes('Badge')) return 'badge';
        if (name.includes('Document') || name.includes('Evidence')) return 'lore';
        if (name.includes('Sample') || name.includes('Tissue')) return 'biological';
        return 'junk';
    }

    getTradeValue(rarity) {
        const values = {
            gray: 1,
            green: 10,
            blue: 50,
            purple: 200,
            gold: 1000
        };
        return values[rarity] || 1;
    }

    showResults(items) {
        const container = document.getElementById('timewaster-container');

        const rarityColors = {
            gray: '#888888',
            green: '#00ff00',
            blue: '#00aaff',
            purple: '#aa00ff',
            gold: '#ffaa00'
        };

        let itemsHTML = items.map(item => {
            const color = rarityColors[item.rarity];
            return `
                <div class="item-reward" style="border-color: ${color};">
                    <span class="item-name" style="color: ${color};">${item.name}</span>
                    <span class="item-rarity">${item.rarity.toUpperCase()}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="timewaster-results">
                <h2>GAME COMPLETE</h2>
                <div class="results-stats">
                    <p>Final Synergy: <span class="highlight">${this.score}</span></p>
                    <p>Performance: <span class="highlight">${this.getPerformanceRating()}</span></p>
                </div>

                <div class="results-items">
                    <h3>Items Earned:</h3>
                    ${itemsHTML || '<p>No items earned. Try harder.</p>'}
                </div>

                <div class="results-commentary">
                    ${this.getFinalCommentary()}
                </div>

                <button class="control-btn" onclick="timewasterEngine.returnToGame()">
                    Continue
                </button>
            </div>
        `;

        // Add items to inventory
        console.log('[Timewaster] Adding items to inventory:', items);
        console.log('[Timewaster] window.gameEngine:', window.gameEngine);

        if (!window.gameEngine) {
            console.error('[Timewaster] ERROR: window.gameEngine is not defined!');
            alert('Error: Game engine not found. Items cannot be added. Please refresh the page.');
            return;
        }

        if (!window.gameEngine.inventory) {
            console.error('[Timewaster] ERROR: gameEngine.inventory is not defined!');
            alert('Error: Inventory system not found. Items cannot be added. Please refresh the page.');
            return;
        }

        let addedCount = 0;
        items.forEach(item => {
            console.log('[Timewaster] Attempting to add:', item.name, item);
            const success = window.gameEngine.inventory.addItem(item);
            console.log('[Timewaster] Add result:', success);
            if (success) addedCount++;
        });

        console.log(`[Timewaster] Successfully added ${addedCount}/${items.length} items`);

        // Play success sound
        if (addedCount > 0) {
            audioEngine.achievement();
        }
    }

    getPerformanceRating() {
        if (this.score < 20) return 'Suboptimal';
        if (this.score < 50) return 'Adequate';
        if (this.score < 80) return 'Productive';
        if (this.score < 120) return 'Synergistic';
        return 'OPTIMIZED';
    }

    getFinalCommentary() {
        const score = this.score;
        if (score < 20) return 'The Brain is disappointed. Productivity training recommended.';
        if (score < 50) return 'Acceptable performance. Continue optimizing.';
        if (score < 80) return 'Good work. Synergy levels approaching target.';
        if (score < 120) return 'Excellent! The Brain is pleased with your productivity.';
        return 'OUTSTANDING! You have achieved peak optimization. Promotion pending.';
    }

    returnToGame() {
        // Hide timewaster, return to main game
        document.getElementById('timewaster-container').style.display = 'none';
        document.getElementById('game-wrapper').style.display = 'block';

        // Trigger continuation of story
        if (window.gameEngine) {
            window.gameEngine.continueAfterTimewaster();
        }
    }

    // ============================================
    // BUZZWORD BINGO
    // ============================================

    setupBuzzwordBingo() {
        const container = document.getElementById('timewaster-container');

        const buzzwords = [
            'SYNERGY', 'PIVOT', 'DISRUPT', 'LEVERAGE', 'SCALABLE',
            'AGILE', 'BANDWIDTH', 'CIRCLE BACK', 'PARADIGM', 'OPTIMIZE',
            'ECOSYSTEM', 'ACTIONABLE', 'HOLISTIC', 'ROBUST', 'STREAMLINE',
            'IDEATE', 'MONETIZE', 'STAKEHOLDER', 'ALIGNMENT', 'INNOVATION',
            'DEEP DIVE', 'LOW-HANGING FRUIT', 'MOVE THE NEEDLE', 'WIN-WIN', 'GAME CHANGER'
        ];

        // Shuffle and pick 16 for 4x4 grid
        const shuffled = buzzwords.sort(() => Math.random() - 0.5).slice(0, 16);

        // Mark one random square as called to start
        this.bingoBoard = shuffled.map((word, idx) => ({
            word: word,
            called: idx === 7 || idx === 8 // Center squares start marked
        }));

        this.bingoCallQueue = buzzwords.filter(w => !this.bingoBoard.find(b => b.word === w)).sort(() => Math.random() - 0.5);
        this.bingoCallInterval = null;

        container.innerHTML = `
            <div class="timewaster-game">
                <h2>BUZZWORD BINGO</h2>
                <p class="timewaster-instructions">Mark the buzzwords as they're called in the meeting!</p>

                <div class="timewaster-stats">
                    <div id="timewaster-timer">Time: 60s</div>
                    <div id="timewaster-score">Lines: 0</div>
                </div>

                <div class="bingo-container">
                    <div class="bingo-grid" id="bingo-grid">
                        ${this.bingoBoard.map((cell, idx) => `
                            <button class="bingo-cell ${cell.called ? 'marked' : ''}" id="bingo-${idx}" data-index="${idx}">
                                ${cell.word}
                            </button>
                        `).join('')}
                    </div>

                    <div class="bingo-call-area">
                        <div class="bingo-current-call" id="bingo-current-call">
                            Waiting for meeting to start...
                        </div>
                    </div>
                </div>

                <div class="timewaster-commentary" id="timewaster-commentary">
                    Listen carefully to mark the right buzzwords...
                </div>
            </div>
        `;

        // Setup click handlers
        this.bingoBoard.forEach((cell, idx) => {
            document.getElementById(`bingo-${idx}`).addEventListener('click', () => this.handleBingoClick(idx));
        });

        // Start calling buzzwords every 3 seconds
        this.startBingoCalls();
    }

    startBingoCalls() {
        this.bingoCallInterval = setInterval(() => {
            if (!this.gameActive || this.bingoCallQueue.length === 0) return;

            const called = this.bingoCallQueue.shift();
            const callDisplay = document.getElementById('bingo-current-call');

            callDisplay.textContent = `"${called}"`;
            callDisplay.className = 'bingo-current-call flash';

            // Mark this buzzword as callable
            const cellIndex = this.bingoBoard.findIndex(c => c.word === called);
            if (cellIndex >= 0) {
                this.bingoBoard[cellIndex].canBeCalled = true;
            }

            setTimeout(() => {
                callDisplay.className = 'bingo-current-call';
            }, 500);

        }, 3000);
    }

    handleBingoClick(index) {
        if (!this.gameActive) return;

        const cell = this.bingoBoard[index];

        // Check if this buzzword was actually called
        if (cell.canBeCalled && !cell.called) {
            cell.called = true;
            document.getElementById(`bingo-${index}`).classList.add('marked');
            audioEngine.select();

            // Check for completed lines
            this.checkBingoLines();
        } else if (!cell.canBeCalled && !cell.called) {
            // Penalty for clicking uncalled buzzword
            audioEngine.error();
            document.getElementById('timewaster-commentary').textContent = 'That buzzword hasn\'t been called yet!';
        }
    }

    checkBingoLines() {
        let linesCompleted = 0;

        // Check rows
        for (let row = 0; row < 4; row++) {
            const start = row * 4;
            if (this.bingoBoard.slice(start, start + 4).every(c => c.called)) {
                linesCompleted++;
            }
        }

        // Check columns
        for (let col = 0; col < 4; col++) {
            if ([0, 1, 2, 3].every(row => this.bingoBoard[row * 4 + col].called)) {
                linesCompleted++;
            }
        }

        // Check diagonals
        if ([0, 5, 10, 15].every(i => this.bingoBoard[i].called)) {
            linesCompleted++;
        }
        if ([3, 6, 9, 12].every(i => this.bingoBoard[i].called)) {
            linesCompleted++;
        }

        // Update score
        if (linesCompleted > this.score) {
            this.score = linesCompleted;
            document.getElementById('timewaster-score').textContent = `Lines: ${this.score}`;

            if (linesCompleted >= 4) {
                document.getElementById('timewaster-commentary').textContent = 'BINGO! You\'ve mastered corporate speak!';
            }
        }
    }

    // ============================================
    // EMAIL SORTER
    // ============================================

    setupEmailSorter() {
        const container = document.getElementById('timewaster-container');

        this.emails = [
            { from: 'Craig the Coffee Cup', subject: 'RE: Synergy Update', category: 'important' },
            { from: 'Nigerian Prince', subject: 'Urgent Business Opportunity', category: 'spam' },
            { from: 'IT Department', subject: 'Password Reset Required', category: 'spam' },
            { from: 'The Brain', subject: 'Productivity Metrics Q3', category: 'important' },
            { from: 'HR', subject: 'Mandatory Fun Event', category: 'normal' },
            { from: 'Alex (AI Assistant)', subject: 'New Product Ideas', category: 'normal' },
            { from: 'Best Deals Now!', subject: 'You Won a Prize!', category: 'spam' },
            { from: 'The Plug', subject: 'Server Maintenance Tonight', category: 'important' },
            { from: 'Marketing', subject: 'Latest Campaign Results', category: 'normal' },
            { from: 'Free Crypto', subject: 'Get Rich Quick', category: 'spam' },
            { from: 'Security', subject: 'Unusual Login Detected', category: 'important' },
            { from: 'Social Media Team', subject: 'Viral Tweet Ideas', category: 'normal' }
        ];

        this.currentEmailIndex = 0;
        this.shuffleArray(this.emails);

        container.innerHTML = `
            <div class="timewaster-game">
                <h2>EMAIL SORTER</h2>
                <p class="timewaster-instructions">Sort incoming emails: Important, Normal, or Spam!</p>

                <div class="timewaster-stats">
                    <div id="timewaster-timer">Time: 60s</div>
                    <div id="timewaster-score">Sorted: 0</div>
                </div>

                <div class="email-display" id="email-display">
                    <div class="email-header">
                        <div class="email-from" id="email-from">From: Loading...</div>
                        <div class="email-subject" id="email-subject">Subject: Loading...</div>
                    </div>
                </div>

                <div class="email-buttons">
                    <button class="email-btn important-btn" id="btn-important">
                        ⚠️ IMPORTANT
                    </button>
                    <button class="email-btn normal-btn" id="btn-normal">
                        📧 NORMAL
                    </button>
                    <button class="email-btn spam-btn" id="btn-spam">
                        🗑️ SPAM
                    </button>
                </div>

                <div class="timewaster-commentary" id="timewaster-commentary">
                    Choose wisely! Wrong sorting loses points.
                </div>
            </div>
        `;

        // Setup button handlers
        document.getElementById('btn-important').addEventListener('click', () => this.sortEmail('important'));
        document.getElementById('btn-normal').addEventListener('click', () => this.sortEmail('normal'));
        document.getElementById('btn-spam').addEventListener('click', () => this.sortEmail('spam'));

        // Show first email
        this.showNextEmail();
    }

    showNextEmail() {
        if (this.currentEmailIndex >= this.emails.length) {
            this.currentEmailIndex = 0;
            this.shuffleArray(this.emails);
        }

        const email = this.emails[this.currentEmailIndex];
        document.getElementById('email-from').textContent = `From: ${email.from}`;
        document.getElementById('email-subject').textContent = `Subject: ${email.subject}`;
    }

    sortEmail(category) {
        if (!this.gameActive) return;

        const email = this.emails[this.currentEmailIndex];

        if (email.category === category) {
            // Correct sort
            this.score++;
            audioEngine.select();
            document.getElementById('timewaster-commentary').textContent = 'Correct! Email sorted.';
        } else {
            // Wrong sort (penalty)
            this.score = Math.max(0, this.score - 1);
            audioEngine.error();
            document.getElementById('timewaster-commentary').textContent = `Wrong! That was ${email.category.toUpperCase()}!`;
        }

        document.getElementById('timewaster-score').textContent = `Sorted: ${this.score}`;
        this.currentEmailIndex++;
        this.showNextEmail();
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

// Global timewaster engine instance
const timewasterEngine = new TimewasterEngine();
