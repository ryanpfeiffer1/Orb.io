/**
 * Orb Battle.io - Boot Scene
 * Initial loading and setup
 */

import { soundManager } from '../managers/SoundManager.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        this.cameras.main.setBackgroundColor(0x1a1d2e);

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Orb Battle.io', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '48px',
            fontStyle: 'bold',
            color: '#6c8eef'
        }).setOrigin(0.5);

        // Progress bar background
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x252836, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2, 320, 30);

        // Loading progress text
        const percentText = this.add.text(width / 2, height / 2 + 15, '0%', {
            fontFamily: 'Inter, sans-serif',
            fontSize: '18px',
            color: '#94a3b8'
        }).setOrigin(0.5);

        // Progress events
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x6c8eef, 1);
            progressBar.fillRect(width / 2 - 155, height / 2 + 5, 310 * value, 20);
            percentText.setText(Math.floor(value * 100) + '%');
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            percentText.destroy();
        });

        // Since we're using procedural graphics, we don't have assets to load
        // But we can simulate loading time for a smoother experience

        // Create a fake loading item to show progress
        this.load.on('start', () => {
            console.log('Loading game assets...');
        });
    }

    create() {
        // Initialize sound manager
        soundManager.init();

        // Short delay then transition to menu
        this.time.delayedCall(500, () => {
            this.scene.start('MenuScene');
        });
    }
}
