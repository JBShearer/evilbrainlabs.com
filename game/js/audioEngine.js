// ============================================
// Audio Engine - Web Audio Synth
// ============================================

class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.3;
        this.soundEnabled = true;
    }

    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playSound(frequency, duration = 0.2, type = 'sine', volume = 0.5) {
        if (!this.soundEnabled || !this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.type = type;
        osc.frequency.value = frequency;

        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(volume * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    }

    playSequence(frequencies, interval = 100, duration = 0.15, type = 'sine') {
        frequencies.forEach((freq, i) => {
            setTimeout(() => {
                this.playSound(freq, duration, type);
            }, i * interval);
        });
    }

    // Preset Sound Effects
    select() {
        this.playSound(800, 0.1, 'sine', 0.4);
    }

    transition() {
        this.playSequence([600, 800], 150, 0.15, 'square');
    }

    loopback() {
        this.playSequence([400, 600, 800, 600, 400], 100, 0.1, 'square');
    }

    achievement() {
        // C-E-G major chord
        this.playSequence([523.25, 659.25, 783.99], 150, 0.2, 'sine');
    }

    error() {
        this.playSound(200, 0.3, 'square', 0.2);
    }

    click() {
        this.playSound(1000, 0.05, 'sine', 0.3);
    }

    hover() {
        this.playSound(600, 0.05, 'sine', 0.2);
    }

    unlock() {
        // Ascending arpeggio
        this.playSequence([523.25, 659.25, 783.99, 1046.50], 100, 0.15, 'sine');
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }
}

// Global audio engine instance
const audioEngine = new AudioEngine();

// Initialize on first user interaction
document.addEventListener('click', () => {
    audioEngine.init();
}, { once: true });
