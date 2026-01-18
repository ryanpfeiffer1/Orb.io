/**
 * Orb Battle.io - Post Game Scene
 * Shows game results with winner/loser status and full leaderboard
 */

export class PostGameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PostGameScene' });
    }

    init(data) {
        this.finalScore = data.finalScore || 0;
        this.orbsCollected = data.orbsCollected || 0;
        this.playersAbsorbed = data.playersAbsorbed || 0;
        this.rank = data.rank || 1;
        this.totalPlayers = data.totalPlayers || 1;
        this.rankings = data.rankings || [];
        this.duration = data.duration || '0:00';
        this.riftsUsed = data.riftsUsed || 0;
        this.dimensionOrbs = data.dimensionOrbs || 0;
        this.playerName = data.playerName || 'Player';
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a1d2e);

        // Create post game UI
        this.createPostGameUI();
    }

    createPostGameUI() {
        const container = document.getElementById('game-container');
        const isWinner = this.rank === 1;

        this.postGameContainer = document.createElement('div');
        this.postGameContainer.className = 'postgame-container';

        // Winner/Loser header
        const resultHeader = document.createElement('div');
        resultHeader.className = `result-header ${isWinner ? 'winner' : 'loser'}`;
        resultHeader.innerHTML = `
            <div class="result-icon">${isWinner ? '🏆' : '💀'}</div>
            <h1 class="result-title">${isWinner ? 'YOU WIN!' : 'YOU LOSE!'}</h1>
            <p class="result-subtitle">${isWinner ? 'Champion of the Arena!' : `Finished #${this.rank} of ${this.totalPlayers}`}</p>
        `;
        this.postGameContainer.appendChild(resultHeader);

        // Leaderboard
        const leaderboard = document.createElement('div');
        leaderboard.className = 'leaderboard';
        leaderboard.innerHTML = '<h3 class="leaderboard-title">Final Standings</h3>';

        const leaderboardList = document.createElement('ul');
        leaderboardList.className = 'leaderboard-list';

        // Show top 10 or all if less
        const displayRankings = this.rankings.slice(0, 10);
        displayRankings.forEach((player, index) => {
            const li = document.createElement('li');
            li.className = `leaderboard-item ${player.isLocal ? 'is-local' : ''} ${index === 0 ? 'first-place' : ''}`;

            const rankBadge = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${player.rank}`;
            const botTag = player.isBot ? ' <span class="bot-tag">BOT</span>' : '';

            li.innerHTML = `
                <span class="rank-badge">${rankBadge}</span>
                <span class="player-name">${player.name}${botTag}</span>
                <span class="player-score">${player.score.toLocaleString()}</span>
            `;
            leaderboardList.appendChild(li);
        });

        leaderboard.appendChild(leaderboardList);
        this.postGameContainer.appendChild(leaderboard);

        // Stats summary
        const statsContainer = document.createElement('div');
        statsContainer.className = 'stats-container compact';
        statsContainer.innerHTML = `
            <div class="stat-row">
                <span class="stat-label">Your Score</span>
                <span class="stat-value">${this.finalScore.toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Orbs Collected</span>
                <span class="stat-value">${this.orbsCollected}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Players Absorbed</span>
                <span class="stat-value">${this.playersAbsorbed}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Game Duration</span>
                <span class="stat-value">${this.duration}</span>
            </div>
        `;
        this.postGameContainer.appendChild(statsContainer);

        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const playAgainBtn = document.createElement('button');
        playAgainBtn.className = 'btn btn-primary';
        playAgainBtn.textContent = 'Play Again';
        playAgainBtn.onclick = () => this.playAgain();
        buttonContainer.appendChild(playAgainBtn);

        const exitBtn = document.createElement('button');
        exitBtn.className = 'btn btn-secondary';
        exitBtn.textContent = 'Exit to Lobby';
        exitBtn.onclick = () => this.exitToLobby();
        buttonContainer.appendChild(exitBtn);

        this.postGameContainer.appendChild(buttonContainer);
        container.appendChild(this.postGameContainer);
    }

    playAgain() {
        this.cleanupDOM();
        this.scene.start('GameScene', {
            mode: 'solo',
            playerName: this.playerName
        });
    }

    exitToLobby() {
        this.cleanupDOM();
        this.scene.start('MenuScene');
    }

    cleanupDOM() {
        this.postGameContainer?.remove();
    }

    shutdown() {
        this.cleanupDOM();
    }
}
