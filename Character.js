export class Character {
    constructor(scene, x, y) {
        this.sprite = scene.add.rectangle(x, y, 32, 48, 0x00ff00);
        scene.physics.add.existing(this.sprite);
        
        this.sprite.body.setBounce(0.2);
        this.sprite.body.setCollideWorldBounds(true);
        
        this.velocity = {
            x: 0,
            y: 0
        };
        
        this.moveSpeed = 160;
        this.jumpForce = 800;
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