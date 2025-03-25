export class World {
    constructor(scene) {
        this.scene = scene;
        
        // Create static group for platforms
        this.platforms = this.scene.physics.add.staticGroup();
        
        // Create group for moving platforms
        this.movingPlatforms = this.scene.physics.add.group();
        
        this.setupPlatforms();
    }
    
    setupPlatforms() {
        // Add ground
        const ground = this.scene.add.rectangle(200, 630, 400, 40, 0x888888);
        this.platforms.add(ground);
        
        // Add static platforms
        const platformPositions = [
            { x: 300, y: 500, width: 100 },
            { x: 100, y: 450, width: 100 },
            { x: 325, y: 400, width: 100 },
            { x: 75, y: 350, width: 100 },
            { x: 50, y: 300, width: 80 },
            { x: 280, y: 300, width: 200 },
            { x: 380, y: 250, width: 100 },
            { x: 50, y: 200, width: 300 },
            { x: 380, y: 200, width: 200 },
            { x: 75, y: 150, width: 100 },
            { x: 280, y: 100, width: 100 },
            { x: 30, y: 80, width: 90 }
        ];

        // Store platform references by index
        this.platformRefs = platformPositions.map((pos, index) => {
            const platform = this.scene.add.rectangle(pos.x, pos.y, pos.width, 15, 0x888888);
            this.platforms.add(platform);
            platform.platformIndex = index;
            return platform;
        });
    }
    
    addCharacterCollider(character) {
        // Add collision with static platforms
        this.scene.physics.add.collider(character.sprite, this.platforms);
        
        // Add collision with moving platforms and handle riding them
        const movingPlatformCollider = this.scene.physics.add.collider(
            character.sprite,
            this.movingPlatforms,
            this.handleMovingPlatformCollision,
            null,
            this
        );
        
        // Debug collision setup
        console.log('Added character colliders for platforms');
    }

    handleMovingPlatformCollision(characterSprite, platform) {
        // Only handle collision if character is above the platform
        if (characterSprite.body.touching.down && platform.body.touching.up) {
            // Make the character move with the platform
            const deltaX = platform.body.position.x - platform.body.prev.x;
            characterSprite.x += deltaX;
            
            // Debug collision handling
            if (Math.abs(deltaX) > 0.01) {
                console.log(`Character moving with platform, deltaX: ${deltaX.toFixed(2)}`);
            }
        }
    }

    // Update platform positions based on Croquet model data
    updateMovingPlatforms(platformsData) {
        if (!platformsData) {
            console.log('No platform data received');
            return;
        }
        
        console.log('Updating moving platforms:', platformsData);
        
        // Clear existing moving platforms
        this.movingPlatforms.clear(true, true);
        
        // Reset visibility of all static platforms
        this.platformRefs.forEach(platform => {
            platform.visible = true;
        });
        
        // Create/update moving platforms based on model data
        platformsData.forEach(platformData => {
            // Get the original platform reference
            const originalPlatform = this.platformRefs[platformData.index];
            if (!originalPlatform) {
                console.log(`No platform found for index ${platformData.index}`);
                return;
            }
            
            // Hide the original static platform
            originalPlatform.visible = false;
            
            // Create a moving platform at the current position
            const movingPlatform = this.scene.add.rectangle(
                platformData.x,
                platformData.y,
                originalPlatform.width,
                15,
                0xFF88FF // Brighter color to make moving platforms more visible
            );
            
            // Add to physics group with specific configuration
            this.movingPlatforms.add(movingPlatform);
            
            // Set up physics properties
            movingPlatform.body.allowGravity = false;
            movingPlatform.body.immovable = true;
            movingPlatform.body.pushable = false;
            
            // Store the platform data for reference
            movingPlatform.platformData = platformData;
            
            // Debug output
            console.log(`Moving platform ${platformData.index} at (${platformData.x.toFixed(2)}, ${platformData.y}), speed: ${platformData.speed}`);
        });
    }
} 