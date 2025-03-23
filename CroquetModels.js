import { Model } from "@croquet/croquet";

// Game world model to manage game state
export class GameModel extends Model {
    init() {
        this.players = {}; // Map of playerID -> player data
        this.goal = { x: 290, y: 70 }; // Location of the goal
        this.gameOver = false;
        this.winner = null;
        
        this.subscribe(this.sessionId, "view-join", this.onViewJoin);
        this.subscribe(this.sessionId, "view-exit", this.onViewExit);
        this.subscribe(this.id, "player-moved", this.onPlayerMoved);
        this.subscribe(this.id, "goal-reached", this.onGoalReached);
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
            playerNumber: playerCount + 1
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
            
            // Reset the game after 3 seconds
            this.future(3000).resetGame();
        }
    }
    
    resetGame() {
        // Reset game state but keep players' scores
        this.gameOver = false;
        this.winner = null;
        
        // Reset all players to starting positions
        Object.keys(this.players).forEach(playerId => {
            this.players[playerId].x = 100;
            this.players[playerId].y = 500;
            this.players[playerId].velocity = { x: 0, y: 0 };
            this.players[playerId].state = "idle";
        });
        
        this.publish(this.id, "game-reset", { players: this.players });
    }
    
    static types() {
        return {
            "GameModel": GameModel
        };
    }
}

// Register the models
GameModel.register("GameModel"); 