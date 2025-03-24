export class Character {
    constructor(scene, x, y, catId = "01") {
        // Store the cat ID for reference
        this.catId = catId;
        
        // Use the specific cat sprite
        this.sprite = scene.add.sprite(x, y, `cat${catId}-idle`);
        scene.physics.add.existing(this.sprite);
        
        // Scale up the sprite
        this.sprite.setScale(2);
        
        // Remove bounce and ensure solid ground contact
        this.sprite.body.setBounce(0);
        this.sprite.body.setCollideWorldBounds(true);
        
        // Adjust the physics body size to be narrower and taller for more precise ground detection
        this.sprite.body.setSize(10, 14); // Narrower and taller collision box
        this.sprite.body.setOffset(15, 16); // Adjusted offset to match visual better
        
        this.velocity = {
            x: 0,
            y: 0
        };
        
        this.moveSpeed = 150;
        this.jumpForce = 1200;
        this.maxFallSpeed = 500;  // Maximum falling speed
        
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

        // Start with idle animation for the specific cat
        this.sprite.play(`cat${catId}-idle`);
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