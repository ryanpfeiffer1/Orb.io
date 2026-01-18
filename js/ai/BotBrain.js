/**
 * Orb Battle.io - Bot Brain (Simple Q-Learning AI)
 * Provides intelligent decision-making for bots
 */

import { CONFIG } from '../config.js';

// AI States
export const BotState = {
    SAFE_ALONE: 'SAFE_ALONE',           // No threats, no prey nearby
    NEAR_ORBS: 'NEAR_ORBS',             // Orbs nearby, focus on collection
    NEAR_PREY: 'NEAR_PREY',             // Smaller entity nearby (can hunt)
    NEAR_THREAT: 'NEAR_THREAT',         // Larger entity nearby (must flee)
    EVENLY_MATCHED: 'EVENLY_MATCHED'    // Similar sized entity nearby
};

// AI Actions
export const BotAction = {
    WANDER: 'WANDER',           // Random movement exploration
    CHASE_ORB: 'CHASE_ORB',     // Move toward nearest orb
    CHASE_ENTITY: 'CHASE_ENTITY', // Hunt smaller entity
    FLEE: 'FLEE',               // Run away from threat
    AGGRESSIVE: 'AGGRESSIVE'    // Risk-taking chase on equal opponent
};

/**
 * BotBrain - Q-Learning based decision system
 */
export class BotBrain {
    constructor() {
        // Q-Table: state -> action -> expected reward value
        this.qTable = this.initializeQTable();

        // Learning parameters
        this.learningRate = CONFIG.BOT_AI?.LEARNING_RATE || 0.1;
        this.discountFactor = CONFIG.BOT_AI?.DISCOUNT_FACTOR || 0.9;
        this.explorationRate = CONFIG.BOT_AI?.EXPLORATION_RATE || 0.2;

        // Track last state/action for learning updates
        this.lastState = null;
        this.lastAction = null;
        this.lastDecisionTime = 0;

        // Cumulative reward for this session
        this.totalReward = 0;
    }

    /**
     * Initialize Q-table with default values biased toward reasonable behavior
     */
    initializeQTable() {
        return {
            [BotState.SAFE_ALONE]: {
                [BotAction.WANDER]: 5,
                [BotAction.CHASE_ORB]: 10,
                [BotAction.CHASE_ENTITY]: 0,
                [BotAction.FLEE]: 0,
                [BotAction.AGGRESSIVE]: 0
            },
            [BotState.NEAR_ORBS]: {
                [BotAction.WANDER]: 2,
                [BotAction.CHASE_ORB]: 20,
                [BotAction.CHASE_ENTITY]: 0,
                [BotAction.FLEE]: 0,
                [BotAction.AGGRESSIVE]: 0
            },
            [BotState.NEAR_PREY]: {
                [BotAction.WANDER]: 0,
                [BotAction.CHASE_ORB]: 5,
                [BotAction.CHASE_ENTITY]: 25,
                [BotAction.FLEE]: -10,
                [BotAction.AGGRESSIVE]: 15
            },
            [BotState.NEAR_THREAT]: {
                [BotAction.WANDER]: -5,
                [BotAction.CHASE_ORB]: 0,
                [BotAction.CHASE_ENTITY]: -20,
                [BotAction.FLEE]: 30,
                [BotAction.AGGRESSIVE]: -15
            },
            [BotState.EVENLY_MATCHED]: {
                [BotAction.WANDER]: 5,
                [BotAction.CHASE_ORB]: 10,
                [BotAction.CHASE_ENTITY]: 5,
                [BotAction.FLEE]: 5,
                [BotAction.AGGRESSIVE]: 8
            }
        };
    }

    /**
     * Select an action based on current state using epsilon-greedy strategy
     */
    selectAction(state) {
        const actions = this.getValidActions(state);

        // Exploration: random action
        if (Math.random() < this.explorationRate) {
            return actions[Math.floor(Math.random() * actions.length)];
        }

        // Exploitation: best action based on Q-values
        let bestAction = actions[0];
        let bestValue = this.qTable[state][actions[0]];

        for (const action of actions) {
            if (this.qTable[state][action] > bestValue) {
                bestValue = this.qTable[state][action];
                bestAction = action;
            }
        }

        return bestAction;
    }

    /**
     * Get valid actions for a given state
     */
    getValidActions(state) {
        switch (state) {
            case BotState.SAFE_ALONE:
                return [BotAction.WANDER, BotAction.CHASE_ORB];
            case BotState.NEAR_ORBS:
                return [BotAction.WANDER, BotAction.CHASE_ORB];
            case BotState.NEAR_PREY:
                return [BotAction.CHASE_ORB, BotAction.CHASE_ENTITY, BotAction.AGGRESSIVE];
            case BotState.NEAR_THREAT:
                return [BotAction.FLEE, BotAction.WANDER];
            case BotState.EVENLY_MATCHED:
                return [BotAction.WANDER, BotAction.CHASE_ORB, BotAction.FLEE, BotAction.AGGRESSIVE];
            default:
                return [BotAction.WANDER];
        }
    }

    /**
     * Update Q-value based on reward received (Q-learning update rule)
     * Q(s,a) = Q(s,a) + α * (r + γ * max(Q(s',a')) - Q(s,a))
     */
    updateQValue(state, action, reward, newState) {
        if (!this.qTable[state] || !this.qTable[state][action]) return;

        const currentQ = this.qTable[state][action];

        // Find max Q-value for new state
        let maxFutureQ = 0;
        if (this.qTable[newState]) {
            const futureActions = Object.keys(this.qTable[newState]);
            for (const futureAction of futureActions) {
                if (this.qTable[newState][futureAction] > maxFutureQ) {
                    maxFutureQ = this.qTable[newState][futureAction];
                }
            }
        }

        // Q-learning update
        const newQ = currentQ + this.learningRate * (reward + this.discountFactor * maxFutureQ - currentQ);
        this.qTable[state][action] = newQ;

        this.totalReward += reward;
    }

    /**
     * Process a reward and update learning
     */
    receiveReward(reward, currentState) {
        if (this.lastState && this.lastAction) {
            this.updateQValue(this.lastState, this.lastAction, reward, currentState);
        }
    }

    /**
     * Make a decision (returns action, updates last state/action)
     */
    decide(state) {
        const action = this.selectAction(state);

        // Give small survival reward for making it to next decision
        if (this.lastState && this.lastAction) {
            const survivalReward = CONFIG.BOT_AI?.SURVIVAL_REWARD || 1;
            this.updateQValue(this.lastState, this.lastAction, survivalReward, state);
        }

        this.lastState = state;
        this.lastAction = action;
        this.lastDecisionTime = Date.now();

        return action;
    }

    /**
     * Reset learning state (on respawn)
     */
    reset() {
        this.lastState = null;
        this.lastAction = null;
    }

    /**
     * Decay exploration rate over time (optional training enhancement)
     */
    decayExploration(minRate = 0.05) {
        this.explorationRate = Math.max(minRate, this.explorationRate * 0.999);
    }

    /**
     * Get current Q-table (for debugging/visualization)
     */
    getQTable() {
        return this.qTable;
    }
}

/**
 * Shared brain for all bots (they learn together)
 * This creates emergent behavior as bots collectively improve
 */
export const sharedBotBrain = new BotBrain();
