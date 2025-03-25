export class Character {
    constructor(scene, x, y, catId = "01") {
        // Store the cat ID for reference
        this.catId = catId;
        
        // Use the specific cat sprite
        this.sprite = scene.add.sprite(x, y, `cat${catId}-idle`);
        scene.physics.add.existing(this.sprite);
        
        // Scale up the sprite
        this.sprite.setScale(2);
        
        // Set the cat sprite to always be on top
        this.sprite.setDepth(100);
        
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

        // Initialize trail properties
        this.trailSprites = [];
        this.lastTrailTime = 0;
        this.trailInterval = 50; // Time between trail spawns in ms
        this.maxTrailSprites = 5; // Maximum number of trail sprites to keep
        this.rainbowColors = ['white', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'];
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

    updateTrail() {
        const currentTime = Date.now();
        
        // Get the current state from the sprite's animation key
        const currentAnim = this.sprite.anims.currentAnim ? this.sprite.anims.currentAnim.key : '';
        const isJumpingOrFalling = currentAnim.includes('jump');
        
        // Create trail if we're in a jumping or falling state and enough time has passed
        if (isJumpingOrFalling && !this.isOnGround() && 
            currentTime - this.lastTrailTime >= this.trailInterval) {
            
            // Create a new trail sprite
            const color = this.rainbowColors[Math.floor(Math.random() * this.rainbowColors.length)];
            const trailSprite = this.sprite.scene.add.sprite(
                this.sprite.x,
                this.sprite.y,
                `cat-${color}-jump`,
                this.sprite.frame.name  // Use the same frame as the main cat
            );
            
            // Set the trail sprite's properties
            trailSprite.setScale(2);
            trailSprite.setDepth(99); // Just below the main cat sprite
            trailSprite.setFlipX(this.sprite.flipX);
            
            // Add to trail sprites array
            this.trailSprites.push({
                sprite: trailSprite,
                time: currentTime
            });
            
            // Remove oldest trail sprite if we exceed the maximum
            if (this.trailSprites.length > this.maxTrailSprites) {
                const oldestTrail = this.trailSprites.shift();
                oldestTrail.sprite.destroy();
            }
            
            this.lastTrailTime = currentTime;
        }
        
        // Remove all trail sprites if we're on the ground or not in jumping/falling state
        if (this.isOnGround() || !isJumpingOrFalling) {
            this.trailSprites.forEach(trail => {
                trail.sprite.destroy();
            });
            this.trailSprites = [];
        }
    }
} 