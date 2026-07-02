// Evil Brain Labs: The Registry
// Configuration

const CONFIG = {
    // Supabase - UPDATE THESE with your project values
    SUPABASE_URL: 'https://aslcrwmbdtvimjrexxzw.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbGNyd21iZHR2aW1qcmV4eHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNDA0NjgsImV4cCI6MjA5NjcxNjQ2OH0.XYG0LrgA_92h7dGjw0aamX53WIrwQaqPHNHQLe8p9ls',

    // Tribunal threshold
    TRIBUNAL_THRESHOLD: 10,

    // Categories
    CATEGORIES: [
        'surveillance',
        'discrimination',
        'misinformation',
        'labor',
        'privacy',
        'manipulation',
        'environment',
        'other'
    ],

    // Severity labels
    SEVERITY_LABELS: {
        1: 'Mild',
        2: 'Concerning',
        3: 'Bad',
        4: 'Very Bad',
        5: 'Catastrophic'
    }
};

// Initialize Supabase client
let supabase = null;

function initSupabase() {
    if (typeof window.supabase !== 'undefined' && !supabase) {
        supabase = window.supabase.createClient(
            CONFIG.SUPABASE_URL,
            CONFIG.SUPABASE_ANON_KEY
        );
    }
    return supabase;
}
