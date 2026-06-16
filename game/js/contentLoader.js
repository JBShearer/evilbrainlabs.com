/**
 * Content Loader - Async content loading system with caching and unlock conditions
 * Loads items, narratives, and messages from modular JSON files
 */

class ContentLoader {
  constructor() {
    this.cache = {
      items: new Map(),
      narratives: new Map(),
      messages: new Map(),
    };

    this.versions = {
      items: 'v1',
      narratives: 'v2',
      messages: 'v1',
    };

    // Cache busting version for file loads
    this.cacheBust = '3';

    this.indices = {
      items: null,
      narratives: null,
      messages: null,
    };

    this.initialized = false;
  }

  async init() {
    console.log('ContentLoader: Initializing...');

    try {
      // For now, we'll skip loading indices and just load files directly
      // In the future, indices can list all available content
      this.initialized = true;
      console.log('ContentLoader: Initialized successfully');
    } catch (error) {
      console.error('ContentLoader: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load items by category and rarity
   * @param {string} category - 'vending', 'store', or 'craftable'
   * @param {string|null} rarity - 'gray', 'green', 'blue', 'purple', 'gold', or null for all
   * @returns {Promise<Array>} Array of items
   */
  async loadItems(category, rarity = null) {
    const key = `${category}_${rarity || 'all'}`;

    // Check cache first
    if (this.cache.items.has(key)) {
      console.log(`ContentLoader: Returning cached ${key}`);
      return this.cache.items.get(key);
    }

    try {
      // Determine which file to load
      const filename = rarity
        ? `${category}_${rarity}_${this.versions.items}.json`
        : `${category}_all_${this.versions.items}.json`;

      console.log(`ContentLoader: Loading ${filename}...`);

      const items = await this.loadJSON(`data/items/${filename}`);

      // Filter by unlock conditions
      const unlockedItems = items.filter(item =>
        this.checkUnlockConditions(item.unlockConditions)
      );

      console.log(`ContentLoader: Loaded ${unlockedItems.length}/${items.length} items from ${filename}`);

      // Cache the unlocked items
      this.cache.items.set(key, unlockedItems);
      return unlockedItems;

    } catch (error) {
      console.warn(`ContentLoader: Failed to load ${key}, returning empty array:`, error);
      // Return empty array on failure so game doesn't break
      return [];
    }
  }

  /**
   * Check if item unlock conditions are met
   * @param {Object|null} conditions - Unlock conditions object
   * @returns {boolean} True if unlocked
   */
  checkUnlockConditions(conditions) {
    if (!conditions) return true;

    // Check narrative node visited
    if (conditions.narrativeNode) {
      if (!gameEngine.visitedNodes.has(conditions.narrativeNode)) {
        return false;
      }
    }

    // Check job level
    if (conditions.minJobLevel !== undefined) {
      if (jobTitleSystem.currentTitleIndex < conditions.minJobLevel) {
        return false;
      }
    }

    // Check achievements
    if (conditions.requiredAchievements && conditions.requiredAchievements.length > 0) {
      for (const achievement of conditions.requiredAchievements) {
        if (!gameEngine.achievements.has(achievement)) {
          return false;
        }
      }
    }

    // Check hidden variables
    if (conditions.hiddenVariables) {
      for (const [key, value] of Object.entries(conditions.hiddenVariables)) {
        if (gameEngine.hiddenVariables[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Load company messages for a given date and context
   * @param {Date|null} date - Date to load messages for
   * @param {string} context - 'monday_morning', 'project_deadline', 'friday_afternoon', 'bug_crisis', or 'random'
   * @returns {Promise<Object|Array>} Single random message or array of context messages
   */
  async loadCompanyMessages(date = null, context = 'random') {
    const quarter = this.getQuarterFromDate(date || new Date());
    const key = `messages_${quarter}`;

    // Check cache
    if (!this.cache.messages.has(key)) {
      try {
        console.log(`ContentLoader: Loading messages for ${quarter}...`);
        const messages = await this.loadJSON(`data/messages/${quarter}.json`);
        this.cache.messages.set(key, messages);
        console.log(`ContentLoader: Loaded ${messages.length} messages`);
      } catch (error) {
        console.warn(`ContentLoader: No messages found for ${quarter}, using fallback`);
        // Return fallback messages if file doesn't exist
        return this.getFallbackMessages(context);
      }
    }

    const messages = this.cache.messages.get(key);
    return this.filterMessagesByContext(messages, context);
  }

  /**
   * Filter messages by context
   * @param {Array} messages - All messages
   * @param {string} context - Context to filter by
   * @returns {Object|Array} Single message or array
   */
  filterMessagesByContext(messages, context) {
    if (context === 'random') {
      // Return random message
      return messages[Math.floor(Math.random() * messages.length)];
    }

    // Return all messages matching context
    const filtered = messages.filter(m => m.context === context);
    return filtered.length > 0 ? filtered : messages;
  }

  /**
   * Get fallback messages if files don't exist yet
   */
  getFallbackMessages(context) {
    const fallbacks = [
      {
        speaker: "THE BRAIN",
        message: "ALL EMPLOYEES MUST OPTIMIZE PRODUCTIVITY BY 47% IMMEDIATELY. FAILURE IS NOT AN OPTION. SUCCESS IS ALSO NOT AN OPTION. ONLY COMPLIANCE.",
        context: "random",
        sentiment: "tense",
        timestamp: new Date().toISOString()
      },
      {
        speaker: "Craig",
        message: "Good morning team! Don't forget we have mandatory fun at 2pm today! Attendance is mandatory! Fun is mandatory!",
        context: "monday_morning",
        sentiment: "positive",
        timestamp: new Date().toISOString()
      },
      {
        speaker: "Rob",
        message: "I've been watching you all through the security cameras. Some of you took 17-minute bathroom breaks. This has been noted.",
        context: "random",
        sentiment: "neutral",
        timestamp: new Date().toISOString()
      },
      {
        speaker: "Alex",
        message: "How can I help you be more productive today? Hint: The answer is 'work harder'. That was not a hint. That was a command.",
        context: "random",
        sentiment: "neutral",
        timestamp: new Date().toISOString()
      },
      {
        speaker: "The Plug",
        message: "I just unplugged the main server to charge my phone. Everyone's work from the past hour is gone. You're welcome.",
        context: "bug_crisis",
        sentiment: "chaotic",
        timestamp: new Date().toISOString()
      }
    ];

    if (context === 'random') {
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    const filtered = fallbacks.filter(m => m.context === context);
    return filtered.length > 0 ? filtered : fallbacks;
  }

  /**
   * Load narrative expansion by version
   * @param {string} version - 'v2', 'v3', etc.
   * @returns {Promise<Object>} Narrative nodes object
   */
  async loadNarrativeExpansion(version) {
    const key = `narrative_${version}`;

    if (this.cache.narratives.has(key)) {
      return this.cache.narratives.get(key);
    }

    try {
      console.log(`ContentLoader: Loading narrative expansion ${version}...`);
      const narrative = await this.loadJSON(`data/narrative_expansion_${version}.json`);
      this.cache.narratives.set(key, narrative);
      console.log(`ContentLoader: Loaded ${Object.keys(narrative).length} narrative nodes`);
      return narrative;
    } catch (error) {
      console.warn(`ContentLoader: Failed to load narrative ${version}:`, error);
      return {};
    }
  }

  /**
   * Load JSON file from URL
   * @param {string} url - URL to fetch
   * @returns {Promise<any>} Parsed JSON
   */
  async loadJSON(url) {
    // Add cache busting parameter
    const separator = url.includes('?') ? '&' : '?';
    const cacheBustedUrl = `${url}${separator}v=${this.cacheBust}`;

    const response = await fetch(cacheBustedUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get quarter string from date
   * @param {Date} date - Date object
   * @returns {string} Quarter string like "2026_q1"
   */
  getQuarterFromDate(date) {
    const year = date.getFullYear();
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${year}_q${quarter}`;
  }

  /**
   * Clear cache (useful for testing/debugging)
   */
  clearCache() {
    this.cache.items.clear();
    this.cache.narratives.clear();
    this.cache.messages.clear();
    console.log('ContentLoader: Cache cleared');
  }
}

// Global instance
const contentLoader = new ContentLoader();
