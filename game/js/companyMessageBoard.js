/**
 * Company Message Board - Displays pre-generated company chat messages
 * Auto-advances through messages with context-aware filtering
 */

class CompanyMessageBoard {
  constructor() {
    this.messages = [];
    this.currentMessageIndex = 0;
    this.autoAdvance = true;
    this.advanceInterval = 30000; // 30 seconds
    this.intervalId = null;
    this.initialized = false;
  }

  async init() {
    console.log('CompanyMessageBoard: Initializing...');
    await this.loadMessages();
    this.createUI();

    if (this.autoAdvance) {
      this.startAutoAdvance();
    }

    this.initialized = true;
    console.log('CompanyMessageBoard: Initialized');
  }

  async loadMessages() {
    try {
      // Get current context based on game state
      const context = this.getCurrentContext();
      console.log(`CompanyMessageBoard: Loading messages for context: ${context}`);

      const messages = await contentLoader.loadCompanyMessages(new Date(), context);

      // If we got a single message (random), wrap in array
      if (!Array.isArray(messages)) {
        this.messages = [messages];
      } else {
        this.messages = messages;
      }

      console.log(`CompanyMessageBoard: Loaded ${this.messages.length} messages`);
    } catch (error) {
      console.error('CompanyMessageBoard: Failed to load messages:', error);
      // Use fallback
      this.messages = [{
        speaker: "THE BRAIN",
        message: "MESSAGE SYSTEM MALFUNCTION. CONTINUE WORKING REGARDLESS.",
        context: "random",
        sentiment: "tense",
        timestamp: new Date().toISOString()
      }];
    }
  }

  getCurrentContext() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = now.getHours();

    // Monday morning (bleary, coffee-dependent)
    if (day === 1 && hour < 12) {
      return 'monday_morning';
    }

    // Friday afternoon (relaxed, weekend talk)
    if (day === 5 && hour >= 15) {
      return 'friday_afternoon';
    }

    // Check for high productivity = deadline mode
    if (typeof jobTitleSystem !== 'undefined' && jobTitleSystem.score > 100) {
      return 'project_deadline';
    }

    // Check for chaos stat = bug crisis
    if (typeof gameEngine !== 'undefined' && gameEngine.gameState.stats.chaos > 50) {
      return 'bug_crisis';
    }

    // Default to random
    return 'random';
  }

  createUI() {
    const container = document.getElementById('message-board');
    if (!container) {
      console.warn('CompanyMessageBoard: No #message-board element found');
      return;
    }

    container.innerHTML = `
      <div class="message-board-header">
        <h3>💬 Company Chat</h3>
        <div class="message-controls">
          <button id="message-prev" class="message-nav-btn" title="Previous message">←</button>
          <span id="message-counter" class="message-counter">1/${this.messages.length}</span>
          <button id="message-next" class="message-nav-btn" title="Next message">→</button>
          <button id="message-pause" class="message-pause-btn" title="Pause auto-advance">⏸</button>
        </div>
      </div>
      <div class="message-content" id="message-content">
        ${this.renderMessage(this.messages[0])}
      </div>
    `;

    // Attach event listeners
    document.getElementById('message-prev').onclick = () => this.prevMessage();
    document.getElementById('message-next').onclick = () => this.nextMessage();
    document.getElementById('message-pause').onclick = () => this.togglePause();
  }

  renderMessage(message) {
    if (!message) return '<div class="message-error">No messages available</div>';

    const speakerClass = message.speaker.toLowerCase().replace(/\s+/g, '-');
    const sentimentIcon = this.getSentimentIcon(message.sentiment);

    return `
      <div class="message ${speakerClass} sentiment-${message.sentiment}">
        <div class="message-header">
          <span class="message-speaker">${message.speaker}</span>
          <span class="message-sentiment">${sentimentIcon}</span>
          <span class="message-context">#${message.context}</span>
        </div>
        <div class="message-body">${message.message}</div>
        <div class="message-timestamp">${this.formatTimestamp(message.timestamp)}</div>
      </div>
    `;
  }

  getSentimentIcon(sentiment) {
    const icons = {
      positive: '😊',
      neutral: '😐',
      tense: '😬',
      chaotic: '🔥'
    };
    return icons[sentiment] || '💬';
  }

  formatTimestamp(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Now';
    }
  }

  nextMessage() {
    this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length;
    this.displayCurrentMessage();
  }

  prevMessage() {
    this.currentMessageIndex = (this.currentMessageIndex - 1 + this.messages.length) % this.messages.length;
    this.displayCurrentMessage();
  }

  displayCurrentMessage() {
    const contentEl = document.getElementById('message-content');
    if (contentEl) {
      contentEl.innerHTML = this.renderMessage(this.messages[this.currentMessageIndex]);
    }

    const counterEl = document.getElementById('message-counter');
    if (counterEl) {
      counterEl.textContent = `${this.currentMessageIndex + 1}/${this.messages.length}`;
    }
  }

  startAutoAdvance() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.nextMessage();
    }, this.advanceInterval);

    console.log('CompanyMessageBoard: Auto-advance started');
  }

  stopAutoAdvance() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('CompanyMessageBoard: Auto-advance stopped');
  }

  togglePause() {
    this.autoAdvance = !this.autoAdvance;

    const pauseBtn = document.getElementById('message-pause');
    if (pauseBtn) {
      pauseBtn.textContent = this.autoAdvance ? '⏸' : '▶';
      pauseBtn.title = this.autoAdvance ? 'Pause auto-advance' : 'Resume auto-advance';
    }

    if (this.autoAdvance) {
      this.startAutoAdvance();
    } else {
      this.stopAutoAdvance();
    }
  }

  // Refresh messages (call when game state changes significantly)
  async refresh() {
    console.log('CompanyMessageBoard: Refreshing messages...');
    this.currentMessageIndex = 0;
    await this.loadMessages();
    this.displayCurrentMessage();
  }
}

// Global instance
const companyMessageBoard = new CompanyMessageBoard();
