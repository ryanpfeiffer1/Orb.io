/**
 * Orb Battle.io - Main Entry Point
 * Phaser 3 Game Initialization
 */

import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { PostGameScene } from './scenes/PostGameScene.js';

// Get device pixel ratio for crisp graphics on high-DPI displays
const dpr = window.devicePixelRatio || 1;

// Phaser 3 Game Configuration
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        resolution: dpr
    },
    backgroundColor: '#1a1d2e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, MenuScene, GameScene, UIScene, PostGameScene],
    render: {
        pixelArt: false,
        antialias: true,
        roundPixels: true,  // Changed to true for crisper rendering
        autoResize: true
    },
    fps: {
        target: 60,
        forceSetTimeOut: false
    },
    input: {
        activePointers: 3,
        keyboard: true  // Ensure keyboard input is enabled
    }
};

// Initialize the game
const game = new Phaser.Game(config);

// Handle visibility change (pause when hidden)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        game.loop.sleep();
    } else {
        game.loop.wake();
    }
});

// Export for debugging
window.game = game;
