const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
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
    // Create platformssS
    platforms = this.physics.add.staticGroup();
    
    // Add ground - create a white rectangle for the ground
    const ground = this.add.rectangle(400, 580, 800, 20, 0x888888);
    platforms.add(ground);
    
    // Add platforms - create rectangles for each platform
    const platformPositions = [
        { x: 600, y: 450 },
        { x: 200, y: 350 },
        { x: 600, y: 250 },
        { x: 200, y: 150 }
    ];

    platformPositions.forEach(pos => {
        const platform = this.add.rectangle(pos.x, pos.y, 200, 20, 0x888888);
        platforms.add(platform);
    });
    
    // Create player
    player = this.add.rectangle(100, 450, 32, 48, 0x00ff00);
    this.physics.add.existing(player);
    
    player.body.setBounce(0.2);
    player.body.setCollideWorldBounds(true);
    
    // Create goal
    goal = this.add.rectangle(700, 100, 32, 32, 0xffff00);
    this.physics.add.existing(goal, true);
    
    // Add colliders
    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, goal, reachGoal, null, this);
    
    // Add text for winning message
    this.winText = this.add.text(400, 300, 'You Win!', {
        fontSize: '64px',
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