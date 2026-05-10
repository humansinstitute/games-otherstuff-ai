import {
    WALK_SPEED,
    GRAVITY,
    TERMINAL_VELOCITY,
    MAX_SAFE_FALL,
    DIG_SPEED,
    CLIMB_SPEED,
    STATES,
    LEMMING_WIDTH,
    LEMMING_HEIGHT,
    LEMMING_BODY_HEIGHT,
    LEMMING_HEAD_RADIUS,
    COLORS
} from './constants.js';

const MAX_STEP_CLIMB = 4; // Pixels a walking lemming can climb when hitting a wall
const BUILDER_STEP_WIDTH = 10;
const BUILDER_STEP_HEIGHT = 2;
const BUILDER_STEP_COLOR = {
    r: COLORS.STEEL_RAMP_R,
    g: COLORS.STEEL_RAMP_G,
    b: COLORS.STEEL_RAMP_B
};
const BUILDER_STEP_COLOR_VARIATION = 12;

export default class Lemming {
    constructor(x, y) {
        // Position
        this.x = x;
        this.y = y;

        // Velocity
        this.vx = WALK_SPEED;
        this.vy = 0;

        // Direction: 1 = right, -1 = left
        this.direction = 1;

        // Current state
        this.state = STATES.WALKING;

        // Visual properties
        this.width = LEMMING_WIDTH;
        this.height = LEMMING_HEIGHT;

        // Animation
        this.animationFrame = 0;

        // Fall tracking
        this.fallDistance = 0;
        this.fallStartY = 0;

        // Death animation
        this.deathTimer = 0;
        this.deathMaxTime = 30; // frames
        this.splatRadius = 0;

        // Building state
        this.buildStepCount = 0; // Number of steps built
        this.buildFrameCounter = 0; // Frames since last step placed
        this.buildStartY = 0; // Y position where building started

        // Digging state
        this.digStartY = 0; // Y position where digging started
        this.digDepth = 0; // How far down the digger has dug

        // Bomber state
        this.bomberCountdown = -1; // -1 = not a bomber, 0-300 = countdown frames
        this.justExploded = false; // Flag to trigger screen shake

        // Bashing state
        this.bashCycleCount = 0; // Number of bash cycles completed (max 15)
        this.readyToBash = false; // Ready to bash when hitting a wall
        this.bashProgress = 0; // How many 10px chunks have been bashed in current cycle (0-5)

        // Permanent abilities
        this.isClimber = false; // Can climb walls
    }

    update(dt, terrain, allLemmings = [], particleSystem = null) {
        // Update animation frame
        this.animationFrame++;

        // Handle death animation
        if (this.state === STATES.DEAD) {
            this.deathTimer++;
            // Expand splat radius
            if (this.deathTimer < 10) {
                this.splatRadius = (this.deathTimer / 10) * 15;
            }
            // Animation complete
            return;
        }

        // Handle bomber countdown
        if (this.bomberCountdown >= 0) {
            this.bomberCountdown--;

            // Trigger explosion when countdown reaches 0
            if (this.bomberCountdown < 0) {
                // Change state to exploding
                this.state = STATES.EXPLODING;

                // Set flag for screen shake trigger
                this.justExploded = true;

                // Remove terrain in circular area (25px radius)
                if (terrain) {
                    terrain.removeTerrainCircle(this.x, this.y, 25);
                }

                // Spawn explosion particles
                if (particleSystem) {
                    particleSystem.spawnExplosionParticles(this.x, this.y);
                }

                // Set to dead state (will be removed from game)
                this.state = STATES.DEAD;
                this.vx = 0;
                this.vy = 0;
                return;
            }
        }

        // Fade out fall distance indicator
        if (this.fallDistance > 0 && this.state === STATES.WALKING) {
            this.fallDistance -= 0.5;
            if (this.fallDistance < 0) this.fallDistance = 0;
        }

        // Apply gravity (not for blocking or building lemmings on ground)
        if (this.state === STATES.WALKING ||
            this.state === STATES.FALLING ||
            this.state === STATES.BLOCKING) {
            this.vy += GRAVITY;

            // Cap at terminal velocity
            if (this.vy > TERMINAL_VELOCITY) {
                this.vy = TERMINAL_VELOCITY;
            }
        }

        // Track falling state
        if (this.state === STATES.FALLING && this.fallStartY === 0) {
            this.fallStartY = this.y;
        }

        // Apply horizontal movement
        if (this.state === STATES.WALKING) {
            this.vx = WALK_SPEED * this.direction;

            const checkX = this.x + (this.direction * (this.width / 2 + 2));
            const hitWall = this.hasWallAhead(terrain);

            // Check for blocker collision
            let hitBlocker = false;
            for (const other of allLemmings) {
                if (other !== this && other.state === STATES.BLOCKING) {
                    const dx = checkX - other.x;
                    const dy = this.y - other.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 12) {
                        hitBlocker = true;
                        break;
                    }
                }
            }

            if (hitWall || hitBlocker) {
                if (hitBlocker) {
                    this.direction *= -1;
                } else if (this.readyToBash) {
                    // For bashers, check for a wall at the EXACT bash height (not entire vertical column)
                    // Check right in front at the height where the basher will carve
                    const bashCheckX = this.x + (this.direction * 6);
                    let wallAtBashHeight = false;

                    // Only check at the middle of the bash area (not top or bottom of wall)
                    const bashCenterY = this.y - 11; // Middle of the 22px tall bash area
                    const checkRadius = 5; // Check 5px above and below center

                    for (let checkY = bashCenterY - checkRadius; checkY <= bashCenterY + checkRadius; checkY += 2) {
                        if (terrain.isSolid(bashCheckX, checkY)) {
                            wallAtBashHeight = true;
                            break;
                        }
                    }

                    if (wallAtBashHeight) {
                        // Wall is at bash height - start bashing
                        this.state = STATES.BASHING;
                        this.bashCycleCount = 0;
                        this.bashProgress = 0;
                        this.readyToBash = false;
                        this.vx = 0;
                        this.vy = 0;
                    } else {
                        // No wall at bash height, keep walking (may be walking through cleared tunnel)
                        this.x += this.vx;
                    }
                } else if (hitWall && terrain && this.tryStepUp(terrain)) {
                    this.x += this.vx;
                } else if (hitWall && this.isClimber) {
                    // Climber hits a wall - start climbing
                    this.state = STATES.CLIMBING;
                    this.vx = 0;
                    this.vy = 0;
                } else {
                    // Reverse direction when hitting a wall or blocker
                    this.direction *= -1;
                }
            } else {
                // Move horizontally
                this.x += this.vx;
            }
        } else if (this.state === STATES.FALLING) {
            // Drop straight down when falling
            this.vx = 0;
        }

        // Handle digging behavior
        if (this.state === STATES.DIGGING && terrain) {
            // Track dig start position
            if (this.digStartY === 0) {
                this.digStartY = this.y;
            }

            // Calculate current dig depth
            this.digDepth = this.y - this.digStartY;

            // Move downward slowly
            this.y += DIG_SPEED;

            // Remove terrain below with rougher, wider pattern
            // Main dig area - wider tunnel (12px wide, 3px deep) to fit lemming width (10px)
            terrain.removeTerrainRect(this.x, this.y, 12, 3);

            // Add roughness by removing random additional pixels around the edges
            for (let i = 0; i < 3; i++) {
                const offsetX = (Math.random() - 0.5) * 6; // Random offset within 3px left/right
                const offsetY = Math.random() * 2; // Random offset 0-2px down
                terrain.removeTerrainRect(this.x + offsetX, this.y + offsetY, 2, 2);
            }

            // Spawn dig particles every few frames
            if (this.animationFrame % 3 === 0 && particleSystem) {
                const particleCount = Math.floor(Math.random() * 4) + 5; // 5-8 particles
                particleSystem.spawnDigParticles(this.x, this.y, particleCount);
            }

            // Check if there's still terrain below to dig
            const checkBelow = terrain.isSolid(this.x, this.y + 4);
            const reachedBottom = this.y >= terrain.height - 10;
            const reachedMaxDepth = this.digDepth >= 60; // Maximum dig depth of 60px

            // Only stop if we've broken through OR hit bottom OR exceeded max depth AND broken through
            if (!checkBelow || reachedBottom || (reachedMaxDepth && !checkBelow)) {
                // Clean up area around lemming before transitioning to ensure it can fall freely
                // Remove a wider area (16px wide, 8px tall) around the lemming
                terrain.removeTerrainRect(this.x, this.y - 4, 16, 8);

                // Finished digging - transition to falling
                this.state = STATES.FALLING;
                this.fallStartY = this.y;
                this.digStartY = 0;
                this.digDepth = 0;
            }
        }

        // Handle building behavior
        if (this.state === STATES.BUILDING && terrain) {
            this.buildFrameCounter++;

            // Place a step every 8 frames
            if (this.buildFrameCounter >= 8) {
                this.buildFrameCounter = 0;

                // Each step is wider and shallower for smoother ramps
                const stepWidth = BUILDER_STEP_WIDTH;
                const stepHeight = BUILDER_STEP_HEIGHT;

                if (this.buildStepCount === 0 && this.buildStartY === 0) {
                    this.buildStartY = this.y;
                }

                // Calculate step position (ahead of lemming in direction it's facing)
                const stepX = this.x + (this.direction * stepWidth / 2);
                const stepY = this.buildStartY - ((this.buildStepCount + 1) * stepHeight);

                // Check for ceiling (terrain within 20px above)
                let hitCeiling = false;
                for (let checkY = stepY - 20; checkY < stepY; checkY++) {
                    for (let dx = 0; dx < stepWidth; dx++) {
                        if (terrain.isSolid(stepX + dx, checkY)) {
                            hitCeiling = true;
                            break;
                        }
                    }
                    if (hitCeiling) break;
                }

                // If ceiling detected, stop building
                if (hitCeiling) {
                    this.state = STATES.WALKING;
                    this.buildStepCount = 0;
                    this.buildFrameCounter = 0;
                    this.buildStartY = 0;
                    return;
                }

                // Check if there's space to build (not hitting wall or existing terrain)
                // Must check the ENTIRE fill height, not just the step height
                const fillHeight = Math.max(this.buildStartY - stepY, stepHeight);
                let canBuild = true;
                let obstacleAt = stepWidth; // Position where obstacle starts (default to full width)

                // Check each horizontal position
                for (let dx = 0; dx < stepWidth; dx++) {
                    let hitObstacle = false;
                    // Check the full vertical fill at this horizontal position
                    for (let dy = 0; dy < fillHeight; dy++) {
                        const checkX = stepX + dx;
                        const checkY = stepY + dy;
                        if (terrain.isSolid(checkX, checkY)) {
                            hitObstacle = true;
                            canBuild = false;
                            obstacleAt = dx; // Record where the obstacle starts
                            break;
                        }
                    }
                    if (hitObstacle) break;
                }

                if (canBuild) {
                    // Full step can be placed - no obstacle
                    terrain.addTerrainRect(stepX, stepY, stepWidth, fillHeight, {
                        color: BUILDER_STEP_COLOR,
                        variation: BUILDER_STEP_COLOR_VARIATION
                    });
                    this.buildStepCount++;

                    // Spawn build particles
                    if (particleSystem) {
                        particleSystem.spawnBuildParticles(stepX + stepWidth / 2, stepY);
                    }

                    // Move lemming up and forward onto the new step
                    this.x += this.direction * stepWidth;
                    this.y -= stepHeight;
                } else {
                    // Hit obstacle - fill the gap up to the obstacle to make it flush
                    if (obstacleAt > 0) {
                        // Place a partial step from stepX to where the obstacle starts
                        terrain.addTerrainRect(stepX, stepY, obstacleAt, fillHeight, {
                            color: BUILDER_STEP_COLOR,
                            variation: BUILDER_STEP_COLOR_VARIATION
                        });
                    }

                    // Stop building - hit an obstacle
                    this.state = STATES.WALKING;
                    this.buildStepCount = 0;
                    this.buildFrameCounter = 0;
                    this.buildStartY = 0;
                }

                // Check if reached maximum steps
                if (this.buildStepCount >= 15) {
                    // Finished building - return to walking
                    this.state = STATES.WALKING;
                    this.buildStepCount = 0;
                    this.buildFrameCounter = 0;
                    this.buildStartY = 0;
                }
            }

            // Keep builder stationary while building (except when placing steps)
            this.vx = 0;
            this.vy = 0;
        }

        // Handle climbing behavior
        if (this.state === STATES.CLIMBING && terrain) {
            // Move upward along the wall
            this.y -= CLIMB_SPEED;

            // Check if there's still a wall in front to climb (check multiple points)
            const checkX = this.x + (this.direction * (this.width / 2 + 1));
            const hasWallInFront = terrain.isSolid(checkX, this.y) ||
                                   terrain.isSolid(checkX, this.y - 5) ||
                                   terrain.isSolid(checkX, this.y - 10);

            // Check if reached the top (no wall above but still wall at current level)
            const hasWallAbove = terrain.isSolid(checkX, this.y - this.height);

            if (!hasWallAbove && hasWallInFront) {
                // Reached the top of the wall - transition to walking on top
                this.state = STATES.WALKING;
                this.y -= 5; // Move up a bit more
                this.x += this.direction * (this.width + 2); // Move over the ledge
                this.vx = WALK_SPEED * this.direction;
                this.vy = 0;
            } else if (!hasWallInFront) {
                // Wall ended while climbing - fall
                this.state = STATES.FALLING;
                this.fallStartY = this.y;
                this.vx = WALK_SPEED * this.direction;
            }

            // Keep climber stationary horizontally while climbing
            if (this.state === STATES.CLIMBING) {
                this.vx = 0;
                this.vy = 0;
            }
        }

        // Handle bashing behavior
        if (this.state === STATES.BASHING && terrain) {
            // Swing pickaxe every 10 frames and remove a chunk
            if (this.animationFrame % 10 === 0) {
                // Remove an 11px wide chunk of terrain directly in front of basher (5 chunks = 55px total)
                const chunkWidth = 11;
                const bashX = this.x + (this.direction * 10); // 10px in front of lemming
                const bashY = this.y - 22; // Start at ground level and extend upward 22px

                terrain.removeTerrainRect(bashX, bashY, chunkWidth, 22);

                // Spawn bash particles when terrain is removed
                if (particleSystem) {
                    particleSystem.spawnBashParticles(bashX, bashY);
                }

                // Increment progress
                this.bashProgress++;

                // After 5 chunks (55px total), move forward and check if we should continue
                if (this.bashProgress >= 5) {
                    // Move forward into the cleared area (X only, keep Y locked)
                    this.x += this.direction * 11;
                    // Lock Y position to prevent any drift
                    // Y stays exactly the same as when bashing started

                    this.bashCycleCount++;
                    this.bashProgress = 0; // Reset for next cycle

                    // Only check for stopping conditions between cycles (not during bashing)
                    // Check if there's terrain ahead to continue bashing
                    const checkX = this.x + (this.direction * 20); // Check further ahead
                    let hasTerrainAhead = false;
                    for (let checkY = this.y - 22; checkY < this.y; checkY += 4) {
                        if (terrain.isSolid(checkX, checkY)) {
                            hasTerrainAhead = true;
                            break;
                        }
                    }

                    // Check stopping conditions:
                    // 1. Broke through to empty space
                    // 2. Completed 15 bash cycles
                    if (!hasTerrainAhead || this.bashCycleCount >= 15) {
                        // Stop bashing - check if we should walk or fall
                        const hasGroundBelow = terrain.isSolid(this.x, this.y + 1);
                        if (hasGroundBelow) {
                            this.state = STATES.WALKING;
                            this.vx = WALK_SPEED * this.direction;
                            this.vy = 0;
                        } else {
                            this.state = STATES.FALLING;
                            this.fallStartY = this.y;
                            this.vx = 0;
                            this.vy = 0;
                        }
                        this.bashCycleCount = 0;
                        this.bashProgress = 0;
                    }
                }
            }

            // Keep basher completely stationary while bashing (no drift)
            this.vx = 0;
            this.vy = 0;
        }

        // Apply vertical movement
        this.y += this.vy;

        // Ground collision detection (skip for climbers and bashers)
        if (terrain && this.state !== STATES.CLIMBING && this.state !== STATES.BASHING) {
            // Check for ground within a small range below the lemming's feet (not just at exact position)
            // This allows lemmings to detect and land on builder steps
            let groundBelow = false;
            let groundDistance = 0;
            const maxGroundCheckDistance = 3; // Check up to 3 pixels below

            for (let checkDist = 0; checkDist <= maxGroundCheckDistance; checkDist++) {
                if (terrain.isSolid(this.x, this.y + checkDist)) {
                    groundBelow = true;
                    groundDistance = checkDist;
                    break;
                }
            }

            if (groundBelow) {
                // CRITICAL: Only land if we're falling ONTO a surface from above, not sliding past a wall
                // The lemming moves horizontally first, so by now we may have drifted into a block's X position

                // Check if there's terrain in the vertical space between current position and detected ground
                // If yes, we're falling THROUGH/BESIDE a block, not onto its top
                let clearVerticalPath = true;

                if (groundDistance > 1) {
                    // Check the vertical column from current Y down to detected ground
                    // Start checking 1 pixel above current position to avoid false positives
                    for (let checkDist = -1; checkDist < groundDistance - 1; checkDist++) {
                        if (terrain.isSolid(this.x, this.y + checkDist)) {
                            clearVerticalPath = false;
                            break;
                        }
                    }
                }

                // Only snap to ground if:
                // 1. There's a clear vertical path (we're truly falling onto the top), OR
                // 2. We're touching/inside terrain at current position (groundDistance <= 1)
                if (clearVerticalPath || groundDistance <= 1) {
                    // If ground is below us, move down close to it (or push up if inside it)
                    if (groundDistance > 0) {
                        // Keep a 1px buffer above terrain so we don't snap into it
                        const snapDistance = Math.max(groundDistance - 1, 0);
                        if (snapDistance > 0) {
                            this.y += snapDistance;
                        }
                    } else {
                        // We're inside terrain - push up until on surface
                        while (terrain.isSolid(this.x, this.y) && this.y > 0) {
                            this.y -= 1;
                        }
                    }
                    this.vy = 0;

                    // Transition from falling to walking (unless blocking)
                    if (this.state === STATES.FALLING) {
                        this.fallDistance = this.y - this.fallStartY;
                        this.fallStartY = 0;

                        // Apply fall damage if fall distance is too great
                        if (this.fallDistance > MAX_SAFE_FALL) {
                            this.state = STATES.DEAD;
                            this.vx = 0;
                            this.vy = 0;
                        } else {
                            this.state = STATES.WALKING;
                        }
                    }

                    // Keep blocker stationary on ground
                    if (this.state === STATES.BLOCKING) {
                        this.vx = 0;
                        this.vy = 0;
                    }
                } else {
                    // Terrain in vertical path - we're falling beside/through a block, not onto its top
                    // Continue falling and don't snap to this ground
                    groundBelow = false;
                }
            } else if (this.state === STATES.WALKING) {
                // Check for ledge - look ahead for ground
                let hasGroundAhead = false;
                const lookAheadX = this.x + (this.direction * (this.width / 2 + 1));

                // Check within 5 pixels down
                for (let checkY = this.y; checkY < this.y + 5; checkY++) {
                    if (terrain.isSolid(lookAheadX, checkY)) {
                        hasGroundAhead = true;
                        break;
                    }
                }

                // If no ground ahead, continue walking (will fall off)
                if (!hasGroundAhead) {
                    this.state = STATES.FALLING;
                }
            }

            // Check if currently falling
            if (!groundBelow && this.state === STATES.WALKING) {
                this.state = STATES.FALLING;
            }
        }
    }

    render(ctx, isHovered = false) {
        // Ready to bash indicator - yellow glow
        if (this.readyToBash && this.state !== STATES.DEAD) {
            ctx.save();
            ctx.shadowColor = '#eab308'; // Yellow glow
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Hover glow effect
        if (isHovered && this.state !== STATES.DEAD) {
            ctx.save();
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Death animation
        if (this.state === STATES.DEAD) {
            if (isHovered) ctx.restore();

            ctx.save();

            // Calculate fade out
            const fadeProgress = Math.min(this.deathTimer / this.deathMaxTime, 1);
            const alpha = 1 - fadeProgress;

            // Draw expanding red splat
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.splatRadius
            );
            gradient.addColorStop(0, `rgba(220, 38, 38, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(239, 68, 68, ${alpha * 0.6})`);
            gradient.addColorStop(1, `rgba(239, 68, 68, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.splatRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw splat particles
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const dist = this.splatRadius * 0.8;
                const px = this.x + Math.cos(angle) * dist;
                const py = this.y + Math.sin(angle) * dist;

                ctx.fillStyle = `rgba(220, 38, 38, ${alpha * 0.8})`;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
            return;
        }

        ctx.save();

        // Calculate animation bob
        let bobOffset = 0;
        if (this.state === STATES.WALKING) {
            bobOffset = Math.sin(this.animationFrame / 10) * 1;
        } else if (this.state === STATES.DIGGING) {
            bobOffset = Math.sin(this.animationFrame / 5) * 0.5; // Faster, smaller bob for digging
        } else if (this.state === STATES.BUILDING) {
            bobOffset = Math.sin(this.animationFrame / 4) * 0.8; // Medium bob for building
        } else if (this.state === STATES.CLIMBING) {
            bobOffset = Math.sin(this.animationFrame / 6) * 0.5; // Climbing animation
        } else if (this.state === STATES.BASHING) {
            bobOffset = Math.sin(this.animationFrame / 4) * 0.6; // Bashing animation
        }

        // Flip horizontally based on direction
        const flipX = this.direction === -1;
        if (flipX) {
            ctx.translate(this.x, this.y + bobOffset);
            ctx.scale(-1, 1);
            ctx.translate(-this.x, -(this.y + bobOffset));
        }

        // Body dimensions
        const bodyWidth = 10;
        const bodyHeight = LEMMING_BODY_HEIGHT;
        const headRadius = LEMMING_HEAD_RADIUS;
        const bodyX = this.x - bodyWidth / 2;
        const bodyY = this.y - bodyHeight + bobOffset;

        // Choose color based on state or permanent abilities
        const isBlocking = this.state === STATES.BLOCKING;
        const isDigging = this.state === STATES.DIGGING;
        const isBuilding = this.state === STATES.BUILDING;
        const isClimbing = this.state === STATES.CLIMBING;
        const isBashing = this.state === STATES.BASHING;

        let bodyColor, outlineColor;
        if (isBlocking) {
            bodyColor = COLORS.LEMMING_BLOCKER;
            outlineColor = COLORS.LEMMING_BLOCKER_OUTLINE;
        } else if (isDigging) {
            bodyColor = COLORS.LEMMING_DIGGER;
            outlineColor = COLORS.LEMMING_DIGGER_OUTLINE;
        } else if (isBuilding) {
            bodyColor = COLORS.LEMMING_BUILDER;
            outlineColor = COLORS.LEMMING_BUILDER_OUTLINE;
        } else if (isBashing) {
            bodyColor = COLORS.LEMMING_BASHER;
            outlineColor = COLORS.LEMMING_BASHER_OUTLINE;
        } else if (this.isClimber) {
            // Climbers are always purple (permanent ability)
            bodyColor = COLORS.LEMMING_CLIMBER;
            outlineColor = COLORS.LEMMING_CLIMBER_OUTLINE;
        } else {
            bodyColor = COLORS.LEMMING_NORMAL;
            outlineColor = COLORS.LEMMING_NORMAL_OUTLINE;
        }

        // Draw body (rounded rectangle)
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(bodyX, bodyY, bodyWidth, bodyHeight, 3);
        ctx.fill();
        ctx.stroke();

        // Draw head (circle on top)
        const headX = this.x;
        const headY = bodyY - headRadius;

        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = outlineColor;
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw green curly hair on top of head
        ctx.fillStyle = '#22c55e'; // Bright green
        ctx.strokeStyle = '#16a34a'; // Darker green outline
        ctx.lineWidth = 1;

        // Left hair curl
        ctx.beginPath();
        ctx.arc(headX - 3, headY - headRadius + 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Middle-left hair curl
        ctx.beginPath();
        ctx.arc(headX - 1, headY - headRadius - 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Middle-right hair curl
        ctx.beginPath();
        ctx.arc(headX + 1, headY - headRadius - 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right hair curl
        ctx.beginPath();
        ctx.arc(headX + 3, headY - headRadius + 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw eyes (two small white circles)
        ctx.fillStyle = '#fff';

        // Left eye
        ctx.beginPath();
        ctx.arc(headX - 1.5, headY - 0.5, 1, 0, Math.PI * 2);
        ctx.fill();

        // Right eye
        ctx.beginPath();
        ctx.arc(headX + 1.5, headY - 0.5, 1, 0, Math.PI * 2);
        ctx.fill();

        // Draw blocker arms (if blocking)
        if (this.state === STATES.BLOCKING) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';

            // Left arm (extended out)
            ctx.beginPath();
            ctx.moveTo(this.x - 3, this.y - 10);
            ctx.lineTo(this.x - 9, this.y - 8);
            ctx.stroke();

            // Right arm (extended out)
            ctx.beginPath();
            ctx.moveTo(this.x + 3, this.y - 10);
            ctx.lineTo(this.x + 9, this.y - 8);
            ctx.stroke();

            // Stop sign indicator - octagon shape
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 1.5;

            // Draw octagon
            const signSize = 4;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                const px = this.x + Math.cos(angle) * signSize;
                const py = this.y - this.height / 2 + Math.sin(angle) * signSize;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // STOP text
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 3px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⛔', this.x, this.y - this.height / 2);

            // Draw collision radius indicator
            ctx.strokeStyle = 'rgba(251, 146, 60, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.height / 2, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw digger animation (if digging)
        if (this.state === STATES.DIGGING) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            // Animated digging motion - arms moving up and down
            const digOffset = Math.sin(this.animationFrame / 5) * 2;

            // Left arm (digging down)
            ctx.beginPath();
            ctx.moveTo(this.x - 3, this.y - 10);
            ctx.lineTo(this.x - 4, this.y - 4 + digOffset);
            ctx.stroke();

            // Right arm (digging down)
            ctx.beginPath();
            ctx.moveTo(this.x + 3, this.y - 10);
            ctx.lineTo(this.x + 4, this.y - 4 + digOffset);
            ctx.stroke();

            // Pickaxe/shovel indicator
            ctx.strokeStyle = '#78716c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x - 1, this.y - 2 + digOffset);
            ctx.lineTo(this.x + 1, this.y - 2 + digOffset);
            ctx.lineTo(this.x, this.y + digOffset);
            ctx.closePath();
            ctx.fillStyle = '#78716c';
            ctx.fill();
            ctx.stroke();
        }

        // Draw builder animation (if building)
        if (this.state === STATES.BUILDING) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            // Animated hammering motion - arms swinging up and down
            const hammerOffset = Math.sin(this.animationFrame / 4) * 3;

            // Right arm (hammering motion) - swings forward and down
            ctx.beginPath();
            ctx.moveTo(this.x + 3, this.y - 10);
            ctx.lineTo(this.x + 7 * this.direction, this.y - 7 + hammerOffset);
            ctx.stroke();

            // Left arm (supporting)
            ctx.beginPath();
            ctx.moveTo(this.x - 3, this.y - 10);
            ctx.lineTo(this.x - 2, this.y - 6);
            ctx.stroke();

            // Hammer tool
            ctx.fillStyle = '#71717a';
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 1;

            // Hammer head
            ctx.beginPath();
            ctx.rect(
                this.x + (6 * this.direction) - 2,
                this.y - 6 + hammerOffset,
                4,
                2
            );
            ctx.fill();
            ctx.stroke();

            // Hammer handle
            ctx.strokeStyle = '#78716c';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x + (6 * this.direction), this.y - 5 + hammerOffset);
            ctx.lineTo(this.x + (7 * this.direction), this.y - 7 + hammerOffset);
            ctx.stroke();
        }

        // Draw climber arms (if climbing)
        if (this.state === STATES.CLIMBING) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';

            // Animated climbing motion - arms reaching upward alternately
            const climbOffset = Math.sin(this.animationFrame / 6) * 3;

            // Left arm (reaching up)
            ctx.beginPath();
            ctx.moveTo(this.x - 3, this.y - 10);
            ctx.lineTo(this.x - 2, this.y - 16 - climbOffset);
            ctx.stroke();

            // Right arm (reaching up, offset from left)
            ctx.beginPath();
            ctx.moveTo(this.x + 3, this.y - 10);
            ctx.lineTo(this.x + 2, this.y - 16 + climbOffset);
            ctx.stroke();
        }

        // Draw basher arms (if bashing)
        if (this.state === STATES.BASHING) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';

            // Animated swinging motion - arms swinging forward and back
            const swingOffset = Math.sin(this.animationFrame / 4) * 4;

            // Right arm (swinging forward in direction of bash)
            ctx.beginPath();
            ctx.moveTo(this.x + 3, this.y - 10);
            ctx.lineTo(this.x + (8 * this.direction), this.y - 8 + swingOffset);
            ctx.stroke();

            // Left arm (supporting)
            ctx.beginPath();
            ctx.moveTo(this.x - 3, this.y - 10);
            ctx.lineTo(this.x - 1, this.y - 7);
            ctx.stroke();

            // Pickaxe tool (in front of basher)
            ctx.fillStyle = '#71717a';
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 1.5;

            // Pickaxe head
            ctx.beginPath();
            ctx.moveTo(this.x + (7 * this.direction), this.y - 8 + swingOffset);
            ctx.lineTo(this.x + (10 * this.direction), this.y - 10 + swingOffset);
            ctx.lineTo(this.x + (9 * this.direction), this.y - 6 + swingOffset);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Pickaxe handle
            ctx.strokeStyle = '#78716c';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x + (8 * this.direction), this.y - 8 + swingOffset);
            ctx.lineTo(this.x + (7 * this.direction), this.y - 9 + swingOffset);
            ctx.stroke();
        }

        ctx.restore();

        // Clear hover glow shadow
        if (isHovered && this.state !== STATES.DEAD) {
            ctx.restore();
        }

        // Clear ready to bash glow shadow
        if (this.readyToBash && this.state !== STATES.DEAD) {
            ctx.restore();
        }

        // State indicator (debug)
        if (this.state === STATES.FALLING) {
            ctx.save();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.height - 8, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Bomber countdown display
        if (this.bomberCountdown >= 0) {
            ctx.save();

            // Calculate seconds remaining (round up)
            const secondsRemaining = Math.ceil((this.bomberCountdown + 1) / 60);

            // Draw countdown number above lemming's head
            ctx.font = 'bold 20px "Fredoka", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            // Add outline for readability
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(secondsRemaining.toString(), this.x, this.y - this.height - 15);

            // Fill with red color
            ctx.fillStyle = '#ef4444';
            ctx.fillText(secondsRemaining.toString(), this.x, this.y - this.height - 15);

            ctx.restore();
        }
    }

    hasWallAhead(terrain) {
        if (!terrain) return false;

        const checkX = this.x + (this.direction * (this.width / 2 + 2));
        const checkY = this.y - this.height / 2;

        for (let i = 0; i < 3; i++) {
            if (terrain.isSolid(checkX, checkY + i * 5)) {
                return true;
            }
        }

        // Additional samples near the feet so shallow steps (e.g., builder ramps) count as obstacles
        for (let offset = 1; offset <= MAX_STEP_CLIMB; offset++) {
            if (terrain.isSolid(checkX, this.y - offset)) {
                return true;
            }
        }

        return false;
    }

    isSpaceClear(terrain, candidateFeetY) {
        return this.isSpaceClearAt(terrain, this.x, candidateFeetY);
    }

    isSpaceClearAt(terrain, centerX, candidateFeetY) {
        if (!terrain) return true;

        const halfWidth = this.width / 2 - 1;
        const sampleXs = [centerX - halfWidth, centerX, centerX + halfWidth];
        const topY = candidateFeetY - this.height + 1;

        for (const sampleX of sampleXs) {
            for (let sampleY = topY; sampleY <= candidateFeetY; sampleY += 2) {
                if (terrain.isSolid(sampleX, sampleY)) {
                    return false;
                }
            }
        }

        return true;
    }

    tryStepUp(terrain) {
        const originalY = this.y;

        for (let step = 1; step <= MAX_STEP_CLIMB; step++) {
            const candidateY = originalY - step;
            if (!this.isSpaceClear(terrain, candidateY)) {
                continue;
            }

            this.y = candidateY;
            return true;
        }

        this.y = originalY;
        return false;
    }
}
