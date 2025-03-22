export class Character {
    constructor(scene, x, y) {
        this.sprite = scene.add.sprite(x, y, 'cat-idle');
        scene.physics.add.existing(this.sprite);
        
        // Scale up the sprite
        this.sprite.setScale(2);
        
        this.sprite.body.setBounce(0.2);
        this.sprite.body.setCollideWorldBounds(true);
        
        // Adjust the physics body size to match the scaled sprite
        this.sprite.body.setSize(20, 30); // Half the sprite size to make collision feel better
        this.sprite.body.setOffset(10, 3);
        
        this.velocity = {
            x: 0,
            y: 0
        };
        
        this.moveSpeed = 160;
        this.jumpForce = 800;

        // Create animations with corrected frame counts and slower frameRate
        scene.anims.create({
            key: 'idle',
            frames: scene.anims.generateFrameNumbers('cat-idle', { start: 0, end: 7 }), // 8 frames
            frameRate: 6, // Slowed down from 8
            repeat: -1
        });

        scene.anims.create({
            key: 'walk',
            frames: scene.anims.generateFrameNumbers('cat-walk', { start: 0, end: 7 }), // 8 frames
            frameRate: 8, // Slowed down from 10
            repeat: -1
        });

        scene.anims.create({
            key: 'jump',
            frames: scene.anims.generateFrameNumbers('cat-jump', { start: 0, end: 3 }), // 4 frames
            frameRate: 8, // Slowed down from 10
            repeat: 0
        });

        // Start with idle animation
        this.sprite.play('idle');
    }

    setVelocity(x, y) {
        this.sprite.body.setVelocity(x, y);
        this.velocity.x = x;
        this.velocity.y = y;
    }

    isOnGround() {
        return this.sprite.body.touching.down;
    }

    getPosition() {
        return {
            x: this.sprite.x,
            y: this.sprite.y
        };
    }
} 