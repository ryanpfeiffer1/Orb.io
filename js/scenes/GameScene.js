/**
 * Orb Battle.io - Game Scene
 * Main gameplay scene with all game mechanics
 */

import { CONFIG, getRandomPlayerColor, hexToNumber } from '../config.js';
import { Player } from '../entities/Player.js';
import { Bot, createBots } from '../entities/Bot.js';
import { Orb, createOrbs, createOrb, createDimensionOrbs } from '../entities/Orb.js';
import { soundManager } from '../managers/SoundManager.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        this.load.image('player', 'assets/images/player.png');
        this.load.image('orb', 'assets/images/orb.png');
    }

    init(data) {
        this.gameMode = 'solo'; // Static single-player mode only
        this.playerName = data.playerName || 'Player';

        // Game state
        this.gameRunning = false;
        this.gameStartTime = 0;
        this.remainingTime = CONFIG.TIMED_MODE?.gameDuration || CONFIG.GAME_DURATION; // Countdown timer
        this.localPlayer = null;
        this.players = [];
        this.bots = [];
        this.orbs = [];

        // World dimensions
        this.worldWidth = CONFIG.WORLD_WIDTH;
        this.worldHeight = CONFIG.WORLD_HEIGHT;

        // Stats
        this.stats = {
            score: 0,
            orbsCollected: 0,
            playersAbsorbed: 0,
            timeOrbsCollected: 0,
            timeAdded: 0
        };

        // Dimensional rift state
        this.currentDimension = null;
        this.dimensionTimer = 0;
        this.riftCooldown = 0;
        this.isInvulnerable = false;
        this.invulnTimer = 0;
        this.mainWorldState = null;
        this.dimensionOrbs = [];
        this.dimensionBots = [];
        this.mazeWalls = [];
        this.mazeWallGraphics = null;
        this.rifts = [];
        this.riftStats = {
            riftsUsed: 0,
            dimensionOrbs: 0
        };

        // Environmental hazards
        this.predator = null;
        this.predatorWarning = null;
        this.predatorCooldown = 0;
        this.dangerZone = null;
        this.dangerZoneTimer = 0;
        this.meteors = [];
        this.meteorTimer = 0;
        this.gauntlets = [];

        // Effects
        this.milestoneReached = [];
        this.killStreak = { count: 0, lastKillTime: 0 };
        this.screenShake = { intensity: 0, duration: 0 };
        this.notifications = [];

        // Network
        this.lastMoveUpdate = 0;
        this.lastUpdateTime = Date.now();

        // Combo system
        this.combo = {
            count: 0,
            timer: 0,
            lastTier: -1,
            multiplier: 1.0
        };
    }

    create() {
        // Set world bounds
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.setBackgroundColor(0x1a1d2e);

        // Create grid background
        this.createGrid();

        // Initialize solo game
        this.initSoloGame();

        // Setup input
        this.setupInput();

        // Start UI scene
        this.scene.launch('UIScene', {
            gameScene: this
        });

        // Start game loop
        this.gameRunning = true;
        this.gameStartTime = Date.now();
        this.lastUpdateTime = Date.now(); // Reset timer tracking when game actually starts

        // Initialize sound
        soundManager.init();
    }

    /**
     * Create the background grid
     */
    createGrid() {
        this.gridGraphics = this.add.graphics();
        this.gridGraphics.lineStyle(1, 0x252836, 1);

        for (let x = 0; x <= this.worldWidth; x += CONFIG.GRID_SIZE) {
            this.gridGraphics.lineBetween(x, 0, x, this.worldHeight);
        }

        for (let y = 0; y <= this.worldHeight; y += CONFIG.GRID_SIZE) {
            this.gridGraphics.lineBetween(0, y, this.worldWidth, y);
        }

        this.gridGraphics.setDepth(0);
    }

    /**
     * Initialize solo mode
     */
    initSoloGame() {

        // Create local player


        this.localPlayer = new Player(this, this.worldWidth / 2, this.worldHeight / 2, {
            id: 'local',
            name: this.playerName,
            color: getRandomPlayerColor(),
            isLocal: true
        });

        this.players.push(this.localPlayer);

        // Create bots
        this.bots = createBots(this, CONFIG.BOT_COUNT);

        // Create orbs
        this.orbs = createOrbs(this, CONFIG.INITIAL_ORB_COUNT);

        // Set entity references for bots (for AI threat/prey detection)
        this.bots.forEach(bot => {
            bot.setOrbs(this.orbs);
            bot.setPlayers(this.players);
            bot.setOtherBots(this.bots);
        });

        // Create rifts
        this.createRifts();

        // Initialize hazards (delayed start)
        this.predatorCooldown = Date.now() + 10000;
        this.dangerZoneTimer = Date.now() + 15000;
        this.meteorTimer = Date.now() + 20000;

        // Setup camera to follow player
        this.cameras.main.startFollow(this.localPlayer, true, 0.1, 0.1);
        this.cameras.main.scrollX = this.localPlayer.x - this.cameras.main.width / 2;
        this.cameras.main.scrollY = this.localPlayer.y - this.cameras.main.height / 2;
    }



    /**
     * Setup input handlers
     */
    setupInput() {
        // Create cursor keys (Arrow keys)
        this.cursors = this.input.keyboard.createCursorKeys();

        // Create WASD keys
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };

        // Track movement direction
        this.moveDirection = { x: 0, y: 0 };

        // Resume sound on any key press
        this.input.keyboard.on('keydown', () => {
            soundManager.resume();
        });
    }



    /**
     * Create dimensional rifts
     */
    createRifts() {
        const positions = [
            { x: this.worldWidth * 0.2, y: this.worldHeight * 0.2 },
            { x: this.worldWidth * 0.8, y: this.worldHeight * 0.2 },
            { x: this.worldWidth * 0.2, y: this.worldHeight * 0.8 },
            { x: this.worldWidth * 0.8, y: this.worldHeight * 0.8 }
        ];

        const dimensionTypes = Object.keys(CONFIG.DIMENSIONS);

        for (let i = 0; i < CONFIG.RIFT.count; i++) {
            const pos = positions[i];
            const rift = {
                id: 'rift_' + i,
                x: pos.x + (Math.random() - 0.5) * 200,
                y: pos.y + (Math.random() - 0.5) * 200,
                dimensionType: dimensionTypes[i],
                pulsePhase: Math.random() * Math.PI * 2,
                graphics: null
            };

            // Create rift graphics
            rift.graphics = this.add.container(rift.x, rift.y);
            this.updateRiftGraphics(rift);

            this.rifts.push(rift);
        }
    }

    /**
     * Update rift visual
     */
    updateRiftGraphics(rift) {
        const config = CONFIG.DIMENSIONS[rift.dimensionType];
        const canEnter = this.riftCooldown <= 0;

        // Clear existing graphics
        rift.graphics.removeAll(true);

        // Outer glow
        const glow = this.add.circle(0, 0, CONFIG.RIFT.radius * 1.8, config.color, canEnter ? 0.3 : 0.1);
        rift.graphics.add(glow);

        // Core
        const core = this.add.circle(0, 0, CONFIG.RIFT.radius * 0.4, config.color, 1);
        rift.graphics.add(core);

        // Label
        const label = this.add.text(0, CONFIG.RIFT.radius + 25, config.name, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: canEnter ? config.colorHex : '#666666'
        }).setOrigin(0.5);
        rift.graphics.add(label);

        // Pulse animation
        this.tweens.add({
            targets: glow,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0.1,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        rift.graphics.setDepth(10);
    }

    /**
     * Main update loop
     */
    update(time, delta) {
        if (!this.gameRunning) return;

        // Calculate delta time for countdown
        const now = Date.now();
        const deltaMs = now - this.lastUpdateTime;
        this.lastUpdateTime = now;

        // Countdown timer (timed mode)
        this.remainingTime -= deltaMs;
        if (this.remainingTime <= 0) {
            this.remainingTime = 0;
            this.endGame();
            return;
        }

        // Update dimension timers
        this.updateDimensionTimers(delta);

        // Update local player (animation/physics)
        if (this.localPlayer) {
            this.localPlayer.update(time, delta);
        }

        // Update solo game
        this.updateSoloGame(time, delta);

        // Update environment visual effects based on player size
        this.updateEnvironmentEffects();

        // Update combo timer
        this.updateCombo(deltaMs);

        // Update screen shake
        this.updateScreenShake();

        // Update notifications
        this.updateNotifications(delta);
    }

    /**
     * Get keyboard movement direction from WASD and Arrow keys
     */
    getKeyboardDirection() {
        let dx = 0;
        let dy = 0;

        // Check WASD and Arrow keys
        if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
        if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
        if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;

        return { x: dx, y: dy };
    }

    /**
     * Update solo game
     */
    updateSoloGame(time, delta) {
        if (!this.localPlayer) return;

        // Handle respawns
        this.handleRespawns();

        // Skip if dead
        if (!this.localPlayer.alive) return;

        // Get current world size
        const worldSize = this.getCurrentWorldSize();
        const speedMult = this.getDimensionSpeedMultiplier();

        // Get keyboard direction and move player
        const dir = this.getKeyboardDirection();
        if (dir.x !== 0 || dir.y !== 0) {
            this.localPlayer.moveInDirection(dir.x, dir.y, speedMult);
            this.localPlayer.clampToWorld(worldSize.width, worldSize.height);
        }

        // Dimension-specific updates
        if (this.currentDimension) {
            this.updateDimensionBots(delta);
            this.checkDimensionCollisions();
            this.checkMazeWallCollisions(); // Check maze wall collisions for MIRROR_MAZE
            this.applyDimensionDecay();
        } else {
            // Main world updates
            this.checkRiftEntry();
            this.updateBots(delta);
            this.checkCollisions();
            this.updatePredator(delta);
            this.updateDangerZone(delta);
            this.updateMeteors(delta);
            // this.applyMassDecay(); // Disabled per user request
            this.checkMilestones();
        }
    }



    /**
     * Update bots (solo mode)
     */
    updateBots(delta) {
        this.bots.forEach(bot => {
            if (!bot.alive) return;

            bot.update(this.time.now, delta, this.worldWidth, this.worldHeight);

            // Check bot orb collection
            for (let i = this.orbs.length - 1; i >= 0; i--) {
                const orb = this.orbs[i];
                if (orb.canCollect(bot)) {
                    // Bot collects orb
                    bot.grow(orb.getSizeGain());
                    bot.addScore(orb.getValue());

                    // Trigger AI reward for learning
                    if (bot.onOrbCollected) {
                        bot.onOrbCollected();
                    }

                    // Remove and respawn orb
                    orb.collect();
                    this.orbs.splice(i, 1);
                    this.orbs.push(createOrb(this, this.worldWidth, this.worldHeight));
                }
            }
        });
    }

    /**
     * Update dimension bots
     */
    updateDimensionBots(delta) {
        const config = CONFIG.DIMENSIONS[this.currentDimension];
        const worldSize = config.worldSize;
        const speedMult = config.speedMult;

        this.dimensionBots.forEach(bot => {
            if (!bot.alive) return;

            // Simple AI - chase orbs or wander
            const now = Date.now();
            if (now > bot.changeTargetTime) {
                if (Math.random() < 0.7 && this.dimensionOrbs.length > 0) {
                    // Target nearest orb
                    let nearest = null;
                    let nearestDist = Infinity;
                    this.dimensionOrbs.forEach(orb => {
                        const dx = orb.x - bot.x;
                        const dy = orb.y - bot.y;
                        const dist = dx * dx + dy * dy;
                        if (dist < nearestDist) {
                            nearestDist = dist;
                            nearest = orb;
                        }
                    });
                    if (nearest) {
                        bot.targetX = nearest.x;
                        bot.targetY = nearest.y;
                    }
                } else {
                    bot.targetX = Math.random() * worldSize;
                    bot.targetY = Math.random() * worldSize;
                }
                bot.changeTargetTime = now + 1000 + Math.random() * 2000;
            }

            // Move
            const speed = Math.max(1.5, 6 - bot.playerSize * 0.04) * speedMult;
            const dx = bot.targetX - bot.x;
            const dy = bot.targetY - bot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                bot.x += (dx / dist) * speed;
                bot.y += (dy / dist) * speed;
                bot.x = Phaser.Math.Clamp(bot.x, bot.playerSize, worldSize - bot.playerSize);
                bot.y = Phaser.Math.Clamp(bot.y, bot.playerSize, worldSize - bot.playerSize);
            }

            // Dimension bot orb collection
            for (let i = this.dimensionOrbs.length - 1; i >= 0; i--) {
                const orb = this.dimensionOrbs[i];
                if (orb.canCollect(bot)) {
                    bot.grow(1.5);
                    orb.collect();
                    this.dimensionOrbs.splice(i, 1);

                    // Respawn orb in dimension
                    const newOrb = new Orb(this,
                        Math.random() * config.worldSize,
                        Math.random() * config.worldSize,
                        {
                            id: 'dim_orb_' + Date.now(),
                            color: config.colorHex,
                            bonus: config.orbBonus,
                            isSpecial: true,
                            specialType: 'dimension'
                        }
                    );
                    this.dimensionOrbs.push(newOrb);
                }
            }
        });
    }

    /**
     * Check collisions (solo mode)
     */
    checkCollisions() {
        const player = this.localPlayer;
        if (!player || !player.alive) return;

        // Check orb collection
        for (let i = this.orbs.length - 1; i >= 0; i--) {
            const orb = this.orbs[i];
            if (orb.canCollect(player)) {
                // Update combo
                this.incrementCombo();

                // Check if this is a time orb
                if (orb.isTimeOrb) {
                    // Add time bonus
                    const timeBonus = orb.getTimeBonus ? orb.getTimeBonus() : CONFIG.TIME_ORB.timeBonus;
                    this.remainingTime += timeBonus;
                    this.stats.timeOrbsCollected++;
                    this.stats.timeAdded += timeBonus;

                    // Show time added effect
                    this.showTimeAddedEffect(orb.x, orb.y, timeBonus);
                    soundManager.playTimeCollect ? soundManager.playTimeCollect() : soundManager.playMilestone();
                } else {
                    // Play combo collection sound (rising pitch)
                    soundManager.playComboCollect(this.combo.count);
                }

                // Collect orb (size + score with combo multiplier)
                player.grow(orb.getSizeGain());
                const baseScore = orb.getValue();
                const comboScore = Math.floor(baseScore * this.combo.multiplier);
                player.addScore(comboScore);
                this.stats.score = player.score;
                this.stats.orbsCollected++;

                // Show absorbed orb effect
                if (player.showAbsorbedOrb) {
                    player.showAbsorbedOrb(orb.orbColor, orb.orbSize);
                }

                // Create ripple effect at collection point (scaled by combo)
                this.createRippleEffect(orb.x, orb.y, player.playerSize, this.combo.count);

                // Remove and respawn orb
                orb.collect();
                this.orbs.splice(i, 1);
                this.orbs.push(createOrb(this, this.worldWidth, this.worldHeight));
            }
        }

        // Check entity collisions
        const allEntities = [...this.players.filter(p => p.alive), ...this.bots.filter(b => b.alive)];

        for (let i = 0; i < allEntities.length; i++) {
            for (let j = i + 1; j < allEntities.length; j++) {
                const a = allEntities[i];
                const b = allEntities[j];

                const result = a.checkCollision(b);

                if (result === 'absorb') {
                    // Check invulnerability
                    if (b === this.localPlayer && this.isInvulnerable) continue;
                    this.absorbEntity(a, b);
                } else if (result === 'absorbed') {
                    // Check invulnerability
                    if (a === this.localPlayer && this.isInvulnerable) continue;
                    this.absorbEntity(b, a);
                }
            }
        }
    }

    /**
     * Check dimension collisions
     */
    checkDimensionCollisions() {
        const player = this.localPlayer;
        if (!player || !player.alive) return;

        const config = CONFIG.DIMENSIONS[this.currentDimension];

        // Check orb collection
        for (let i = this.dimensionOrbs.length - 1; i >= 0; i--) {
            const orb = this.dimensionOrbs[i];
            if (orb.canCollect(player)) {
                const points = Math.floor(CONFIG.ORB_VALUE * (orb.bonus || config.orbBonus));
                player.grow(1.5);
                player.addScore(points);
                this.stats.score = player.score;
                this.stats.orbsCollected++;
                this.riftStats.dimensionOrbs++;

                // Remove and respawn
                orb.collect();
                this.dimensionOrbs.splice(i, 1);

                const newOrb = new Orb(this,
                    Math.random() * config.worldSize,
                    Math.random() * config.worldSize,
                    {
                        id: 'dim_orb_' + Date.now(),
                        color: config.colorHex,
                        bonus: config.orbBonus,
                        isSpecial: true,
                        specialType: 'dimension'
                    }
                );
                this.dimensionOrbs.push(newOrb);

                soundManager.playCollect();
            }
        }

        // Check bot collisions with player
        this.dimensionBots.forEach(bot => {
            if (!bot.alive) return;

            const result = player.checkCollision(bot);

            if (result === 'absorb') {
                // Player absorbs bot
                bot.die();
                player.grow(bot.playerSize * CONFIG.ABSORPTION_SIZE_GAIN);
                player.addScore(CONFIG.ABSORPTION_BASE_SCORE);
                this.stats.score = player.score;
                this.stats.playersAbsorbed++;
                soundManager.playAbsorb();
                this.registerKill();
            } else if (result === 'absorbed' && !this.isInvulnerable) {
                // Bot absorbs player - mark as dead then exit dimension
                player.die();
                this.exitDimension(true);
                return; // Exit early since we're leaving the dimension
            }
        });

        // Check bot-bot collisions in dimension
        for (let i = 0; i < this.dimensionBots.length; i++) {
            for (let j = i + 1; j < this.dimensionBots.length; j++) {
                const a = this.dimensionBots[i];
                const b = this.dimensionBots[j];
                if (!a.alive || !b.alive) continue;

                const result = a.checkCollision(b);
                if (result === 'absorb') {
                    b.die();
                    a.grow(b.playerSize * CONFIG.ABSORPTION_SIZE_GAIN);
                } else if (result === 'absorbed') {
                    a.die();
                    b.grow(a.playerSize * CONFIG.ABSORPTION_SIZE_GAIN);
                }
            }
        }
    }

    /**
     * Absorb entity
     */
    absorbEntity(absorber, absorbed) {
        // Safety checks to prevent issues
        if (!absorber || !absorbed) return;
        if (!absorber.alive || !absorbed.alive) return;

        absorbed.die();

        const sizeRatio = absorbed.playerSize / absorber.playerSize;
        let scoreGain = Math.floor(CONFIG.ABSORPTION_BASE_SCORE * sizeRatio);

        // Kill streak for local player
        if (absorber === this.localPlayer) {
            const multiplier = this.registerKill();
            scoreGain = Math.floor(scoreGain * multiplier);
            this.stats.playersAbsorbed++;
            soundManager.playAbsorb();
            this.triggerScreenShake(5, 10);
        }

        // Bot AI rewards - absorber gets kill reward
        if (absorber.isBot && absorber.onKill) {
            absorber.onKill();
        }

        // Bot AI penalties - absorbed gets death penalty
        if (absorbed.isBot && absorbed.onDeath) {
            absorbed.onDeath();
        }

        absorber.grow(absorbed.playerSize * CONFIG.ABSORPTION_SIZE_GAIN);
        absorber.addScore(scoreGain);

        if (absorber === this.localPlayer) {
            this.stats.score = absorber.score;
        }

        // Death effects for local player
        if (absorbed === this.localPlayer) {
            soundManager.playDeath();
            this.triggerScreenShake(12, 25);
            this.showNotification('💀 ABSORBED!', '#ef4444');
        }
    }

    /**
     * Handle respawns
     */
    handleRespawns() {
        const now = Date.now();
        const worldSize = this.getCurrentWorldSize();

        // Respawn players
        this.players.forEach(player => {
            if (!player.alive && player.respawnTime && now > player.respawnTime) {
                player.respawn(
                    Math.random() * worldSize.width,
                    Math.random() * worldSize.height,
                    worldSize.width,
                    worldSize.height
                );

                if (player.isLocal) {
                    soundManager.playRespawn();
                    this.showNotification('🔄 RESPAWNED!', '#86efac');
                }
            }
        });

        // Respawn bots (main world only)
        if (this.currentDimension === null) {
            this.bots.forEach(bot => {
                if (!bot.alive && bot.respawnTime && now > bot.respawnTime) {
                    bot.respawn(undefined, undefined, this.worldWidth, this.worldHeight);
                }
            });
        } else {
            // Respawn dimension bots
            const config = CONFIG.DIMENSIONS[this.currentDimension];
            this.dimensionBots.forEach(bot => {
                if (!bot.alive && bot.respawnTime && now > bot.respawnTime) {
                    bot.respawn(
                        Math.random() * config.worldSize,
                        Math.random() * config.worldSize,
                        config.worldSize,
                        config.worldSize
                    );
                }
            });
        }
    }

    /**
     * Apply mass decay
     */
    applyMassDecay() {
        const allEntities = [...this.players.filter(p => p.alive), ...this.bots.filter(b => b.alive)];

        allEntities.forEach(entity => {
            if (entity.playerSize <= CONFIG.DECAY.minSize) return;

            const sizeRatio = entity.playerSize / CONFIG.DECAY.minSize;
            const decayRate = CONFIG.DECAY.baseRate * (1 + (sizeRatio - 1) * CONFIG.DECAY.sizeMultiplier);

            entity.setSize(entity.playerSize - decayRate);
        });
    }

    /**
     * Apply dimension decay
     */
    applyDimensionDecay() {
        if (!this.localPlayer || !this.localPlayer.alive) return;
        if (this.localPlayer.playerSize <= CONFIG.DECAY.minSize) return;

        const config = CONFIG.DIMENSIONS[this.currentDimension];
        if (!config) return;

        const decayMult = config.decayMult || 1;
        const sizeRatio = this.localPlayer.playerSize / CONFIG.DECAY.minSize;
        const decayRate = CONFIG.DECAY.baseRate * decayMult * (1 + (sizeRatio - 1) * CONFIG.DECAY.sizeMultiplier);

        this.localPlayer.setSize(this.localPlayer.playerSize - decayRate);
    }

    /**
     * Check milestone achievements
     */
    checkMilestones() {
        if (!this.localPlayer) return;

        CONFIG.MILESTONES.forEach(milestone => {
            if (!this.milestoneReached.includes(milestone.size) && this.localPlayer.playerSize >= milestone.size) {
                this.milestoneReached.push(milestone.size);
                this.localPlayer.addScore(milestone.bonus);
                this.stats.score = this.localPlayer.score;

                this.showNotification(`🏆 ${milestone.name}`, '#fbbf24');
                soundManager.playMilestone();
                this.triggerScreenShake(5, 15);
            }
        });
    }

    /**
     * Register a kill for streak tracking
     */
    registerKill() {
        const now = Date.now();

        if (now - this.killStreak.lastKillTime < CONFIG.STREAK.window) {
            this.killStreak.count++;
        } else {
            this.killStreak.count = 1;
        }
        this.killStreak.lastKillTime = now;

        // Check for streak bonuses
        const bonus = CONFIG.STREAK.bonuses.find(b => b.kills === this.killStreak.count);
        if (bonus) {
            this.showNotification(`🔥 ${bonus.name}`, '#f97316');
            soundManager.playKillStreak(this.killStreak.count);
            this.triggerScreenShake(8, 20);
            return bonus.multiplier;
        }

        return this.killStreak.count >= 2 ?
            (CONFIG.STREAK.bonuses.find(b => b.kills <= this.killStreak.count)?.multiplier || 1) : 1;
    }

    // ========================================
    // DIMENSIONAL RIFT SYSTEM
    // ========================================

    checkRiftEntry() {
        if (!this.localPlayer || !this.localPlayer.alive) return;
        if (this.currentDimension !== null) return;
        if (this.riftCooldown > 0) return;
        // In multiplayer without solo-simulation, server handles rift detection
        if (this.gameMode === 'multiplayer' && !this.multiplayerUsesSoloSimulation) return;

        for (const rift of this.rifts) {
            const dx = this.localPlayer.x - rift.x;
            const dy = this.localPlayer.y - rift.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONFIG.RIFT.radius + this.localPlayer.playerSize * 0.5) {
                this.enterDimension(rift.dimensionType, rift.id);
                break;
            }
        }
    }

    enterDimension(type, entryRiftId) {
        const config = CONFIG.DIMENSIONS[type];

        // Save main world state
        this.mainWorldState = {
            playerX: this.localPlayer.x,
            playerY: this.localPlayer.y,
            entryRiftId: entryRiftId
        };

        // Hide main world entities
        this.bots.forEach(bot => bot.setVisible(false));
        this.orbs.forEach(orb => orb.setVisible(false));
        this.rifts.forEach(rift => rift.graphics.setVisible(false));
        if (this.predator) {
            this.predator.setVisible(false);
        }

        // Set dimension state
        this.currentDimension = type;
        this.dimensionTimer = CONFIG.RIFT.minDimensionTime +
            Math.random() * (CONFIG.RIFT.maxDimensionTime - CONFIG.RIFT.minDimensionTime);
        this.riftCooldown = CONFIG.RIFT.cooldown;

        // Grant invulnerability
        this.isInvulnerable = true;
        this.invulnTimer = CONFIG.RIFT.invulnDuration;
        this.localPlayer.setInvulnerable(true);

        // Apply dimension-specific player mechanics
        if (type === 'ANTI_GRAVITY') {
            this.localPlayer.setPhysicsMode('drift');
            this.showNotification('Gravity Low! Drift Enabled', '#a78bfa');
        } else {
            this.localPlayer.setPhysicsMode('direct');
        }

        // Update world bounds
        this.worldWidth = config.worldSize;
        this.worldHeight = config.worldSize;
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Position player in center
        this.localPlayer.setPosition(config.worldSize / 2, config.worldSize / 2);

        // Create dimension content (maze walls, themed orbs, dimension bots)
        // This is now created for BOTH solo and multiplayer for visual parity
        this.createDimensionContent(type);

        // Update grid
        this.gridGraphics.clear();
        this.gridGraphics.lineStyle(1, hexToNumber(config.colorHex), 0.3);
        for (let x = 0; x <= this.worldWidth; x += CONFIG.GRID_SIZE) {
            this.gridGraphics.lineBetween(x, 0, x, this.worldHeight);
        }
        for (let y = 0; y <= this.worldHeight; y += CONFIG.GRID_SIZE) {
            this.gridGraphics.lineBetween(0, y, this.worldWidth, y);
        }

        // Track stats
        this.riftStats.riftsUsed++;

        // Effects
        soundManager.playRiftEnter();
        this.showNotification('ENTERING ' + config.name.toUpperCase() + '!', config.colorHex);
        this.triggerScreenShake(8, 15);
    }

    createDimensionContent(type) {
        const config = CONFIG.DIMENSIONS[type];

        // Create dimension orbs
        this.dimensionOrbs = createDimensionOrbs(
            this,
            config.orbCount,
            config.worldSize,
            config.colorHex,
            config.orbBonus
        );

        // Create dimension bots
        this.dimensionBots = [];
        const botNames = ['Shadow', 'Phantom', 'Specter', 'Wraith', 'Ghost', 'Shade'];
        for (let i = 0; i < config.bots; i++) {
            const bot = new Bot(this,
                Math.random() * config.worldSize,
                Math.random() * config.worldSize,
                {
                    id: 'dim_bot_' + i,
                    name: botNames[i % botNames.length],
                    color: config.colorHex,
                    size: 18 + Math.random() * 15
                }
            );
            this.dimensionBots.push(bot);
        }

        // Create maze walls for MIRROR_MAZE dimension
        if (config.hasWalls) {
            this.createMazeWalls(config.worldSize, config.color);
        }
    }

    /**
     * Create maze walls for the Mirror Maze dimension
     */
    createMazeWalls(size, color) {
        this.mazeWalls = [];
        const wallThickness = 15;
        const passages = 4;
        const spacing = size / (passages + 1);

        // Horizontal walls with random gaps
        for (let i = 1; i <= passages; i++) {
            const gapPos = Math.random() * 0.6 + 0.2; // Gap between 20-80% of width
            // Left segment
            this.mazeWalls.push({
                x: 0,
                y: spacing * i - wallThickness / 2,
                width: size * gapPos - 40,
                height: wallThickness
            });
            // Right segment
            this.mazeWalls.push({
                x: size * gapPos + 40,
                y: spacing * i - wallThickness / 2,
                width: size * (1 - gapPos) - 40,
                height: wallThickness
            });
        }

        // Vertical walls with random gaps
        for (let i = 1; i <= passages - 1; i++) {
            const gapPos = Math.random() * 0.6 + 0.2;
            // Top segment
            this.mazeWalls.push({
                x: spacing * i - wallThickness / 2,
                y: 0,
                width: wallThickness,
                height: size * gapPos - 40
            });
            // Bottom segment
            this.mazeWalls.push({
                x: spacing * i - wallThickness / 2,
                y: size * gapPos + 40,
                width: wallThickness,
                height: size * (1 - gapPos) - 40
            });
        }

        // Create graphics for walls
        this.mazeWallGraphics = this.add.graphics();
        this.mazeWallGraphics.setDepth(5);

        // Draw walls with glow effect
        this.mazeWalls.forEach(wall => {
            // Outer glow
            this.mazeWallGraphics.fillStyle(color, 0.3);
            this.mazeWallGraphics.fillRoundedRect(
                wall.x - 4, wall.y - 4,
                wall.width + 8, wall.height + 8,
                8
            );
            // Inner wall
            this.mazeWallGraphics.fillStyle(color, 0.7);
            this.mazeWallGraphics.fillRoundedRect(
                wall.x, wall.y,
                wall.width, wall.height,
                4
            );
            // Border
            this.mazeWallGraphics.lineStyle(2, color, 1);
            this.mazeWallGraphics.strokeRoundedRect(
                wall.x, wall.y,
                wall.width, wall.height,
                4
            );
        });
    }

    /**
     * Check and handle maze wall collisions for the player
     */
    checkMazeWallCollisions() {
        if (!this.localPlayer || !this.localPlayer.alive) return;
        if (this.mazeWalls.length === 0) return;

        const player = this.localPlayer;
        const playerSize = player.playerSize;

        this.mazeWalls.forEach(wall => {
            // Player bounds
            const playerLeft = player.x - playerSize;
            const playerRight = player.x + playerSize;
            const playerTop = player.y - playerSize;
            const playerBottom = player.y + playerSize;

            // Wall bounds
            const wallLeft = wall.x;
            const wallRight = wall.x + wall.width;
            const wallTop = wall.y;
            const wallBottom = wall.y + wall.height;

            // Check collision
            if (playerRight > wallLeft && playerLeft < wallRight &&
                playerBottom > wallTop && playerTop < wallBottom) {
                // Calculate overlap on each axis
                const overlapLeft = playerRight - wallLeft;
                const overlapRight = wallRight - playerLeft;
                const overlapTop = playerBottom - wallTop;
                const overlapBottom = wallBottom - playerTop;

                // Find minimum overlap and push player out
                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapLeft) {
                    player.x = wallLeft - playerSize;
                } else if (minOverlap === overlapRight) {
                    player.x = wallRight + playerSize;
                } else if (minOverlap === overlapTop) {
                    player.y = wallTop - playerSize;
                } else {
                    player.y = wallBottom + playerSize;
                }
            }
        });
    }

    exitDimension(wasAbsorbed = false) {
        if (!this.mainWorldState) return;

        const exitedConfig = CONFIG.DIMENSIONS[this.currentDimension];

        // Cleanup dimension content
        this.dimensionOrbs.forEach(orb => orb.destroy());
        this.dimensionOrbs = [];
        this.dimensionBots.forEach(bot => bot.destroy());
        this.dimensionBots = [];

        // Cleanup maze walls
        this.mazeWalls = [];
        if (this.mazeWallGraphics) {
            this.mazeWallGraphics.destroy();
            this.mazeWallGraphics = null;
        }

        // Restore world
        this.worldWidth = CONFIG.WORLD_WIDTH;
        this.worldHeight = CONFIG.WORLD_HEIGHT;
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Choose exit rift (same as entry if possible, otherwise random)
        let exitRift = null;
        if (this.mainWorldState && this.mainWorldState.entryRiftId) {
            exitRift = this.rifts.find(r => r.id === this.mainWorldState.entryRiftId);
        }

        if (!exitRift) {
            exitRift = this.rifts[Math.floor(Math.random() * this.rifts.length)];
        }

        if (this.gameMode !== 'multiplayer' || this.multiplayerUsesSoloSimulation) {
            this.localPlayer.setPosition(
                exitRift.x + (Math.random() - 0.5) * 100,
                exitRift.y + (Math.random() - 0.5) * 100
            );
        }

        // Respawn if died
        if (!this.localPlayer.alive) {
            this.localPlayer.respawn(this.localPlayer.x, this.localPlayer.y);
            soundManager.playRespawn();
        }

        // No exit invulnerability - matches server. Combat should work immediately.
        this.isInvulnerable = false;
        this.invulnTimer = 0;
        this.localPlayer.setInvulnerable(false);
        this.riftCooldown = CONFIG.RIFT.cooldown;

        // Reset mechanics
        this.localPlayer.setPhysicsMode('direct');

        // Show main world entities
        this.bots.forEach(bot => bot.setVisible(true));
        this.orbs.forEach(orb => orb.setVisible(true));
        this.rifts.forEach(rift => rift.graphics.setVisible(true));
        if (this.predator) {
            this.predator.setVisible(true);
        }

        // Restore grid
        this.gridGraphics.clear();
        this.gridGraphics.lineStyle(1, 0x252836, 1);
        for (let x = 0; x <= this.worldWidth; x += CONFIG.GRID_SIZE) {
            this.gridGraphics.lineBetween(x, 0, x, this.worldHeight);
        }
        for (let y = 0; y <= this.worldHeight; y += CONFIG.GRID_SIZE) {
            this.gridGraphics.lineBetween(0, y, this.worldWidth, y);
        }

        // Clear dimension state
        this.currentDimension = null;
        this.mainWorldState = null;

        // Effects
        soundManager.playRiftExit();
        this.showNotification(
            wasAbsorbed ? '💥 ABSORBED! Ejecting...' : 'EXITING ' + exitedConfig.name.toUpperCase() + '!',
            wasAbsorbed ? '#fca5a5' : exitedConfig.colorHex
        );
        this.triggerScreenShake(8, 15);
    }

    updateDimensionTimers(delta) {
        // Update dimension timer
        if (this.currentDimension !== null) {
            this.dimensionTimer -= delta;
            if (this.dimensionTimer <= 0) {
                this.exitDimension();
            }
        }

        // Update rift cooldown
        if (this.riftCooldown > 0) {
            this.riftCooldown -= delta;
            if (this.riftCooldown < 0) this.riftCooldown = 0;
        }

        // Update invulnerability
        if (this.invulnTimer > 0) {
            this.invulnTimer -= delta;
            if (this.invulnTimer <= 0) {
                this.isInvulnerable = false;
                this.invulnTimer = 0;
                if (this.localPlayer) {
                    this.localPlayer.setInvulnerable(false);
                }
            }
        }
    }

    getDimensionSpeedMultiplier() {
        if (!this.currentDimension) return 1;
        const config = CONFIG.DIMENSIONS[this.currentDimension];
        return config ? config.speedMult : 1;
    }

    getCurrentWorldSize() {
        if (!this.currentDimension) {
            return { width: CONFIG.WORLD_WIDTH, height: CONFIG.WORLD_HEIGHT };
        }
        const config = CONFIG.DIMENSIONS[this.currentDimension];
        if (!config) return { width: CONFIG.WORLD_WIDTH, height: CONFIG.WORLD_HEIGHT };
        return { width: config.worldSize, height: config.worldSize };
    }

    // ========================================
    // ENVIRONMENTAL HAZARDS
    // ========================================

    updatePredator(delta) {
        // Simplified predator logic
        const now = Date.now();

        if (!this.predator && !this.predatorWarning && now > this.predatorCooldown) {
            const allEntities = [...this.players.filter(p => p.alive), ...this.bots.filter(b => b.alive)];
            const largest = allEntities.sort((a, b) => b.playerSize - a.playerSize)[0];

            if (largest && largest.playerSize >= CONFIG.PREDATOR.spawnThreshold) {
                this.predatorWarning = {
                    target: largest,
                    startTime: now,
                    x: largest.x + (Math.random() - 0.5) * 400,
                    y: largest.y + (Math.random() - 0.5) * 400
                };
                soundManager.playPredatorWarning();
                this.showNotification('⚠️ HUNTER INCOMING!', '#ef4444');
                this.triggerScreenShake(8, 30);
            }
        }

        // Spawn predator after warning
        if (this.predatorWarning && now - this.predatorWarning.startTime >= CONFIG.PREDATOR.warningDuration) {
            this.predator = new Bot(this, this.predatorWarning.x, this.predatorWarning.y, {
                id: 'predator_' + now,
                name: '☠️ HUNTER',
                color: '#dc2626',
                size: this.predatorWarning.target.playerSize * CONFIG.PREDATOR.sizeMultiplier
            });
            this.predator.spawnTime = now;
            this.predatorWarning = null;
            this.showNotification('🔴 HUNTER SPAWNED!', '#dc2626');
        }

        // Update predator
        if (this.predator && this.predator.alive) {
            if (now - this.predator.spawnTime > CONFIG.PREDATOR.duration) {
                this.predator.destroy();
                this.predator = null;
                this.predatorCooldown = now + CONFIG.PREDATOR.cooldown;
                this.showNotification('Hunter Retreated', '#86efac');
                return;
            }

            // Chase largest entity
            const allEntities = [...this.players.filter(p => p.alive), ...this.bots.filter(b => b.alive)];
            const target = allEntities.sort((a, b) => b.playerSize - a.playerSize)[0];

            if (target) {
                const speed = Math.max(1.5, 6 - this.predator.playerSize * 0.02) * CONFIG.PREDATOR.speedMultiplier;
                const dx = target.x - this.predator.x;
                const dy = target.y - this.predator.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 5) {
                    this.predator.x += (dx / dist) * speed;
                    this.predator.y += (dy / dist) * speed;
                    this.predator.clampToWorld(this.worldWidth, this.worldHeight);
                }

                // Check collision with entities
                allEntities.forEach(entity => {
                    const dx = entity.x - this.predator.x;
                    const dy = entity.y - this.predator.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < this.predator.playerSize * 0.8 && this.predator.playerSize > entity.playerSize * 1.1) {
                        entity.die();

                        if (entity === this.localPlayer) {
                            soundManager.playDeath();
                            this.triggerScreenShake(15, 30);
                            this.showNotification('💀 EATEN BY HUNTER!', '#ef4444');
                        }
                    }
                });
            }
        }
    }

    updateDangerZone(delta) {
        // Simplified danger zone logic
    }

    updateMeteors(delta) {
        // Simplified meteor logic
    }

    // ========================================
    // EFFECTS AND UI
    // ========================================

    triggerScreenShake(intensity, duration) {
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
        this.screenShake.duration = Math.max(this.screenShake.duration, duration);
    }

    updateScreenShake() {
        if (this.screenShake.duration > 0) {
            const offsetX = (Math.random() - 0.5) * this.screenShake.intensity;
            const offsetY = (Math.random() - 0.5) * this.screenShake.intensity;
            this.cameras.main.setScroll(
                this.cameras.main.scrollX + offsetX,
                this.cameras.main.scrollY + offsetY
            );
            this.screenShake.duration--;
            this.screenShake.intensity *= 0.95;
        }
    }

    showNotification(text, color = '#fdba74') {
        this.notifications.push({
            text,
            color,
            life: 1.0,
            y: 0
        });
    }

    updateNotifications(delta) {
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const n = this.notifications[i];
            n.life -= 0.015;
            n.y -= 1;
            if (n.life <= 0) {
                this.notifications.splice(i, 1);
            }
        }
    }

    /**
     * Show floating time added effect when collecting time orbs
     */
    showTimeAddedEffect(x, y, timeBonus) {
        const seconds = Math.round(timeBonus / 1000);
        const text = this.add.text(x, y, `+${seconds}s`, {
            fontFamily: 'Inter, sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        text.setDepth(200);

        // Animate floating upward and fading
        this.tweens.add({
            targets: text,
            y: y - 60,
            alpha: { from: 1, to: 0 },
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 1000,
            ease: 'Cubic.easeOut',
            onComplete: () => text.destroy()
        });

        // Also show notification
        this.showNotification(`⏰ +${seconds} SECONDS!`, '#00ffff');
    }

    /**
     * Create ripple effect at orb collection point
     */
    createRippleEffect(x, y, playerSize, comboCount = 0) {
        if (!this.localPlayer) return;

        // Scale ripple intensity with player size and combo
        const stage = this.localPlayer.visualStage || 0;
        const comboBoost = Math.min(comboCount / 20, 1); // 0-1 based on combo
        const intensity = 0.2 + (stage * 0.1) + (comboBoost * 0.15);
        const size = playerSize * (0.4 + stage * 0.15 + comboBoost * 0.2);

        // Create expanding circle ripple
        const ripple = this.add.circle(x, y, size, hexToNumber(this.localPlayer.playerColor), intensity);
        ripple.setBlendMode(Phaser.BlendModes.ADD);
        ripple.setDepth(2);

        this.tweens.add({
            targets: ripple,
            scaleX: 2 + stage * 0.5,
            scaleY: 2 + stage * 0.5,
            alpha: 0,
            duration: 300 + stage * 50,
            ease: 'Cubic.easeOut',
            onComplete: () => ripple.destroy()
        });

        // Additional ripples for higher stages
        if (stage >= 2) {
            const ripple2 = this.add.circle(x, y, size * 0.7, 0xffffff, intensity * 0.5);
            ripple2.setBlendMode(Phaser.BlendModes.ADD);
            ripple2.setDepth(2);

            this.tweens.add({
                targets: ripple2,
                scaleX: 1.5 + stage * 0.3,
                scaleY: 1.5 + stage * 0.3,
                alpha: 0,
                duration: 200 + stage * 30,
                ease: 'Cubic.easeOut',
                onComplete: () => ripple2.destroy()
            });
        }
    }

    /**
     * Increment combo counter and calculate multiplier
     */
    incrementCombo() {
        this.combo.count++;
        this.combo.timer = CONFIG.COMBO.window;

        // Calculate multiplier (linear scaling up to max)
        this.combo.multiplier = Math.min(
            1 + (this.combo.count - 1) * 0.1,
            CONFIG.COMBO.maxMultiplier
        );

        // Check for combo tier milestones
        const tiers = CONFIG.COMBO.tiers;
        for (let i = tiers.length - 1; i >= 0; i--) {
            if (this.combo.count === tiers[i].count && this.combo.lastTier < i) {
                this.combo.lastTier = i;
                this.showNotification(`🔥 ${this.combo.count}x COMBO - ${tiers[i].name}`, tiers[i].color);
                soundManager.playComboMilestone(i);
                this.triggerScreenShake(4 + i * 2, 10);
                break;
            }
        }
    }

    /**
     * Update combo timer (call from main update)
     */
    updateCombo(deltaMs) {
        if (this.combo.count > 0) {
            this.combo.timer -= deltaMs;
            if (this.combo.timer <= 0) {
                // Combo expired
                if (this.combo.count >= 5) {
                    soundManager.playComboBreak();
                }
                this.combo.count = 0;
                this.combo.timer = 0;
                this.combo.lastTier = -1;
                this.combo.multiplier = 1.0;
            }
        }
    }

    /**
     * Update environment visual effects based on player size
     */
    updateEnvironmentEffects() {
        if (!this.localPlayer || !this.localPlayer.alive) return;

        const stage = this.localPlayer.visualStage || 0;

        // Update grid intensity based on player size (subtle effect)
        if (this.gridGraphics && stage >= 2) {
            const intensity = Math.min(0.15 + stage * 0.05, 0.4);
            const r = Math.floor(37 + stage * 5);
            const g = Math.floor(40 + stage * 5);
            const b = Math.floor(54 + stage * 8);
            const gridColor = (r << 16) | (g << 8) | b;

            // Only update if changed significantly (performance)
            if (!this._lastGridStage || this._lastGridStage !== stage) {
                this._lastGridStage = stage;
                // Grid color update would require redrawing, so we skip for performance
            }
        }

        // Camera effects for chaos level (stage 4+)
        if (stage >= 4) {
            // Subtle zoom pulse for chaos mode
            if (!this._chaosZoomActive) {
                this._chaosZoomActive = true;
                this.tweens.add({
                    targets: this.cameras.main,
                    zoom: { from: 1, to: 0.98 },
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        } else if (this._chaosZoomActive) {
            this._chaosZoomActive = false;
            this.tweens.killTweensOf(this.cameras.main);
            this.cameras.main.setZoom(1);
        }
    }

    // ========================================
    // GAME END
    // ========================================

    endGame(data = null) {
        this.gameRunning = false;

        // Calculate final rankings
        const allEntities = [...this.players, ...this.bots];
        allEntities.sort((a, b) => b.score - a.score);
        const rank = allEntities.findIndex(e => e.id === this.localPlayer?.id) + 1;

        // Build rankings array for leaderboard
        const rankings = allEntities.map((entity, index) => ({
            id: entity.id,
            name: entity.playerName || entity.name || 'Unknown',
            score: entity.score || 0,
            rank: index + 1,
            isLocal: entity.id === this.localPlayer?.id,
            isBot: entity.isBot || false
        }));

        const elapsed = Date.now() - this.gameStartTime;
        const mins = Math.floor(elapsed / 60000);
        const secs = Math.floor((elapsed % 60000) / 1000);

        // Remove the main timer immediately so it doesn't show over the post-game screen
        document.getElementById('hud-main-timer')?.remove();

        // Stop UI scene
        this.scene.stop('UIScene');

        // Start post game scene
        this.scene.start('PostGameScene', {
            finalScore: this.stats.score,
            orbsCollected: this.stats.orbsCollected,
            playersAbsorbed: this.stats.playersAbsorbed,
            rank: rank,
            totalPlayers: allEntities.length,
            rankings: rankings,
            duration: `${mins}:${secs.toString().padStart(2, '0')}`,
            riftsUsed: this.riftStats.riftsUsed,
            dimensionOrbs: this.riftStats.dimensionOrbs,
            gameMode: this.gameMode,
            playerName: this.playerName
        });
    }

    shutdown() {
        // Cleanup
        this.gameRunning = false;
    }
}
