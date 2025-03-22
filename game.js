import { World } from './World.js';
import { Character } from './Character.js';
import { CharacterStateMachine } from './CharacterStateMachine.js';

const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
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
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game',
        width: 360,
        height: 640
    }
};

const game = new Phaser.Game(config);

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
    // No assets to preload for now
}

function create() {
    // Create world
    world = new World(this);
    
    // Create character
    character = new Character(this, 90, 550);
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
    const buttonAlpha = 0.5;
    
    // Left button
    leftButton = this.add.rectangle(50, 560, 60, 60, 0x888888, buttonAlpha);
    leftButton.setInteractive();
    leftButton.setScrollFactor(0);
    leftButton.setDepth(100);
    
    // Right button
    rightButton = this.add.rectangle(120, 560, 60, 60, 0x888888, buttonAlpha);
    rightButton.setInteractive();
    rightButton.setScrollFactor(0);
    rightButton.setDepth(100);
    
    // Jump button
    jumpButton = this.add.circle(290, 560, 35, 0x888888, buttonAlpha);
    jumpButton.setInteractive();
    jumpButton.setScrollFactor(0);
    jumpButton.setDepth(100);

    // Add button labels
    this.add.text(50, 560, '←', { fontSize: '32px', fill: '#000' }).setOrigin(0.5).setDepth(100);
    this.add.text(120, 560, '→', { fontSize: '32px', fill: '#000' }).setOrigin(0.5).setDepth(100);
    this.add.text(290, 560, '↑', { fontSize: '32px', fill: '#000' }).setOrigin(0.5).setDepth(100);

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
        jump: cursors.up.isDown || isJumpDown
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
    }
} 