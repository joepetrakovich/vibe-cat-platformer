import { Model } from "@croquet/croquet";

// Game world model to manage game state
export class GameModel extends Model {
    init() {
        this.players = {}; // Map of playerID -> player data
        this.goal = { x: 290, y: 70 }; // Location of the goal
        this.gameOver = false;
        this.winner = null;
        
        // Add moving platform state
        this.movingPlatforms = [];
        this.lastPlatformUpdate = this.now();
        
        this.subscribe(this.sessionId, "view-join", this.onViewJoin);
        this.subscribe(this.sessionId, "view-exit", this.onViewExit);
        this.subscribe(this.id, "player-moved", this.onPlayerMoved);
        this.subscribe(this.id, "goal-reached", this.onGoalReached);
        this.subscribe(this.id, "set-username", this.onSetUsername);
        this.subscribe(this.id, "set-cat-type", this.onSetCatType);
        
        // Initialize moving platforms
        this.resetMovingPlatforms();
        
        // Start platform movement updates
        this.future(50).updatePlatforms();
    }
    
    onViewJoin(viewId) {
        // Create a new player for this view
        const playerCount = Object.keys(this.players).length;
        const playerX = 100; // Starting X position
        const playerY = 500; // Starting Y position
        
        this.players[viewId] = {
            id: viewId,
            x: playerX,
            y: playerY,
            velocity: { x: 0, y: 0 },
            state: "idle",
            flipX: false,
            score: 0,
            playerNumber: playerCount + 1,
            username: null,
            catType: 1 // Default cat type is 1 (cat01)
        };
        
        this.publish(this.id, "player-joined", { playerId: viewId, players: this.players });
    }
    
    onViewExit(viewId) {
        if (this.players[viewId]) {
            delete this.players[viewId];
            this.publish(this.id, "player-left", { playerId: viewId, players: this.players });
        }
    }
    
    onPlayerMoved(data) {
        const { playerId, x, y, velocity, state, flipX } = data;
        if (this.players[playerId]) {
            this.players[playerId].x = x;
            this.players[playerId].y = y;
            this.players[playerId].velocity = velocity;
            this.players[playerId].state = state;
            this.players[playerId].flipX = flipX;
            
            this.publish(this.id, "player-updated", { playerId, players: this.players });
        }
    }
    
    onSetUsername(data) {
        const { playerId, username } = data;
        if (this.players[playerId]) {
            this.players[playerId].username = username;
            this.publish(this.id, "player-updated", { playerId, players: this.players });
        }
    }
    
    onSetCatType(data) {
        const { playerId, catType } = data;
        if (this.players[playerId]) {
            this.players[playerId].catType = catType;
            this.publish(this.id, "player-updated", { playerId, players: this.players });
        }
    }
    
    onGoalReached(data) {
        if (this.gameOver) return;
        
        const { playerId } = data;
        if (this.players[playerId]) {
            this.gameOver = true;
            this.winner = playerId;
            
            // Increment the winner's score
            this.players[playerId].score++;
            
            this.publish(this.id, "game-over", { 
                winnerId: playerId,
                winnerNumber: this.players[playerId].playerNumber 
            });
            
            // Reset the game after 1.5 seconds (shortened from 3 seconds)
            this.future(1500).resetGame();
        }
    }
    
    // Add platform management methods
    updatePlatforms() {
        const now = this.now();
        const dt = now - this.lastPlatformUpdate;
        
        // Update each platform's position
        this.movingPlatforms.forEach(platform => {
            // Move platform back and forth
            const oldX = platform.x;
            platform.x += platform.speed * dt;
            
            // Check bounds and reverse direction
            if (platform.x >= platform.startX + platform.distance) {
                platform.x = platform.startX + platform.distance;
                platform.speed = -Math.abs(platform.speed);
            } else if (platform.x <= platform.startX - platform.distance) {
                platform.x = platform.startX - platform.distance;
                platform.speed = Math.abs(platform.speed);
            }
            
            // Add interpolation data
            platform.targetX = platform.x;
            platform.lastUpdate = now;
        });
        
        this.lastPlatformUpdate = now;
        
        // Publish updated positions to all views
        if (this.movingPlatforms.length > 0) {
            this.publish(this.id, "platforms-updated", { platforms: this.movingPlatforms });
        }
        
        // Schedule next update (every 50ms instead of 16ms)
        this.future(50).updatePlatforms();
    }

    resetMovingPlatforms() {
        // Define platform positions (same as in World.js)
        const platformPositions = [
            { x: 300, y: 500 },
            { x: 100, y: 450 },
            { x: 325, y: 400 },
            { x: 75, y: 350 },
            { x: 50, y: 300 },
            { x: 280, y: 300 },
            { x: 380, y: 250 },
            { x: 50, y: 200 },
            { x: 380, y: 200 },
            { x: 75, y: 150 },
            { x: 280, y: 100 },
            { x: 30, y: 80 }
        ];

        // Randomly select two platforms to move
        const selectedIndices = [];
        while (selectedIndices.length < 2) {
            const index = Math.floor(Math.random() * platformPositions.length);
            if (!selectedIndices.includes(index)) {
                selectedIndices.push(index);
            }
        }

        // Clear previous moving platforms
        this.movingPlatforms = [];

        // Set up new moving platforms
        selectedIndices.forEach(index => {
            const platform = platformPositions[index];
            this.movingPlatforms.push({
                index: index,
                startX: platform.x,
                x: platform.x,
                y: platform.y,
                speed: 0.05, // Reduced from 0.3 to 0.05 units per millisecond
                distance: 100 // Maximum distance to move in each direction
            });
        });

        // Publish initial platform state
        this.publish(this.id, "platforms-updated", { platforms: this.movingPlatforms });
    }

    resetGame() {
        this.gameOver = false;
        this.winner = null;
        
        // Reset all players to starting positions
        Object.keys(this.players).forEach(playerId => {
            this.players[playerId].x = 100;
            this.players[playerId].y = 500;
            this.players[playerId].velocity = { x: 0, y: 0 };
            this.players[playerId].state = "idle";
        });
        
        // Reset and randomize moving platforms
        this.resetMovingPlatforms();
        
        this.publish(this.id, "game-reset", { players: this.players });
    }
}

// Register the models
GameModel.register("GameModel"); 