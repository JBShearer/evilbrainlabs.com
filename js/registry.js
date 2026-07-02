// Evil Brain Labs: The Registry
// Registry browsing and cards

class Registry {
    constructor() {
        this.useCases = [];
        this.filters = {
            search: '',
            category: '',
            severity: '',
            valence: ''
        };
    }

    async load() {
        const client = initSupabase();
        if (!client) {
            console.warn('Supabase not initialized');
            return [];
        }

        let query = client
            .from('use_cases')
            .select(`
                *,
                coins (
                    id,
                    current_valence,
                    mint_valence,
                    pressure,
                    owner_id
                )
            `)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        // Apply filters
        if (this.filters.category) {
            query = query.eq('category', this.filters.category);
        }

        if (this.filters.severity) {
            query = query.eq('severity', parseInt(this.filters.severity));
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading use cases:', error);
            return [];
        }

        this.useCases = data || [];

        // Filter by valence (coin field)
        if (this.filters.valence) {
            this.useCases = this.useCases.filter(uc =>
                uc.coins?.[0]?.current_valence === this.filters.valence
            );
        }

        // Filter by search term (client-side for now)
        if (this.filters.search) {
            const term = this.filters.search.toLowerCase();
            this.useCases = this.useCases.filter(uc =>
                uc.title.toLowerCase().includes(term) ||
                uc.description.toLowerCase().includes(term)
            );
        }

        return this.useCases;
    }

    async search(query) {
        this.filters.search = query;
        return this.load();
    }

    setFilter(key, value) {
        this.filters[key] = value;
    }

    renderCard(useCase) {
        const coin = useCase.coins?.[0];
        const valence = coin?.current_valence || 'evil';
        const pressure = coin?.pressure || 0;
        const pressurePercent = Math.min((pressure / CONFIG.TRIBUNAL_THRESHOLD) * 100, 100);
        const underReview = pressure >= CONFIG.TRIBUNAL_THRESHOLD;

        // Severity dots
        const severityDots = Array(5).fill(0).map((_, i) =>
            `<span class="severity-dot ${i < useCase.severity ? 'filled' : ''}"></span>`
        ).join('');

        return `
            <article class="use-case-card">
                ${underReview ? '<div class="tribunal-stamp">Under Tribunal Review</div>' : ''}
                <div class="card-header">
                    <h4 class="card-title">
                        <a href="/use-case.html?id=${useCase.id}">${escapeHtml(useCase.title)}</a>
                    </h4>
                    <span class="valence-badge ${valence}">${valence}</span>
                </div>
                <p class="card-description">${escapeHtml(useCase.description)}</p>
                <div class="card-meta">
                    <span class="card-category">${useCase.category || 'uncategorized'}</span>
                    <div class="severity-dots" title="Severity: ${useCase.severity}/5">
                        ${severityDots}
                    </div>
                    <div class="card-pressure" title="Pressure: ${pressure}/${CONFIG.TRIBUNAL_THRESHOLD}">
                        <div class="pressure-bar">
                            <div class="pressure-fill ${underReview ? 'warning' : ''}"
                                 style="width: ${pressurePercent}%"></div>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }

    render(container) {
        if (!container) return;

        const loading = document.getElementById('loading');
        const emptyState = document.getElementById('empty-state');
        const resultCount = document.getElementById('result-count');

        if (this.useCases.length === 0) {
            container.innerHTML = '';
            if (loading) loading.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            if (resultCount) resultCount.textContent = '(0)';
            return;
        }

        if (loading) loading.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
        if (resultCount) resultCount.textContent = `(${this.useCases.length})`;

        container.innerHTML = this.useCases.map(uc => this.renderCard(uc)).join('');
    }
}

// Utility: escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Global registry instance
const registry = new Registry();

// Setup registry UI
async function setupRegistryUI() {
    const grid = document.getElementById('registry-grid');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const categoryFilter = document.getElementById('filter-category');
    const severityFilter = document.getElementById('filter-severity');
    const valenceFilter = document.getElementById('filter-valence');

    if (!grid) return;

    // Initial load
    await registry.load();
    registry.render(grid);

    // Search
    const doSearch = async () => {
        registry.filters.search = searchInput?.value || '';
        await registry.load();
        registry.render(grid);
    };

    searchBtn?.addEventListener('click', doSearch);
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
    });

    // Filters
    categoryFilter?.addEventListener('change', async () => {
        registry.setFilter('category', categoryFilter.value);
        await registry.load();
        registry.render(grid);
    });

    severityFilter?.addEventListener('change', async () => {
        registry.setFilter('severity', severityFilter.value);
        await registry.load();
        registry.render(grid);
    });

    valenceFilter?.addEventListener('change', async () => {
        registry.setFilter('valence', valenceFilter.value);
        await registry.load();
        registry.render(grid);
    });
}
