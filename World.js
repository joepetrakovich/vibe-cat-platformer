
export class World {
    constructor(scene) {
        this.scene = scene;
        this.platforms = scene.physics.add.staticGroup();
        this.setupPlatforms();
    }

    setupPlatforms() {
        // Add ground
        const ground = this.scene.add.rectangle(200, 600, 400, 20, 0x888888);
        this.platforms.add(ground);
        
        // Add platforms
        const platformPositions = [
            { x: 300, y: 500 },
            { x: 100, y: 400 },
            { x: 300, y: 300 },
            { x: 100, y: 200 },
            { x: 300, y: 100 }
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