/**
 * Orb Battle.io - Bot Entity
 * AI-controlled bot with intelligent targeting and Q-learning behavior
 */

import { CONFIG, getRandomPlayerColor } from '../config.js';
import { Player } from './Player.js';
import { sharedBotBrain, BotState, BotAction } from '../ai/BotBrain.js';

export class Bot extends Player {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, {
            id: config.id || 'bot_' + Date.now(),
            name: config.name || 'Bot',
            color: config.color || getRandomPlayerColor(),
            size: config.size || CONFIG.BOT_MIN_SIZE + Math.random() * (CONFIG.BOT_MAX_SIZE - CONFIG.BOT_MIN_SIZE),
            isBot: true,
            isLocal: false
        });

        // AI state
        this.targetX = Math.random() * CONFIG.WORLD_WIDTH;
        this.targetY = Math.random() * CONFIG.WORLD_HEIGHT;
        this.changeTargetTime = Date.now() + Math.random() * 3000;
        this.aiMode = 'wander'; // wander, chase_orb, chase_entity, flee

        // References to game entities (set by game scene)
        this.orbs = [];
        this.players = [];
        this.otherBots = [];

        // Target entity for chase/flee behavior
        this.targetEntity = null;
        this.fleeUntilTime = 0;

        // AI brain reference (shared Q-learning)
        this.brain = sharedBotBrain;
        this.lastDecisionTime = 0;
        this.currentState = BotState.SAFE_ALONE;
        this.currentAction = BotAction.WANDER;

        // Stats tracking for rewards
        this.lastOrbCount = 0;
        this.lastKillCount = 0;
    }

    /**
     * Set orbs reference for targeting
     */
    setOrbs(orbs) {
        this.orbs = orbs;
    }

    /**
     * Set players reference for threat/prey detection
     */
    setPlayers(players) {
        this.players = players;
    }

    /**
     * Set other bots reference for threat/prey detection
     */
    setOtherBots(bots) {
        this.otherBots = bots.filter(b => b !== this);
    }

    /**
     * Find nearest orb
     */
    findNearestOrb() {
        let nearest = null;
        let nearestDist = Infinity;

        for (const orb of this.orbs) {
            const dx = orb.x - this.x;
            const dy = orb.y - this.y;
            const dist = dx * dx + dy * dy;

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = orb;
            }
        }

        return nearest;
    }

    /**
     * Find nearby entities (players and bots) within detection radius
     */
    findNearbyEntities() {
        const detectionRadius = CONFIG.BOT_AI?.PLAYER_DETECTION_RADIUS || 250;
        const radiusSq = detectionRadius * detectionRadius;
        const nearby = [];

        // Check players
        for (const player of this.players) {
            if (!player.alive || player === this) continue;

            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < radiusSq) {
                nearby.push({
                    entity: player,
                    distance: Math.sqrt(distSq),
                    sizeRatio: this.playerSize / player.playerSize
                });
            }
        }

        // Check other bots
        for (const bot of this.otherBots) {
            if (!bot.alive || bot === this) continue;

            const dx = bot.x - this.x;
            const dy = bot.y - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < radiusSq) {
                nearby.push({
                    entity: bot,
                    distance: Math.sqrt(distSq),
                    sizeRatio: this.playerSize / bot.playerSize
                });
            }
        }

        // Sort by distance
        nearby.sort((a, b) => a.distance - b.distance);
        return nearby;
    }

    /**
     * Find nearby orbs
     */
    findNearbyOrbs() {
        const detectionRadius = CONFIG.BOT_AI?.PLAYER_DETECTION_RADIUS || 250;
        const radiusSq = detectionRadius * detectionRadius;
        let count = 0;

        for (const orb of this.orbs) {
            const dx = orb.x - this.x;
            const dy = orb.y - this.y;
            if (dx * dx + dy * dy < radiusSq) {
                count++;
            }
        }

        return count;
    }

    /**
     * Determine current AI state based on surroundings
     */
    evaluateState() {
        const nearby = this.findNearbyEntities();
        const nearbyOrbCount = this.findNearbyOrbs();
        const advantageRatio = CONFIG.BOT_AI?.SIZE_ADVANTAGE_RATIO || 1.15;
        const disadvantageRatio = CONFIG.BOT_AI?.SIZE_DISADVANTAGE_RATIO || 0.85;

        if (nearby.length === 0) {
            // No entities nearby
            if (nearbyOrbCount >= 3) {
                return BotState.NEAR_ORBS;
            }
            return BotState.SAFE_ALONE;
        }

        // Check nearest entity
        const nearest = nearby[0];

        if (nearest.sizeRatio >= advantageRatio) {
            // We're significantly larger - this is prey
            this.targetEntity = nearest.entity;
            return BotState.NEAR_PREY;
        } else if (nearest.sizeRatio <= disadvantageRatio) {
            // We're significantly smaller - this is a threat
            this.targetEntity = nearest.entity;
            return BotState.NEAR_THREAT;
        } else {
            // Similar size - evenly matched
            this.targetEntity = nearest.entity;
            return BotState.EVENLY_MATCHED;
        }
    }

    /**
     * Execute the selected action
     */
    executeAction(action, worldWidth, worldHeight) {
        const now = Date.now();

        switch (action) {
            case BotAction.WANDER:
                this.aiMode = 'wander';
                if (now > this.changeTargetTime) {
                    this.targetX = Math.random() * worldWidth;
                    this.targetY = Math.random() * worldHeight;
                    this.changeTargetTime = now + 2000 + Math.random() * 3000;
                }
                break;

            case BotAction.CHASE_ORB:
                this.aiMode = 'chase_orb';
                const nearestOrb = this.findNearestOrb();
                if (nearestOrb) {
                    this.targetX = nearestOrb.x;
                    this.targetY = nearestOrb.y;
                }
                break;

            case BotAction.CHASE_ENTITY:
            case BotAction.AGGRESSIVE:
                this.aiMode = 'chase_entity';
                if (this.targetEntity && this.targetEntity.alive) {
                    // Predict where target is heading
                    this.targetX = this.targetEntity.x;
                    this.targetY = this.targetEntity.y;
                } else {
                    // No valid target, fall back to orb
                    this.executeAction(BotAction.CHASE_ORB, worldWidth, worldHeight);
                }
                break;

            case BotAction.FLEE:
                this.aiMode = 'flee';
                if (this.targetEntity && this.targetEntity.alive) {
                    // Move away from threat
                    const dx = this.x - this.targetEntity.x;
                    const dy = this.y - this.targetEntity.y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                    // Run in opposite direction
                    this.targetX = this.x + (dx / dist) * 300;
                    this.targetY = this.y + (dy / dist) * 300;

                    // Clamp to world bounds
                    this.targetX = Phaser.Math.Clamp(this.targetX, 50, worldWidth - 50);
                    this.targetY = Phaser.Math.Clamp(this.targetY, 50, worldHeight - 50);

                    this.fleeUntilTime = now + (CONFIG.BOT_AI?.FLEE_DURATION || 3000);
                }
                break;
        }
    }

    /**
     * Update AI behavior with Q-learning
     */
    updateAI(worldWidth = CONFIG.WORLD_WIDTH, worldHeight = CONFIG.WORLD_HEIGHT) {
        if (!this.alive) return;

        const now = Date.now();
        const decisionInterval = CONFIG.BOT_AI?.DECISION_INTERVAL || 300;

        // Make new decision at intervals
        if (now - this.lastDecisionTime > decisionInterval) {
            // Evaluate current state
            const newState = this.evaluateState();

            // If still fleeing from recent threat, keep fleeing
            if (this.aiMode === 'flee' && now < this.fleeUntilTime) {
                // Continue fleeing, but update target position
                if (this.targetEntity && this.targetEntity.alive) {
                    this.executeAction(BotAction.FLEE, worldWidth, worldHeight);
                }
            } else {
                // Get action from brain or override with heuristic
                // Heuristic: If we are big and see a small player, chase them!
                let action = this.brain.decide(newState);

                // Override: Aggressive chasing if we have size advantage
                if (newState === BotState.NEAR_PREY && Math.random() < 0.8) {
                    action = BotAction.CHASE_ENTITY;
                }

                // Override: Dynamic wandering if safe
                if (newState === BotState.SAFE_ALONE && Math.random() < 0.3) {
                    this.targetX = this.x + (Math.random() - 0.5) * 500;
                    this.targetY = this.y + (Math.random() - 0.5) * 500;
                }

                // Execute selected action
                this.executeAction(action, worldWidth, worldHeight);

                this.currentState = newState;
                this.currentAction = action;
            }

            this.lastDecisionTime = now;
        }

        // Move towards target
        const speed = Math.max(1.5, 6 - this.playerSize * 0.04);
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            // Speed boost when fleeing or chasing
            const speedMult = (this.aiMode === 'flee' || this.aiMode === 'chase_entity') ? 1.2 : 1.0;

            // Add organic sine wave movement to make it look less robotic
            const wobble = Math.sin(now / 200) * 0.5;

            this.x += (dx / dist + wobble * 0.1) * speed * speedMult;
            this.y += (dy / dist - wobble * 0.1) * speed * speedMult;

            // Clamp to world bounds
            this.clampToWorld(worldWidth, worldHeight);
        }
    }

    /**
     * Called when bot collects an orb (for reward)
     */
    onOrbCollected() {
        const orbReward = CONFIG.BOT_AI?.ORB_REWARD || 5;
        this.brain.receiveReward(orbReward, this.currentState);
    }

    /**
     * Called when bot kills another entity (for reward)
     */
    onKill() {
        const killReward = CONFIG.BOT_AI?.KILL_REWARD || 100;
        this.brain.receiveReward(killReward, this.currentState);
    }

    /**
     * Called when bot dies (for penalty)
     */
    onDeath() {
        const deathPenalty = CONFIG.BOT_AI?.DEATH_PENALTY || -50;
        this.brain.receiveReward(deathPenalty, this.currentState);
        this.brain.reset();
    }

    /**
     * Respawn bot with new random size
     */
    respawn(x, y, worldWidth = CONFIG.WORLD_WIDTH, worldHeight = CONFIG.WORLD_HEIGHT) {
        this.alive = true;
        this.respawnTime = null;
        this.setPosition(
            x !== undefined ? x : Math.random() * worldWidth,
            y !== undefined ? y : Math.random() * worldHeight
        );

        // Dynamic Difficulty: New bots scale with the player to keep challenge high
        let spawnSizeMin = CONFIG.BOT_MIN_SIZE;
        let spawnSizeMax = CONFIG.BOT_MIN_SIZE + 10;

        if (this.scene.localPlayer && this.scene.localPlayer.active) {
            // Scale up based on player size (e.g. if player is size 100, bots can spawn up to size 60)
            const playerSize = this.scene.localPlayer.playerSize;
            if (playerSize > 40) {
                spawnSizeMin = Math.min(playerSize * 0.4, 60);
                spawnSizeMax = Math.min(playerSize * 0.8, 100);
            }
        }

        this.setSize(spawnSizeMin + Math.random() * (spawnSizeMax - spawnSizeMin));
        this.setVisible(true);

        // Reset AI
        this.targetX = Math.random() * worldWidth;
        this.targetY = Math.random() * worldHeight;
        this.changeTargetTime = Date.now() + Math.random() * 2000;
        this.aiMode = 'wander';
        this.targetEntity = null;
        this.fleeUntilTime = 0;
        this.currentState = BotState.SAFE_ALONE;
        this.currentAction = BotAction.WANDER;
    }

    /**
     * Update bot
     */
    update(time, delta, worldWidth, worldHeight) {
        // Check for respawn
        if (!this.alive && this.respawnTime && Date.now() > this.respawnTime) {
            this.respawn(undefined, undefined, worldWidth, worldHeight);
        }

        // Update AI
        this.updateAI(worldWidth, worldHeight);
    }
}

/**
 * Create multiple bots
 */
export function createBots(scene, count = CONFIG.BOT_COUNT) {
    const bots = [];

    for (let i = 0; i < count; i++) {
        const bot = new Bot(scene,
            Math.random() * CONFIG.WORLD_WIDTH,
            Math.random() * CONFIG.WORLD_HEIGHT,
            {
                id: 'bot_' + i,
                name: CONFIG.BOT_NAMES[i] || 'Bot'
            }
        );
        bots.push(bot);
    }

    // Set references to other bots for each bot
    bots.forEach(bot => {
        bot.setOtherBots(bots);
    });

    return bots;
}
