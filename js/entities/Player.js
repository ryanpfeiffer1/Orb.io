/**
 * Orb Battle.io - Player Entity
 * Player orb with movement and state management
 */

import { CONFIG, hexToNumber } from '../config.js';

export class Player extends Phaser.GameObjects.Container {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y);

        this.id = config.id || 'local';
        this.playerName = config.name || 'Player';
        this.playerColor = config.color || '#6c8eef';
        this.playerSize = config.size || CONFIG.INITIAL_SIZE;
        this.score = config.score || 0;
        this.isLocal = config.isLocal || false;
        this.isBot = config.isBot || false;
        this.alive = true;
        this.respawnTime = null;

        // Physics properties
        this.velocity = { x: 0, y: 0 };
        this.physicsMode = 'direct'; // 'direct' or 'drift'
        this.friction = 0.95;

        // Target position for interpolation (remote players)
        this.targetX = x;
        this.targetY = y;

        // Visual progression system
        this.visualStage = 0;
        this.particleTrail = [];
        this.absorbedOrbs = [];       // Recently absorbed orbs shown inside player
        this.innerLayers = [];        // Visual layers that build up with size
        this.energyPatterns = null;   // Cracks/energy for large players
        this.lastTrailSpawn = 0;
        this.trailSpawnInterval = 50; // ms between trail particles

        // Create visual elements
        this.createVisuals();

        // Add to scene
        scene.add.existing(this);

        // Set depth based on size
        this.setDepth(this.playerSize);
    }

    /**
     * Create the visual elements for the player
     */
    createVisuals() {
        const color = hexToNumber(this.playerColor);

        // Main body sprite
        this.body = this.scene.add.sprite(0, 0, 'player');
        this.body.setTint(color);
        this.body.setBlendMode(Phaser.BlendModes.ADD);
        this.body.setDisplaySize(this.playerSize * 2, this.playerSize * 2);
        this.add(this.body);

        // Name label
        this.nameLabel = this.scene.add.text(0, this.playerSize + 18, this.playerName, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5, 0);
        this.add(this.nameLabel);

        // Invulnerability glow (hidden by default)
        this.invulnGlow = this.scene.add.circle(0, 0, this.playerSize * 1.8, 0x67e8f9, 0.4);
        this.invulnGlow.setVisible(false);
        this.add(this.invulnGlow);
    }

    /**
     * Update visual elements when size changes
     */
    updateVisuals() {
        const color = hexToNumber(this.playerColor);

        this.body.setDisplaySize(this.playerSize * 2, this.playerSize * 2);
        this.body.setTint(color);

        this.nameLabel.setY(this.playerSize + 18);

        this.invulnGlow.setRadius(this.playerSize * 1.8);

        // Update depth based on size
        this.setDepth(this.playerSize);

        // Update visual stage based on size
        this.updateVisualStage();
    }

    /**
     * Update visual stage based on current size
     */
    updateVisualStage() {
        if (!CONFIG.VISUAL_STAGES) return;

        // Find the appropriate stage for current size
        let newStage = 0;
        for (let i = CONFIG.VISUAL_STAGES.length - 1; i >= 0; i--) {
            if (this.playerSize >= CONFIG.VISUAL_STAGES[i].minSize) {
                newStage = i;
                break;
            }
        }

        // Only update if stage changed
        if (newStage !== this.visualStage) {
            const oldStage = this.visualStage;
            this.visualStage = newStage;
            this.applyVisualStage(oldStage < newStage);
        }

        // Update existing visual elements for smooth scaling
        this.updateStageVisuals();
    }

    /**
     * Apply visual changes for new stage
     */
    applyVisualStage(isUpgrade) {
        const stage = CONFIG.VISUAL_STAGES[this.visualStage];
        if (!stage) return;

        // Clear old layers when downgrading
        if (!isUpgrade) {
            this.clearLayers();
        }

        // Add layers based on stage
        while (this.innerLayers.length < stage.layers) {
            this.addInnerLayer();
        }

        // Add energy patterns for dominating+ stages
        if (this.visualStage >= 3 && !this.energyPatterns) {
            this.createEnergyPatterns();
        } else if (this.visualStage < 3 && this.energyPatterns) {
            this.destroyEnergyPatterns();
        }

        // Flash effect on upgrade
        if (isUpgrade && this.isLocal) {
            this.scene.tweens.add({
                targets: this.body,
                alpha: { from: 1, to: 0.5 },
                scaleX: 1.3,
                scaleY: 1.3,
                duration: 150,
                yoyo: true,
                ease: 'Sine.easeOut'
            });
        }
    }

    /**
     * Update visual elements based on current stage (called every frame during growth)
     */
    updateStageVisuals() {
        const stage = CONFIG.VISUAL_STAGES[this.visualStage];
        if (!stage) return;

        // Update glow intensity
        if (this.outerGlow) {
            this.outerGlow.setAlpha(stage.glowIntensity * 0.3);
            this.outerGlow.setRadius(this.playerSize * (1.5 + stage.glowIntensity * 0.5));
        }

        // Update inner layers
        this.innerLayers.forEach((layer, index) => {
            const scale = 0.7 - (index * 0.15);
            layer.setDisplaySize(this.playerSize * 2 * scale, this.playerSize * 2 * scale);
        });

        // Update energy patterns
        if (this.energyPatterns) {
            this.energyPatterns.setScale(this.playerSize / 50);
        }
    }

    /**
     * Add an inner layer ring
     */
    addInnerLayer() {
        const color = hexToNumber(this.playerColor);
        const layerIndex = this.innerLayers.length;
        const scale = 0.7 - (layerIndex * 0.15);
        const alpha = 0.3 + (layerIndex * 0.1);

        const layer = this.scene.add.sprite(0, 0, 'player');
        layer.setTint(color);
        layer.setBlendMode(Phaser.BlendModes.ADD);
        layer.setDisplaySize(this.playerSize * 2 * scale, this.playerSize * 2 * scale);
        layer.setAlpha(alpha);
        this.add(layer);
        this.sendToBack(layer);
        this.innerLayers.push(layer);

        // Add rotation animation
        this.scene.tweens.add({
            targets: layer,
            rotation: Math.PI * 2 * (layerIndex % 2 === 0 ? 1 : -1),
            duration: 3000 + layerIndex * 1000,
            repeat: -1,
            ease: 'Linear'
        });
    }

    /**
     * Create energy crack patterns for large players
     */
    createEnergyPatterns() {
        this.energyPatterns = this.scene.add.graphics();
        this.add(this.energyPatterns);
        this.sendToBack(this.energyPatterns);

        // Animate energy patterns
        this.energyPatternsPhase = 0;
        this.energyPatternsTimer = this.scene.time.addEvent({
            delay: 100,
            callback: () => this.updateEnergyPatterns(),
            loop: true
        });
    }

    /**
     * Update energy pattern animation
     */
    updateEnergyPatterns() {
        if (!this.energyPatterns || !this.alive) return;

        this.energyPatterns.clear();
        this.energyPatternsPhase += 0.1;

        const intensity = (this.visualStage - 2) / 2; // 0 to 1 for stages 3-4
        const color = hexToNumber(this.playerColor);
        const numCracks = 3 + Math.floor(intensity * 5);

        for (let i = 0; i < numCracks; i++) {
            const angle = (i / numCracks) * Math.PI * 2 + this.energyPatternsPhase;
            const wobble = Math.sin(this.energyPatternsPhase * 3 + i) * 0.2;
            const length = this.playerSize * (0.5 + intensity * 0.3 + wobble);

            const alpha = 0.4 + Math.sin(this.energyPatternsPhase * 2 + i) * 0.3;
            this.energyPatterns.lineStyle(1 + intensity, color, alpha);
            this.energyPatterns.beginPath();
            this.energyPatterns.moveTo(0, 0);
            this.energyPatterns.lineTo(
                Math.cos(angle) * length,
                Math.sin(angle) * length
            );
            this.energyPatterns.strokePath();
        }
    }

    /**
     * Destroy energy patterns
     */
    destroyEnergyPatterns() {
        if (this.energyPatternsTimer) {
            this.energyPatternsTimer.remove();
            this.energyPatternsTimer = null;
        }
        if (this.energyPatterns) {
            this.energyPatterns.destroy();
            this.energyPatterns = null;
        }
    }

    /**
     * Clear all inner layers
     */
    clearLayers() {
        this.innerLayers.forEach(layer => {
            this.scene.tweens.killTweensOf(layer);
            layer.destroy();
        });
        this.innerLayers = [];
    }

    /**
     * Show absorbed orb animation (orb flies into player center)
     */
    showAbsorbedOrb(orbColor, orbSize) {
        if (!this.isLocal) return;

        const color = hexToNumber(orbColor || '#ffffff');
        const absorbedOrb = this.scene.add.circle(0, 0, orbSize || 8, color, 0.8);
        absorbedOrb.setBlendMode(Phaser.BlendModes.ADD);
        this.add(absorbedOrb);
        this.absorbedOrbs.push(absorbedOrb);

        // Animate orb moving into center and fading
        this.scene.tweens.add({
            targets: absorbedOrb,
            scaleX: 0.3,
            scaleY: 0.3,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                absorbedOrb.destroy();
                const index = this.absorbedOrbs.indexOf(absorbedOrb);
                if (index > -1) this.absorbedOrbs.splice(index, 1);
            }
        });

        // Limit visible absorbed orbs
        if (this.absorbedOrbs.length > 5) {
            const oldest = this.absorbedOrbs.shift();
            if (oldest && oldest.active) oldest.destroy();
        }
    }

    /**
     * Spawn particle trail based on movement and visual stage
     */
    spawnTrailParticle(deltaX, deltaY) {
        if (!this.isLocal || !CONFIG.VISUAL_STAGES) return;

        const now = Date.now();
        if (now - this.lastTrailSpawn < this.trailSpawnInterval) return;
        this.lastTrailSpawn = now;

        const stage = CONFIG.VISUAL_STAGES[this.visualStage];
        if (!stage || stage.trailThickness <= 0) return;

        const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (speed < 0.5) return;

        const color = hexToNumber(this.playerColor);
        const particleCount = Math.min(stage.particleCount, Math.ceil(speed / 2));

        for (let i = 0; i < particleCount; i++) {
            const turbulence = stage.trailTurbulence;
            const offsetX = (Math.random() - 0.5) * this.playerSize * turbulence;
            const offsetY = (Math.random() - 0.5) * this.playerSize * turbulence;

            const particle = this.scene.add.circle(
                this.x + offsetX,
                this.y + offsetY,
                stage.trailThickness + Math.random() * 2,
                color,
                0.4 + Math.random() * 0.3
            );
            particle.setBlendMode(Phaser.BlendModes.ADD);
            particle.setDepth(this.depth - 1);

            // Add turbulent motion for higher stages
            const driftX = (Math.random() - 0.5) * turbulence * 20;
            const driftY = (Math.random() - 0.5) * turbulence * 20;

            this.scene.tweens.add({
                targets: particle,
                x: particle.x - deltaX * 0.5 + driftX,
                y: particle.y - deltaY * 0.5 + driftY,
                scaleX: 0.1,
                scaleY: 0.1,
                alpha: 0,
                duration: 300 + Math.random() * 200,
                ease: 'Cubic.easeOut',
                onComplete: () => particle.destroy()
            });
        }
    }

    /**
     * Set player size
     */
    setSize(newSize) {
        this.playerSize = Math.max(CONFIG.MIN_SIZE, newSize);
        this.updateVisuals();
    }

    /**
     * Grow player by amount
     */
    grow(amount) {
        this.setSize(this.playerSize + amount);
    }

    /**
     * Add score
     */
    addScore(amount) {
        this.score += amount;
    }

    /**
     * Set invulnerability visual state
     */
    setInvulnerable(isInvuln) {
        this.invulnGlow.setVisible(isInvuln);
        if (isInvuln) {
            this.scene.tweens.add({
                targets: this.invulnGlow,
                alpha: { from: 0.4, to: 0.1 },
                duration: 300,
                yoyo: true,
                repeat: -1
            });
        } else {
            this.scene.tweens.killTweensOf(this.invulnGlow);
            this.invulnGlow.setAlpha(0.4);
        }
    }

    /**
     * Kill the player
     */
    die() {
        this.alive = false;
        this.respawnTime = Date.now() + CONFIG.RESPAWN_TIME;
        this.setVisible(false);
    }

    /**
     * Respawn the player
     */
    respawn(x, y, worldWidth = CONFIG.WORLD_WIDTH, worldHeight = CONFIG.WORLD_HEIGHT) {
        this.alive = true;
        this.respawnTime = null;
        this.setPosition(
            x !== undefined ? x : Math.random() * worldWidth,
            y !== undefined ? y : Math.random() * worldHeight
        );
        this.setSize(CONFIG.INITIAL_SIZE);
        this.setVisible(true);
        this.targetX = this.x;
        this.targetY = this.y;
    }

    /**
     * Set physics mode
     * @param {string} mode - 'direct' or 'drift'
     */
    setPhysicsMode(mode) {
        this.physicsMode = mode;
        this.velocity = { x: 0, y: 0 };
    }

    /**
     * Move towards target position (for remote players)
     */
    interpolatePosition(lerp = 0.15) {
        if (!this.isLocal && this.alive) {
            this.x += (this.targetX - this.x) * lerp;
            this.y += (this.targetY - this.y) * lerp;
        }
    }

    /**
     * Move local player towards pointer (legacy - kept for compatibility)
     */
    moveTowards(targetX, targetY, speedMult = 1) {
        if (!this.alive) return;

        const baseSpeed = Math.max(2, CONFIG.BASE_SPEED - this.playerSize * CONFIG.SIZE_SPEED_FACTOR);
        const speed = baseSpeed * speedMult;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            this.x += (dx / dist) * speed;
            this.y += (dy / dist) * speed;
        }
    }

    /**
     * Move local player in a direction (for keyboard input)
     * @param {number} dirX - X direction (-1, 0, or 1)
     * @param {number} dirY - Y direction (-1, 0, or 1)
     * @param {number} speedMult - Speed multiplier
     */
    moveInDirection(dirX, dirY, speedMult = 1) {
        if (!this.alive) return;
        if (dirX === 0 && dirY === 0) return;

        const baseSpeed = Math.max(2, CONFIG.BASE_SPEED - this.playerSize * CONFIG.SIZE_SPEED_FACTOR);
        const speed = baseSpeed * speedMult;

        // Normalize diagonal movement
        const dist = Math.sqrt(dirX * dirX + dirY * dirY);
        const normalizedX = dirX / dist;
        const normalizedY = dirY / dist;

        let deltaX = 0, deltaY = 0;

        if (this.physicsMode === 'drift') {
            // Acceleration-based movement (Anti-Gravity)
            const accel = speed * 0.05;
            this.velocity.x += normalizedX * accel;
            this.velocity.y += normalizedY * accel;
            deltaX = this.velocity.x;
            deltaY = this.velocity.y;
        } else {
            // Direct movement with subtle momentum for larger players
            // Larger players have slightly more "weight" feeling
            const sizeWeight = Math.min(this.playerSize / 100, 0.5); // 0 to 0.5
            const inertiaFactor = 0.7 + sizeWeight * 0.3; // 0.7 to 1.0

            const targetVelX = normalizedX * speed;
            const targetVelY = normalizedY * speed;

            // Blend current velocity with target (larger players blend slower)
            this.velocity.x = this.velocity.x * (1 - inertiaFactor) + targetVelX * inertiaFactor;
            this.velocity.y = this.velocity.y * (1 - inertiaFactor) + targetVelY * inertiaFactor;

            deltaX = this.velocity.x;
            deltaY = this.velocity.y;
            this.x += deltaX;
            this.y += deltaY;
        }

        // Spawn trail particles
        this.spawnTrailParticle(deltaX, deltaY);
    }

    /**
     * Clamp position to world bounds
     */
    clampToWorld(worldWidth, worldHeight) {
        this.x = Phaser.Math.Clamp(this.x, this.playerSize, worldWidth - this.playerSize);
        this.y = Phaser.Math.Clamp(this.y, this.playerSize, worldHeight - this.playerSize);
    }

    /**
     * Check collision with another entity
     */
    checkCollision(other) {
        if (!this.alive || !other.alive) return null;

        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = Math.max(this.playerSize, other.playerSize) * 0.8;

        if (dist < minDist) {
            if (this.playerSize > other.playerSize * CONFIG.SIZE_RATIO_TO_ABSORB) {
                return 'absorb'; // This entity absorbs other
            } else if (other.playerSize > this.playerSize * CONFIG.SIZE_RATIO_TO_ABSORB) {
                return 'absorbed'; // This entity gets absorbed
            }
        }
        return null;
    }

    /**
     * Get distance to another entity
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Update player state
     */
    update(time, delta) {
        // Check for respawn
        if (!this.alive && this.respawnTime && Date.now() > this.respawnTime) {
            // Respawn handled by game scene
        }

        // Interpolate remote players
        if (!this.isLocal) {
        }

        // Apply drift physics
        if (this.isLocal && this.alive && this.physicsMode === 'drift') {
            this.x += this.velocity.x;
            this.y += this.velocity.y;

            // Friction
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;

            // Bounce off walls (simple)
            // Note: clampToWorld handles position, but we should zero velocity if hitting wall
            // OR actually bounce. Let's start with zeroing velocity on clamp for stability.
            // (We will let the scene clamp call valid position limits)
        }
    }

    /**
     * Serialize player data for network
     */
    serialize() {
        return {
            id: this.id,
            name: this.playerName,
            x: this.x,
            y: this.y,
            size: this.playerSize,
            color: this.playerColor,
            score: this.score,
            alive: this.alive
        };
    }

    /**
     * Update from network data
     */
    deserialize(data) {
        if (data.x !== undefined) this.targetX = data.x;
        if (data.y !== undefined) this.targetY = data.y;
        if (data.size !== undefined) this.setSize(data.size);
        if (data.score !== undefined) this.score = data.score;
        if (data.dimension !== undefined) this.dimension = data.dimension;
        if (data.alive !== undefined) {
            if (data.alive && !this.alive) {
                this.respawn(data.x, data.y);
            } else if (!data.alive && this.alive) {
                this.die();
            }
        }
    }
}
