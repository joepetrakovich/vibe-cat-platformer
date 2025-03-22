export class Character {
    constructor(scene, x, y) {
        this.sprite = scene.add.sprite(x, y, 'cat-idle');
        scene.physics.add.existing(this.sprite);
        
        // Scale up the sprite
        this.sprite.setScale(3);
        
        // Remove bounce and ensure solid ground contact
        this.sprite.body.setBounce(0);
        this.sprite.body.setCollideWorldBounds(true);
        
        // Adjust the physics body size to be narrower and taller for more precise ground detection
        this.sprite.body.setSize(12, 16); // Narrower and taller collision box
        this.sprite.body.setOffset(14, 16); // Adjusted offset to match visual better
        
        this.velocity = {
            x: 0,
            y: 0
        };
        
        this.moveSpeed = 160;
        this.jumpForce = 1500;
        this.maxFallSpeed = 600;  // Maximum falling speed
        
        // Set the maximum vertical velocity
        this.sprite.body.setMaxVelocityY(this.maxFallSpeed);

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