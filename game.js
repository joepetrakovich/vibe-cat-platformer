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
let stateText;
let groundText;

function preload() {
    // Add version number for cache busting
    const version = Date.now();
    
    // Load cat spritesheets
    this.load.spritesheet('cat-idle', 'assets/cat01_spritesheets/cat01_idle_strip8.png?v=' + version, { frameWidth: 40, frameHeight: 40 });
    this.load.spritesheet('cat-walk', 'assets/cat01_spritesheets/cat01_walk_strip8.png?v=' + version, { frameWidth: 40, frameHeight: 40 });
    this.load.spritesheet('cat-jump', 'assets/cat01_spritesheets/cat01_jump_strip4.png?v=' + version, { frameWidth: 40, frameHeight: 40 });
    this.load.audio('boing', 'assets/sounds/Jump2.wav?v=' + version);
    this.load.audio('win', 'assets/sounds/Checkpoint.wav?v=' + version);
}

function create() {
    // Create world
    world = new World(this);
    
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
    
    // Add debug text for ground state
    groundText = this.add.text(10, 40, 'OnGround: true', {
        fontSize: '20px',
        fill: '#fff',
        backgroundColor: '#000',
        padding: { x: 10, y: 5 }
    });
    groundText.setScrollFactor(0);
    groundText.setDepth(100);
    
    // Set up state change callback
    characterStateMachine.onStateChange = (newState) => {
        stateText.setText('State: ' + newState);
    };
    
    // Create goal
    goal = this.add.rectangle(270, 70, 32, 32, 0xffff00);
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
    leftButton.on('pointerdown', () => { isLeftDown = true; });
    leftButton.on('pointerup', () => { isLeftDown = false; });
    leftButton.on('pointerout', () => { isLeftDown = false; });

    rightButton.on('pointerdown', () => { isRightDown = true; });
    rightButton.on('pointerup', () => { isRightDown = false; });
    rightButton.on('pointerout', () => { isRightDown = false; });

    jumpButton.on('pointerdown', () => { isJumpDown = true; });
    jumpButton.on('pointerup', () => { isJumpDown = false; });
    jumpButton.on('pointerout', () => { isJumpDown = false; });
}

function update() {
    if (gameWon) return;
    
    // Handle input (keyboard and touch)
    const cursors = this.input.keyboard.createCursorKeys();
    
    const input = {
        left: cursors.left.isDown || isLeftDown,
        right: cursors.right.isDown || isRightDown,
        jump: cursors.space.isDown || isJumpDown
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