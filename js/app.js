// Evil Brain Labs: The Registry
// Main app initialization

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🧠 Evil Brain Labs: The Registry initialized');

    // Initialize Supabase
    initSupabase();

    // Initialize auth
    await auth.init();
    setupAuthUI();

    // Initialize registry (if on homepage)
    await setupRegistryUI();
});
