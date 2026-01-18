# Orb Battle.io

A premium, fast-paced HTML5 action game built with **Phaser 3**. Collect orbs, grow your mass, and outmaneuver opponents in a dynamic arena filled with dimensional rifts and environmental hazards.

![Orb Battle.io Preview](https://via.placeholder.com/800x400?text=Orb+Battle.io+Gameplay)

## 🌌 Overview

Orb Battle.io takes the classic "grow-to-win" mechanic and elevates it with advanced AI, multiple dimensions, and deep visual progression. Whether playing solo against learning bots or competing in a future multiplayer setup, the gameplay is designed to be smooth, rewarding, and visually stunning.

## ✨ Key Features

### 🎮 Gameplay Mechanics
- **Dimensional Rifts**: Discover 4 unique dimensions (Feast, Anti-Gravity, Mirror Maze, Speed Zone), each with its own physics, visuals, and scoring bonuses.
- **Advanced Bot AI**: Experience challenging gameplay against bots powered by **Q-Learning**, capable of threat detection, prey chasing, and strategic fleeing.
- **Timed Mode & Time Orbs**: Race against the clock in 3-minute matches. Collect rare Time Orbs to extend your stay and rack up massive scores.
- **Combo System**: Build multipliers by collecting orbs in quick succession.
- **Environmental Hazards**: Evade the **Predator NPC**, navigate **Danger Zones**, and dodge **Meteor Showers** to survive.
- **Gauntlet Passages**: High-risk, high-reward narrow paths accessible only to smaller orbs.

### 🎨 Visuals & UX
- **Dynamic Visual Progression**: Your orb evolves visually as it grows, adding layers, trails, and energy patterns.
- **High-Performance Rendering**: Built on Phaser 3 for 60 FPS smooth canvas rendering with antialiasing and high-DPI support.
- **Premium Aesthetics**: Sleek dark mode design using the **Inter** typeface and a curated color palette.
- **Responsive Controls**: Fluid movement using **WASD** or **Arrow keys**.

### 🛠 Technical Stack
- **Engine**: Phaser 3 (Arcade Physics).
- **Core**: Vanilla JavaScript (ES6 Modules).
- **Styling**: Vanilla CSS3.
- **Backend**: Node.js, Express, Socket.IO (for multiplayer connectivity).
- **AI**: Q-Learning implementation for bot behavior.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0.0 or higher)
- npm (comes with Node)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/orb-battle-io.git
   cd orb-battle-io
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Project
The project includes a Node.js server to handle multiplayer logic and serve the static files:

1. Start the server:
   ```bash
   npm start
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🕹 How to Play

### Controls
- **WASD / Arrow Keys**: Move your orb.
- **Goal**: Collect orbs to grow. Absorb smaller players/bots (at least 10% smaller than you).

### Dimensional Rifts
Step into rifts to enter specialized dimensions:
- **🟢 Feast**: High orb density, fast growth.
- **🟣 Anti-Gravity**: Float with low-friction physics and high orb bonuses.
- **💗 Mirror Maze**: Navigate a confined labyrinth with high-value orbs.
- **🟡 Speed Zone**: Everything moves at 2x speed. Extreme risk/reward.

### Scoring & Progression
- **Collect Orb**: +10 points (base).
- **Absorb Entity**: +50 base points + mass gain.
- **Combos**: Each orb collected within 1.5s increases your multiplier (up to 3.0x).
- **Milestones**: Reach 30, 50, 75, and 100 size for major score bonuses and visual upgrades.

---

## 📂 Project Structure

```text
Orb.io/
├── assets/             # Game images and audio
├── js/
│   ├── ai/             # Bot Q-Learning logic
│   ├── entities/       # Player, Bot, and Orb classes
│   ├── managers/       # Sound and Game management
│   ├── scenes/         # Phaser scenes (Boot, Menu, Game, UI, PostGame)
│   ├── config.js       # Central game constants
│   └── main.js         # Phaser entry point
├── server.js           # Socket.IO & Express server
├── index.html          # Main entry file
├── styles.css          # Game UI styling
└── README.md           # Documentation
```

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Credits
- Built with ❤️ using [Phaser 3](https://phaser.io/).
- Fonts by [Google Fonts (Inter)](https://fonts.google.com/specimen/Inter).
