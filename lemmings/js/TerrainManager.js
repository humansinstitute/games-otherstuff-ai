import { COLORS } from './constants.js';
import LevelValidator from './LevelValidator.js';

export default class TerrainManager {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Create 2D boolean array for terrain
        this.grid = Array(height).fill(null).map(() => Array(width).fill(false));

        // Create color variation map for organic look
        this.colorMap = Array(height).fill(null).map(() =>
            Array(width).fill(null).map(() => ({
                r: COLORS.TERRAIN_BASE_R + Math.random() * 30 - 15,
                g: COLORS.TERRAIN_BASE_G + Math.random() * 20 - 10,
                b: COLORS.TERRAIN_BASE_B + Math.random() * 20 - 10
            }))
        );
    }

    clear() {
        // Clear all terrain and regenerate color map
        this.grid = Array(this.height).fill(null).map(() => Array(this.width).fill(false));
        this.colorMap = Array(this.height).fill(null).map(() =>
            Array(this.width).fill(null).map(() => ({
                r: COLORS.TERRAIN_BASE_R + Math.random() * 30 - 15,
                g: COLORS.TERRAIN_BASE_G + Math.random() * 20 - 10,
                b: COLORS.TERRAIN_BASE_B + Math.random() * 20 - 10
            }))
        );
    }

    initializeFromLevel(levelData) {
        // Clear existing terrain first
        this.clear();

        // Get flattened terrain array from new level format
        const terrain = LevelValidator.flattenTerrain(levelData);

        // Draw all terrain rectangles
        terrain.forEach(rect => {
            this.drawRect(rect.x, rect.y, rect.width, rect.height, true);
        });
    }

    drawRect(x, y, width, height, value) {
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const px = x + dx;
                const py = y + dy;
                if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
                    this.grid[py][px] = value;
                }
            }
        }
    }

    removeTerrainRect(x, y, width, height) {
        // Remove terrain in a rectangular area centered at (x, y)
        const startX = Math.floor(x - width / 2);
        const startY = Math.floor(y);

        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const px = startX + dx;
                const py = startY + dy;
                if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
                    this.grid[py][px] = false;
                }
            }
        }
    }

    removeTerrainCircle(x, y, radius) {
        // Remove terrain in a circular area centered at (x, y)
        const centerX = Math.floor(x);
        const centerY = Math.floor(y);
        const radiusSquared = radius * radius;

        // Check all pixels in bounding box
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                // Check if pixel is within circle
                if (dx * dx + dy * dy <= radiusSquared) {
                    const px = centerX + dx;
                    const py = centerY + dy;
                    if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
                        this.grid[py][px] = false;
                    }
                }
            }
        }
    }

    addTerrainRect(x, y, width, height, colorOptions = null) {
        // Add terrain in a rectangular area at (x, y)
        const useCustomColor = Boolean(colorOptions?.color);
        const variation = colorOptions?.variation ?? 0;

        const clampChannel = (value) => Math.max(0, Math.min(255, value));

        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const px = Math.floor(x + dx);
                const py = Math.floor(y + dy);
                if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
                    this.grid[py][px] = true;
                    // Regenerate color for new terrain
                    if (useCustomColor) {
                        const base = colorOptions.color;
                        const jitter = () => (Math.random() - 0.5) * variation * 2;
                        this.colorMap[py][px] = {
                            r: clampChannel(base.r + jitter()),
                            g: clampChannel(base.g + jitter()),
                            b: clampChannel(base.b + jitter())
                        };
                    } else {
                        this.colorMap[py][px] = {
                            r: COLORS.TERRAIN_BASE_R + Math.random() * 30 - 15,
                            g: COLORS.TERRAIN_BASE_G + Math.random() * 20 - 10,
                            b: COLORS.TERRAIN_BASE_B + Math.random() * 20 - 10
                        };
                    }
                }
            }
        }
    }

    isSolid(x, y) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        if (px < 0 || px >= this.width || py < 0 || py >= this.height) {
            return false;
        }
        return this.grid[py][px];
    }

    render(ctx) {
        // Use image data for efficient pixel manipulation
        const imageData = ctx.createImageData(this.width, this.height);
        const data = imageData.data;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x]) {
                    const index = (y * this.width + x) * 4;
                    const color = this.colorMap[y][x];

                    data[index] = color.r;     // R
                    data[index + 1] = color.g; // G
                    data[index + 2] = color.b; // B
                    data[index + 3] = 255;     // A
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }
}
