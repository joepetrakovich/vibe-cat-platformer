import Phaser from 'phaser';
import { World } from './World.js';
import { Character } from './Character.js';
import { CharacterStateMachine } from './CharacterStateMachine.js';
import { Session, View } from "@croquet/croquet";
import { GameModel } from './CroquetModels.js';

// Configuration for Phaser
const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 700,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1200 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game',
        width: 400,
        height: 700,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        min: {
            width: 400,
            height: 700
        },
        max: {
            width: 400,
            height: 700
        }
    }
};

// Game area constants
const GAME_HEIGHT = 620;
const CONTROLS_HEIGHT = 80;

// Croquet application name and API key
const APP_NAME = "io.croquet.catplatformracer";
const API_KEY = process.env.CROQUET_API_KEY || "REPLACE_WITH_YOUR_CROQUET_API_KEY"; // Read from .env file

// Create Phaser game instance
let game;
let croquetView;

// Generate a random session name or use one from URL
function getSessionName() {
    const urlParams = new URLSearchParams(window.location.search);
    let sessionName = urlParams.get('session');
    
    // If no session name in URL, generate a random one
    if (!sessionName) {
        sessionName = Math.random().toString(36).substring(2, 15);
        // Update URL with the session name
        const url = new URL(window.location);
        url.searchParams.set('session', sessionName);
        window.history.pushState({}, '', url);
    }
    
    return sessionName;
}

// GameView class for Croquet
class GameView extends View {
    constructor(model) {
        super(model);
        this.model = model;
        
        // Store local player ID
        this.localPlayerId = this.viewId;
        
        // Set up event listeners for model updates
        this.subscribe(model.id, "player-joined", this.onPlayerJoined);
        this.subscribe(model.id, "player-left", this.onPlayerLeft);
        this.subscribe(model.id, "player-updated", this.onPlayerUpdated);
        this.subscribe(model.id, "game-over", this.onGameOver);
        this.subscribe(model.id, "game-reset", this.onGameReset);
        
        // Initialize Phaser in the next frame to ensure Croquet is ready
        setTimeout(() => {
            // Initialize Phaser after Croquet session is established
            game = new Phaser.Game(config);
        }, 0);
    }
    
    // Event handlers for Croquet model updates
    onPlayerJoined(data) {
        console.log(`Player joined: ${data.playerId}`);
        this.updatePlayersDisplay();
    }
    
    onPlayerLeft(data) {
        console.log(`Player left: ${data.playerId}`);
        if (this.gameScene && typeof this.gameScene.removePlayerSprite === 'function') {
            // Remove other player sprite if it exists
            this.gameScene.removePlayerSprite(data.playerId);
        }
        this.updatePlayersDisplay();
    }
    
    onPlayerUpdated(data) {
        // Called when any player moves
        if (this.gameScene && typeof this.gameScene.updateOtherPlayers === 'function') {
            this.gameScene.updateOtherPlayers(data.players);
        }
    }
    
    onGameOver(data) {
        if (this.gameScene && typeof this.gameScene.showGameOver === 'function') {
            const isLocalPlayerWinner = data.winnerId === this.localPlayerId;
            this.gameScene.showGameOver(data.winnerNumber, isLocalPlayerWinner);
        }
    }
    
    onGameReset(data) {
        if (this.gameScene && typeof this.gameScene.resetGame === 'function') {
            this.gameScene.resetGame(data.players);
        }
    }
    
    updatePlayersDisplay() {
        if (this.gameScene && typeof this.gameScene.updatePlayersInfo === 'function') {
            this.gameScene.updatePlayersInfo(this.model.players, this.localPlayerId);
        }
    }
    
    // Register the game scene for callbacks
    registerGameScene(scene) {
        this.gameScene = scene;
        // Only update the display after the scene has set up its methods
        setTimeout(() => {
            this.updatePlayersDisplay();
        }, 100);
    }
    
    // Update player position on the model
    updatePlayerPosition(playerId, x, y, velocity, state, flipX) {
        this.publish(this.model.id, "player-moved", {
            playerId,
            x,
            y,
            velocity,
            state,
            flipX
        });
    }
    
    // Notify model that a player reached the goal
    notifyGoalReached(playerId) {
        this.publish(this.model.id, "goal-reached", { playerId });
    }
}

// Game variables
let world;
let localCharacter;
let characterStateMachine;
let goal;
let otherPlayerSprites = {}; // Store sprites for other players
let playerInfoText;
let winText;
let isGameOver = false;

// Controls
let leftButton;
let rightButton;
let jumpButton;
let isLeftDown = false;
let isRightDown = false;
let isJumpDown = false;
let canJump = true;
let lastJumpTime = 0;
const JUMP_BUFFER = 150;

function preload() {
    // Load cat spritesheets
    this.load.spritesheet('cat-idle', 'assets/cat01_spritesheets/cat01_idle_strip8.png', { frameWidth: 40, frameHeight: 32 });
    this.load.spritesheet('cat-walk', 'assets/cat01_spritesheets/cat01_walk_strip8.png', { frameWidth: 40, frameHeight: 32 });
    this.load.spritesheet('cat-jump', 'assets/cat01_spritesheets/cat01_jump_strip4.png', { frameWidth: 40, frameHeight: 32 });
    this.load.spritesheet('food', 'assets/food3.png', { frameWidth: 32, frameHeight: 32 });
    this.load.audio('boing', 'assets/sounds/Jump2.mp3');
    this.load.audio('win', 'assets/sounds/Checkpoint.mp3');
    
    // Load night background assets
    this.load.image('night-sky', 'assets/night/night sky.png');
    this.load.image('night-buildings-back', 'assets/night/night buildings back.png');
    this.load.image('night-buildings-front', 'assets/night/night buildings front.png');
    this.load.image('night-fence', 'assets/night/night fence.png');
    this.load.image('night-bush', 'assets/night/night bush.png');
}

function create() {
    // Save a reference to the scene
    const scene = this;
    
    // Create world
    world = new World(this);
    
    // Set up the background
    setupBackground(this);
    
    // Create local player character
    localCharacter = new Character(this, 100, 500);
    world.addCharacterCollider(localCharacter);
    
    // Create state machine for the local character
    characterStateMachine = new CharacterStateMachine(localCharacter, world);
    
    // Create goal
    goal = this.add.sprite(290, 70, 'food', 7);
    this.physics.add.existing(goal, true);
    this.physics.add.overlap(localCharacter.sprite, goal, reachGoal, null, this);
    
    // Add floating animation to goal
    this.tweens.add({
        targets: goal,
        y: goal.y - 10,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    
    // Add text for player information
    playerInfoText = this.add.text(10, 10, '', {
        fontSize: '14px',
        fill: '#fff',
        backgroundColor: '#000',
        padding: { x: 5, y: 3 }
    });
    playerInfoText.setScrollFactor(0);
    playerInfoText.setDepth(100);
    
    // Add text for winning message
    winText = this.add.text(200, 320, '', {
        fontSize: '32px',
        fill: '#fff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    winText.setOrigin(0.5);
    winText.setScrollFactor(0);
    winText.setDepth(100);
    winText.visible = false;
    
    // Create mobile controls
    setupControls(this);
    
    // Register this scene with Croquet view
    croquetView.registerGameScene(this);
    
    // Add functions for multiplayer
    this.updateOtherPlayers = function(players) {
        const localPlayerId = croquetView.localPlayerId;
        
        // Update or create sprites for other players
        Object.values(players).forEach(player => {
            if (player.id !== localPlayerId) {
                updateOtherPlayerSprite(scene, player);
            }
        });
    };
    
    this.updatePlayersInfo = function(players, localPlayerId) {
        let infoText = 'Players:\n';
        Object.values(players).forEach(player => {
            const isLocal = player.id === localPlayerId;
            infoText += `Player ${player.playerNumber}${isLocal ? ' (You)' : ''}: ${player.score}\n`;
        });
        playerInfoText.setText(infoText);
    };
    
    this.removePlayerSprite = function(playerId) {
        if (otherPlayerSprites[playerId]) {
            otherPlayerSprites[playerId].destroy();
            delete otherPlayerSprites[playerId];
        }
    };
    
    this.showGameOver = function(winnerNumber, isLocalWinner) {
        isGameOver = true;
        const message = isLocalWinner ? 'You Win!' : `Player ${winnerNumber} Wins!`;
        winText.setText(message);
        winText.visible = true;
    };
    
    this.resetGame = function(players) {
        isGameOver = false;
        winText.visible = false;
        
        // Reset local character position
        const localPlayer = players[croquetView.localPlayerId];
        if (localPlayer) {
            localCharacter.sprite.x = localPlayer.x;
            localCharacter.sprite.y = localPlayer.y;
            localCharacter.setVelocity(0, 0);
            characterStateMachine.transition('idle');
        }
        
        // Update player info
        this.updatePlayersInfo(players, croquetView.localPlayerId);
        
        // Reset other player sprites
        Object.values(players).forEach(player => {
            if (player.id !== croquetView.localPlayerId) {
                updateOtherPlayerSprite(scene, player);
            }
        });
    };
}

function update() {
    if (isGameOver) return;
    
    // Handle input (keyboard and touch)
    const cursors = this.input.keyboard.createCursorKeys();
    
    // Track if jump button/key was just pressed this frame
    const jumpPressed = (cursors.up.isDown || cursors.space.isDown || isJumpDown);
    
    // Get current time
    const currentTime = this.time.now;
    
    // Only allow jumping if we're on the ground, not already jumping/falling, and enough time has passed
    const currentState = characterStateMachine.getCurrentState();
    const canJumpNow = localCharacter.isOnGround() && 
                      currentState !== characterStateMachine.states.jumping &&
                      currentState !== characterStateMachine.states.falling &&
                      (currentTime - lastJumpTime) >= JUMP_BUFFER;
    
    const jumpJustPressed = jumpPressed && canJumpNow;
    
    if (jumpJustPressed) {
        lastJumpTime = currentTime;
    }
    
    const input = {
        left: cursors.left.isDown || isLeftDown,
        right: cursors.right.isDown || isRightDown,
        jump: jumpJustPressed
    };
    
    // Update character state machine
    characterStateMachine.update(input);
    
    // Get the current state name
    const stateName = Object.keys(characterStateMachine.states).find(
        state => characterStateMachine.states[state] === characterStateMachine.currentState
    );
    
    // Update character position on the model
    croquetView.updatePlayerPosition(
        croquetView.localPlayerId,
        localCharacter.sprite.x,
        localCharacter.sprite.y,
        { x: localCharacter.sprite.body.velocity.x, y: localCharacter.sprite.body.velocity.y },
        stateName,
        localCharacter.sprite.flipX
    );
}

function reachGoal() {
    if (!isGameOver) {
        croquetView.notifyGoalReached(croquetView.localPlayerId);
        this.sound.play('win', { volume: 0.35 });
    }
}

function updateOtherPlayerSprite(scene, player) {
    let sprite = otherPlayerSprites[player.id];
    
    // Create sprite if it doesn't exist
    if (!sprite) {
        sprite = scene.add.sprite(player.x, player.y, 'cat-idle');
        sprite.setScale(3);
        otherPlayerSprites[player.id] = sprite;
        
        // Create a player number label
        const label = scene.add.text(0, -20, `P${player.playerNumber}`, {
            fontSize: '14px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 3, y: 2 }
        });
        label.setOrigin(0.5);
        sprite.label = label;
    }
    
    // Update sprite position and animation
    sprite.x = player.x;
    sprite.y = player.y;
    sprite.flipX = player.flipX;
    
    // Update label position
    if (sprite.label) {
        sprite.label.x = player.x;
        sprite.label.y = player.y - 30;
    }
    
    // Update animation based on state
    const currentAnim = sprite.anims.currentAnim ? sprite.anims.currentAnim.key : null;
    
    if (player.state === 'idle' && currentAnim !== 'idle') {
        sprite.play('idle');
    } else if (player.state === 'walking' && currentAnim !== 'walk') {
        sprite.play('walk');
    } else if (player.state === 'jumping' && currentAnim !== 'jump') {
        sprite.play('jump');
    }
}

function setupBackground(scene) {
    const gameWidth = scene.cameras.main.width;
    const gameHeight = GAME_HEIGHT;
    
    // Night sky (background)
    scene.add.image(gameWidth/2, gameHeight/2, 'night-sky')
        .setDisplaySize(gameWidth, gameHeight)
        .setDepth(-5);
    
    // Buildings back
    scene.add.image(gameWidth/2, gameHeight - 300, 'night-buildings-back')
        .setOrigin(0.5, 0)
        .setDisplaySize(gameWidth, 200)
        .setDepth(-4);
    
    // Buildings front
    scene.add.image(gameWidth/2, gameHeight - 200, 'night-buildings-front')
        .setOrigin(0.5, 0)
        .setDisplaySize(gameWidth, 150)
        .setDepth(-3);
    
    // Fence
    scene.add.image(gameWidth/2, gameHeight - 100, 'night-fence')
        .setOrigin(0.5, 0)
        .setDisplaySize(gameWidth, 60)
        .setDepth(-2);
    
    // Bush
    scene.add.image(gameWidth/2, gameHeight - 60, 'night-bush')
        .setOrigin(0.5, 0)
        .setDisplaySize(gameWidth, 60)
        .setDepth(-1);
    
    // Add dark veil/overlay to dim the background
    const darkVeil = scene.add.rectangle(gameWidth/2, gameHeight/2, gameWidth, gameHeight, 0x000033, 0.8);
    darkVeil.setDepth(-0.5);
    
    // Add control bar background
    const controlBar = scene.add.rectangle(200, GAME_HEIGHT + (CONTROLS_HEIGHT/2), 400, CONTROLS_HEIGHT, 0x333333);
    controlBar.setScrollFactor(0);
    controlBar.setDepth(90);
}

function setupControls(scene) {
    const buttonAlpha = 0.7;
    const controlsY = GAME_HEIGHT + (CONTROLS_HEIGHT/2); // Center of control bar
    
    // Left button
    leftButton = scene.add.rectangle(60, controlsY, 60, 60, 0x888888, buttonAlpha);
    leftButton.setInteractive();
    leftButton.setScrollFactor(0);
    leftButton.setDepth(100);
    
    // Right button
    rightButton = scene.add.rectangle(140, controlsY, 60, 60, 0x888888, buttonAlpha);
    rightButton.setInteractive();
    rightButton.setScrollFactor(0);
    rightButton.setDepth(100);
    
    // Jump button
    jumpButton = scene.add.circle(320, controlsY, 35, 0x888888, buttonAlpha);
    jumpButton.setInteractive();
    jumpButton.setScrollFactor(0);
    jumpButton.setDepth(100);

    // Add button labels
    scene.add.text(60, controlsY, '←', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setDepth(100);
    scene.add.text(140, controlsY, '→', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setDepth(100);
    scene.add.text(320, controlsY, '↑', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setDepth(100);

    // Button event listeners
    leftButton.on('pointerdown', () => { 
        isLeftDown = true;
    });
    leftButton.on('pointerup', () => { 
        isLeftDown = false;
    });
    leftButton.on('pointerout', () => { 
        isLeftDown = false;
    });
    leftButton.on('pointerover', (pointer) => {
        if (pointer.isDown) isLeftDown = true;
    });

    rightButton.on('pointerdown', () => { 
        isRightDown = true;
    });
    rightButton.on('pointerup', () => { 
        isRightDown = false;
    });
    rightButton.on('pointerout', () => { 
        isRightDown = false;
    });
    rightButton.on('pointerover', (pointer) => {
        if (pointer.isDown) isRightDown = true;
    });

    // Enable multitouch
    scene.input.addPointer(3);
    scene.input.setGlobalTopOnly(false);
    
    // Jump button handling
    jumpButton.on('pointerdown', () => { 
        isJumpDown = true;
    });
    jumpButton.on('pointerup', () => { 
        isJumpDown = false;
    });
    jumpButton.on('pointerout', () => { 
        isJumpDown = false;
    });
    jumpButton.on('pointerover', (pointer) => {
        if (pointer.isDown) isJumpDown = true;
    });
}

// Initialize Croquet session
function startCroquetSession() {
    console.log("Starting Croquet session with appId:", APP_NAME);
    console.log("API Key:", API_KEY.substring(0, 5) + "...");
    
    // Initialize Croquet session
    Session.join({
        appId: APP_NAME,
        name: getSessionName(),
        password: "password",
        model: GameModel,
        view: GameView,
        apiKey: API_KEY,
        autoSleep: false
    }).then(session => {
        console.log("Croquet session has started");
        croquetView = session.view;
    }).catch(error => {
        console.error("Croquet session error:", error);
    });
}

// Start the Croquet session when the document is ready
document.addEventListener('DOMContentLoaded', startCroquetSession); 