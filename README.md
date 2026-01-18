# Orb Battle.io

A real-time multiplayer HTML5 game built with WebSockets. Collect orbs, grow bigger, and compete against other players in a fast-paced arena.

![Game Preview](https://via.placeholder.com/800x400?text=Orb+Battle.io)

## Features

### Gameplay
- **Collect Orbs**: Gather orbs to increase your size and score (+10 points each)
- **Absorb Players**: Consume smaller players to grow faster (+50 points × size ratio)
- **Real-time Multiplayer**: Compete with up to 10 players per room
- **Bot AI**: 8 intelligent bots fill empty spaces for action-packed gameplay
- **5-Minute Matches**: Quick games with clear winners

### Healthy Engagement Design
This game is designed with player wellbeing in mind:
- **Fixed-Ratio Rewards**: Predictable scoring (orb = +10, always)
- **Session Reminders**: Friendly break suggestions at 15 and 30 minutes
- **Transparent Progress**: Clear milestones and progress indicators
- **No Punishment for Stopping**: Take breaks anytime without penalty

### Technical Features
- Single HTML file (embeddable anywhere)
- WebSocket multiplayer with Socket.IO
- Solo mode fallback (works without server)
- 60 FPS smooth canvas rendering
- Mobile-responsive with touch support

---

## Quick Start

### Play Solo (No Server Needed)
1. Open `client.html` in any modern browser
2. Click "Play Solo (Bots Only)"
3. Have fun!

### Play Multiplayer

#### Step 1: Deploy the Server

**Option A: Deploy to Render.com (Free)**
1. Create account at [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repo or upload files directly
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Copy your URL (e.g., `https://orb-battle-xyz.onrender.com`)

**Option B: Deploy to Railway.app (Free)**
1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repo with server files
4. Railway auto-detects Node.js and deploys
5. Copy your URL from the deployment

**Option C: Deploy to Glitch.com (Free)**
1. Go to [glitch.com](https://glitch.com)
2. Click "New Project" → "Import from GitHub"
3. Paste your repo URL
4. Copy your URL (e.g., `https://orb-battle.glitch.me`)

**Option D: Run Locally**
```bash
cd /path/to/orb-battle-io
npm install
npm start
# Server runs at http://localhost:3000
```

#### Step 2: Configure the Client

1. Open `client.html` in a text editor
2. Find line ~50: `const SERVER_URL = 'REPLACE_WITH_YOUR_SERVER_URL';`
3. Replace with your server URL:
   ```javascript
   const SERVER_URL = 'https://your-server.onrender.com';
   ```
4. Save the file

#### Step 3: Embed in Google Sites

1. Open your Google Site
2. Click **Insert** → **Embed**
3. Select **Embed code** tab
4. Paste the entire contents of `client.html`
5. Click **Next** → **Insert**
6. Resize the embed as needed

---

## Files

| File | Description |
|------|-------------|
| `client.html` | Complete game (HTML + CSS + JavaScript) |
| `server.js` | WebSocket multiplayer server |
| `package.json` | Server dependencies |
| `README.md` | This documentation |

---

## How to Play

### Controls
- **Mouse/Touch**: Move your orb towards the cursor
- **Goal**: Collect orbs and absorb smaller players

### Scoring
| Action | Points |
|--------|--------|
| Collect Orb | +10 |
| Absorb Player | +50 × (their size / your size) |
| Survival | +1 per 10 seconds |
| Size Milestone | +25 bonus every 10 size units |

### Rules
- You can only absorb players/bots 10% smaller than you
- When absorbed, you respawn after 3 seconds
- Match lasts 5 minutes
- Highest score wins!

---

## Troubleshooting

### "Could not connect to server"
- Check that your server URL is correct
- Ensure the server is running (visit URL in browser)
- Try the "Play Solo" mode as a fallback

### Game runs slow
- Close other browser tabs
- Reduce browser window size
- Check your internet connection (for multiplayer)

### Room code not working
- Room codes are 6 characters, all uppercase
- Rooms expire when all players leave
- Game may have already started

### Server won't start
```bash
# Check Node.js version (need 16+)
node --version

# Reinstall dependencies
rm -rf node_modules
npm install

# Check for port conflicts
lsof -i :3000
```

---

## Server API

### Health Check
```
GET /
GET /health
```

### WebSocket Events

**Client → Server:**
- `createRoom` - Create a new game room
- `joinRoom` - Join existing room by code
- `quickMatch` - Join any available room
- `startGame` - Host starts the game
- `playerMove` - Send position update
- `leaveRoom` - Leave current room

**Server → Client:**
- `roomCreated` - Room successfully created
- `roomJoined` - Successfully joined room
- `playerJoined` - New player joined
- `playerLeft` - Player left room
- `gameStarted` - Game has begun
- `playerMoved` - Another player moved
- `orbCollected` - Orb was collected
- `playerAbsorbed` - Player was absorbed
- `gameEnded` - Game finished with rankings

---

## Configuration

Edit these values in `server.js`:

```javascript
const CONFIG = {
    maxPlayersPerRoom: 10,     // Max players per room
    minPlayersToStart: 1,      // Min players to start game
    gameDuration: 5 * 60000,   // Game length (5 min)
    worldWidth: 2000,          // Arena width
    worldHeight: 2000,         // Arena height
    initialOrbCount: 100,      // Starting orbs
    botCount: 8,               // AI bots
    tickRate: 20,              // Server updates/sec
    orbValue: 10,              // Points per orb
    absorptionBaseValue: 50    // Base absorption points
};
```

---

## License

MIT License - Feel free to modify and share!

---

## Credits

Built with ❤️ using:
- [Socket.IO](https://socket.io/) - Real-time WebSocket library
- [Express](https://expressjs.com/) - Web server framework
- [Inter Font](https://rsms.me/inter/) - Beautiful typography
