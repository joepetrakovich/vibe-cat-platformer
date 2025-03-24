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
            gravity: { y: 1000 },
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
const GAME_HEIGHT = 650;
const CONTROLS_HEIGHT = 50;

// Croquet application name and API key
const APP_NAME = "io.croquet.catplatformracer";
const API_KEY = process.env.CROQUET_API_KEY || "REPLACE_WITH_YOUR_CROQUET_API_KEY"; // Read from .env file

// Create Phaser game instance
let game;
let croquetView;

// Generate a random session name or use one from URL
function getSessionName() {
    // Always return the same fixed session name for all users
    return "global-cat-platformer-session";
}

// GameView class for Croquet
class GameView extends View {
    constructor(model) {
        super(model);
        this.model = model;
        
        // Store local player ID
        this.localPlayerId = this.viewId;
        
        // Check for username in URL params
        const urlParams = new URLSearchParams(window.location.search);
        this.username = urlParams.get('username');
        
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
        
        // Send username to model if it exists
        if (this.username) {
            setTimeout(() => {
                this.publish(model.id, "set-username", {
                    playerId: this.localPlayerId,
                    username: this.username
                });
            }, 100); // Small delay to ensure model is ready
        }
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
        
        // Send the username to the Croquet model if it exists
        if (this.username) {
            this.publish(this.model.id, "set-username", { 
                playerId: this.localPlayerId,
                username: this.username
            });
        }
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

    // Assign a random cat type to this player
    assignRandomCatType() {
        const catType = Math.floor(Math.random() * 5) + 1; // Random number between 1-5
        this.publish(this.model.id, "set-cat-type", { 
            playerId: this.localPlayerId,
            catType: catType
        });
        return catType;
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

// Inactivity tracking
let lastMoveTime = 0;
const INACTIVITY_TIMEOUT = 60000; // 60 seconds (1 minute) in milliseconds
let inactivityTimer = null;
let inactivityWarningText = null;

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
    // Load all cat variants spritesheets
    for (let catNum = 1; catNum <= 5; catNum++) {
        const catId = catNum.toString().padStart(2, '0'); // Format as "01", "02", etc.
        this.load.spritesheet(`cat${catId}-idle`, `assets/cat${catId}_spritesheets/cat${catId}_idle_strip8.png`, { frameWidth: 40, frameHeight: 32 });
        this.load.spritesheet(`cat${catId}-walk`, `assets/cat${catId}_spritesheets/cat${catId}_walk_strip8.png`, { frameWidth: 40, frameHeight: 32 });
        this.load.spritesheet(`cat${catId}-jump`, `assets/cat${catId}_spritesheets/cat${catId}_jump_strip4.png`, { frameWidth: 40, frameHeight: 32 });
    }
    
    this.load.spritesheet('food', 'assets/food3.png', { frameWidth: 32, frameHeight: 32 });
    this.load.audio('boing', 'assets/sounds/Jump2.mp3');
    this.load.audio('win', 'assets/sounds/Checkpoint.mp3');
    
    // Load portal sprite sheets
    this.load.spritesheet('start-portal', 'assets/start-portal.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('exit-portal', 'assets/exit-portal.png', { frameWidth: 128, frameHeight: 128 });
    
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
    
    // Create animations for all cat variants
    for (let catNum = 1; catNum <= 5; catNum++) {
        const catId = catNum.toString().padStart(2, '0'); // Format as "01", "02", etc.
        
        this.anims.create({
            key: `cat${catId}-idle`,
            frames: this.anims.generateFrameNumbers(`cat${catId}-idle`, { start: 0, end: 7 }),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: `cat${catId}-walk`,
            frames: this.anims.generateFrameNumbers(`cat${catId}-walk`, { start: 0, end: 7 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: `cat${catId}-jump`,
            frames: this.anims.generateFrameNumbers(`cat${catId}-jump`, { start: 0, end: 3 }),
            frameRate: 8,
            repeat: 0
        });
    }
    
    // Create portal animations
    this.anims.create({
        key: 'exit-portal-animation',
        frames: this.anims.generateFrameNumbers('exit-portal', { start: 0, end: 6 }),
        frameRate: 10,
        repeat: -1
    });
    
    this.anims.create({
        key: 'start-portal-animation',
        frames: this.anims.generateFrameNumbers('start-portal', { start: 0, end: 6 }),
        frameRate: 10,
        repeat: -1
    });
    
    // Check for query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const refUrl = urlParams.get('ref');
    const portalParam = urlParams.get('portal');
    const username = urlParams.get('username'); // Add username parameter
    const isPortalEntry = portalParam === 'true';
    
    // Determine starting position
    let startX = 100;
    let startY = 500;
    
    // If ref URL exists, create start portal in bottom right
    if (refUrl) {
        // Add a text hint above the start portal
        const startPortalHint = this.add.text(360, 520, 'RETURN', {
            fontSize: '12px',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        });
        startPortalHint.setOrigin(0.5);
        startPortalHint.setDepth(5);
        
        // Create animated start portal sprite in the bottom right
        const startPortal = this.add.sprite(360, 550, 'start-portal');
        startPortal.setScale(0.5);
        startPortal.setDepth(5);
        startPortal.play('start-portal-animation');
        
        // Adjust the physics body with larger detection area
        this.physics.add.existing(startPortal, true);
        startPortal.body.setSize(80, 80);
        startPortal.body.setOffset(24, 24);
        
        // Add animation to the start portal hint
        this.tweens.add({
            targets: startPortalHint,
            alpha: 0.6,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // If player is entering through portal, set starting position to be near the return portal
        // but not directly on top of it to prevent immediate re-entry
        if (isPortalEntry) {
            // Position the player to the left of the portal instead of directly on it
            startX = 280; // Move to the left of the portal (was 360)
            startY = 550; // Keep the same Y position
        }
        
        // We'll add collision detection later after the character is created
        
        // Store portal reference for later use
        this.startPortal = startPortal;
        this.returnUrl = refUrl;
    }
    
    // Assign a random cat type for this player
    const catType = croquetView.assignRandomCatType();
    const catId = catType.toString().padStart(2, '0');
    
    // Create local player character with assigned cat type
    localCharacter = new Character(this, startX, startY, catId);
    world.addCharacterCollider(localCharacter);
    
    // Store the username in the character for later use
    localCharacter.username = username;
    
    // Now add collision detection for start portal if it exists
    if (this.startPortal) {
        // Create the overlap detection but store the reference
        const portalOverlap = this.physics.add.overlap(
            localCharacter.sprite, 
            this.startPortal, 
            function() {
                enterReturnPortal.call(this, this.returnUrl);
            }, 
            null, 
            this
        );
        
        // If player entered through portal, temporarily disable the collision to prevent immediate re-entry
        if (isPortalEntry) {
            // Disable the overlap initially
            portalOverlap.active = false;
            
            // Re-enable it after a delay
            this.time.delayedCall(1500, () => {
                portalOverlap.active = true;
            });
        }
    }
    
    // If entering through portal, play entrance animation
    if (isPortalEntry) {
        // Initially hide the player
        localCharacter.sprite.setAlpha(0);
        
        // Flash the screen
        this.cameras.main.flash(500, 255, 255, 255);
        this.cameras.main.shake(500, 0.02);
        
        // Play sound
        if (this.sound.get('win')) {
            this.sound.play('win', { volume: 0.5 });
        }
        
        // Animate the player appearing
        this.tweens.add({
            targets: localCharacter.sprite,
            alpha: 1,
            y: startY - 50,
            duration: 500,
            ease: 'Bounce.Out',
            onComplete: () => {
                // Apply a gentle bounce physics effect
                localCharacter.sprite.body.setVelocity(0, -300);
            }
        });
    }
    
    // Add a text hint above the portal
    const portalHint = this.add.text(40, 10, 'PORTAL', {
        fontSize: '12px',
        fontStyle: 'bold',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
    });
    portalHint.setOrigin(0.5);
    portalHint.setDepth(5);
    
    // Create animated portal sprite in the top left corner
    const portal = this.add.sprite(40, 30, 'exit-portal');
    portal.setScale(0.4);  // Adjusted scale for better size
    portal.setDepth(5);
    portal.play('exit-portal-animation');
    
    // Adjust the physics body to match the visual size
    this.physics.add.existing(portal, true); // Add physics body, set to static
    portal.body.setSize(25, 25); // Smaller collision box
    portal.body.setOffset(52, 52); // Center the smaller collision box in the sprite
    
    // Add animation to the text hint
    this.tweens.add({
        targets: portalHint,
        alpha: 0.6,
        duration: 1000,
        yoyo: true,
        repeat: -1
    });
    
    // Add collision detection for portal
    this.physics.add.overlap(localCharacter.sprite, portal, enterPortal, null, this);
    
    // Add player number label to local character
    const localPlayerLabel = this.add.text(localCharacter.sprite.x, localCharacter.sprite.y - 25, '', {
        fontSize: '16px',
        fontStyle: 'bold',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        padding: { x: 4, y: 2 }
    });
    localPlayerLabel.setOrigin(0.5);
    localPlayerLabel.setDepth(20);
    localPlayerLabel.visible = false; // Hide initially until we know the player number

    // Update the local player label text and position in the game loop
    this.events.on('update', function() {
        if (localCharacter && localCharacter.sprite) {
            // Update position only
            localPlayerLabel.x = localCharacter.sprite.x;
            localPlayerLabel.y = localCharacter.sprite.y - 25;
        }
    });

    // Create state machine for the local character
    characterStateMachine = new CharacterStateMachine(localCharacter, world);
    
    // Create goal
    goal = this.add.sprite(290, 25, 'food', 7);
    goal.setScale(1.5); // Make the pizza bigger
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
    playerInfoText = this.add.text(0, 0, '', {
        fontSize: '16px',
        fontStyle: 'bold',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: { x: 8, y: 5 },
        align: 'center'
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
    
    // Initialize inactivity tracking
    lastMoveTime = this.time.now; // Set initial move time to current time
    
    // Create a timer that checks for inactivity every second
    inactivityTimer = this.time.addEvent({
        delay: 1000,
        callback: checkInactivity,
        args: [this],
        callbackScope: this,
        loop: true
    });
    
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
        // Skip updating player info text - effectively hiding it
        
        // Only update the local player label
        const sortedPlayers = Object.values(players).sort((a, b) => a.playerNumber - b.playerNumber);
        
        sortedPlayers.forEach((player) => {
            const isLocal = player.id === localPlayerId;
            
            // Update local player label with correct player number
            if (isLocal && localPlayerLabel) {
                // Use username if it exists, otherwise just "(You)"
                const displayName = localCharacter.username ? 
                    `${localCharacter.username} (You)` : 
                    `(You)`;
                localPlayerLabel.setText(displayName);
                localPlayerLabel.visible = true;
            }
        });
        
        // Hide the player info text
        playerInfoText.visible = false;
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
        
        // Remove inactivity warning if it exists
        if (inactivityWarningText) {
            inactivityWarningText.destroy();
            inactivityWarningText = null;
        }
    };
    
    this.resetGame = function(players) {
        isGameOver = false;
        
        // Start the countdown before actual gameplay begins
        this.startCountdown(3, () => {
            // Only reset positions after countdown completes
            
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
        });
    };

    // Add countdown function
    this.startCountdown = function(seconds, callback) {
        isGameOver = true; // Prevent movement during countdown
        
        // Hide the win text immediately when countdown starts
        winText.visible = false;
        
        // Create countdown text
        const countdownText = this.add.text(200, 300, `${seconds}`, {
            fontSize: '64px',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            padding: { x: 20, y: 10 }
        });
        countdownText.setOrigin(0.5);
        countdownText.setScrollFactor(0);
        countdownText.setDepth(110);
        
        // Play countdown sound
        this.sound.play('boing', { volume: 0.2 });
        
        // Scale animation for the text
        this.tweens.add({
            targets: countdownText,
            scale: { from: 1.5, to: 1 },
            duration: 800,
            ease: 'Bounce'
        });
        
        // Create the countdown timer
        const countdownTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                seconds--;
                if (seconds > 0) {
                    // Update text
                    countdownText.setText(`${seconds}`);
                    // Play sound
                    this.sound.play('boing', { volume: 0.2 });
                    // New scale animation
                    this.tweens.add({
                        targets: countdownText,
                        scale: { from: 1.5, to: 1 },
                        duration: 800,
                        ease: 'Bounce'
                    });
                } else {
                    // Show GO! message
                    countdownText.setText('GO!');
                    this.sound.play('win', { volume: 0.4 });
                    
                    // Scale and fade animation for GO!
                    this.tweens.add({
                        targets: countdownText,
                        scale: { from: 1, to: 2 },
                        alpha: { from: 1, to: 0 },
                        duration: 800,
                        ease: 'Power2',
                        onComplete: () => {
                            countdownText.destroy();
                            isGameOver = false; // Re-enable movement
                            if (callback) callback();
                        }
                    });
                    
                    countdownTimer.destroy();
                }
            },
            callbackScope: this,
            repeat: 2
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
    
    // Check if player is trying to move
    const isMoving = input.left || input.right || input.jump;
    
    // Update character state machine
    characterStateMachine.update(input);
    
    // Get the current state name
    const stateName = Object.keys(characterStateMachine.states).find(
        state => characterStateMachine.states[state] === characterStateMachine.currentState
    );
    
    // Check if player has actually moved or jumped
    if (isMoving || 
        Math.abs(localCharacter.sprite.body.velocity.x) > 10 || 
        Math.abs(localCharacter.sprite.body.velocity.y) > 10) {
        // Reset the inactivity timer if the player is moving
        lastMoveTime = currentTime;
    }
    
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
    let container = otherPlayerSprites[player.id];
    
    // Get cat type from player data
    const catType = player.catType || 1; // Default to cat01 if not set
    const catId = catType.toString().padStart(2, '0');
    
    // Create sprite container if it doesn't exist
    if (!container) {
        // Create a container at the player position
        container = scene.add.container(player.x, player.y);
        otherPlayerSprites[player.id] = container;
        
        // Create sprite and add to container using the player's cat type
        const sprite = scene.add.sprite(0, 0, `cat${catId}-idle`);
        sprite.setScale(3);
        container.add(sprite);
        container.sprite = sprite;
        
        // Create a player number label and add to container
        const displayName = player.username ? player.username : `P${player.playerNumber}`;
        const label = scene.add.text(0, -25, displayName, {
            fontSize: '16px',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            padding: { x: 4, y: 2 }
        });
        label.setOrigin(0.5);
        container.add(label);
        container.label = label;
        
        // Store the cat type with the container
        container.catType = catType;
    }
    
    // Update container position
    container.x = player.x;
    container.y = player.y;
    
    // Update sprite flip
    container.sprite.flipX = player.flipX;
    
    // Update label text if username changed
    if (container.label) {
        const displayName = player.username ? player.username : `P${player.playerNumber}`;
        if (container.label.text !== displayName) {
            container.label.setText(displayName);
        }
    }
    
    // Update animation based on state using the player's cat type
    const currentAnim = container.sprite.anims.currentAnim ? container.sprite.anims.currentAnim.key : null;
    
    if (player.state === 'idle' && currentAnim !== `cat${catId}-idle`) {
        container.sprite.play(`cat${catId}-idle`);
    } else if (player.state === 'walking' && currentAnim !== `cat${catId}-walk`) {
        container.sprite.play(`cat${catId}-walk`);
    } else if (player.state === 'jumping' && currentAnim !== `cat${catId}-jump`) {
        container.sprite.play(`cat${catId}-jump`);
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

// Function to handle portal entry
function enterPortal() {
    // Check if we're already processing portal entry
    if (this.isEnteringPortal) return;
    this.isEnteringPortal = true;
    
    // Notify other players that this player entered a portal
    croquetView.publish(croquetView.model.id, "player-entered-portal", {
        playerId: croquetView.localPlayerId
    });
    
    // Play some visual effects
    this.cameras.main.flash(500, 255, 255, 255);
    this.cameras.main.shake(500, 0.01);
    
    // Play a sound if available
    if (this.sound.get('win')) {
        this.sound.play('win', { volume: 0.5 });
    }
    
    // Make the cat and player badge disappear
    if (localCharacter && localCharacter.sprite) {
        localCharacter.sprite.body.setVelocity(0, 0);
        localCharacter.sprite.setVisible(false);
        
        // Find and hide the player label
        const playerLabel = this.children.getAll().find(child => 
            child.type === 'Text' && 
            child.text && 
            child.text.includes('(You)')
        );
        
        if (playerLabel) {
            playerLabel.setVisible(false);
        }
    }
    
    // Get the current URL without query strings
    const currentUrl = window.location.origin + window.location.pathname;
    
    // Get username from the current URL or from character if available
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username') || (localCharacter && localCharacter.username);
    
    // Wait for the effects to complete, then redirect
    this.time.delayedCall(800, () => {
        // Build the redirect URL with ref parameter and username if available
        let redirectUrl = `https://portal.pieter.com?ref=${currentUrl}`;
        if (username) {
            redirectUrl += `&username=${encodeURIComponent(username)}`;
        }
        // Redirect to portal.pieter.com with parameters
        window.location.href = redirectUrl;
    });
}

// Function to handle returning through the start portal
function enterReturnPortal(refUrl) {
    // Check if we're already processing portal entry
    if (this.isEnteringPortal) return;
    this.isEnteringPortal = true;
    
    // Notify other players that this player entered a portal
    croquetView.publish(croquetView.model.id, "player-entered-portal", {
        playerId: croquetView.localPlayerId
    });
    
    // Play some visual effects
    this.cameras.main.flash(500, 255, 255, 255);
    this.cameras.main.shake(500, 0.01);
    
    // Play a sound if available
    if (this.sound.get('win')) {
        this.sound.play('win', { volume: 0.5 });
    }
    
    // Make the cat and player badge disappear
    if (localCharacter && localCharacter.sprite) {
        localCharacter.sprite.body.setVelocity(0, 0);
        localCharacter.sprite.setVisible(false);
        
        // Find and hide the player label
        const playerLabel = this.children.getAll().find(child => 
            child.type === 'Text' && 
            child.text && 
            child.text.includes('(You)')
        );
        
        if (playerLabel) {
            playerLabel.setVisible(false);
        }
    }
    
    // Get username from the current URL or from character if available
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username') || (localCharacter && localCharacter.username);
    
    // Ensure refUrl has a protocol
    if (refUrl && !refUrl.startsWith('http://') && !refUrl.startsWith('https://')) {
        refUrl = 'https://' + refUrl;
    }
    
    console.log("Redirecting to:", refUrl);
    
    // Wait for the effects to complete, then redirect
    this.time.delayedCall(800, () => {
        // Append username parameter if it exists
        if (username) {
            // Check if the refUrl already has query parameters
            const hasQueryParams = refUrl.includes('?');
            const separator = hasQueryParams ? '&' : '?';
            refUrl += `${separator}username=${encodeURIComponent(username)}`;
        }
        
        // Redirect to the original URL with proper protocol
        window.location.href = refUrl;
    });
}

// Function to handle inactivity check
function checkInactivity(scene) {
    // Don't check for inactivity if the game is over
    if (isGameOver) return;
    
    const currentTime = scene.time.now;
    
    // If player hasn't moved for 10 seconds
    if (currentTime - lastMoveTime > INACTIVITY_TIMEOUT) {
        // Player has been inactive too long, redirect them out
        console.log("Player inactive for too long, exiting");
        
        // Play some effects
        scene.cameras.main.flash(500, 255, 0, 0); // Red flash
        scene.cameras.main.shake(500, 0.02);
        
        // Show a message
        if (!inactivityWarningText) {
            inactivityWarningText = scene.add.text(200, 300, 'INACTIVE - LOGGING OUT', {
                fontSize: '20px',
                fontStyle: 'bold',
                fill: '#ffffff',
                stroke: '#ff0000',
                strokeThickness: 6,
                backgroundColor: '#000000',
                padding: { x: 15, y: 10 }
            });
            inactivityWarningText.setOrigin(0.5);
            inactivityWarningText.setScrollFactor(0);
            inactivityWarningText.setDepth(100);
        }
        
        // Wait a moment, then exit to a default destination
        scene.time.delayedCall(1500, () => {
            window.location.href = 'https://portal.pieter.com';
        });
        
        // Clear the timer so it doesn't fire again
        if (inactivityTimer) {
            scene.time.removeEvent(inactivityTimer);
            inactivityTimer = null;
        }
    } else if (currentTime - lastMoveTime > INACTIVITY_TIMEOUT - 3000) {
        // Warning when 3 seconds from timeout
        if (!inactivityWarningText) {
            inactivityWarningText = scene.add.text(200, 300, 'MOVE TO STAY ACTIVE!', {
                fontSize: '20px',
                fontStyle: 'bold',
                fill: '#ffffff',
                stroke: '#ff0000',
                strokeThickness: 6,
                backgroundColor: '#000000',
                padding: { x: 15, y: 10 }
            });
            inactivityWarningText.setOrigin(0.5);
            inactivityWarningText.setScrollFactor(0);
            inactivityWarningText.setDepth(100);
            
            // Make it blink
            scene.tweens.add({
                targets: inactivityWarningText,
                alpha: 0.3,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
    } else if (inactivityWarningText) {
        // If player moved, remove the warning
        inactivityWarningText.destroy();
        inactivityWarningText = null;
    }
} 