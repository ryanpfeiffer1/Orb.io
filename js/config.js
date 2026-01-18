/**
 * Orb Battle.io - Game Configuration
 * Central configuration for all game constants
 */

export const CONFIG = {
    // Game timing
    GAME_DURATION: 5 * 60 * 1000, // 5 minutes
    BREAK_REMINDER_1: 15 * 60 * 1000, // 15 minutes
    BREAK_REMINDER_2: 30 * 60 * 1000, // 30 minutes

    // World
    WORLD_WIDTH: 2000,
    WORLD_HEIGHT: 2000,
    GRID_SIZE: 50,

    // Player
    INITIAL_SIZE: 20,
    MIN_SIZE: 15,
    BASE_SPEED: 8,
    SIZE_SPEED_FACTOR: 0.05,

    // Orbs
    INITIAL_ORB_COUNT: 100,
    ORB_MIN_SIZE: 8,
    ORB_MAX_SIZE: 14,
    ORB_VALUE: 10,

    // Bots
    BOT_COUNT: 8,
    BOT_MIN_SIZE: 15,
    BOT_MAX_SIZE: 35,
    BOT_NAMES: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'],

    // Colors
    PLAYER_COLORS: ['#6c8eef', '#86efac', '#fdba74', '#a78bfa', '#f472b6', '#67e8f9', '#fca5a5'],
    ORB_COLORS: ['#86efac', '#fdba74', '#67e8f9', '#fca5a5', '#d8b4fe'],

    // Absorption
    SIZE_RATIO_TO_ABSORB: 1.1,
    ABSORPTION_SIZE_GAIN: 0.3,
    ABSORPTION_BASE_SCORE: 50,
    RESPAWN_TIME: 1500, // 1.5 seconds

    // Mass Decay
    DECAY: {
        baseRate: 0.02,
        sizeMultiplier: 2.5,
        minSize: 15,
        particleChance: 0.15
    },

    // Dimensional Rifts
    RIFT: {
        count: 4,
        radius: 35,
        cooldown: 8000,
        invulnDuration: 1500,
        minDimensionTime: 15000,
        maxDimensionTime: 30000
    },

    // Dimension Configs
    DIMENSIONS: {
        FEAST: {
            name: 'Feast',
            worldSize: 1000,
            orbCount: 150,
            speedMult: 1,
            orbBonus: 1.5,
            decayMult: 1.5,
            color: 0x86efac,
            colorHex: '#86efac',
            bots: 4,
            description: 'High orb density'
        },
        ANTI_GRAVITY: {
            name: 'Anti-Gravity',
            worldSize: 1500,
            orbCount: 80,
            speedMult: 0.35,
            orbBonus: 2.0,
            decayMult: 0.5,
            color: 0xa78bfa,
            colorHex: '#a78bfa',
            bots: 2,
            description: 'Slow & floaty'
        },
        MIRROR_MAZE: {
            name: 'Mirror Maze',
            worldSize: 800,
            orbCount: 60,
            speedMult: 1,
            orbBonus: 1.75,
            decayMult: 1.25,
            color: 0xf472b6,
            colorHex: '#f472b6',
            bots: 2,
            hasWalls: true,
            description: 'Confined labyrinth'
        },
        SPEED: {
            name: 'Speed Zone',
            worldSize: 1200,
            orbCount: 100,
            speedMult: 2,
            orbBonus: 1.5,
            decayMult: 2.0,
            color: 0xfbbf24,
            colorHex: '#fbbf24',
            bots: 3,
            description: 'Everything 2x faster'
        }
    },

    // Predator NPC
    PREDATOR: {
        spawnThreshold: 50,
        sizeMultiplier: 1.8,
        speedMultiplier: 1.4,
        duration: 30000,
        cooldown: 45000,
        warningDuration: 3000
    },

    // Danger Zones
    DANGER_ZONE: {
        spawnInterval: [45000, 60000],
        warningDuration: 5000,
        activeDuration: 20000,
        radius: 180,
        orbMultiplier: 4,
        shrinkRate: 0.002
    },

    // Gauntlet Passages
    GAUNTLET: {
        count: 3,
        width: 40,
        length: 300,
        orbValue: 25,
        maxSizeToEnter: 35
    },

    // Meteor Showers
    METEOR: {
        spawnInterval: [30000, 45000],
        targetCount: 3,
        warningDuration: 2000,
        damageRadius: 60,
        damagePercent: 0.35,
        dodgeDistance: 100
    },

    // Milestones
    MILESTONES: [
        { size: 30, name: "Growing!", bonus: 50, effect: 'pulse' },
        { size: 50, name: "Getting Big!", bonus: 100, effect: 'flash' },
        { size: 75, name: "DOMINATING!", bonus: 200, effect: 'glow' },
        { size: 100, name: "MASSIVE!", bonus: 500, effect: 'crown' }
    ],

    // Kill Streaks
    STREAK: {
        window: 5000,
        bonuses: [
            { kills: 2, name: "Double Kill!", multiplier: 1.25 },
            { kills: 3, name: "Triple Kill!", multiplier: 1.5 },
            { kills: 4, name: "MEGA KILL!", multiplier: 1.75 },
            { kills: 5, name: "RAMPAGE!", multiplier: 2.0 }
        ]
    },

    // Bot AI Behavior
    BOT_AI: {
        // Detection ranges
        PLAYER_DETECTION_RADIUS: 250,
        THREAT_DETECTION_RADIUS: 200,

        // Size thresholds for behavior changes
        SIZE_ADVANTAGE_RATIO: 1.15,      // When bot is 15% bigger, it will chase
        SIZE_DISADVANTAGE_RATIO: 0.85,   // When bot is 15% smaller, it will flee

        // Q-Learning parameters
        LEARNING_RATE: 0.1,              // How fast bots learn (alpha)
        DISCOUNT_FACTOR: 0.9,            // Future reward importance (gamma)
        EXPLORATION_RATE: 0.15,          // Chance to try random action (epsilon)

        // Rewards
        ORB_REWARD: 5,
        KILL_REWARD: 100,
        DEATH_PENALTY: -50,
        SURVIVAL_REWARD: 1,

        // Timing
        DECISION_INTERVAL: 500,          // How often bots make decisions (ms)
        FLEE_DURATION: 3000              // How long to flee after spotting threat
    },

    // Timed Mode
    TIMED_MODE: {
        gameDuration: 3 * 60 * 1000,      // 3 minutes default
        warningThreshold: 30000,          // 30 seconds - timer turns orange
        criticalThreshold: 10000,         // 10 seconds - intense pulsing red
    },

    // Time Orbs
    TIME_ORB: {
        spawnRate: 0.05,                  // 5% of orbs are time orbs (reduced for rarity)
        timeBonus: 5000,                  // 5 seconds added per orb
        minBonus: 3000,
        maxBonus: 8000,
        color: '#00ffff',                 // Cyan glow
        secondaryColor: '#ffd700',        // Gold accent
        pulseSpeed: 400,                  // Slower pulse
        size: 16,                         // Slightly larger than normal orbs
    },

    // Visual Complexity Stages (based on player size) - Reduced intensity for calmer visuals
    VISUAL_STAGES: [
        { minSize: 15, name: 'nascent', trailThickness: 1, trailTurbulence: 0, layers: 0, glowIntensity: 0.05, particleCount: 1 },
        { minSize: 30, name: 'emerging', trailThickness: 1, trailTurbulence: 0.1, layers: 1, glowIntensity: 0.15, particleCount: 2 },
        { minSize: 50, name: 'growing', trailThickness: 2, trailTurbulence: 0.2, layers: 1, glowIntensity: 0.25, particleCount: 3 },
        { minSize: 75, name: 'dominating', trailThickness: 3, trailTurbulence: 0.3, layers: 2, glowIntensity: 0.35, particleCount: 4 },
        { minSize: 100, name: 'chaos', trailThickness: 4, trailTurbulence: 0.4, layers: 2, glowIntensity: 0.5, particleCount: 6 },
    ],

    // Combo System
    COMBO: {
        window: 1500,           // ms between orbs to maintain combo
        maxMultiplier: 3.0,     // max score multiplier
        tiers: [
            { count: 5, name: 'Nice!', color: '#86efac' },
            { count: 10, name: 'Great!', color: '#fdba74' },
            { count: 20, name: 'Amazing!', color: '#f472b6' },
            { count: 50, name: 'UNSTOPPABLE!', color: '#fbbf24' }
        ]
    },
};

// Helper to get random color
export function getRandomPlayerColor() {
    return CONFIG.PLAYER_COLORS[Math.floor(Math.random() * CONFIG.PLAYER_COLORS.length)];
}

export function getRandomOrbColor() {
    return CONFIG.ORB_COLORS[Math.floor(Math.random() * CONFIG.ORB_COLORS.length)];
}

// Convert hex color string to number
export function hexToNumber(hex) {
    return parseInt(hex.replace('#', '0x'));
}
