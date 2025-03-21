const config = {
    type: Phaser.AUTO,
    width: 360,
    height: 640,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
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

let player;
let platforms;
let goal;
let gameWon = false;

function preload() {
    // No assets to preload for now
}

function create() {
    // Create platforms
    platforms = this.physics.add.staticGroup();
    
    // Add ground - create a white rectangle for the ground
    const ground = this.add.rectangle(180, 620, 360, 20, 0x888888);
    platforms.add(ground);
    
    // Add platforms - create rectangles for each platform
    const platformPositions = [
        { x: 270, y: 520 },
        { x: 90, y: 420 },
        { x: 270, y: 320 },
        { x: 90, y: 220 },
        { x: 270, y: 120 }  // Added an extra platform
    ];

    platformPositions.forEach(pos => {
        const platform = this.add.rectangle(pos.x, pos.y, 120, 20, 0x888888);
        platforms.add(platform);
    });
    
    // Create player
    player = this.add.rectangle(90, 550, 32, 48, 0x00ff00);
    this.physics.add.existing(player);
    
    player.body.setBounce(0.2);
    player.body.setCollideWorldBounds(true);
    
    // Create goal
    goal = this.add.rectangle(270, 70, 32, 32, 0xffff00);
    this.physics.add.existing(goal, true);
    
    // Add colliders
    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, goal, reachGoal, null, this);
    
    // Add text for winning message
    this.winText = this.add.text(180, 320, 'You Win!', {
        fontSize: '48px',
        fill: '#fff'
    });
    this.winText.setOrigin(0.5);
    this.winText.visible = false;
}

function update() {
    if (gameWon) return;
    
    // Handle input
    const cursors = this.input.keyboard.createCursorKeys();
    
    if (cursors.left.isDown) {
        player.body.setVelocityX(-160);
    } else if (cursors.right.isDown) {
        player.body.setVelocityX(160);
    } else {
        player.body.setVelocityX(0);
    }
    
    if (cursors.up.isDown && player.body.touching.down) {
        player.body.setVelocityY(-400);
    }
}

function reachGoal() {
    if (!gameWon) {
        gameWon = true;
        this.winText.visible = true;
        player.body.setVelocity(0, 0);
    }
} 