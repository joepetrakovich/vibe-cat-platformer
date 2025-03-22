export class World {
    constructor(scene) {
        this.scene = scene;
        this.platforms = scene.physics.add.staticGroup();
        this.setupPlatforms();
    }

    setupPlatforms() {
        // Add ground
        const ground = this.scene.add.rectangle(180, 620, 360, 20, 0x888888);
        this.platforms.add(ground);
        
        // Add platforms
        const platformPositions = [
            { x: 270, y: 520 },
            { x: 90, y: 420 },
            { x: 270, y: 320 },
            { x: 90, y: 220 },
            { x: 270, y: 120 }
        ];

        platformPositions.forEach(pos => {
            const platform = this.scene.add.rectangle(pos.x, pos.y, 120, 20, 0x888888);
            this.platforms.add(platform);
        });
    }

    addCharacterCollider(character) {
        this.scene.physics.add.collider(character.sprite, this.platforms);
    }
} 