import Phaser from 'phaser';
import { World } from './World.js';
import { Character } from './Character.js';
import { CharacterStateMachine } from './CharacterStateMachine.js';

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

const game = new Phaser.Game(config);

// Game area constants
const GAME_HEIGHT = 620;  // Increased game height
const CONTROLS_HEIGHT = 80;  // Height of controls area

let world;
let character;
let characterStateMachine;
let goal;
let gameWon = false;
let leftButton;
let rightButton;
let jumpButton;
let isLeftDown = false;
let isRightDown = false;
let isJumpDown = false;
let canJump = true;       // Track if we can process a new jump
let lastJumpTime = 0;     // Track the last time we jumped
const JUMP_BUFFER = 150;  // Buffer time in ms between jumps
let stateText;
let groundText;

function preload() {
    // Add version number for cache busting
    const version = Date.now();
    
    // Load cat spritesheets
    this.load.spritesheet('cat-idle', 'assets/cat01_spritesheets/cat01_idle_strip8.png?v=' + version, { frameWidth: 40, frameHeight: 32 });
    this.load.spritesheet('cat-walk', 'assets/cat01_spritesheets/cat01_walk_strip8.png?v=' + version, { frameWidth: 40, frameHeight: 32 });
    this.load.spritesheet('cat-jump', 'assets/cat01_spritesheets/cat01_jump_strip4.png?v=' + version, { frameWidth: 40, frameHeight: 32 });
    this.load.spritesheet('food', 'assets/food3.png?v=' + version, { frameWidth: 32, frameHeight: 32 });
    this.load.audio('boing', 'assets/sounds/Jump2.wav?v=' + version);
    this.load.audio('win', 'assets/sounds/Checkpoint.wav?v=' + version);
    
    // Load night background assets
    this.load.image('night-sky', 'assets/night/night sky.png?v=' + version);
    this.load.image('night-buildings-back', 'assets/night/night buildings back.png?v=' + version);
    this.load.image('night-buildings-front', 'assets/night/night buildings front.png?v=' + version);
    this.load.image('night-fence', 'assets/night/night fence.png?v=' + version);
    this.load.image('night-bush', 'assets/night/night bush.png?v=' + version);
}

function create() {
    // Create world
    world = new World(this);
    
    // Add night background elements
    const gameWidth = this.cameras.main.width;
    const gameHeight = GAME_HEIGHT;
    
    // Night sky (background)
    this.add.image(gameWidth/2, gameHeight/2, 'night-sky')
        .setDisplaySize(gameWidth, gameHeight)
        .setDepth(-5);
    
    // Buildings back
    this.add.image(gameWidth/2, gameHeight - 300, 'night-buildings-back')
        .setOrigin(0.5, 0)
        .setDisplaySize(gameWidth, 200)
        .setDepth(-4);
    
    // Buildings front
    this.add.image(gameWidth/2, gameHeight - 200, 'night-buildings-front')
        .setOrigin(0.5, 0)
        .setDisplaySize(gameWidth, 150)
        .setDepth(-3);
    
    // Fence
    this.add.image(gameWidth/2, gameHeight - 100, 'night-fence')
        .setOrigin(0.5, 0)
        .setDisplaySize(gameWidth, 60)
        .setDepth(-2);
    
    // Bush
    this.add.image(gameWidth/2, gameHeight - 60, 'night-bush')
        .setOrigin(0.5, 0)
        .setDisplaySize(gameWidth, 60)
        .setDepth(-1);
    
    // Add dark veil/overlay to dim the background
    const darkVeil = this.add.rectangle(gameWidth/2, gameHeight/2, gameWidth, gameHeight, 0x000033, 0.8);
    darkVeil.setDepth(-0.5);
    
    // Add control bar background
    const controlBar = this.add.rectangle(200, GAME_HEIGHT + (CONTROLS_HEIGHT/2), 400, CONTROLS_HEIGHT, 0x333333);
    controlBar.setScrollFactor(0);
    controlBar.setDepth(90);
    
    // Create character
    character = new Character(this, 100, 500);
    world.addCharacterCollider(character);
    
    // Create state machine
    characterStateMachine = new CharacterStateMachine(character, world);
    
    // Add debug text for state
    stateText = this.add.text(10, 10, 'State: idle', {
        fontSize: '20px',
        fill: '#fff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    stateText.setScrollFactor(0);
    stateText.setDepth(100);
    stateText.visible = false;  // Hide state text
    
    // Add debug text for ground state
    groundText = this.add.text(10, 40, 'OnGround: true', {
        fontSize: '20px',
        fill: '#fff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    groundText.setScrollFactor(0);
    groundText.setDepth(100);
    groundText.visible = false;  // Hide ground state text
    
    // Set up state change callback
    characterStateMachine.onStateChange = (newState) => {
        stateText.setText('State: ' + newState);
    };
    
    // Create goal
    goal = this.add.sprite(290, 70, 'food', 7);
    
    // Make the food static (doesn't move when hit)
    // goal.body.setAllowGravity(false);
    // goal.body.setImmovable(true);
    
    // // Scale the sprite if needed
    goal.setScale(1.5);
    
    // // Add a gentle floating animation
    this.tweens.add({
        targets: goal,
        y: goal.y - 10,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    //goal = this.add.rectangle(270, 70, 32, 32, 0xffff00);
    this.physics.add.existing(goal, true);
    this.physics.add.overlap(character.sprite, goal, reachGoal, null, this);
    
    // Add text for winning message
    this.winText = this.add.text(180, 320, 'You Win!', {
        fontSize: '48px',
        fill: '#fff'
    });
    this.winText.setOrigin(0.5);
    this.winText.visible = false;

    // Create mobile controls
    const buttonAlpha = 0.7;
    const controlsY = GAME_HEIGHT + (CONTROLS_HEIGHT/2); // Center of control bar
    
    // Left button
    leftButton = this.add.rectangle(60, controlsY, 60, 60, 0x888888, buttonAlpha);
    leftButton.setInteractive();
    leftButton.setScrollFactor(0);
    leftButton.setDepth(100);
    
    // Right button
    rightButton = this.add.rectangle(140, controlsY, 60, 60, 0x888888, buttonAlpha);
    rightButton.setInteractive();
    rightButton.setScrollFactor(0);
    rightButton.setDepth(100);
    
    // Jump button
    jumpButton = this.add.circle(320, controlsY, 35, 0x888888, buttonAlpha);
    jumpButton.setInteractive();
    jumpButton.setScrollFactor(0);
    jumpButton.setDepth(100);

    // Add button labels
    this.add.text(60, controlsY, '←', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setDepth(100);
    this.add.text(140, controlsY, '→', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setDepth(100);
    this.add.text(320, controlsY, '↑', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setDepth(100);

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
    this.input.addPointer(3);
    this.input.setGlobalTopOnly(false);
    
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

function update() {
    if (gameWon) return;
    
    // Handle input (keyboard and touch)
    const cursors = this.input.keyboard.createCursorKeys();
    
    // Track if jump button/key was just pressed this frame
    const jumpPressed = (cursors.up.isDown || cursors.space.isDown || isJumpDown);
    
    // Get current time
    const currentTime = this.time.now;
    
    // Only allow jumping if we're on the ground, not already jumping/falling, and enough time has passed
    const currentState = characterStateMachine.getCurrentState();
    const canJumpNow = character.isOnGround() && 
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
    
    // Update ground state debug text
    groundText.setText('OnGround: ' + character.isOnGround());
}

function reachGoal() {
    if (!gameWon) {
        gameWon = true;
        this.winText.visible = true;
        character.setVelocity(0, 0);
        this.sound.play('win', { volume: 0.35 });
    }
} 