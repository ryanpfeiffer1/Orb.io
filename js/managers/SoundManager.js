/**
 * Orb Battle.io - Sound Manager
 * Web Audio API based procedural sound effects
 */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    /**
     * Initialize the audio context
     */
    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio not supported');
            this.enabled = false;
        }
    }

    /**
     * Resume audio context (required after user interaction)
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Play a tone with the given parameters
     */
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        oscillator.start(this.ctx.currentTime);
        oscillator.stop(this.ctx.currentTime + duration);
    }

    /**
     * Play decay particle sound
     */
    playDecay() {
        this.playTone(200 + Math.random() * 100, 0.1, 'sine', 0.15);
    }

    /**
     * Play orb collection sound
     */
    playCollect() {
        this.playTone(523, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.2), 50);
    }

    /**
     * Play absorption sound
     */
    playAbsorb() {
        this.playTone(300, 0.3, 'sawtooth', 0.25);
    }

    /**
     * Play milestone achievement sound
     */
    playMilestone() {
        this.playTone(523, 0.15, 'sine', 0.3);
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.3), 100);
        setTimeout(() => this.playTone(784, 0.2, 'sine', 0.3), 200);
    }

    /**
     * Play predator warning sound
     */
    playPredatorWarning() {
        this.playTone(150, 0.5, 'sawtooth', 0.4);
        setTimeout(() => this.playTone(100, 0.5, 'sawtooth', 0.4), 500);
    }

    /**
     * Play meteor warning sound
     */
    playMeteorWarning() {
        this.playTone(800, 0.1, 'square', 0.3);
        setTimeout(() => this.playTone(800, 0.1, 'square', 0.3), 200);
        setTimeout(() => this.playTone(800, 0.1, 'square', 0.3), 400);
    }

    /**
     * Play meteor impact sound
     */
    playMeteorImpact() {
        this.playTone(80, 0.4, 'sawtooth', 0.5);
    }

    /**
     * Play death sound
     */
    playDeath() {
        this.playTone(400, 0.2, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(300, 0.2, 'sawtooth', 0.3), 100);
        setTimeout(() => this.playTone(200, 0.3, 'sawtooth', 0.3), 200);
    }

    /**
     * Play respawn sound
     */
    playRespawn() {
        this.playTone(300, 0.15, 'sine', 0.25);
        setTimeout(() => this.playTone(400, 0.15, 'sine', 0.25), 100);
        setTimeout(() => this.playTone(500, 0.2, 'sine', 0.25), 200);
    }

    /**
     * Play kill streak sound
     */
    playKillStreak(count) {
        for (let i = 0; i < Math.min(count, 5); i++) {
            setTimeout(() => this.playTone(400 + i * 100, 0.15, 'sine', 0.3), i * 80);
        }
    }

    /**
     * Play rift enter sound
     */
    playRiftEnter() {
        this.playTone(400, 0.3, 'sine', 0.4);
        this.playTone(600, 0.2, 'sine', 0.3);
        this.playTone(800, 0.15, 'sine', 0.2);
    }

    /**
     * Play rift exit sound
     */
    playRiftExit() {
        this.playTone(800, 0.2, 'sine', 0.4);
        this.playTone(600, 0.25, 'sine', 0.3);
        this.playTone(400, 0.3, 'sine', 0.2);
    }

    /**
     * Play time orb collection sound - distinctive crystalline chime
     */
    playTimeCollect() {
        // Higher, more magical sound for time orbs
        this.playTone(880, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(1046, 0.1, 'sine', 0.3), 50);
        setTimeout(() => this.playTone(1318, 0.15, 'sine', 0.25), 100);
        setTimeout(() => this.playTone(1568, 0.2, 'sine', 0.2), 150);
    }

    /**
     * Play orb collection sound scaled by player size
     * Deeper, more resonant sounds for larger players
     */
    playCollectScaled(playerSize) {
        // Base frequencies adjusted by player size
        const sizeMultiplier = Math.max(0.5, 1 - (playerSize - 20) / 200);
        const baseFreq = 523 * sizeMultiplier;
        const secondFreq = 659 * sizeMultiplier;

        // Volume increases slightly with size
        const volume = Math.min(0.35, 0.2 + (playerSize - 20) / 400);

        this.playTone(baseFreq, 0.1, 'sine', volume);
        setTimeout(() => this.playTone(secondFreq, 0.1, 'sine', volume), 50);

        // Add bass rumble for larger players
        if (playerSize > 50) {
            this.playTone(100 * sizeMultiplier, 0.15, 'sine', 0.15);
        }
    }

    /**
     * Play urgency tick sound for low time
     */
    playUrgencyTick() {
        this.playTone(800, 0.05, 'square', 0.2);
    }

    /**
     * Play low time warning sound
     */
    playLowTimeWarning() {
        this.playTone(600, 0.2, 'sawtooth', 0.35);
        setTimeout(() => this.playTone(500, 0.2, 'sawtooth', 0.35), 200);
        setTimeout(() => this.playTone(400, 0.3, 'sawtooth', 0.3), 400);
    }

    /**
     * Play combo collection sound - rising pitch based on combo count
     */
    playComboCollect(comboCount) {
        // Base frequency rises with combo, capped for sanity
        const baseFreq = Math.min(523 + comboCount * 20, 1200);
        const volume = Math.min(0.25 + comboCount * 0.01, 0.4);

        this.playTone(baseFreq, 0.08, 'sine', volume);
        setTimeout(() => this.playTone(baseFreq * 1.25, 0.08, 'sine', volume * 0.8), 40);

        // Add sparkle for high combos
        if (comboCount >= 10) {
            setTimeout(() => this.playTone(baseFreq * 1.5, 0.06, 'sine', 0.2), 80);
        }
    }

    /**
     * Play combo break sound - descending disappointed tone
     */
    playComboBreak() {
        this.playTone(400, 0.15, 'sine', 0.2);
        setTimeout(() => this.playTone(300, 0.2, 'sine', 0.15), 100);
    }

    /**
     * Play combo milestone sound - celebratory arpeggio
     */
    playComboMilestone(tier) {
        const baseFreq = 523 + tier * 100;
        for (let i = 0; i <= tier; i++) {
            setTimeout(() => this.playTone(baseFreq + i * 80, 0.12, 'sine', 0.3), i * 60);
        }
    }
}

// Singleton instance
export const soundManager = new SoundManager();
