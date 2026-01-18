/**
 * Orb Battle.io - Orb Entity
 * Collectible orb with visual effects
 */

import { CONFIG, getRandomOrbColor, hexToNumber } from '../config.js';

export class Orb extends Phaser.GameObjects.Container {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y);

        this.id = config.id || 'orb_' + Date.now();
        this.orbColor = config.color || getRandomOrbColor();
        this.orbSize = config.size || CONFIG.ORB_MIN_SIZE + Math.random() * (CONFIG.ORB_MAX_SIZE - CONFIG.ORB_MIN_SIZE);
        this.value = config.value || CONFIG.ORB_VALUE;
        this.bonus = config.bonus || 1;
        this.isSpecial = config.isSpecial || false;
        this.specialType = config.specialType || null; // 'gauntlet', 'danger', 'dimension'
        this.isTimeOrb = config.isTimeOrb || false;
        this.timeBonus = config.timeBonus || 0;

        // Create visual elements
        this.createVisuals();

        // Add to scene
        scene.add.existing(this);

        // Set depth
        this.setDepth(5);
    }

    /**
     * Create the visual elements for the orb
     */
    createVisuals() {
        const color = hexToNumber(this.orbColor);

        // Main orb sprite
        this.body = this.scene.add.sprite(0, 0, 'orb');
        this.body.setTint(color);
        this.body.setBlendMode(Phaser.BlendModes.ADD);
        this.body.setDisplaySize(this.orbSize * 2, this.orbSize * 2);
        this.add(this.body);

        // Pulse animation for special orbs (exclude dimension orbs to prevent visual clutter)
        if (this.isSpecial && this.specialType !== 'dimension') {
            this.scene.tweens.add({
                targets: this.body,
                scaleX: 1.2,
                scaleY: 1.2,
                alpha: 0.8,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
    }

    /**
     * Check if player can collect this orb
     */
    canCollect(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Relaxed collision: distance < sum of radii (with slight overlap required)
        return dist < (player.playerSize + this.orbSize * 0.5);
    }

    /**
     * Get collection value
     */
    getValue() {
        return Math.floor(this.value * this.bonus);
    }

    /**
     * Get size gain from collecting
     */
    getSizeGain() {
        return this.isSpecial ? 2 : 1.5;
    }

    /**
     * Destroy the orb
     */
    collect() {
        // Stop any tweens
        if (this.body) {
            this.scene.tweens.killTweensOf(this.body);
        }
        if (this.ring) {
            this.scene.tweens.killTweensOf(this.ring);
        }
        if (this.sparkles) {
            this.sparkles.forEach(s => this.scene.tweens.killTweensOf(s));
        }
        // Stop timer event
        if (this.colorCycleTimer) {
            this.colorCycleTimer.remove();
        }

        // Destroy
        this.destroy();
    }
}

/**
 * Time Orb - Special orb that adds time when collected
 */
export class TimeOrb extends Orb {
    constructor(scene, x, y, config = {}) {
        // Force time orb properties
        const timeConfig = {
            ...config,
            isTimeOrb: true,
            isSpecial: true,
            specialType: 'time',
            color: CONFIG.TIME_ORB.color,
            size: CONFIG.TIME_ORB.size,
            timeBonus: config.timeBonus || CONFIG.TIME_ORB.timeBonus,
            value: 15 // Slightly more points than normal orbs
        };
        super(scene, x, y, timeConfig);

        // Additional time orb visuals
        this.createTimeOrbVisuals();
    }

    /**
     * Create enhanced visuals for time orbs
     */
    createTimeOrbVisuals() {
        const primaryColor = hexToNumber(CONFIG.TIME_ORB.color);
        const secondaryColor = hexToNumber(CONFIG.TIME_ORB.secondaryColor);

        // Rotating ring around the orb
        this.ring = this.scene.add.graphics();
        this.ring.lineStyle(2, primaryColor, 0.8);
        this.ring.strokeCircle(0, 0, this.orbSize * 1.3);
        this.add(this.ring);
        this.sendToBack(this.ring);

        // Rotating animation
        this.scene.tweens.add({
            targets: this.ring,
            rotation: Math.PI * 2,
            duration: 2000,
            repeat: -1,
            ease: 'Linear'
        });

        // Enhanced pulse with color cycling
        this.scene.tweens.add({
            targets: this.body,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: CONFIG.TIME_ORB.pulseSpeed,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Color cycling between cyan and gold
        this.colorPhase = 0;
        this.colorCycleTimer = this.scene.time.addEvent({
            delay: 100,
            callback: () => {
                if (!this.body || !this.body.active) return;
                this.colorPhase += 0.1;
                const blend = (Math.sin(this.colorPhase) + 1) / 2;
                const r = Math.floor(0 * (1 - blend) + 255 * blend);
                const g = Math.floor(255 * (1 - blend) + 215 * blend);
                const b = Math.floor(255 * (1 - blend) + 0 * blend);
                const color = (r << 16) | (g << 8) | b;
                this.body.setTint(color);
            },
            loop: true
        });

        // Sparkle particles around the orb
        this.sparkles = [];
        for (let i = 0; i < 4; i++) {
            const sparkle = this.scene.add.circle(
                Math.cos(i * Math.PI / 2) * this.orbSize * 1.5,
                Math.sin(i * Math.PI / 2) * this.orbSize * 1.5,
                2,
                0xffffff,
                0.8
            );
            this.add(sparkle);
            this.sparkles.push(sparkle);

            // Animate sparkles orbiting
            this.scene.tweens.add({
                targets: sparkle,
                alpha: { from: 0.3, to: 1 },
                scale: { from: 0.5, to: 1.2 },
                duration: 400 + i * 100,
                yoyo: true,
                repeat: -1
            });
        }

        // Rotate sparkle container
        this.scene.tweens.add({
            targets: this,
            angle: 360,
            duration: 3000,
            repeat: -1,
            ease: 'Linear'
        });

        // Outer glow
        this.glow = this.scene.add.circle(0, 0, this.orbSize * 2, primaryColor, 0.15);
        this.add(this.glow);
        this.sendToBack(this.glow);

        this.scene.tweens.add({
            targets: this.glow,
            alpha: { from: 0.1, to: 0.3 },
            scale: { from: 1, to: 1.2 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    /**
     * Get the time bonus this orb provides
     */
    getTimeBonus() {
        return this.timeBonus;
    }
}

/**
 * Create orbs for the game (includes time orbs based on spawn rate)
 */
export function createOrbs(scene, count = CONFIG.INITIAL_ORB_COUNT, worldWidth = CONFIG.WORLD_WIDTH, worldHeight = CONFIG.WORLD_HEIGHT) {
    const orbs = [];
    const timeOrbRate = CONFIG.TIME_ORB?.spawnRate || 0.15;

    for (let i = 0; i < count; i++) {
        const isTimeOrb = Math.random() < timeOrbRate;
        const x = Math.random() * worldWidth;
        const y = Math.random() * worldHeight;

        if (isTimeOrb) {
            const orb = new TimeOrb(scene, x, y, { id: 'time_orb_' + i });
            orbs.push(orb);
        } else {
            const orb = new Orb(scene, x, y, { id: 'orb_' + i });
            orbs.push(orb);
        }
    }

    return orbs;
}

/**
 * Create a single orb at random position (may be time orb based on spawn rate)
 */
export function createOrb(scene, worldWidth = CONFIG.WORLD_WIDTH, worldHeight = CONFIG.WORLD_HEIGHT) {
    const isTimeOrb = Math.random() < (CONFIG.TIME_ORB?.spawnRate || 0.15);
    const x = Math.random() * worldWidth;
    const y = Math.random() * worldHeight;

    if (isTimeOrb) {
        return new TimeOrb(scene, x, y, { id: 'time_orb_' + Date.now() });
    }
    return new Orb(scene, x, y, { id: 'orb_' + Date.now() });
}

/**
 * Create a single time orb at random position
 */
export function createTimeOrb(scene, worldWidth = CONFIG.WORLD_WIDTH, worldHeight = CONFIG.WORLD_HEIGHT) {
    return new TimeOrb(scene,
        Math.random() * worldWidth,
        Math.random() * worldHeight,
        { id: 'time_orb_' + Date.now() }
    );
}

/**
 * Create dimension orbs with specific color and bonus
 */
export function createDimensionOrbs(scene, count, worldSize, color, bonus) {
    const orbs = [];

    for (let i = 0; i < count; i++) {
        const orb = new Orb(scene,
            Math.random() * worldSize,
            Math.random() * worldSize,
            {
                id: 'dim_orb_' + i,
                color: color,
                bonus: bonus,
                isSpecial: true,
                specialType: 'dimension'
            }
        );
        orbs.push(orb);
    }

    return orbs;
}
