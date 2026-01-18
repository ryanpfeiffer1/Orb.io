/**
 * Orb Battle.io - Multiplayer WebSocket Server
 * 
 * Features:
 * - Room creation and management
 * - Real-time player synchronization
 * - Server-authoritative collision detection
 * - Bot AI for empty player slots
 * - Rate limiting and input validation
 * - Dimensional Rifts and Multi-World Logic
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    maxPlayersPerRoom: 10,
    minPlayersToStart: 1,
    gameDuration: 5 * 60 * 1000, // 5 minutes
    worldWidth: 2000,
    worldHeight: 2000,
    initialOrbCount: 100,
    botCount: 8,
    tickRate: 20, // Server updates per second
    orbValue: 10,
    absorptionBaseValue: 50,
    // Mass Decay (Synced with client)
    DECAY: {
        baseRate: 0.02,
        sizeMultiplier: 2.5,
        minSize: 15
    },
    // Dimension Configs (Synced with client)
    DIMENSIONS: {
        FEAST: { worldSize: 1000, bots: 4 },
        ANTI_GRAVITY: { worldSize: 1500, bots: 2 },
        MIRROR_MAZE: { worldSize: 800, bots: 2 },
        SPEED: { worldSize: 1200, bots: 3 }
    }
};

// ========================================
// GAME STATE
// ========================================
const rooms = new Map();
const playerRooms = new Map(); // Maps socket.id to roomId

// ========================================
// UTILITY FUNCTIONS
// ========================================
function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function getRandomColor() {
    const colors = ['#6c8eef', '#86efac', '#fdba74', '#a78bfa', '#f472b6', '#67e8f9', '#fca5a5'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomOrbColor() {
    const colors = ['#86efac', '#fdba74', '#67e8f9', '#fca5a5', '#d8b4fe'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function createPlayer(id, name, color = null) {
    return {
        id,
        name: name.substring(0, 12),
        x: Math.random() * CONFIG.worldWidth,
        y: Math.random() * CONFIG.worldHeight,
        size: 20,
        color: color || getRandomColor(),
        score: 0,
        alive: true,
        respawnTime: null,
        dimension: null, // null = main world, or 'FEAST', 'SPEED', etc.
        dimensionTimer: 0,
        invulnTime: 0
    };
}

function createBot(index, dimension = null) {
    const config = dimension ? CONFIG.DIMENSIONS[dimension] : { worldSize: CONFIG.worldWidth };
    const worldSize = config.worldSize || CONFIG.worldWidth;

    const botNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
    return {
        id: 'bot_' + (dimension || 'main') + '_' + index + '_' + Date.now(),
        name: (dimension ? `[${dimension.charAt(0)}] ` : '') + (botNames[index] || 'Bot'),
        x: Math.random() * worldSize,
        y: Math.random() * worldSize,
        targetX: Math.random() * worldSize,
        targetY: Math.random() * worldSize,
        size: 15 + Math.random() * 20,
        color: getRandomColor(),
        score: 0,
        alive: true,
        isBot: true,
        changeTargetTime: Date.now() + Math.random() * 3000,
        respawnTime: null,
        dimension: dimension
    };
}

function createOrb(index, dimension = null) {
    const config = dimension ? CONFIG.DIMENSIONS[dimension] : { worldSize: CONFIG.worldWidth };
    const worldSize = config.worldSize || CONFIG.worldWidth;

    return {
        id: 'orb_' + (index !== undefined ? index : Date.now()) + '_' + Math.random().toString(36).substr(2, 5),
        x: Math.random() * worldSize,
        y: Math.random() * worldSize,
        size: 8 + Math.random() * 6,
        color: getRandomOrbColor(),
        dimension: dimension
    };
}

function createRifts() {
    // Hardcoded positions matching client
    const positions = [
        { x: CONFIG.worldWidth * 0.2, y: CONFIG.worldHeight * 0.2, type: 'FEAST' },
        { x: CONFIG.worldWidth * 0.8, y: CONFIG.worldHeight * 0.2, type: 'ANTI_GRAVITY' },
        { x: CONFIG.worldWidth * 0.2, y: CONFIG.worldHeight * 0.8, type: 'MIRROR_MAZE' },
        { x: CONFIG.worldWidth * 0.8, y: CONFIG.worldHeight * 0.8, type: 'SPEED' }
    ];

    return positions.map((pos, i) => ({
        id: 'rift_' + i,
        x: pos.x,
        y: pos.y,
        type: pos.type,
        radius: 35
    }));
}

function createRoom(hostId, hostName) {
    const roomId = generateRoomId();
    const hostPlayer = createPlayer(hostId, hostName);

    const room = {
        id: roomId,
        hostId: hostId,
        players: [hostPlayer],
        bots: [],
        orbs: [],
        rifts: createRifts(), // Server-side rifts
        state: 'waiting', // waiting, playing, ended
        startTime: null,
        gameInterval: null,
        lastOrbSync: 0
        // Note: For simplicity, we are NOT simulating 'dimension bots' separate from main bots yet.
        // Players entering dimensions will find it empty of bots unless we add checks to spawn bots there.
        // For now, let's focus on players being able to enter/exit and see each other.
    };

    rooms.set(roomId, room);
    playerRooms.set(hostId, roomId);

    return room;
}

function findAvailableRoom() {
    for (const [roomId, room] of rooms) {
        if (room.state === 'waiting' && room.players.length < CONFIG.maxPlayersPerRoom) {
            return room;
        }
    }
    return null;
}

// ========================================
// GAME LOGIC
// ========================================
function startGame(room) {
    room.state = 'playing';
    room.startTime = Date.now();

    // Initialize bots (Main world + Dimensions)
    room.bots = [];
    // Main world bots
    for (let i = 0; i < CONFIG.botCount; i++) {
        room.bots.push(createBot(i, null));
    }

    // Dimension bots (spawning specific counts from config)
    const dimensionTypes = ['FEAST', 'ANTI_GRAVITY', 'MIRROR_MAZE', 'SPEED'];
    dimensionTypes.forEach((type) => {
        const dimConfig = CONFIG.DIMENSIONS[type];
        const botCount = dimConfig.bots || 2;
        for (let i = 0; i < botCount; i++) {
            room.bots.push(createBot(i, type));
        }
    });

    // Initialize orbs (Main world + Dimensions)
    room.orbs = [];
    // Main world orbs
    for (let i = 0; i < CONFIG.initialOrbCount; i++) {
        room.orbs.push(createOrb(i, null));
    }

    // Dimension orbs (spawn equal amount in each dimension type for balance)
    dimensionTypes.forEach((type, typeIndex) => {
        const count = Math.floor(CONFIG.initialOrbCount * 0.3); // 30% density of main world
        for (let i = 0; i < count; i++) {
            room.orbs.push(createOrb(`dim_${type}_${i}`, type));
        }
    });

    // Reset all players
    room.players.forEach(player => {
        player.x = Math.random() * CONFIG.worldWidth;
        player.y = Math.random() * CONFIG.worldHeight;
        player.size = 20;
        player.score = 0;
        player.alive = true;
        player.dimension = null;
    });

    // Notify all players
    io.to(room.id).emit('gameStarted', {
        players: room.players,
        bots: room.bots,
        orbs: room.orbs,
        rifts: room.rifts
    });

    // Start game loop
    room.gameInterval = setInterval(() => updateGame(room), 1000 / CONFIG.tickRate);

    // Set game end timer
    setTimeout(() => endGame(room), CONFIG.gameDuration);
}

function updateGame(room) {
    if (room.state !== 'playing') return;

    const now = Date.now();

    // Send full game state every tick (20Hz)
    // This provides smooth 50ms updates for bots and players
    io.to(room.id).emit('gameState', {
        players: room.players.map(p => ({
            id: p.id, x: p.x, y: p.y, size: p.size, score: p.score, alive: p.alive, dimension: p.dimension
        })),
        bots: room.bots.map(b => ({
            id: b.id, x: b.x, y: b.y, size: b.size, alive: b.alive, dimension: b.dimension
        })),
    });

    // Periodic Orb Sync (every 2 seconds) to fix "ghost orbs"
    // Forces client to reconcile with server authoritative list
    if (!room.lastOrbSync || now - room.lastOrbSync > 2000) {
        room.lastOrbSync = now;
        io.to(room.id).emit('orbSync', {
            orbs: room.orbs
        });
    }

    // Dimension Exit Check (Keep in loop for timer)
    room.players.forEach(player => {
        if (!player.alive || player.dimension === null) return;

        player.dimensionTimer -= (1000 / CONFIG.tickRate);
        if (player.dimensionTimer <= 0) {
            const exitedDimension = player.dimension;
            player.dimension = null;
            player.invulnTime = 0; // Clear invulnerability on exit - no lingering immunity
            // Teleport back to random spot
            player.x = Math.random() * CONFIG.worldWidth;
            player.y = Math.random() * CONFIG.worldHeight;

            // Emit dimension exited event
            io.to(room.id).emit('dimensionExited', {
                playerId: player.id,
                dimensionType: exitedDimension,
                x: player.x,
                y: player.y
            });
        }
    });

    // Update bots
    room.bots.forEach(bot => {
        if (!bot.alive) {
            if (bot.respawnTime && now > bot.respawnTime) {
                const config = bot.dimension ? CONFIG.DIMENSIONS[bot.dimension] : { worldSize: CONFIG.worldWidth };
                const worldSize = config.worldSize || CONFIG.worldWidth;

                bot.alive = true;
                bot.x = Math.random() * worldSize;
                bot.y = Math.random() * worldSize;
                bot.size = 15 + Math.random() * 10;
                bot.respawnTime = null;
                // Keep the same dimension for bots to maintain balance
            }
            return;
        }

        // Change target periodically
        if (now > bot.changeTargetTime) {
            if (Math.random() < 0.7) {
                // Target nearest orb IN SAME DIMENSION
                let nearestOrb = null;
                let nearestDist = Infinity;

                room.orbs.forEach(orb => {
                    if (orb.dimension !== bot.dimension) return; // Skip orbs in other dimensions

                    const dx = orb.x - bot.x;
                    const dy = orb.y - bot.y;
                    const dist = dx * dx + dy * dy;
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestOrb = orb;
                    }
                });

                if (nearestOrb) {
                    bot.targetX = nearestOrb.x;
                    bot.targetY = nearestOrb.y;
                }
            } else {
                const config = bot.dimension ? CONFIG.DIMENSIONS[bot.dimension] : { worldSize: CONFIG.worldWidth };
                const worldSize = config.worldSize || CONFIG.worldWidth;
                bot.targetX = Math.random() * worldSize;
                bot.targetY = Math.random() * worldSize;
            }
            bot.changeTargetTime = now + 1000 + Math.random() * 2000;
        }

        // Move towards target
        const speed = Math.max(1.5, 6 - bot.size * 0.04);
        const dx = bot.targetX - bot.x;
        const dy = bot.targetY - bot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            bot.x += (dx / dist) * speed;
            bot.y += (dy / dist) * speed;

            // Modern clamping per dimension
            const config = bot.dimension ? CONFIG.DIMENSIONS[bot.dimension] : { worldSize: CONFIG.worldWidth };
            const worldSize = config.worldSize || CONFIG.worldWidth;
            bot.x = Math.max(bot.size, Math.min(worldSize - bot.size, bot.x));
            bot.y = Math.max(bot.size, Math.min(worldSize - bot.size, bot.y));
        }
    });

    // Check collisions
    // Check collisions (Bots and PvP)
    // Note: Player-vs-Orb is now handled immediately in playerMove for better responsiveness

    // 1. Bot orb collection
    room.bots.forEach(bot => {
        if (!bot.alive) return;
        checkPlayerOrbCollisions(room, bot);
    });

    const allEntities = [
        ...room.players.filter(p => p.alive),
        ...room.bots.filter(b => b.alive)
    ];

    // 2. Entity vs entity collisions (PvP and Bot-vs-Player)
    for (let i = 0; i < allEntities.length; i++) {
        for (let j = i + 1; j < allEntities.length; j++) {
            const a = allEntities[i];
            const b = allEntities[j];

            // Must be in same dimension
            if (a.dimension !== b.dimension) continue;

            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Generous overlap check
            if (dist < Math.max(a.size, b.size) * 0.7) {
                // One-way invulnerability: only protect the entity that would be absorbed
                // This matches solo mode where invulnerable players can still kill others
                if (a.size > b.size * 1.1) {
                    // a absorbs b - only check if b is invulnerable
                    if (b.invulnTime && b.invulnTime > now) continue;
                    absorbEntity(room, a, b);
                } else if (b.size > a.size * 1.1) {
                    // b absorbs a - only check if a is invulnerable  
                    if (a.invulnTime && a.invulnTime > now) continue;
                    absorbEntity(room, b, a);
                }
            }
        }
    }

    // Respawn players
    room.players.forEach(player => {
        if (!player.alive && player.respawnTime && now > player.respawnTime) {
            player.alive = true;
            player.x = Math.random() * CONFIG.worldWidth;
            player.y = Math.random() * CONFIG.worldHeight;
            player.size = 20;
            player.respawnTime = null;
            player.dimension = null; // Respawn in main world

            io.to(room.id).emit('playerRespawned', {
                playerId: player.id,
                x: player.x,
                y: player.y,
                size: player.size
            });
        }
    });

    // Mass Decay (Exact replication of offline mode)
    // Client runs at ~60fps. Server runs at 20fps (tickRate=20).
    // so we multiply decay by 3 to match the speed per second.
    const tickMultiplier = 3;

    room.players.forEach(p => {
        if (p.alive && p.size > CONFIG.DECAY.minSize) {
            // Formula: base * (1 + (ratio-1) * multiplier)
            const sizeRatio = p.size / CONFIG.DECAY.minSize;
            const decayRate = CONFIG.DECAY.baseRate * (1 + (sizeRatio - 1) * CONFIG.DECAY.sizeMultiplier);

            p.size -= decayRate * tickMultiplier;

            if (p.size < CONFIG.DECAY.minSize) p.size = CONFIG.DECAY.minSize;
        }
    });

    // Clean up "ghost" orbs occasionally (simple check if we want, but logic above should be robust now)
}

function checkPlayerOrbCollisions(room, entity) {
    const now = Date.now();
    for (let i = room.orbs.length - 1; i >= 0; i--) {
        const orb = room.orbs[i];

        // Skip if in different dimensions
        if (entity.dimension !== orb.dimension) continue;

        const dx = entity.x - orb.x;
        const dy = entity.y - orb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Use generous buffer to account for latency
        const collisionDist = entity.size + orb.size + 25;

        if (dist < collisionDist) {
            // Collect orb
            entity.size += 1.5;
            entity.score += CONFIG.orbValue;

            const newOrb = createOrb(undefined, orb.dimension); // Respawn in same dimension
            room.orbs.splice(i, 1);
            room.orbs.push(newOrb);

            io.to(room.id).emit('orbCollected', {
                orbId: orb.id,
                newOrb: newOrb,
                playerId: entity.id,
                newSize: entity.size,
                newScore: entity.score
            });
            return true; // Only one orb per movement if they are overlapping
        }
    }
    return false;
}

function absorbEntity(room, absorber, absorbed) {
    absorbed.alive = false;
    absorbed.respawnTime = Date.now() + 3000;

    const sizeRatio = absorbed.size / absorber.size;
    absorber.size += absorbed.size * 0.3;
    absorber.score += Math.floor(CONFIG.absorptionBaseValue * sizeRatio);

    io.to(room.id).emit('playerAbsorbed', {
        absorberId: absorber.id,
        absorbedId: absorbed.id,
        newSize: absorber.size,
        newScore: absorber.score
    });
}

function endGame(room) {
    if (room.state !== 'playing') return;

    room.state = 'ended';

    if (room.gameInterval) {
        clearInterval(room.gameInterval);
        room.gameInterval = null;
    }

    // Calculate final rankings
    const allEntities = [...room.players, ...room.bots];
    allEntities.sort((a, b) => b.score - a.score);

    const rankings = allEntities.map((entity, index) => ({
        id: entity.id,
        name: entity.name,
        score: entity.score,
        rank: index + 1
    }));

    io.to(room.id).emit('gameEnded', {
        rankings,
        duration: Date.now() - room.startTime
    });

    // Reset room to waiting state for new game
    room.state = 'waiting';
    room.bots = [];
    room.orbs = [];
}

// ========================================
// SOCKET HANDLERS
// ========================================
io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    // Rate limiting
    let lastMoveTime = 0;
    const moveThrottle = 20; // Minimum ms between moves (Wait 20ms = 50 updates/sec maximum)

    // Create room
    socket.on('createRoom', (data) => {
        if (!data.playerName || typeof data.playerName !== 'string') {
            socket.emit('error', { message: 'Invalid player name' });
            return;
        }

        const room = createRoom(socket.id, data.playerName);
        socket.join(room.id);

        socket.emit('roomCreated', {
            roomId: room.id,
            players: room.players,
            isHost: true
        });

        console.log(`Room ${room.id} created by ${data.playerName}`);
    });

    // Quick match - join available room or create new one
    socket.on('quickMatch', (data) => {
        if (!data.playerName || typeof data.playerName !== 'string') {
            socket.emit('error', { message: 'Invalid player name' });
            return;
        }

        let room = findAvailableRoom();

        if (room) {
            // Join existing room
            const player = createPlayer(socket.id, data.playerName);
            room.players.push(player);
            playerRooms.set(socket.id, room.id);
            socket.join(room.id);

            socket.emit('roomJoined', {
                roomId: room.id,
                players: room.players,
                isHost: false
            });

            socket.to(room.id).emit('playerJoined', {
                players: room.players
            });
        } else {
            // Create new room
            room = createRoom(socket.id, data.playerName);
            socket.join(room.id);

            socket.emit('roomCreated', {
                roomId: room.id,
                players: room.players,
                isHost: true
            });
        }
    });

    // Join specific room
    socket.on('joinRoom', (data) => {
        if (!data.playerName || typeof data.playerName !== 'string') {
            socket.emit('error', { message: 'Invalid player name' });
            return;
        }

        if (!data.roomId || typeof data.roomId !== 'string') {
            socket.emit('error', { message: 'Invalid room code' });
            return;
        }

        const roomId = data.roomId.toUpperCase();
        const room = rooms.get(roomId);

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        if (room.state !== 'waiting') {
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }

        if (room.players.length >= CONFIG.maxPlayersPerRoom) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        const player = createPlayer(socket.id, data.playerName);
        room.players.push(player);
        playerRooms.set(socket.id, roomId);
        socket.join(roomId);

        socket.emit('roomJoined', {
            roomId: roomId,
            players: room.players,
            isHost: false
        });

        socket.to(roomId).emit('playerJoined', {
            players: room.players
        });

        console.log(`${data.playerName} joined room ${roomId}`);
    });

    // Leave room
    socket.on('leaveRoom', () => {
        handlePlayerLeave(socket);
    });

    // Start game
    socket.on('startGame', (data) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room) return;

        if (room.hostId !== socket.id) {
            socket.emit('error', { message: 'Only host can start the game' });
            return;
        }

        if (room.players.length < CONFIG.minPlayersToStart) {
            socket.emit('error', { message: `Need at least ${CONFIG.minPlayersToStart} player(s) to start` });
            return;
        }

        startGame(room);
    });

    // Player movement
    socket.on('playerMove', (data) => {
        const now = Date.now();
        if (now - lastMoveTime < moveThrottle) return;
        lastMoveTime = now;

        if (typeof data.x !== 'number' || typeof data.y !== 'number') return;

        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room || room.state !== 'playing') return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || !player.alive) return;

        // Validate and update position per dimension bounds
        const config = player.dimension ? CONFIG.DIMENSIONS[player.dimension] : { worldSize: CONFIG.worldWidth };
        const worldSize = config.worldSize || CONFIG.worldWidth;

        const x = Math.max(player.size, Math.min(worldSize - player.size, data.x));
        const y = Math.max(player.size, Math.min(worldSize - player.size, data.y));

        player.x = x;
        player.y = y;

        // Immediate sub-tick collision check for perfect responsiveness
        checkPlayerOrbCollisions(room, player);

        // Immediate rift entry check (only in main world)
        if (player.dimension === null) {
            const now = Date.now();
            for (const rift of room.rifts) {
                const dx = player.x - rift.x;
                const dy = player.y - rift.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Entry logic (relaxed distance check +10px buffer)
                if (dist < rift.radius + player.size * 0.5 + 10) {
                    const dimConfig = CONFIG.DIMENSIONS[rift.type];
                    const worldSize = dimConfig.worldSize || 1000;

                    player.dimension = rift.type;
                    player.dimensionTimer = 15000; // 15s duration
                    player.invulnTime = now + 1500;

                    // Teleport to center of dimension world
                    player.x = worldSize / 2;
                    player.y = worldSize / 2;

                    // Emit dimension entered event
                    io.to(room.id).emit('dimensionEntered', {
                        playerId: player.id,
                        dimensionType: rift.type,
                        x: player.x,
                        y: player.y,
                        duration: 15000
                    });
                    break; // Entered dimension, stop checking other rifts
                }
            }
        }

        // Broadcast via gameState loop
    });

    // Request new game (after game ends)
    socket.on('requestNewGame', () => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId) return;

        const room = rooms.get(roomId);
        if (!room || room.state !== 'waiting') return;

        if (room.hostId === socket.id) {
            startGame(room);
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        handlePlayerLeave(socket);
    });
});

function handlePlayerLeave(socket) {
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    // Remove player from room
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
    }

    playerRooms.delete(socket.id);
    socket.leave(roomId);

    // If room is empty, delete it
    if (room.players.length === 0) {
        if (room.gameInterval) {
            clearInterval(room.gameInterval);
        }
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
        return;
    }

    // If host left, assign new host
    if (room.hostId === socket.id) {
        room.hostId = room.players[0].id;
    }

    // Notify remaining players
    io.to(roomId).emit('playerLeft', {
        playerId: socket.id,
        players: room.players,
        newHostId: room.hostId
    });
}

// ========================================
// EXPRESS ROUTES
// ========================================
app.use(cors());

// Serve static files from current directory
app.use(express.static('.'));

app.get('/api/status', (req, res) => {
    res.json({
        name: 'Orb Battle.io Server',
        version: '1.0.0',
        status: 'running',
        rooms: rooms.size,
        players: playerRooms.size
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

// ========================================
// START SERVER
// ========================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎮 Orb Battle.io Server running on port ${PORT}`);
    console.log(`   WebSocket ready for connections`);
});
