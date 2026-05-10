import { STATES } from './constants.js';

export default class LevelValidator {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.errors = [];
        this.warnings = [];
    }

    validate(levelData) {
        this.errors = [];
        this.warnings = [];

        this.validateMetadata(levelData);
        this.validateDimensions(levelData);
        this.validateEntrance(levelData);
        this.validateExit(levelData);
        this.validateSections(levelData);
        this.validateSkillRequirements(levelData);
        this.validatePathExists(levelData);

        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    validateMetadata(levelData) {
        if (!levelData.metadata) {
            this.errors.push('Level missing metadata');
            return;
        }

        if (!levelData.metadata.name) {
            this.warnings.push('Level missing name in metadata');
        }

        if (levelData.metadata.width !== this.canvasWidth) {
            this.warnings.push(`Level width ${levelData.metadata.width} doesn't match canvas width ${this.canvasWidth}`);
        }

        if (levelData.metadata.height !== this.canvasHeight) {
            this.warnings.push(`Level height ${levelData.metadata.height} doesn't match canvas height ${this.canvasHeight}`);
        }
    }

    validateDimensions(levelData) {
        const allTerrain = this.getAllTerrain(levelData);

        allTerrain.forEach((rect, index) => {
            // Check if terrain is within bounds
            if (rect.x < 0 || rect.y < 0) {
                this.errors.push(`Terrain block ${index} has negative coordinates: (${rect.x}, ${rect.y})`);
            }

            if (rect.x + rect.width > this.canvasWidth) {
                this.errors.push(`Terrain block ${index} extends beyond canvas width: x=${rect.x}, width=${rect.width}, canvas=${this.canvasWidth}`);
            }

            if (rect.y + rect.height > this.canvasHeight) {
                this.errors.push(`Terrain block ${index} extends beyond canvas height: y=${rect.y}, height=${rect.height}, canvas=${this.canvasHeight}`);
            }

            // Check for invalid dimensions
            if (rect.width <= 0 || rect.height <= 0) {
                this.errors.push(`Terrain block ${index} has invalid dimensions: ${rect.width}x${rect.height}`);
            }
        });
    }

    validateEntrance(levelData) {
        if (!levelData.entrance) {
            this.errors.push('Level missing entrance definition');
            return;
        }

        const { x, y } = levelData.entrance;

        if (x < 0 || x > this.canvasWidth || y < 0 || y > this.canvasHeight) {
            this.errors.push(`Entrance position (${x}, ${y}) is out of bounds`);
        }

        // Check if entrance is above some terrain (lemmings need somewhere to land)
        const allTerrain = this.getAllTerrain(levelData);
        let hasTerrainBelow = false;

        for (const rect of allTerrain) {
            // Check if there's terrain within 200 pixels below entrance
            if (rect.y > y && rect.y < y + 200) {
                if (x >= rect.x && x <= rect.x + rect.width) {
                    hasTerrainBelow = true;
                    break;
                }
            }
        }

        if (!hasTerrainBelow) {
            this.warnings.push('Entrance has no terrain within 200 pixels below - lemmings may fall to death');
        }
    }

    validateExit(levelData) {
        if (!levelData.exit) {
            this.errors.push('Level missing exit definition');
            return;
        }

        const { position, dimensions } = levelData.exit;

        if (!position || !dimensions) {
            this.errors.push('Exit missing position or dimensions');
            return;
        }

        const { x, y } = position;
        const { width, height } = dimensions;

        if (x < 0 || x + width > this.canvasWidth || y < 0 || y + height > this.canvasHeight) {
            this.errors.push(`Exit (${x}, ${y}, ${width}x${height}) is out of bounds`);
        }

        // Check if exit is on solid ground
        const allTerrain = this.getAllTerrain(levelData);
        let onSolidGround = false;

        for (const rect of allTerrain) {
            // Check if exit sits on top of terrain
            if (Math.abs(rect.y - (y + height)) <= 5) {
                if (x >= rect.x - width && x <= rect.x + rect.width) {
                    onSolidGround = true;
                    break;
                }
            }
        }

        if (!onSolidGround) {
            this.warnings.push('Exit is not positioned on solid ground');
        }
    }

    validateSections(levelData) {
        if (!levelData.sections || levelData.sections.length === 0) {
            this.warnings.push('Level has no sections defined');
            return;
        }

        levelData.sections.forEach((section, index) => {
            if (!section.name) {
                this.warnings.push(`Section ${index} missing name`);
            }

            if (!section.type) {
                this.warnings.push(`Section ${index} (${section.name}) missing type`);
            }

            if (!section.terrain || section.terrain.length === 0) {
                this.warnings.push(`Section ${index} (${section.name}) has no terrain`);
            }

            if (section.type === 'challenge' && !section.requiredSkills) {
                this.warnings.push(`Challenge section ${section.name} doesn't specify required skills`);
            }
        });
    }

    validateSkillRequirements(levelData) {
        if (!levelData.metadata || !levelData.metadata.requiredSkills) {
            this.warnings.push('Level missing required skills specification');
            return;
        }

        const requiredSkills = levelData.metadata.requiredSkills;
        const validSkills = ['blocker', 'digger', 'builder', 'bomber'];

        for (const skill in requiredSkills) {
            if (!validSkills.includes(skill)) {
                this.warnings.push(`Unknown skill type in requirements: ${skill}`);
            }

            if (requiredSkills[skill] < 0) {
                this.errors.push(`Invalid skill requirement: ${skill} = ${requiredSkills[skill]}`);
            }
        }

        // Check if section requirements match level requirements
        const sectionSkills = new Set();
        if (levelData.sections) {
            levelData.sections.forEach(section => {
                if (section.requiredSkills) {
                    section.requiredSkills.forEach(skill => sectionSkills.add(skill));
                }
            });
        }

        sectionSkills.forEach(skill => {
            if (!requiredSkills[skill] || requiredSkills[skill] === 0) {
                this.warnings.push(`Section requires ${skill} but level metadata doesn't list it as required`);
            }
        });
    }

    validatePathExists(levelData) {
        if (!levelData.entrance || !levelData.exit) {
            return; // Already validated in other methods
        }

        // Create a simple terrain grid for pathfinding
        const grid = Array(this.canvasHeight).fill(null).map(() => Array(this.canvasWidth).fill(false));

        // Fill in terrain
        const allTerrain = this.getAllTerrain(levelData);
        allTerrain.forEach(rect => {
            for (let y = rect.y; y < rect.y + rect.height && y < this.canvasHeight; y++) {
                for (let x = rect.x; x < rect.x + rect.width && x < this.canvasWidth; x++) {
                    if (x >= 0 && y >= 0) {
                        grid[y][x] = true;
                    }
                }
            }
        });

        // Start from entrance position
        const startX = Math.floor(levelData.entrance.x);
        const startY = Math.floor(levelData.entrance.y);

        // Exit area
        const exitLeft = Math.floor(levelData.exit.position.x);
        const exitRight = Math.floor(levelData.exit.position.x + levelData.exit.dimensions.width);
        const exitTop = Math.floor(levelData.exit.position.y);
        const exitBottom = Math.floor(levelData.exit.position.y + levelData.exit.dimensions.height);

        // Simplified reachability check using flood fill
        // This checks if lemmings can reach exit area considering:
        // - Walking on terrain
        // - Falling (up to safe fall distance ~100px)
        // - Wrapping around screen edges

        const MAX_FALL_DISTANCE = 100;
        const visited = Array(this.canvasHeight).fill(null).map(() => Array(this.canvasWidth).fill(false));
        const queue = [{ x: startX, y: startY }];
        visited[startY][startX] = true;

        let foundPath = false;
        let iterations = 0;
        const MAX_ITERATIONS = 10000; // Prevent infinite loops

        while (queue.length > 0 && iterations < MAX_ITERATIONS) {
            iterations++;
            const { x, y } = queue.shift();

            // Check if we reached exit area
            if (x >= exitLeft && x <= exitRight && y >= exitTop && y <= exitBottom) {
                foundPath = true;
                break;
            }

            // Try moving in different directions
            const moves = [
                { dx: 1, dy: 0 },   // Right
                { dx: -1, dy: 0 },  // Left
                { dx: 0, dy: 1 }    // Down (falling)
            ];

            for (const { dx, dy } of moves) {
                let nx = x + dx;
                let ny = y + dy;

                // Handle screen wrapping
                if (nx < 0) nx = this.canvasWidth - 1;
                if (nx >= this.canvasWidth) nx = 0;

                // Check bounds
                if (ny < 0 || ny >= this.canvasHeight) continue;

                // Skip if already visited
                if (visited[ny][nx]) continue;

                // For horizontal movement, check if there's ground below
                if (dy === 0) {
                    // Check if position is walkable (air above, ground below)
                    const hasGroundBelow = ny + 1 < this.canvasHeight && grid[ny + 1][nx];
                    const isAir = !grid[ny][nx];

                    if (isAir && hasGroundBelow) {
                        visited[ny][nx] = true;
                        queue.push({ x: nx, y: ny });
                    }
                }
                // For falling, check if we can fall safely
                else if (dy === 1) {
                    let fallDistance = 0;
                    let fallY = y;

                    // Simulate fall
                    while (fallY < this.canvasHeight && !grid[fallY][nx] && fallDistance < MAX_FALL_DISTANCE) {
                        fallY++;
                        fallDistance++;
                    }

                    // Check if we landed on ground and fall wasn't too far
                    if (fallY < this.canvasHeight && grid[fallY][nx] && fallDistance < MAX_FALL_DISTANCE) {
                        const landY = fallY - 1;
                        if (!visited[landY][nx]) {
                            visited[landY][nx] = true;
                            queue.push({ x: nx, y: landY });
                        }
                    }
                }
            }
        }

        if (!foundPath) {
            this.warnings.push('No obvious path found from entrance to exit - level may be impossible without skills or require precise skill usage');
        } else {
            console.log(`Path validation: Found path to exit in ${iterations} iterations`);
        }
    }

    getAllTerrain(levelData) {
        const terrain = [];

        // Collect from sections
        if (levelData.sections) {
            levelData.sections.forEach(section => {
                if (section.terrain) {
                    terrain.push(...section.terrain);
                }
            });
        }

        // Add decoration
        if (levelData.decoration) {
            terrain.push(...levelData.decoration);
        }

        // Add ground
        if (levelData.ground) {
            terrain.push(levelData.ground);
        }

        return terrain;
    }

    // Helper to get flat terrain array for TerrainManager (maintains compatibility)
    static flattenTerrain(levelData) {
        const terrain = [];

        // Collect from sections
        if (levelData.sections) {
            levelData.sections.forEach(section => {
                if (section.terrain) {
                    terrain.push(...section.terrain);
                }
            });
        }

        // Add decoration
        if (levelData.decoration) {
            terrain.push(...levelData.decoration);
        }

        // Add ground
        if (levelData.ground) {
            terrain.push(levelData.ground);
        }

        return terrain;
    }
}
