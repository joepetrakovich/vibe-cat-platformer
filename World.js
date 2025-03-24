export class World {
    constructor(scene) {
        this.scene = scene;
        this.platforms = scene.physics.add.staticGroup();
        this.setupPlatforms();
    }

    setupPlatforms() {
        // Add ground
        const ground = this.scene.add.rectangle(200, 630, 400, 40, 0x888888);
        this.platforms.add(ground);
        
        // Add platforms - more platforms with smaller sizes
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

        platformPositions.forEach(pos => {
            const platform = this.scene.add.rectangle(pos.x, pos.y, pos.width, 15, 0x888888);
            this.platforms.add(platform);
        });
    }

    addCharacterCollider(character) {
        this.scene.physics.add.collider(character.sprite, this.platforms);
    }
} 