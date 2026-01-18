/**
 * Orb Battle.io - Menu Scene
 * Simple menu with play button
 */

import { CONFIG } from '../config.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.playerNameInput = null;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        this.cameras.main.setBackgroundColor(0x1a1d2e);

        // Clean up any leftover HUD elements from previous game
        document.getElementById('hud-main-timer')?.remove();
        document.querySelectorAll('.hud-panel').forEach(el => el.remove());
        document.getElementById('hud-invuln')?.remove();
        document.getElementById('hud-notifications')?.remove();

        // Create DOM overlay for menu
        this.createMenuUI();

        // Handle resize
        this.scale.on('resize', this.handleResize, this);
    }

    /**
     * Create the menu UI using DOM elements
     */
    createMenuUI() {
        // Create menu container
        this.menuContainer = document.createElement('div');
        this.menuContainer.className = 'lobby-container';
        this.menuContainer.id = 'lobby-container';

        // Title
        const title = document.createElement('h1');
        title.className = 'lobby-title';
        title.textContent = 'Orb Battle.io';
        this.menuContainer.appendChild(title);

        // Subtitle
        const subtitle = document.createElement('p');
        subtitle.className = 'lobby-subtitle';
        subtitle.textContent = 'Collect orbs. Grow bigger. Compete!';
        this.menuContainer.appendChild(subtitle);

        // Menu section
        const menuSection = document.createElement('div');
        menuSection.id = 'menu-section';

        // Player name input
        const nameGroup = document.createElement('div');
        nameGroup.className = 'input-group';
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Your Name';
        this.playerNameInput = document.createElement('input');
        this.playerNameInput.type = 'text';
        this.playerNameInput.className = 'input-field';
        this.playerNameInput.placeholder = 'Enter your name';
        this.playerNameInput.maxLength = 12;
        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(this.playerNameInput);
        menuSection.appendChild(nameGroup);

        // Play button
        const playBtn = document.createElement('button');
        playBtn.className = 'btn btn-primary';
        playBtn.textContent = 'Play';
        playBtn.onclick = () => this.play();
        menuSection.appendChild(playBtn);

        this.menuContainer.appendChild(menuSection);

        // Add to game container
        document.getElementById('game-container').appendChild(this.menuContainer);
    }

    /**
     * Get player name from input
     */
    getPlayerName() {
        const name = this.playerNameInput.value.trim();
        if (!name || name.length < 1) {
            return 'Player' + Math.floor(Math.random() * 1000);
        }
        return name.substring(0, 12);
    }

    /**
     * Start the game
     */
    play() {
        const name = this.getPlayerName();

        // Clean up DOM
        this.cleanupDOM();

        // Start game in solo mode
        this.scene.start('GameScene', {
            mode: 'solo',
            playerName: name
        });
    }

    /**
     * Clean up DOM elements
     */
    cleanupDOM() {
        if (this.menuContainer) {
            this.menuContainer.remove();
            this.menuContainer = null;
        }
    }

    /**
     * Handle resize
     */
    handleResize(gameSize) {
        // DOM elements auto-resize with CSS
    }

    /**
     * Cleanup on scene shutdown
     */
    shutdown() {
        this.cleanupDOM();
        this.scale.off('resize', this.handleResize, this);
    }
}
