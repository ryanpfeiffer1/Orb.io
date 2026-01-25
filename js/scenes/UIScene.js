/**
 * Orb Battle.io - UI Scene
 * HUD overlay for score, timer, leaderboard
 */

import { CONFIG } from '../config.js';

export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    init(data) {
        this.gameScene = data.gameScene;
    }

    create() {
        // Clean up any existing HUD elements (in case of restart)
        document.getElementById('hud-main-timer')?.remove();
        document.querySelectorAll('.hud-panel').forEach(el => el.remove());
        document.getElementById('hud-invuln')?.remove();
        document.getElementById('hud-notifications')?.remove();

        // Create DOM-based HUD
        this.createHUD();

        // Update timer
        this.time.addEvent({
            delay: 100,
            callback: this.updateHUD,
            callbackScope: this,
            loop: true
        });
    }

    createHUD() {
        const container = document.getElementById('game-container');

        // Score panel (top-left)
        this.scorePanel = document.createElement('div');
        this.scorePanel.className = 'hud-panel hud-top-left';
        this.scorePanel.innerHTML = `
            <div class="score-display" id="hud-score">Score: 0</div>
            <div class="timer-display" id="hud-timer">Time: 3:00</div>
            <div class="progress-container">
                <div class="progress-label">Next milestone: <span id="hud-points-needed">100</span> pts</div>
                <div class="progress-bar">
                    <div class="progress-fill" id="hud-progress" style="width: 0%"></div>
                </div>
            </div>
            <div class="power-level-container" id="hud-power-level" style="margin-top: 8px; display: none;">
                <span class="power-label" style="font-size: 11px; color: #a78bfa;">Power: </span>
                <span class="power-value" id="hud-power-stage" style="font-size: 12px; font-weight: bold; color: #d8b4fe;">Nascent</span>
            </div>
            <div id="hud-rift-status" class="rift-status hidden">
                <div class="rift-timer">
                    <span class="dimension-name" id="hud-dim-name">FEAST</span>
                    <span class="dimension-timer" id="hud-dim-timer">15s</span>
                </div>
                <div class="rift-bonus">BONUS: <span id="hud-orb-mult">1.5x</span></div>
            </div>
        `;
        container.appendChild(this.scorePanel);

        // Main countdown timer (top-center, prominent)
        this.mainTimer = document.createElement('div');
        this.mainTimer.className = 'hud-main-timer';
        this.mainTimer.id = 'hud-main-timer';
        this.mainTimer.style.cssText = `
            position: absolute;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Inter', sans-serif;
            font-size: 42px;
            font-weight: 800;
            color: #67e8f9;
            text-shadow: 0 0 20px rgba(103, 232, 249, 0.5), 2px 2px 4px rgba(0, 0, 0, 0.8);
            z-index: 1000;
            transition: color 0.3s, text-shadow 0.3s, transform 0.1s;
        `;
        this.mainTimer.textContent = '3:00';
        container.appendChild(this.mainTimer);

        // Leaderboard panel (top-right)
        this.leaderboardPanel = document.createElement('div');
        this.leaderboardPanel.className = 'hud-panel hud-top-right';
        this.leaderboardPanel.innerHTML = `
            <h4 class="leaderboard-title">Top Players</h4>
            <ol class="leaderboard-list" id="hud-leaderboard"></ol>
        `;
        container.appendChild(this.leaderboardPanel);

        // Invulnerability indicator
        this.invulnIndicator = document.createElement('div');
        this.invulnIndicator.className = 'invuln-indicator hidden';
        this.invulnIndicator.id = 'hud-invuln';
        this.invulnIndicator.textContent = 'INVULNERABLE';
        container.appendChild(this.invulnIndicator);

        // Notification container
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.className = 'notification-toast';
        this.notificationContainer.id = 'hud-notifications';
        this.notificationContainer.style.display = 'none';
        container.appendChild(this.notificationContainer);
    }

    updateHUD() {
        if (!this.gameScene || !this.gameScene.gameRunning) return;

        const gs = this.gameScene;

        // Score
        const scoreEl = document.getElementById('hud-score');
        if (scoreEl) scoreEl.textContent = `Score: ${gs.stats.score}`;

        // Timer - use remainingTime countdown
        const remaining = Math.max(0, gs.remainingTime || 0);
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        const timerText = `${mins}:${secs.toString().padStart(2, '0')}`;

        // Update small timer in panel
        const timerEl = document.getElementById('hud-timer');
        if (timerEl) timerEl.textContent = `Time: ${timerText}`;

        // Update main prominent timer
        const mainTimerEl = document.getElementById('hud-main-timer');
        if (mainTimerEl) {
            mainTimerEl.textContent = timerText;

            // Visual urgency effects based on time remaining
            const warningThreshold = CONFIG.TIMED_MODE?.warningThreshold || 30000;
            const criticalThreshold = CONFIG.TIMED_MODE?.criticalThreshold || 10000;

            if (remaining <= criticalThreshold) {
                // Critical - red with intense pulsing
                mainTimerEl.style.color = '#ef4444';
                mainTimerEl.style.textShadow = '0 0 30px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.4)';
                // Pulse effect
                const pulse = 1 + Math.sin(Date.now() / 100) * 0.08;
                mainTimerEl.style.transform = `translateX(-50%) scale(${pulse})`;
            } else if (remaining <= warningThreshold) {
                // Warning - orange/yellow
                mainTimerEl.style.color = '#fdba74';
                mainTimerEl.style.textShadow = '0 0 20px rgba(253, 186, 116, 0.6), 2px 2px 4px rgba(0, 0, 0, 0.8)';
                mainTimerEl.style.transform = 'translateX(-50%) scale(1)';
            } else {
                // Normal - cyan
                mainTimerEl.style.color = '#67e8f9';
                mainTimerEl.style.textShadow = '0 0 20px rgba(103, 232, 249, 0.5), 2px 2px 4px rgba(0, 0, 0, 0.8)';
                mainTimerEl.style.transform = 'translateX(-50%) scale(1)';
            }
        }

        // Power level / Visual stage indicator
        const powerLevelEl = document.getElementById('hud-power-level');
        const powerStageEl = document.getElementById('hud-power-stage');
        if (powerLevelEl && powerStageEl && gs.localPlayer) {
            const stage = gs.localPlayer.visualStage || 0;
            if (stage > 0) {
                powerLevelEl.style.display = 'block';
                const stageNames = ['Nascent', 'Emerging', 'Growing', 'Dominating', 'CHAOS'];
                const stageColors = ['#86efac', '#67e8f9', '#a78bfa', '#f472b6', '#ef4444'];
                powerStageEl.textContent = stageNames[stage] || 'Nascent';
                powerStageEl.style.color = stageColors[stage] || '#d8b4fe';
            } else {
                powerLevelEl.style.display = 'none';
            }
        }

        // Progress
        const milestone = Math.ceil(gs.stats.score / 100) * 100;
        const progress = ((gs.stats.score % 100) / 100) * 100;
        const progressEl = document.getElementById('hud-progress');
        const pointsEl = document.getElementById('hud-points-needed');
        if (progressEl) progressEl.style.width = `${progress}%`;
        if (pointsEl) pointsEl.textContent = milestone - gs.stats.score;

        // Rift status
        const riftStatusEl = document.getElementById('hud-rift-status');
        const riftCooldownEl = document.getElementById('hud-rift-cooldown');

        if (gs.currentDimension !== null) {
            const config = CONFIG.DIMENSIONS[gs.currentDimension];
            riftStatusEl?.classList.remove('hidden');

            const dimNameEl = document.getElementById('hud-dim-name');
            const dimTimerEl = document.getElementById('hud-dim-timer');
            const orbMultEl = document.getElementById('hud-orb-mult');

            if (dimNameEl) dimNameEl.textContent = config.name;
            if (dimTimerEl) {
                dimTimerEl.textContent = Math.ceil(gs.dimensionTimer / 1000) + 's';
                dimTimerEl.style.color = gs.dimensionTimer < 5000 ? '#fca5a5' : '#f472b6';
            }
            if (orbMultEl) orbMultEl.textContent = config.orbBonus + 'x';
        } else {
            riftStatusEl?.classList.add('hidden');
        }

        // Invulnerability
        const invulnEl = document.getElementById('hud-invuln');
        if (gs.isInvulnerable) {
            invulnEl?.classList.remove('hidden');
        } else {
            invulnEl?.classList.add('hidden');
        }

        // Leaderboard
        this.updateLeaderboard();

        // Notifications
        this.updateNotifications();
    }

    updateLeaderboard() {
        const gs = this.gameScene;
        if (!gs) return;

        const allEntities = [...gs.players, ...gs.bots].filter(e => e.alive);
        allEntities.sort((a, b) => b.score - a.score);
        const top5 = allEntities.slice(0, 5);

        const listEl = document.getElementById('hud-leaderboard');
        if (!listEl) return;

        listEl.innerHTML = '';
        top5.forEach((entity, index) => {
            const li = document.createElement('li');
            li.className = 'leaderboard-item';
            if (entity.id === gs.localPlayer?.id) {
                li.classList.add('local-player');
            }
            li.innerHTML = `
                <span class="leaderboard-rank">${index + 1}.</span>
                <span class="leaderboard-name">${entity.playerName || entity.name}</span>
                <span class="leaderboard-score">${entity.score}</span>
            `;
            listEl.appendChild(li);
        });
    }

    updateNotifications() {
        const gs = this.gameScene;
        if (!gs || !gs.notifications || gs.notifications.length === 0) return;

        const container = document.getElementById('hud-notifications');
        if (!container) return;

        // Show latest notification
        const latest = gs.notifications[gs.notifications.length - 1];
        if (latest && latest.life > 0.5) {
            container.style.display = 'block';
            container.textContent = latest.text;
            container.style.color = latest.color;
            container.style.opacity = latest.life;
            container.style.fontSize = '32px';
        } else {
            container.style.display = 'none';
        }
    }

    shutdown() {
        // Cleanup DOM elements
        this.scorePanel?.remove();
        this.leaderboardPanel?.remove();
        this.invulnIndicator?.remove();
        this.notificationContainer?.remove();
        this.mainTimer?.remove();
    }
}
