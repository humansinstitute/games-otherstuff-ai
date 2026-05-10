/**
 * Dumpling Town - Entity Classes
 * Player, NPCs, and interactive objects
 */

// Filling types and their visual properties
export const Fillings = {
    pork: {
        name: 'Pork',
        color: '#f5d6c6',
        accent: '#e8a88a',
        emoji: '🐷'
    },
    shrimp: {
        name: 'Shrimp',
        color: '#ffcccb',
        accent: '#ff9999',
        emoji: '🦐'
    },
    veggie: {
        name: 'Veggie',
        color: '#c8e6c9',
        accent: '#81c784',
        emoji: '🥬'
    },
    sweet: {
        name: 'Sweet',
        color: '#ffcce5',
        accent: '#ff99cc',
        emoji: '🍓'
    }
};

// Base entity class
class Entity {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    collidesWith(other) {
        const a = this.getBounds();
        const b = other.getBounds();
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }
}

// Base Dumpling class - shared by player and NPCs
class Dumpling extends Entity {
    constructor(x, y, filling) {
        super(x, y, 32, 32);
        this.filling = filling;
        this.fillingData = Fillings[filling] || Fillings.pork;

        // Animation state
        this.animFrame = 0;
        this.animTime = 0;
        this.direction = 'down'; // up, down, left, right
        this.isMoving = false;

        // Bounce animation
        this.bounceOffset = 0;
        this.bouncePhase = 0;

        // Blink animation
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.nextBlinkTime = this.getRandomBlinkTime();
    }

    getRandomBlinkTime() {
        return 2 + Math.random() * 4; // Blink every 2-6 seconds
    }

    update(deltaTime, dx = 0, dy = 0) {
        this.animTime += deltaTime;

        // Update direction based on movement
        if (dx !== 0 || dy !== 0) {
            this.isMoving = true;
            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? 'right' : 'left';
            } else {
                this.direction = dy > 0 ? 'down' : 'up';
            }
        } else {
            this.isMoving = false;
        }

        // Bounce animation when moving
        if (this.isMoving) {
            this.bouncePhase += deltaTime * 10;
            this.bounceOffset = Math.sin(this.bouncePhase) * 3;
        } else {
            this.bounceOffset *= 0.9; // Ease out bounce
            this.bouncePhase = 0;
        }

        // Blink animation
        this.blinkTimer += deltaTime;
        if (this.isBlinking) {
            if (this.blinkTimer > 0.15) {
                this.isBlinking = false;
                this.blinkTimer = 0;
                this.nextBlinkTime = this.getRandomBlinkTime();
            }
        } else {
            if (this.blinkTimer > this.nextBlinkTime) {
                this.isBlinking = true;
                this.blinkTimer = 0;
            }
        }

        // Animation frame
        if (this.isMoving) {
            if (this.animTime > 0.15) {
                this.animFrame = (this.animFrame + 1) % 4;
                this.animTime = 0;
            }
        } else {
            this.animFrame = 0;
        }
    }
}

// Player dumpling
export class Player extends Dumpling {
    constructor(x, y, filling) {
        super(x, y, filling);
        this.speed = 3; // Movement speed
        this.name = 'You';
    }
}

// NPC dumpling
export class NPC extends Dumpling {
    constructor(x, y, filling, name, dialogue) {
        super(x, y, filling);
        this.name = name;
        // Dialogue can be an object (dialogue tree) or array (legacy simple dialogue)
        this.dialogue = dialogue;

        // Idle animation - subtle swaying
        this.idlePhase = Math.random() * Math.PI * 2;

        // Random facing direction
        const directions = ['up', 'down', 'left', 'right'];
        this.direction = directions[Math.floor(Math.random() * directions.length)];

        // Wandering behavior
        this.wanderEnabled = false;
        this.wanderArea = null; // { x, y, width, height }
        this.wanderTarget = null;
        this.wanderSpeed = 0.8; // Slower than player
        this.wanderPauseTimer = 0;
        this.wanderPauseDuration = 2 + Math.random() * 3; // 2-5 seconds pause
        this.isWandering = false;

        // Home house (NPC might be inside sometimes)
        this.homeHouse = null;
        this.isIndoors = false;
        this.indoorCheckTimer = 0;
        this.indoorCheckInterval = 30 + Math.random() * 30; // Check every 30-60 seconds
    }

    setWanderArea(x, y, width, height) {
        this.wanderEnabled = true;
        this.wanderArea = { x, y, width, height };
        this.pickNewWanderTarget();
    }

    setHomeHouse(house) {
        this.homeHouse = house;
        // 30% chance to start indoors
        this.isIndoors = Math.random() < 0.3;
    }

    pickNewWanderTarget() {
        if (!this.wanderArea) return;

        // Pick random position within wander area
        this.wanderTarget = {
            x: this.wanderArea.x + Math.random() * this.wanderArea.width,
            y: this.wanderArea.y + Math.random() * this.wanderArea.height
        };
    }

    update(deltaTime, world = null) {
        super.update(deltaTime);

        // Check for going indoors/outdoors
        if (this.homeHouse) {
            this.indoorCheckTimer += deltaTime;
            if (this.indoorCheckTimer >= this.indoorCheckInterval) {
                this.indoorCheckTimer = 0;
                this.indoorCheckInterval = 30 + Math.random() * 30;
                // 20% chance to toggle indoor/outdoor state
                if (Math.random() < 0.2) {
                    this.isIndoors = !this.isIndoors;
                }
            }
        }

        // Skip wandering if indoors
        if (this.isIndoors) {
            this.bounceOffset = Math.sin(this.idlePhase) * 1.5;
            return;
        }

        // Wandering behavior
        if (this.wanderEnabled && this.wanderTarget) {
            if (this.wanderPauseTimer > 0) {
                // Pausing - just sway
                this.wanderPauseTimer -= deltaTime;
                this.isWandering = false;
                this.bounceOffset = Math.sin(this.idlePhase) * 1.5;
            } else {
                // Move toward target
                const dx = this.wanderTarget.x - this.x;
                const dy = this.wanderTarget.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 5) {
                    // Reached target, pause and pick new one
                    this.wanderPauseTimer = this.wanderPauseDuration;
                    this.wanderPauseDuration = 2 + Math.random() * 4;
                    this.pickNewWanderTarget();
                    this.isWandering = false;
                } else {
                    // Move toward target
                    const moveX = (dx / distance) * this.wanderSpeed * deltaTime * 60;
                    const moveY = (dy / distance) * this.wanderSpeed * deltaTime * 60;

                    // Check collision if world is provided
                    let canMove = true;
                    if (world) {
                        canMove = world.canMoveTo(this.x + moveX, this.y + moveY, this.width, this.height);
                    }

                    if (canMove) {
                        this.x += moveX;
                        this.y += moveY;
                        this.isWandering = true;

                        // Update direction
                        if (Math.abs(dx) > Math.abs(dy)) {
                            this.direction = dx > 0 ? 'right' : 'left';
                        } else {
                            this.direction = dy > 0 ? 'down' : 'up';
                        }
                    } else {
                        // Can't move, pick new target
                        this.pickNewWanderTarget();
                    }
                }
            }

            // Update movement state for animation
            this.isMoving = this.isWandering;
        } else {
            // Idle swaying when not wandering
            this.bounceOffset = Math.sin(this.idlePhase) * 1.5;
        }
    }
}

// Interactive objects (houses, items, etc.)
export class InteractiveObject extends Entity {
    constructor(x, y, width, height, type, data = {}) {
        super(x, y, width, height);
        this.type = type;
        this.data = data;
    }
}

// House building
export class House extends InteractiveObject {
    constructor(x, y, ownerFilling, ownerName) {
        super(x, y, 64, 64, 'house', {
            ownerFilling,
            ownerName
        });
        this.fillingData = Fillings[ownerFilling] || Fillings.pork;
    }
}

// Decoration objects
export class Decoration extends Entity {
    constructor(x, y, type) {
        super(x, y, 16, 16);
        this.type = type; // tree, flower, lantern, etc.
    }
}
