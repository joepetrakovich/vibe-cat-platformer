export class CharacterStateMachine {
    constructor(character, world) {
        this.character = character;
        this.world = world;
        this.states = {
            idle: new IdleState(this),
            walking: new WalkingState(this),
            jumping: new JumpingState(this),
            falling: new FallingState(this)
        };
        this.currentState = this.states.idle;
        this.onStateChange = null;
    }

    update(input) {
        this.currentState.update(input);
    }

    transition(newState) {
        this.currentState.exit();
        this.currentState = this.states[newState];
        this.currentState.enter();
        
        // Notify state change
        if (this.onStateChange) {
            this.onStateChange(newState);
        }
    }

    getCurrentState() {
        return this.currentState;
    }
}

class CharacterState {
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
        this.character = stateMachine.character;
        this.world = stateMachine.world;
    }

    enter() {}
    exit() {}
    update(input) {}
}

class IdleState extends CharacterState {
    enter() {
        this.character.setVelocity(0, 0);
        this.character.sprite.play('idle');
    }

    update(input) {
        if (!this.character.isOnGround()) {
            this.stateMachine.transition('falling');
        } else if (input.jump && this.character.isOnGround()) {
            this.stateMachine.transition('jumping');
        } else if (input.left || input.right) {
            this.stateMachine.transition('walking');
        }
    }
}

class WalkingState extends CharacterState {
    enter() {
        this.character.sprite.play('walk');
    }

    update(input) {
        if (!this.character.isOnGround()) {
            this.stateMachine.transition('falling');
        } else if (input.jump && this.character.isOnGround()) {
            this.stateMachine.transition('jumping');
        } else if (input.left) {
            this.character.setVelocity(-this.character.moveSpeed, this.character.velocity.y);
            this.character.sprite.setFlipX(true);
        } else if (input.right) {
            this.character.setVelocity(this.character.moveSpeed, this.character.velocity.y);
            this.character.sprite.setFlipX(false);
        } else {
            this.stateMachine.transition('idle');
        }
    }
}

class JumpingState extends CharacterState {
    enter() {
        // Only apply jump force if we're actually on the ground
        if (this.character.isOnGround()) {
            this.character.setVelocity(this.character.velocity.x, -this.character.jumpForce);
            this.character.sprite.play('jump');
            // Play the jump sound effect at half volume
            this.character.sprite.scene.sound.play('boing', { volume: 0.25 });
        }
    }
    
    update(input) {
        // Check if we've reached the peak of our jump (velocity becomes positive)
        if (this.character.velocity.y > 0) {
            this.stateMachine.transition('falling');
            return;
        }

        // Only transition to idle when landing
        if (this.character.isOnGround()) {
            this.stateMachine.transition('idle');
            return;
        }

        // Allow horizontal movement while in air without state changes
        if (input.left) {
            this.character.sprite.x -= this.character.moveSpeed / 60;
            this.character.sprite.setFlipX(true);
        } else if (input.right) {
            this.character.sprite.x += this.character.moveSpeed / 60;
            this.character.sprite.setFlipX(false);
        }
    }
}

class FallingState extends CharacterState {
    enter() {
        this.character.sprite.play('fall');
    }

    update(input) {
        if (this.character.isOnGround()) {
            this.stateMachine.transition('idle');
            return;
        }

        // Allow horizontal movement while falling
        if (input.left) {
            this.character.sprite.x -= this.character.moveSpeed / 60;
            this.character.sprite.setFlipX(true);
        } else if (input.right) {
            this.character.sprite.x += this.character.moveSpeed / 60;
            this.character.sprite.setFlipX(false);
        }
    }
} 