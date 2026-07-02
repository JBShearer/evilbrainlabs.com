// Evil Brain Labs: The Registry
// Authentication

class Auth {
    constructor() {
        this.user = null;
        this.profile = null;
        this.listeners = [];
    }

    async init() {
        const client = initSupabase();
        if (!client) return;

        // Check for existing session
        const { data: { session } } = await client.auth.getSession();
        if (session) {
            this.user = session.user;
            await this.loadProfile();
        }

        // Listen for auth changes
        client.auth.onAuthStateChange(async (event, session) => {
            this.user = session?.user || null;
            if (this.user) {
                await this.loadProfile();
            } else {
                this.profile = null;
            }
            this.notifyListeners();
        });

        this.notifyListeners();
    }

    async loadProfile() {
        if (!this.user) return;

        const client = initSupabase();
        const { data, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', this.user.id)
            .single();

        if (!error && data) {
            this.profile = data;
        }
    }

    async signIn(email) {
        const client = initSupabase();
        const { error } = await client.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        if (error) throw error;
        return true;
    }

    async signOut() {
        const client = initSupabase();
        await client.auth.signOut();
        this.user = null;
        this.profile = null;
        this.notifyListeners();
    }

    isAuthenticated() {
        return !!this.user;
    }

    getBalance() {
        return this.profile?.braincoin_balance || 0;
    }

    getHandle() {
        return this.profile?.handle || 'Anonymous';
    }

    onAuthChange(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.user, this.profile));
    }
}

// Global auth instance
const auth = new Auth();

// Setup auth UI
function setupAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    const authModal = document.getElementById('auth-modal');
    const modalClose = document.getElementById('modal-close');
    const authForm = document.getElementById('auth-form');
    const authMessage = document.getElementById('auth-message');
    const navProfile = document.getElementById('nav-profile');
    const navBalance = document.getElementById('nav-balance');

    if (!authBtn) return;

    // Update UI based on auth state
    auth.onAuthChange((user, profile) => {
        if (user) {
            authBtn.textContent = 'Sign Out';
            if (navProfile) {
                navProfile.style.display = 'flex';
                navBalance.textContent = profile?.braincoin_balance || 0;
            }
        } else {
            authBtn.textContent = 'Sign In';
            if (navProfile) {
                navProfile.style.display = 'none';
            }
        }
    });

    // Auth button click
    authBtn.addEventListener('click', async () => {
        if (auth.isAuthenticated()) {
            await auth.signOut();
        } else {
            authModal.classList.add('active');
        }
    });

    // Close modal
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            authModal.classList.remove('active');
            authMessage.textContent = '';
            authMessage.className = 'auth-message';
        });
    }

    // Close modal on background click
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.classList.remove('active');
        }
    });

    // Auth form submit
    authForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;

        try {
            await auth.signIn(email);
            authMessage.textContent = 'Check your email for the magic link!';
            authMessage.className = 'auth-message success';
        } catch (error) {
            authMessage.textContent = error.message;
            authMessage.className = 'auth-message error';
        }
    });
}
