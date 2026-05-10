/**
 * Dumpling Town - Renderer
 * Handles all canvas drawing with cute pixel art style
 */

import { Fillings } from './entities.js';

// Polyfill for roundRect if not supported
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radii) {
        const radius = typeof radii === 'number' ? radii : (radii?.[0] || 0);
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.arcTo(x + width, y, x + width, y + radius, radius);
        this.lineTo(x + width, y + height - radius);
        this.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        this.lineTo(x + radius, y + height);
        this.arcTo(x, y + height, x, y + height - radius, radius);
        this.lineTo(x, y + radius);
        this.arcTo(x, y, x + radius, y, radius);
        this.closePath();
    };
}

export class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;

        // Color palette - soft kawaii colors
        this.colors = {
            sky: '#87ceeb',
            grass: '#90c96b',
            grassDark: '#7ab85a',
            path: '#e8dcc8',
            pathEdge: '#d4c4a8',
            water: '#7ec8e3',
            waterHighlight: '#a8dff0',
            shadow: 'rgba(0, 0, 0, 0.1)',
            white: '#ffffff',
            cream: '#fff8f0'
        };

        // Base tile size (will be scaled)
        this.baseTileSize = 16;

        // Fixed scale for nice pixel art look (2x makes things visible but not huge)
        this.scale = 2;
        this.tileSize = this.baseTileSize * this.scale;

        // View dimensions (updated on resize)
        this.viewWidth = 800;
        this.viewHeight = 600;
    }

    onResize(width, height) {
        this.viewWidth = width || this.canvas.width;
        this.viewHeight = height || this.canvas.height;
        // Re-get context in case it was reset
        this.ctx = this.canvas.getContext('2d');
    }

    // Word wrap helper - splits text into lines that fit within maxWidth
    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const metrics = this.ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    clear() {
        // Fill with grass color
        this.ctx.fillStyle = this.colors.grass;
        this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    }

    drawWorld(world, camera) {
        const baseTile = this.baseTileSize;
        const startTileX = Math.floor(camera.x / baseTile);
        const startTileY = Math.floor(camera.y / baseTile);
        const endTileX = startTileX + Math.ceil(this.viewWidth / this.tileSize) + 1;
        const endTileY = startTileY + Math.ceil(this.viewHeight / this.tileSize) + 1;

        // Draw tiles
        for (let y = startTileY; y < endTileY; y++) {
            for (let x = startTileX; x < endTileX; x++) {
                const tile = world.getTile(x, y);
                this.drawTile(x, y, tile, camera);
            }
        }

        // Draw decorations
        for (const deco of world.decorations) {
            this.drawDecoration(deco, camera);
        }

        // Draw houses
        for (const house of world.houses) {
            this.drawHouse(house, camera);
        }
    }

    drawTile(tileX, tileY, tile, camera) {
        const s = this.scale;
        const base = this.baseTileSize;
        const x = (tileX * base - camera.x) * s;
        const y = (tileY * base - camera.y) * s;
        const size = this.tileSize;

        switch (tile) {
            case 'grass':
                // Base grass
                this.ctx.fillStyle = this.colors.grass;
                this.ctx.fillRect(x, y, size, size);

                // Add grass detail
                if ((tileX + tileY) % 3 === 0) {
                    this.ctx.fillStyle = this.colors.grassDark;
                    this.ctx.fillRect(x + 4 * s, y + 4 * s, 2 * s, 2 * s);
                }
                break;

            case 'path':
                this.ctx.fillStyle = this.colors.path;
                this.ctx.fillRect(x, y, size, size);

                // Path texture
                if ((tileX + tileY) % 5 === 0) {
                    this.ctx.fillStyle = this.colors.pathEdge;
                    this.ctx.fillRect(x + 3 * s, y + 7 * s, 3 * s, 2 * s);
                }
                break;

            case 'water':
                this.ctx.fillStyle = this.colors.water;
                this.ctx.fillRect(x, y, size, size);

                // Water shimmer
                const shimmer = Math.sin(Date.now() / 500 + tileX + tileY) * 0.5 + 0.5;
                if (shimmer > 0.7) {
                    this.ctx.fillStyle = this.colors.waterHighlight;
                    this.ctx.fillRect(x + 2 * s, y + 4 * s, 4 * s, 2 * s);
                }
                break;

            case 'soy_sauce':
                // Dark brown soy sauce river
                this.ctx.fillStyle = '#3d2314';
                this.ctx.fillRect(x, y, size, size);

                // Soy sauce shimmer/ripple effect
                const soyShimmer = Math.sin(Date.now() / 400 + tileX * 0.5 + tileY) * 0.5 + 0.5;
                if (soyShimmer > 0.6) {
                    this.ctx.fillStyle = '#5c3a2a';
                    this.ctx.fillRect(x + 3 * s, y + 2 * s, 5 * s, 2 * s);
                }
                // Darker current lines
                if ((tileX + tileY) % 4 === 0) {
                    this.ctx.fillStyle = '#2a1810';
                    this.ctx.fillRect(x, y + 6 * s, size, 2 * s);
                }
                break;

            case 'bridge':
                // Draw soy sauce underneath first
                this.ctx.fillStyle = '#3d2314';
                this.ctx.fillRect(x, y, size, size);

                // Wooden bridge planks
                this.ctx.fillStyle = '#8b6914';
                this.ctx.fillRect(x + 1 * s, y, size - 2 * s, size);

                // Plank lines
                this.ctx.strokeStyle = '#6b4f12';
                this.ctx.lineWidth = 1;
                for (let py = 0; py < 4; py++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + 1 * s, y + py * 4 * s);
                    this.ctx.lineTo(x + size - 1 * s, y + py * 4 * s);
                    this.ctx.stroke();
                }

                // Bridge railings on sides
                this.ctx.fillStyle = '#a67c00';
                this.ctx.fillRect(x, y, 2 * s, size);
                this.ctx.fillRect(x + size - 2 * s, y, 2 * s, size);
                break;

            case 'wall':
                this.ctx.fillStyle = '#8b7355';
                this.ctx.fillRect(x, y, size, size);
                break;

            case 'sand':
                // Sandy beach
                this.ctx.fillStyle = '#f4d03f';
                this.ctx.fillRect(x, y, size, size);

                // Sandy texture dots
                if ((tileX + tileY) % 3 === 0) {
                    this.ctx.fillStyle = '#e6c229';
                    this.ctx.fillRect(x + 4 * s, y + 6 * s, 3 * s, 2 * s);
                }
                break;

            default:
                // Default to grass
                this.ctx.fillStyle = this.colors.grass;
                this.ctx.fillRect(x, y, size, size);
        }
    }

    drawDecoration(deco, camera) {
        const s = this.scale;
        const x = (deco.x - camera.x) * s;
        const y = (deco.y - camera.y) * s;

        switch (deco.type) {
            case 'tree':
                this.drawTree(x, y, s);
                break;
            case 'flower':
                this.drawFlower(x, y, deco.color || '#ff69b4', s);
                break;
            case 'lantern':
                this.drawLantern(x, y, s);
                break;
            case 'rock':
                this.drawRock(x, y, s);
                break;
            case 'fishing_spot':
                this.drawFishingSpot(x, y, s);
                break;
            case 'dock':
                this.drawDock(x, y, s);
                break;
            case 'palm_tree':
                this.drawPalmTree(x, y, s);
                break;
            case 'school_sign':
                this.drawSchoolSign(x, y, s);
                break;
            case 'beach_umbrella':
                this.drawBeachUmbrella(x, y, deco.color || '#ff8a80', s);
                break;
        }
    }

    drawFishingSpot(x, y, s = 1) {
        // Wooden sign post
        this.ctx.fillStyle = '#8b6914';
        this.ctx.fillRect(x + 6 * s, y + 8 * s, 4 * s, 12 * s);

        // Sign board
        this.ctx.fillStyle = '#a67c4e';
        this.ctx.fillRect(x - 2 * s, y + 2 * s, 20 * s, 10 * s);
        this.ctx.strokeStyle = '#6b4e31';
        this.ctx.lineWidth = s;
        this.ctx.strokeRect(x - 2 * s, y + 2 * s, 20 * s, 10 * s);

        // Fish emoji on sign
        this.ctx.font = `${8 * s}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🎣', x + 8 * s, y + 10 * s);
        this.ctx.textAlign = 'left';
    }

    drawDock(x, y, s = 1) {
        // Wooden dock platform
        this.ctx.fillStyle = '#a67c4e';
        this.ctx.fillRect(x, y + 10 * s, 40 * s, 30 * s);

        // Dock planks (horizontal lines)
        this.ctx.strokeStyle = '#8b6914';
        this.ctx.lineWidth = s;
        for (let i = 0; i < 4; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + (15 + i * 8) * s);
            this.ctx.lineTo(x + 40 * s, y + (15 + i * 8) * s);
            this.ctx.stroke();
        }

        // Support posts
        this.ctx.fillStyle = '#6b4e31';
        this.ctx.fillRect(x + 2 * s, y + 38 * s, 6 * s, 8 * s);
        this.ctx.fillRect(x + 32 * s, y + 38 * s, 6 * s, 8 * s);

        // Sign post
        this.ctx.fillRect(x + 15 * s, y, 4 * s, 12 * s);

        // Sign
        this.ctx.fillStyle = '#d4a574';
        this.ctx.fillRect(x + 5 * s, y - 2 * s, 24 * s, 12 * s);
        this.ctx.strokeRect(x + 5 * s, y - 2 * s, 24 * s, 12 * s);

        // Boat emoji
        this.ctx.font = `${10 * s}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🚢', x + 17 * s, y + 8 * s);
        this.ctx.textAlign = 'left';
    }

    drawPalmTree(x, y, s = 1) {
        // Shadow
        this.ctx.fillStyle = this.colors.shadow;
        this.ctx.beginPath();
        this.ctx.ellipse(x + 12 * s, y + 32 * s, 12 * s, 4 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Curved trunk
        this.ctx.fillStyle = '#8b6914';
        this.ctx.beginPath();
        this.ctx.moveTo(x + 10 * s, y + 28 * s);
        this.ctx.quadraticCurveTo(x + 8 * s, y + 14 * s, x + 12 * s, y + 4 * s);
        this.ctx.lineTo(x + 16 * s, y + 4 * s);
        this.ctx.quadraticCurveTo(x + 16 * s, y + 14 * s, x + 14 * s, y + 28 * s);
        this.ctx.fill();

        // Palm fronds (leaves)
        this.ctx.fillStyle = '#228b22';
        const frondAngles = [-0.8, -0.4, 0, 0.4, 0.8];
        for (const angle of frondAngles) {
            this.ctx.save();
            this.ctx.translate(x + 13 * s, y + 5 * s);
            this.ctx.rotate(angle);
            this.ctx.beginPath();
            this.ctx.ellipse(0, -10 * s, 4 * s, 12 * s, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // Coconuts
        this.ctx.fillStyle = '#8b4513';
        this.ctx.beginPath();
        this.ctx.arc(x + 10 * s, y + 6 * s, 2 * s, 0, Math.PI * 2);
        this.ctx.arc(x + 15 * s, y + 7 * s, 2 * s, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawBeachUmbrella(x, y, color, s = 1) {
        // Pole
        this.ctx.fillStyle = '#8b6914';
        this.ctx.fillRect(x + 15 * s, y + 12 * s, 3 * s, 28 * s);

        // Canopy
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 2 * s, y + 18 * s);
        this.ctx.quadraticCurveTo(x + 16 * s, y - 4 * s, x + 30 * s, y + 18 * s);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + 16 * s, y + 1 * s);
            this.ctx.lineTo(x + (8 + i * 7) * s, y + 18 * s);
            this.ctx.lineTo(x + (13 + i * 5) * s, y + 18 * s);
            this.ctx.closePath();
            this.ctx.fill();
        }

        // Towel
        this.ctx.fillStyle = '#fff8f0';
        this.ctx.fillRect(x + 1 * s, y + 33 * s, 26 * s, 8 * s);
        this.ctx.fillStyle = '#f48fb1';
        this.ctx.fillRect(x + 1 * s, y + 36 * s, 26 * s, 2 * s);
    }

    drawSchoolSign(x, y, s = 1) {
        // Sign posts
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(x + 8 * s, y + 20 * s, 4 * s, 20 * s);
        this.ctx.fillRect(x + 48 * s, y + 20 * s, 4 * s, 20 * s);

        // Sign board
        this.ctx.fillStyle = '#deb887';
        this.ctx.fillRect(x, y, 60 * s, 24 * s);
        this.ctx.strokeStyle = '#8b4513';
        this.ctx.lineWidth = 2 * s;
        this.ctx.strokeRect(x, y, 60 * s, 24 * s);

        // Text
        this.ctx.fillStyle = '#4a3728';
        this.ctx.font = `bold ${8 * s}px "M PLUS Rounded 1c", sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DUMPLING', x + 30 * s, y + 10 * s);
        this.ctx.fillText('ACADEMY', x + 30 * s, y + 20 * s);
        this.ctx.textAlign = 'left';
    }

    drawTree(x, y, s = 1) {
        // Shadow
        this.ctx.fillStyle = this.colors.shadow;
        this.ctx.beginPath();
        this.ctx.ellipse(x + 12 * s, y + 28 * s, 10 * s, 4 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Trunk
        this.ctx.fillStyle = '#8b6914';
        this.ctx.fillRect(x + 9 * s, y + 16 * s, 6 * s, 12 * s);

        // Foliage (stacked circles for cute look)
        this.ctx.fillStyle = '#5a8a4a';
        this.ctx.beginPath();
        this.ctx.arc(x + 12 * s, y + 10 * s, 10 * s, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#6ba35a';
        this.ctx.beginPath();
        this.ctx.arc(x + 8 * s, y + 12 * s, 7 * s, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(x + 16 * s, y + 12 * s, 7 * s, 0, Math.PI * 2);
        this.ctx.fill();

        // Highlight
        this.ctx.fillStyle = '#8bc97a';
        this.ctx.beginPath();
        this.ctx.arc(x + 10 * s, y + 7 * s, 3 * s, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawFlower(x, y, color, s = 1) {
        // Stem
        this.ctx.fillStyle = '#6ba35a';
        this.ctx.fillRect(x + 7 * s, y + 10 * s, 2 * s, 6 * s);

        // Petals
        this.ctx.fillStyle = color;
        const petalRadius = 3 * s;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            const px = x + 8 * s + Math.cos(angle) * 3 * s;
            const py = y + 7 * s + Math.sin(angle) * 3 * s;
            this.ctx.beginPath();
            this.ctx.arc(px, py, petalRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Center
        this.ctx.fillStyle = '#ffeb3b';
        this.ctx.beginPath();
        this.ctx.arc(x + 8 * s, y + 7 * s, 2 * s, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawLantern(x, y, s = 1) {
        // Post
        this.ctx.fillStyle = '#5d4037';
        this.ctx.fillRect(x + 6 * s, y + 8 * s, 4 * s, 16 * s);

        // Lantern body
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.fillRect(x + 2 * s, y + 2 * s, 12 * s, 10 * s);

        // Glow effect
        this.ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(x + 8 * s, y + 7 * s, 10 * s, 0, Math.PI * 2);
        this.ctx.fill();

        // Lantern detail
        this.ctx.fillStyle = '#ffab91';
        this.ctx.fillRect(x + 4 * s, y + 4 * s, 8 * s, 2 * s);
    }

    drawRock(x, y, s = 1) {
        this.ctx.fillStyle = '#9e9e9e';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 8 * s, y + 12 * s, 7 * s, 5 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Highlight
        this.ctx.fillStyle = '#bdbdbd';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 6 * s, y + 10 * s, 3 * s, 2 * s, -0.3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawHouse(house, camera) {
        const s = this.scale;
        const x = (house.x - camera.x) * s;
        const y = (house.y - camera.y) * s;
        const filling = house.fillingData;

        // Determine number of basket levels (1-3) based on house position for variety
        const levelSeed = (Math.abs(house.x) + Math.abs(house.y)) % 100;
        const levels = levelSeed < 33 ? 1 : levelSeed < 66 ? 2 : 3;

        const basketWidth = 56 * s;
        const basketHeight = 18 * s;
        const centerX = x + 32 * s;
        const baseY = y + 55 * s;

        // Shadow
        this.ctx.fillStyle = this.colors.shadow;
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, baseY + 4 * s, 28 * s, 7 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw stacked basket levels from bottom to top
        for (let level = 0; level < levels; level++) {
            const levelY = baseY - (level * basketHeight);

            // Basket body (bamboo color)
            this.ctx.fillStyle = '#d4a574';
            this.ctx.beginPath();
            this.ctx.ellipse(centerX, levelY, 28 * s, 8 * s, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Basket side
            this.ctx.fillStyle = '#c49464';
            this.ctx.fillRect(centerX - 28 * s, levelY - basketHeight + 8 * s, 56 * s, basketHeight);

            // Top rim of basket
            this.ctx.fillStyle = '#d4a574';
            this.ctx.beginPath();
            this.ctx.ellipse(centerX, levelY - basketHeight + 8 * s, 28 * s, 8 * s, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Bamboo weave pattern (horizontal lines)
            this.ctx.strokeStyle = '#a67c52';
            this.ctx.lineWidth = 1 * s;
            for (let i = 1; i < 4; i++) {
                const lineY = levelY - basketHeight + 8 * s + (i * 4 * s);
                this.ctx.beginPath();
                this.ctx.moveTo(centerX - 26 * s, lineY);
                this.ctx.lineTo(centerX + 26 * s, lineY);
                this.ctx.stroke();
            }

            // Vertical weave lines
            for (let i = -3; i <= 3; i++) {
                const lineX = centerX + (i * 8 * s);
                this.ctx.beginPath();
                this.ctx.moveTo(lineX, levelY - basketHeight + 12 * s);
                this.ctx.lineTo(lineX, levelY - 2 * s);
                this.ctx.stroke();
            }

            // Door on bottom level only
            if (level === 0) {
                // Door frame (darker bamboo)
                this.ctx.fillStyle = '#8b6914';
                this.ctx.beginPath();
                this.ctx.ellipse(centerX, levelY - 6 * s, 10 * s, 12 * s, 0, 0, Math.PI);
                this.ctx.fill();

                // Door interior (owner's color)
                this.ctx.fillStyle = filling.color;
                this.ctx.beginPath();
                this.ctx.ellipse(centerX, levelY - 6 * s, 7 * s, 9 * s, 0, 0, Math.PI);
                this.ctx.fill();

                // Door handle
                this.ctx.fillStyle = filling.accent;
                this.ctx.beginPath();
                this.ctx.arc(centerX + 4 * s, levelY - 8 * s, 2 * s, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // Windows on each level (small round windows)
            this.ctx.fillStyle = '#87ceeb';
            this.ctx.beginPath();
            this.ctx.arc(centerX - 16 * s, levelY - 8 * s, 5 * s, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(centerX + 16 * s, levelY - 8 * s, 5 * s, 0, Math.PI * 2);
            this.ctx.fill();

            // Window frames
            this.ctx.strokeStyle = '#8b6914';
            this.ctx.lineWidth = 1.5 * s;
            this.ctx.beginPath();
            this.ctx.arc(centerX - 16 * s, levelY - 8 * s, 5 * s, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.arc(centerX + 16 * s, levelY - 8 * s, 5 * s, 0, Math.PI * 2);
            this.ctx.stroke();

            // Window shine
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(centerX - 18 * s, levelY - 10 * s, 2 * s, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(centerX + 14 * s, levelY - 10 * s, 2 * s, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Lid on top
        const lidY = baseY - (levels * basketHeight);
        this.ctx.fillStyle = '#d4a574';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, lidY, 30 * s, 9 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Lid dome
        this.ctx.fillStyle = '#c49464';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, lidY - 6 * s, 24 * s, 8 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Lid handle (small knob)
        this.ctx.fillStyle = '#8b6914';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, lidY - 12 * s, 6 * s, 4 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Lid weave pattern
        this.ctx.strokeStyle = '#a67c52';
        this.ctx.lineWidth = 1 * s;
        for (let i = -2; i <= 2; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(centerX + (i * 8 * s), lidY - 10 * s);
            this.ctx.lineTo(centerX + (i * 10 * s), lidY + 4 * s);
            this.ctx.stroke();
        }

        // Steam animation rising from lid
        const time = Date.now() / 200;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

        // Multiple steam puffs at different phases
        for (let i = 0; i < 3; i++) {
            const phase = time + i * 2;
            const steamY = lidY - 15 * s - ((phase % 4) * 6 * s);
            const steamX = centerX + Math.sin(phase) * 4 * s + (i - 1) * 8 * s;
            const steamSize = (3 - (phase % 4) * 0.5) * s;
            const steamAlpha = 0.7 - (phase % 4) * 0.15;

            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, steamAlpha)})`;
            this.ctx.beginPath();
            this.ctx.arc(steamX, steamY, Math.max(1, steamSize), 0, Math.PI * 2);
            this.ctx.fill();
        }

        // House name label
        if (house.data?.ownerName) {
            const name = house.data.ownerName;
            this.ctx.font = 'bold 10px "M PLUS Rounded 1c", sans-serif';
            const nameWidth = this.ctx.measureText(name).width;

            // Background pill
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            this.ctx.beginPath();
            this.ctx.roundRect(centerX - nameWidth / 2 - 6, baseY + 8 * s, nameWidth + 12, 16, 8);
            this.ctx.fill();

            // Name text
            this.ctx.fillStyle = '#5d4037';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(name, centerX, baseY + 19 * s);
            this.ctx.textAlign = 'left';
        }
    }

    drawDumpling(entity, camera, equippedItems = null) {
        const s = this.scale;
        const x = (entity.x - camera.x) * s;
        const y = (entity.y - camera.y - entity.bounceOffset) * s;
        const w = entity.width * s;
        const h = entity.height * s;
        const filling = entity.fillingData;

        // Shadow (stays on ground)
        this.ctx.fillStyle = this.colors.shadow;
        this.ctx.beginPath();
        this.ctx.ellipse(
            x + w / 2,
            (entity.y - camera.y + entity.height - 2) * s,
            w / 2.5,
            4 * s,
            0, 0, Math.PI * 2
        );
        this.ctx.fill();

        // Body - cute dumpling shape
        this.ctx.fillStyle = filling.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4 * s, y + 24 * s);
        this.ctx.quadraticCurveTo(x + 4 * s, y + 8 * s, x + 16 * s, y + 4 * s);
        this.ctx.quadraticCurveTo(x + 28 * s, y + 8 * s, x + 28 * s, y + 24 * s);
        this.ctx.quadraticCurveTo(x + 16 * s, y + 28 * s, x + 4 * s, y + 24 * s);
        this.ctx.fill();

        // Pleats on top
        this.ctx.strokeStyle = filling.accent;
        this.ctx.lineWidth = 1.5 * s;
        for (let i = 0; i < 3; i++) {
            const px = x + (10 + i * 4) * s;
            this.ctx.beginPath();
            this.ctx.moveTo(px, y + 6 * s);
            this.ctx.quadraticCurveTo(px + 1 * s, y + 10 * s, px, y + 14 * s);
            this.ctx.stroke();
        }

        // Face
        this.drawFace(x + 16 * s, y + 18 * s, entity.direction, entity.isBlinking, s);

        // Cheek blush
        this.ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 8 * s, y + 19 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(x + 24 * s, y + 19 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw equipped items (only for player)
        if (equippedItems) {
            this.drawEquippedItems(x, y, s, equippedItems);
        }

        // Name tag for NPCs
        if (entity.name && entity.name !== 'You') {
            const fontSize = Math.max(12, 8 * s);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = `bold ${fontSize}px "M PLUS Rounded 1c", sans-serif`;
            const nameWidth = this.ctx.measureText(entity.name).width;
            this.ctx.fillRect(x + 16 * s - nameWidth / 2 - 4, y - 12 * s, nameWidth + 8, fontSize + 4);

            this.ctx.fillStyle = '#5d4037';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(entity.name, x + 16 * s, y - 2 * s);
            this.ctx.textAlign = 'left';
        }
    }

    drawEquippedItems(x, y, s, equippedItems) {
        // Draw hat on top of dumpling
        if (equippedItems.hat) {
            const emoji = equippedItems.hat.emoji;
            this.ctx.font = `${14 * s}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(emoji, x + 16 * s, y - 2 * s);
            this.ctx.textAlign = 'left';
        }

        // Draw accessory on the side
        if (equippedItems.accessory) {
            const emoji = equippedItems.accessory.emoji;
            this.ctx.font = `${10 * s}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(emoji, x + 28 * s, y + 8 * s);
            this.ctx.textAlign = 'left';
        }

        // Draw held item in front
        if (equippedItems.held) {
            const emoji = equippedItems.held.emoji;
            this.ctx.font = `${12 * s}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(emoji, x + 4 * s, y + 22 * s);
            this.ctx.textAlign = 'left';
        }
    }

    drawFace(x, y, direction, isBlinking, s = 1) {
        // Eyes based on direction
        const eyeOffsetX = (direction === 'left' ? -2 : direction === 'right' ? 2 : 0) * s;
        const eyeOffsetY = (direction === 'up' ? -2 : direction === 'down' ? 1 : 0) * s;

        if (isBlinking) {
            // Closed eyes (happy lines)
            this.ctx.strokeStyle = '#5d4037';
            this.ctx.lineWidth = 1.5 * s;
            this.ctx.lineCap = 'round';

            // Left eye
            this.ctx.beginPath();
            this.ctx.arc(x - 4 * s + eyeOffsetX, y - 2 * s + eyeOffsetY, 2 * s, 0, Math.PI);
            this.ctx.stroke();

            // Right eye
            this.ctx.beginPath();
            this.ctx.arc(x + 4 * s + eyeOffsetX, y - 2 * s + eyeOffsetY, 2 * s, 0, Math.PI);
            this.ctx.stroke();
        } else {
            // Open eyes
            this.ctx.fillStyle = '#5d4037';

            // Left eye
            this.ctx.beginPath();
            this.ctx.arc(x - 4 * s + eyeOffsetX, y - 2 * s + eyeOffsetY, 2 * s, 0, Math.PI * 2);
            this.ctx.fill();

            // Right eye
            this.ctx.beginPath();
            this.ctx.arc(x + 4 * s + eyeOffsetX, y - 2 * s + eyeOffsetY, 2 * s, 0, Math.PI * 2);
            this.ctx.fill();

            // Eye shine
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(x - 3 * s + eyeOffsetX, y - 3 * s + eyeOffsetY, 0.8 * s, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(x + 5 * s + eyeOffsetX, y - 3 * s + eyeOffsetY, 0.8 * s, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Mouth - cute small smile
        this.ctx.strokeStyle = '#5d4037';
        this.ctx.lineWidth = 1 * s;
        this.ctx.beginPath();
        this.ctx.arc(x, y + 2 * s, 2 * s, 0.1 * Math.PI, 0.9 * Math.PI);
        this.ctx.stroke();
    }

    drawCoinsHUD(coins, rewardMessage = null) {
        const x = this.viewWidth - 120;
        const y = 70; // Below the menu toggle button

        // Background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, 100, 36, 18);
        this.ctx.fill();

        // Coin icon
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.arc(x + 22, y + 18, 12, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#ffec8b';
        this.ctx.beginPath();
        this.ctx.arc(x + 20, y + 16, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Coin amount
        this.ctx.fillStyle = '#5d4037';
        this.ctx.font = 'bold 16px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(coins.toString(), x + 42, y + 24);

        // Reward message (floating above coins)
        if (rewardMessage) {
            const bounce = Math.sin(Date.now() / 150) * 3;
            this.ctx.fillStyle = 'rgba(76, 175, 80, 0.95)';
            this.ctx.beginPath();
            this.ctx.roundRect(x - 10, y - 35 + bounce, 120, 28, 14);
            this.ctx.fill();

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px "M PLUS Rounded 1c", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(rewardMessage, x + 50, y - 15 + bounce);
            this.ctx.textAlign = 'left';
        }

        // Inventory hint
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.roundRect(x + 10, y + 44, 80, 22, 11);
        this.ctx.fill();

        this.ctx.fillStyle = '#999';
        this.ctx.font = '11px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('[I] Inventory', x + 50, y + 59);
        this.ctx.textAlign = 'left';
    }

    drawTimeHUD(displayTime, periodName, dayNumber) {
        const x = 20;
        const y = 70;

        // Background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, 130, 50, 12);
        this.ctx.fill();

        // Clock icon and time
        this.ctx.fillStyle = '#5d4037';
        this.ctx.font = 'bold 18px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`\u{1F551} ${displayTime}`, x + 10, y + 22);

        // Day and period info
        this.ctx.fillStyle = '#888';
        this.ctx.font = '12px "M PLUS Rounded 1c", sans-serif';
        this.ctx.fillText(`Day ${dayNumber}`, x + 10, y + 40);

        // Period name (smaller, right aligned)
        this.ctx.fillStyle = '#666';
        this.ctx.font = '10px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(periodName, x + 120, y + 40);
        this.ctx.textAlign = 'left';
    }

    drawInterior(building, playerPos, npcs, player, equippedItems = null, homeData = {}) {
        // Check if we're in a school room
        if (homeData.schoolRoom) {
            this.drawSchoolRoom(homeData.schoolRoom, homeData.schoolRoomDoors, playerPos, npcs, player, equippedItems);
            return;
        }

        const isPlayerHome = building.buildingType === 'playerHome';
        const filling = building.fillingData;

        // Room dimensions - cozy inset from viewport
        const margin = 40;
        const roomX = margin;
        const roomY = margin + 20;
        const roomW = this.viewWidth - margin * 2;
        const roomH = this.viewHeight - margin * 2 - 40;

        // Outer background (visible around room edges)
        this.ctx.fillStyle = '#2a1810';
        this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

        // Floor - tatami pattern
        this.ctx.fillStyle = isPlayerHome ? '#d4c4a8' : '#c8b896';
        this.ctx.fillRect(roomX, roomY, roomW, roomH);

        // Tatami mat grid
        this.ctx.strokeStyle = isPlayerHome ? '#b8a888' : '#a89870';
        this.ctx.lineWidth = 2;
        const tatamiW = roomW / 3;
        const tatamiH = roomH / 2;
        for (let i = 0; i <= 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(roomX + i * tatamiW, roomY);
            this.ctx.lineTo(roomX + i * tatamiW, roomY + roomH);
            this.ctx.stroke();
        }
        for (let i = 0; i <= 2; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(roomX, roomY + i * tatamiH);
            this.ctx.lineTo(roomX + roomW, roomY + i * tatamiH);
            this.ctx.stroke();
        }

        // Walls - top wall (taller, with wood paneling)
        const wallHeight = 80;
        this.ctx.fillStyle = isPlayerHome ? '#f5e6d3' : '#ebe0cc';
        this.ctx.fillRect(roomX, roomY, roomW, wallHeight);

        // Wood trim at top of wall
        this.ctx.fillStyle = '#8b6914';
        this.ctx.fillRect(roomX, roomY, roomW, 8);

        // Wall wainscoting pattern
        this.ctx.strokeStyle = filling.accent;
        this.ctx.lineWidth = 1;
        for (let i = 0; i < roomW; i += 60) {
            this.ctx.strokeRect(roomX + i + 5, roomY + 15, 50, wallHeight - 25);
        }

        // Left window with curtains
        const winLeftX = roomX + 40;
        const winY = roomY + 20;
        const winW = 80;
        const winH = 50;

        // Window frame
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(winLeftX, winY, winW, winH);
        this.ctx.strokeStyle = '#5d4037';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(winLeftX, winY, winW, winH);

        // Window panes
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(winLeftX + winW / 2, winY);
        this.ctx.lineTo(winLeftX + winW / 2, winY + winH);
        this.ctx.moveTo(winLeftX, winY + winH / 2);
        this.ctx.lineTo(winLeftX + winW, winY + winH / 2);
        this.ctx.stroke();

        // Left curtain
        this.ctx.fillStyle = filling.color;
        this.ctx.beginPath();
        this.ctx.moveTo(winLeftX - 10, winY - 5);
        this.ctx.quadraticCurveTo(winLeftX + 5, winY + winH / 2, winLeftX - 5, winY + winH + 10);
        this.ctx.lineTo(winLeftX - 15, winY + winH + 10);
        this.ctx.quadraticCurveTo(winLeftX - 5, winY + winH / 2, winLeftX - 15, winY - 5);
        this.ctx.fill();

        // Right curtain
        this.ctx.beginPath();
        this.ctx.moveTo(winLeftX + winW + 10, winY - 5);
        this.ctx.quadraticCurveTo(winLeftX + winW - 5, winY + winH / 2, winLeftX + winW + 5, winY + winH + 10);
        this.ctx.lineTo(winLeftX + winW + 15, winY + winH + 10);
        this.ctx.quadraticCurveTo(winLeftX + winW + 5, winY + winH / 2, winLeftX + winW + 15, winY - 5);
        this.ctx.fill();

        // Right window with curtains
        const winRightX = roomX + roomW - 120;

        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(winRightX, winY, winW, winH);
        this.ctx.strokeStyle = '#5d4037';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(winRightX, winY, winW, winH);

        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(winRightX + winW / 2, winY);
        this.ctx.lineTo(winRightX + winW / 2, winY + winH);
        this.ctx.moveTo(winRightX, winY + winH / 2);
        this.ctx.lineTo(winRightX + winW, winY + winH / 2);
        this.ctx.stroke();

        // Right window curtains
        this.ctx.fillStyle = filling.color;
        this.ctx.beginPath();
        this.ctx.moveTo(winRightX - 10, winY - 5);
        this.ctx.quadraticCurveTo(winRightX + 5, winY + winH / 2, winRightX - 5, winY + winH + 10);
        this.ctx.lineTo(winRightX - 15, winY + winH + 10);
        this.ctx.quadraticCurveTo(winRightX - 5, winY + winH / 2, winRightX - 15, winY - 5);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(winRightX + winW + 10, winY - 5);
        this.ctx.quadraticCurveTo(winRightX + winW - 5, winY + winH / 2, winRightX + winW + 5, winY + winH + 10);
        this.ctx.lineTo(winRightX + winW + 15, winY + winH + 10);
        this.ctx.quadraticCurveTo(winRightX + winW + 5, winY + winH / 2, winRightX + winW + 15, winY - 5);
        this.ctx.fill();

        // Scroll/wall art between windows
        const scrollX = roomX + roomW / 2 - 25;
        this.ctx.fillStyle = '#fff8f0';
        this.ctx.fillRect(scrollX, winY, 50, 55);
        this.ctx.strokeStyle = '#8b6914';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(scrollX, winY, 50, 55);
        // Scroll art (kanji-like design)
        this.ctx.fillStyle = '#333';
        this.ctx.font = '28px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('福', scrollX + 25, winY + 40);
        this.ctx.textAlign = 'left';

        // Door at bottom center - sliding shoji door
        const doorW = 90;
        const doorH = 70;
        const doorX = roomX + roomW / 2 - doorW / 2;
        const doorY = roomY + roomH - doorH;

        // Door frame
        this.ctx.fillStyle = '#5d4037';
        this.ctx.fillRect(doorX - 6, doorY - 6, doorW + 12, doorH + 12);

        // Door panels (shoji style)
        this.ctx.fillStyle = '#fff8f0';
        this.ctx.fillRect(doorX, doorY, doorW, doorH);

        // Door grid pattern
        this.ctx.strokeStyle = '#8b6914';
        this.ctx.lineWidth = 2;
        for (let i = 0; i <= 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(doorX + i * (doorW / 3), doorY);
            this.ctx.lineTo(doorX + i * (doorW / 3), doorY + doorH);
            this.ctx.stroke();
        }
        for (let i = 0; i <= 4; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(doorX, doorY + i * (doorH / 4));
            this.ctx.lineTo(doorX + doorW, doorY + i * (doorH / 4));
            this.ctx.stroke();
        }

        // Door handle
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.ellipse(doorX + doorW - 15, doorY + doorH / 2, 4, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // NPC home: draw personalized decorations
        if (!isPlayerHome && building.interior?.decorations) {
            this.ctx.font = '28px sans-serif';
            this.ctx.textAlign = 'center';
            for (const deco of building.interior.decorations) {
                this.ctx.fillText(deco.emoji, deco.x, deco.y);
            }
            this.ctx.textAlign = 'left';
        }

        // Player home: draw placed decorations (including bed)
        if (isPlayerHome && homeData.homeDecorations) {
            for (const deco of homeData.homeDecorations) {
                if (deco.isBed) {
                    // Draw bed using special bed renderer
                    this.drawBed(deco.x, deco.y);
                } else {
                    // Draw regular furniture as emoji
                    this.ctx.font = '32px sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(deco.emoji, deco.x, deco.y);
                    this.ctx.textAlign = 'left';
                }
            }
        }

        // Draw NPCs inside
        for (const npc of npcs) {
            this.drawInteriorDumpling(npc, npc.x, npc.y);
        }

        // Draw player inside
        if (player) {
            const tempEntity = {
                ...player,
                x: playerPos.x,
                y: playerPos.y,
                bounceOffset: player.bounceOffset || 0,
                fillingData: player.fillingData,
                width: player.width,
                height: player.height,
                direction: player.direction,
                isBlinking: player.isBlinking
            };
            this.drawInteriorDumpling(tempEntity, playerPos.x, playerPos.y, equippedItems);
        }

        // Placement mode cursor and preview
        if (homeData.isPlacingItem && homeData.placingItem) {
            const cursorX = homeData.placementCursor.x;
            const cursorY = homeData.placementCursor.y;

            this.ctx.strokeStyle = '#4caf50';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(cursorX - 20, cursorY - 20, 40, 40);
            this.ctx.setLineDash([]);

            this.ctx.font = '32px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.globalAlpha = 0.7;
            this.ctx.fillText(homeData.placingItem.emoji, cursorX, cursorY + 10);
            this.ctx.globalAlpha = 1.0;
            this.ctx.textAlign = 'left';
        }

        // Building name header (positioned right, below menu toggle)
        const nameText = building.data.ownerName;
        this.ctx.font = 'bold 14px "M PLUS Rounded 1c", sans-serif';
        const nameWidth = this.ctx.measureText(nameText).width;
        const headerX = this.viewWidth - nameWidth - 50;
        const headerY = 75; // Below menu toggle button

        this.ctx.fillStyle = 'rgba(255, 183, 197, 0.95)';
        this.ctx.beginPath();
        this.ctx.roundRect(headerX, headerY, nameWidth + 30, 28, 6);
        this.ctx.fill();

        this.ctx.fillStyle = '#5d4037';
        this.ctx.fillText(nameText, headerX + 15, headerY + 19);

        // Description for empty rooms
        if (!isPlayerHome && building.interior?.description && npcs.length === 0) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            this.ctx.beginPath();
            this.ctx.roundRect(roomX + 20, roomY + roomH / 2 - 25, roomW - 40, 50, 10);
            this.ctx.fill();

            this.ctx.fillStyle = '#5d4037';
            this.ctx.font = '16px "M PLUS Rounded 1c", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(building.interior.description, roomX + roomW / 2, roomY + roomH / 2 + 5);
            this.ctx.textAlign = 'left';
        }

        // Sleep message
        if (homeData.sleepMessage) {
            this.ctx.fillStyle = 'rgba(70, 70, 120, 0.95)';
            this.ctx.beginPath();
            this.ctx.roundRect(this.viewWidth / 2 - 100, this.viewHeight / 2 - 25, 200, 50, 10);
            this.ctx.fill();

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px "M PLUS Rounded 1c", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(homeData.sleepMessage, this.viewWidth / 2, this.viewHeight / 2 + 5);
            this.ctx.textAlign = 'left';
        }

        // Exit/control hints
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '12px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';

        if (homeData.isPlacingItem) {
            this.ctx.fillText('Move: WASD • Tab: Next item • Space: Place • ESC: Cancel', this.viewWidth / 2, this.viewHeight - 15);
        } else if (isPlayerHome) {
            this.ctx.fillText('Q: Exit • P: Place item • X: Pick up • Space near bed: Sleep', this.viewWidth / 2, this.viewHeight - 15);
        } else {
            this.ctx.fillText('Press Q or ESC to exit • Space to interact', this.viewWidth / 2, this.viewHeight - 15);
        }
        this.ctx.textAlign = 'left';
    }

    drawBed(x, y) {
        // Futon-style bed (larger, more visible)
        const bedW = 80;
        const bedH = 100;

        // Futon base/mattress
        this.ctx.fillStyle = '#fff8f0';
        this.ctx.beginPath();
        this.ctx.roundRect(x - bedW / 2, y - 10, bedW, bedH, 8);
        this.ctx.fill();

        // Futon border
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(x - bedW / 2, y - 10, bedW, bedH, 8);
        this.ctx.stroke();

        // Pillow
        this.ctx.fillStyle = '#ffcccc';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 10, 28, 14, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffaaaa';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Blanket
        this.ctx.fillStyle = '#ffb7c5';
        this.ctx.beginPath();
        this.ctx.roundRect(x - bedW / 2 + 5, y + 30, bedW - 10, 55, 6);
        this.ctx.fill();

        // Blanket pattern (cute dumpling pattern)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                this.ctx.beginPath();
                this.ctx.arc(x - 20 + i * 20, y + 45 + j * 25, 6, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // Blanket fold line
        this.ctx.strokeStyle = '#ff99aa';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - bedW / 2 + 10, y + 32);
        this.ctx.lineTo(x + bedW / 2 - 10, y + 32);
        this.ctx.stroke();
    }

    // Draw school room (hallway or classroom)
    drawSchoolRoom(roomName, doors, playerPos, npcs, player, equippedItems) {
        const margin = 40;
        const roomX = margin;
        const roomY = margin + 20;
        const roomW = this.viewWidth - margin * 2;
        const roomH = this.viewHeight - margin * 2 - 40;

        // Outer background
        this.ctx.fillStyle = '#2a3a4a';
        this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

        // Floor - school linoleum
        this.ctx.fillStyle = '#e8e0d0';
        this.ctx.fillRect(roomX, roomY, roomW, roomH);

        // Floor tiles pattern
        this.ctx.strokeStyle = '#d0c8b8';
        this.ctx.lineWidth = 1;
        const tileSize = 40;
        for (let x2 = roomX; x2 <= roomX + roomW; x2 += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x2, roomY);
            this.ctx.lineTo(x2, roomY + roomH);
            this.ctx.stroke();
        }
        for (let y2 = roomY; y2 <= roomY + roomH; y2 += tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(roomX, y2);
            this.ctx.lineTo(roomX + roomW, y2);
            this.ctx.stroke();
        }

        // Wall
        const wallHeight = 80;
        this.ctx.fillStyle = '#f5f0e8';
        this.ctx.fillRect(roomX, roomY, roomW, wallHeight);

        // Wall trim
        this.ctx.fillStyle = '#8b7355';
        this.ctx.fillRect(roomX, roomY, roomW, 6);
        this.ctx.fillRect(roomX, roomY + wallHeight - 4, roomW, 4);

        // Room-specific decorations
        if (roomName === 'hallway') {
            this.drawHallwayDecorations(roomX, roomY, roomW, wallHeight);
        } else {
            this.drawClassroomDecorations(roomName, roomX, roomY, roomW, roomH, wallHeight);
        }

        // Resolve proportional door coords to absolute pixels on the floor
        const floorX = roomX + 30;
        const floorY = roomY + wallHeight + 10;
        const floorW = roomW - 60;
        const floorH = roomH - wallHeight - 60;

        // Draw doors and check proximity
        let nearbyDoor = null;
        for (const door of doors) {
            const doorAbsX = floorX + door.px * floorW;
            const doorAbsY = floorY + door.py * floorH;
            const dx = Math.abs(playerPos.x - doorAbsX);
            const dy = Math.abs(playerPos.y - doorAbsY);
            const isNear = dx < 35 && dy < 35;
            this.drawSchoolDoor(doorAbsX, doorAbsY, door.label, isNear);
            if (isNear) nearbyDoor = door;
        }

        // Draw NPCs (teachers)
        for (const npc of npcs) {
            this.drawInteriorDumpling(npc, npc.x, npc.y);
        }

        // Draw player
        if (player) {
            const tempEntity = {
                fillingData: player.fillingData,
                bounceOffset: player.bounceOffset,
                animFrame: player.animFrame
            };
            this.drawInteriorDumpling(tempEntity, playerPos.x, playerPos.y, equippedItems);
        }

        // Room name header
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.viewWidth / 2 - 100, 10, 200, 30);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px sans-serif';
        this.ctx.textAlign = 'center';
        const roomTitle = this.getSchoolRoomTitle(roomName);
        this.ctx.fillText(roomTitle, this.viewWidth / 2, 30);
        this.ctx.textAlign = 'left';

        // Show "Press E" hint if near a door
        if (nearbyDoor) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(this.viewWidth / 2 - 80, this.viewHeight - 50, 160, 35);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Press E: ${nearbyDoor.label}`, this.viewWidth / 2, this.viewHeight - 28);
            this.ctx.textAlign = 'left';
        }
    }

    getSchoolRoomTitle(roomName) {
        const titles = {
            hallway: 'Main Hallway',
            art: 'Art Room',
            music: 'Music Room',
            science: 'Science Lab',
            japanese: 'Japanese Class',
            gym: 'Gymnasium'
        };
        return titles[roomName] || roomName;
    }

    drawHallwayDecorations(roomX, roomY, roomW, wallHeight) {
        // Lockers on left wall - scale count to room width
        const lockerCount = Math.max(4, Math.floor(roomW / 100));
        const lockerSpacing = Math.min(35, (roomW * 0.4) / lockerCount);
        this.ctx.fillStyle = '#4a90d9';
        for (let i = 0; i < lockerCount; i++) {
            const lx = roomX + 20 + i * lockerSpacing;
            const ly = roomY + wallHeight + 10;
            this.ctx.fillRect(lx, ly, 30, 60);
            // Locker vent lines
            this.ctx.strokeStyle = '#3a70b9';
            this.ctx.lineWidth = 1;
            for (let j = 0; j < 3; j++) {
                this.ctx.beginPath();
                this.ctx.moveTo(lx + 5, ly + 10 + j * 8);
                this.ctx.lineTo(lx + 25, ly + 10 + j * 8);
                this.ctx.stroke();
            }
        }

        // Bulletin board centered on wall
        const bbX = roomX + roomW / 2 - 40;
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(bbX, roomY + 15, 80, 50);
        this.ctx.fillStyle = '#d2691e';
        this.ctx.fillRect(bbX + 5, roomY + 20, 70, 40);
        // Pinned papers
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(bbX + 10, roomY + 25, 25, 30);
        this.ctx.fillRect(bbX + 40, roomY + 28, 25, 25);

        // Clock on right side of wall
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(roomX + roomW - 50, roomY + 40, 20, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        // Clock hands
        this.ctx.beginPath();
        this.ctx.moveTo(roomX + roomW - 50, roomY + 40);
        this.ctx.lineTo(roomX + roomW - 50, roomY + 28);
        this.ctx.moveTo(roomX + roomW - 50, roomY + 40);
        this.ctx.lineTo(roomX + roomW - 40, roomY + 40);
        this.ctx.stroke();
    }

    drawClassroomDecorations(roomName, roomX, roomY, roomW, roomH, wallHeight) {
        // Center the 2x3 desk grid within the floor area
        const floorCenterX = roomX + roomW / 2;
        const floorTopY = roomY + wallHeight;
        const floorAvailH = roomH - wallHeight;
        const deskW = 60;
        const deskH = 35;
        const cols = 3;
        const rows = 2;
        const colSpacing = Math.min(90, (roomW - 120) / cols);
        const rowSpacing = Math.min(50, floorAvailH / (rows + 2));
        const gridW = (cols - 1) * colSpacing + deskW;
        const gridStartX = floorCenterX - gridW / 2;
        const gridStartY = floorTopY + rowSpacing;

        this.ctx.fillStyle = '#b8860b';
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const dx = gridStartX + col * colSpacing;
                const dy = gridStartY + row * rowSpacing;
                this.ctx.fillRect(dx, dy, deskW, deskH);
                // Chair
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(dx + 20, dy + 38, 25, 15);
                this.ctx.fillStyle = '#b8860b';
            }
        }

        // Subject-specific decorations on wall
        switch (roomName) {
            case 'art':
                // Easels and paintings
                this.ctx.fillStyle = '#654321';
                this.ctx.fillRect(roomX + roomW - 100, roomY + 20, 60, 50);
                this.ctx.fillStyle = '#ff6b6b';
                this.ctx.fillRect(roomX + roomW - 95, roomY + 25, 50, 40);
                break;
            case 'music':
                // Piano keys — position relative to right side of room
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(roomX + roomW - 120, roomY + wallHeight + 20, 80, 50);
                this.ctx.fillStyle = '#fff';
                for (let i = 0; i < 7; i++) {
                    this.ctx.fillRect(roomX + roomW - 115 + i * 10, roomY + wallHeight + 25, 8, 40);
                }
                break;
            case 'science':
                // Beakers on shelf
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(roomX + roomW - 100, roomY + 25, 70, 10);
                this.ctx.fillStyle = '#87ceeb';
                this.ctx.beginPath();
                this.ctx.moveTo(roomX + roomW - 90, roomY + 25);
                this.ctx.lineTo(roomX + roomW - 80, roomY + 55);
                this.ctx.lineTo(roomX + roomW - 70, roomY + 25);
                this.ctx.closePath();
                this.ctx.fill();
                break;
            case 'japanese':
                // Kanji scroll
                this.ctx.fillStyle = '#fff5e6';
                this.ctx.fillRect(roomX + roomW - 80, roomY + 15, 50, 60);
                this.ctx.fillStyle = '#333';
                this.ctx.font = 'bold 24px serif';
                this.ctx.fillText('餃', roomX + roomW - 65, roomY + 55);
                break;
            case 'gym':
                // Basketball hoop
                this.ctx.strokeStyle = '#ff6600';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(roomX + roomW - 60, roomY + 50, 20, 0, Math.PI);
                this.ctx.stroke();
                // Backboard
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(roomX + roomW - 85, roomY + 20, 50, 30);
                break;
        }
    }

    drawSchoolDoor(x, y, label, isNear = false) {
        // Highlight glow when player is near
        if (isNear) {
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            this.ctx.fillRect(x - 30, y - 35, 60, 70);
        }

        // Door frame
        this.ctx.fillStyle = '#5d4037';
        this.ctx.fillRect(x - 25, y - 30, 50, 60);

        // Door
        this.ctx.fillStyle = isNear ? '#a08070' : '#8d6e63';
        this.ctx.fillRect(x - 22, y - 27, 44, 54);

        // Door window
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(x - 15, y - 22, 30, 20);

        // Door handle
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.arc(x + 15, y + 5, 4, 0, Math.PI * 2);
        this.ctx.fill();

        // Label below door
        this.ctx.fillStyle = isNear ? '#000' : '#333';
        this.ctx.font = isNear ? 'bold 11px sans-serif' : '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(label, x, y + 40);
        this.ctx.textAlign = 'left';
    }

    drawInteriorDumpling(entity, x, y, equippedItems = null) {
        const s = 2; // Scale for interior
        y = y - (entity.bounceOffset || 0);

        const filling = entity.fillingData;

        // Shadow
        this.ctx.fillStyle = this.colors.shadow;
        this.ctx.beginPath();
        this.ctx.ellipse(x + 16 * s, y + 30 * s, 12 * s, 4 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Body
        this.ctx.fillStyle = filling.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4 * s, y + 24 * s);
        this.ctx.quadraticCurveTo(x + 4 * s, y + 8 * s, x + 16 * s, y + 4 * s);
        this.ctx.quadraticCurveTo(x + 28 * s, y + 8 * s, x + 28 * s, y + 24 * s);
        this.ctx.quadraticCurveTo(x + 16 * s, y + 28 * s, x + 4 * s, y + 24 * s);
        this.ctx.fill();

        // Pleats
        this.ctx.strokeStyle = filling.accent;
        this.ctx.lineWidth = 1.5 * s;
        for (let i = 0; i < 3; i++) {
            const px = x + (10 + i * 4) * s;
            this.ctx.beginPath();
            this.ctx.moveTo(px, y + 6 * s);
            this.ctx.quadraticCurveTo(px + 1 * s, y + 10 * s, px, y + 14 * s);
            this.ctx.stroke();
        }

        // Face
        this.drawFace(x + 16 * s, y + 18 * s, entity.direction || 'down', entity.isBlinking || false, s);

        // Cheeks
        this.ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 8 * s, y + 19 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(x + 24 * s, y + 19 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw equipped items (only for player)
        if (equippedItems) {
            this.drawEquippedItems(x, y, s, equippedItems);
        }

        // Name
        if (entity.name && entity.name !== 'You') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = 'bold 12px "M PLUS Rounded 1c", sans-serif';
            const nameWidth = this.ctx.measureText(entity.name).width;
            this.ctx.fillRect(x + 16 * s - nameWidth / 2 - 4, y - 10, nameWidth + 8, 16);

            this.ctx.fillStyle = '#5d4037';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(entity.name, x + 16 * s, y + 2);
            this.ctx.textAlign = 'left';
        }
    }

    drawShop(building, items, selectedIndex, playerCoins, purchaseMessage = null) {
        // Background
        this.ctx.fillStyle = '#fff8f0';
        this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

        // Shop header
        const filling = building.fillingData;
        this.ctx.fillStyle = filling.color;
        this.ctx.fillRect(0, 0, this.viewWidth, 80);

        this.ctx.fillStyle = filling.accent;
        this.ctx.fillRect(0, 75, this.viewWidth, 5);

        // Shop name
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 28px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(building.data.ownerName, this.viewWidth / 2, 50);

        // Shopkeeper greeting
        if (building.interior?.shopkeeper) {
            this.ctx.fillStyle = '#5d4037';
            this.ctx.font = '14px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText(`Welcome! - ${building.interior.shopkeeper.name}`, this.viewWidth / 2, 70);
        }

        // Player coins
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 18px "M PLUS Rounded 1c", sans-serif';
        this.ctx.fillText(`💰 ${playerCoins} coins`, this.viewWidth - 30, 45);

        // Items list
        const startY = 110;
        const itemHeight = 70;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const y = startY + i * itemHeight;
            const isSelected = i === selectedIndex;

            // Item background
            if (isSelected) {
                this.ctx.fillStyle = 'rgba(255, 183, 197, 0.3)';
                this.ctx.strokeStyle = '#ffb7c5';
                this.ctx.lineWidth = 3;
            } else {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.strokeStyle = '#ddd';
                this.ctx.lineWidth = 1;
            }

            this.ctx.beginPath();
            this.ctx.roundRect(30, y, this.viewWidth - 60, itemHeight - 10, 12);
            this.ctx.fill();
            this.ctx.stroke();

            // Item emoji
            this.ctx.font = '32px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(item.emoji, 50, y + 42);

            // Item name
            this.ctx.fillStyle = '#5d4037';
            this.ctx.font = 'bold 18px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText(item.name, 100, y + 28);

            // Item description
            this.ctx.fillStyle = '#999';
            this.ctx.font = '12px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText(item.description, 100, y + 48);

            // Price
            const canAfford = playerCoins >= item.price;
            this.ctx.fillStyle = canAfford ? '#4caf50' : '#f44336';
            this.ctx.font = 'bold 16px "M PLUS Rounded 1c", sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${item.price} coins`, this.viewWidth - 50, y + 38);
        }

        // Instructions
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.font = '14px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('↑↓ Select • Space/Enter to Buy • Q/ESC to Exit', this.viewWidth / 2, this.viewHeight - 20);
        this.ctx.textAlign = 'left';

        // Purchase message
        if (purchaseMessage) {
            this.ctx.fillStyle = 'rgba(76, 175, 80, 0.95)';
            this.ctx.beginPath();
            this.ctx.roundRect(this.viewWidth / 2 - 100, 90, 200, 40, 12);
            this.ctx.fill();

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 16px "M PLUS Rounded 1c", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(purchaseMessage, this.viewWidth / 2, 116);
            this.ctx.textAlign = 'left';
        }
    }

    drawInventory(inventory, equippedItems, selectedIndex, player) {
        // Background
        this.ctx.fillStyle = '#fff8f0';
        this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

        // Header
        this.ctx.fillStyle = '#ffb7c5';
        this.ctx.fillRect(0, 0, this.viewWidth, 70);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 28px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🎒 Inventory', this.viewWidth / 2, 45);

        // Draw player preview with equipment
        const previewX = this.viewWidth - 120;
        const previewY = 100;
        this.ctx.fillStyle = 'rgba(255, 183, 197, 0.3)';
        this.ctx.beginPath();
        this.ctx.roundRect(previewX - 50, previewY - 20, 120, 140, 12);
        this.ctx.fill();

        this.ctx.fillStyle = '#5d4037';
        this.ctx.font = '12px "M PLUS Rounded 1c", sans-serif';
        this.ctx.fillText('Preview', previewX + 10, previewY);

        // Draw dumpling preview
        if (player) {
            const s = 2;
            const x = previewX - 20;
            const y = previewY + 20;
            const filling = player.fillingData;

            // Body
            this.ctx.fillStyle = filling.color;
            this.ctx.beginPath();
            this.ctx.moveTo(x + 4 * s, y + 24 * s);
            this.ctx.quadraticCurveTo(x + 4 * s, y + 8 * s, x + 16 * s, y + 4 * s);
            this.ctx.quadraticCurveTo(x + 28 * s, y + 8 * s, x + 28 * s, y + 24 * s);
            this.ctx.quadraticCurveTo(x + 16 * s, y + 28 * s, x + 4 * s, y + 24 * s);
            this.ctx.fill();

            // Pleats
            this.ctx.strokeStyle = filling.accent;
            this.ctx.lineWidth = 1.5 * s;
            for (let i = 0; i < 3; i++) {
                const px = x + (10 + i * 4) * s;
                this.ctx.beginPath();
                this.ctx.moveTo(px, y + 6 * s);
                this.ctx.quadraticCurveTo(px + 1 * s, y + 10 * s, px, y + 14 * s);
                this.ctx.stroke();
            }

            // Simple face
            this.ctx.fillStyle = '#5d4037';
            this.ctx.beginPath();
            this.ctx.arc(x + 12 * s, y + 16 * s, 2 * s, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(x + 20 * s, y + 16 * s, 2 * s, 0, Math.PI * 2);
            this.ctx.fill();

            // Equipped items on preview
            this.drawEquippedItems(x, y, s, equippedItems);
        }

        // Equipment slots display
        const slotsX = 30;
        const slotsY = 100;
        this.ctx.fillStyle = '#5d4037';
        this.ctx.font = 'bold 14px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Equipped:', slotsX, slotsY);

        const slots = [
            { key: 'hat', label: 'Head', y: slotsY + 25 },
            { key: 'accessory', label: 'Side', y: slotsY + 55 },
            { key: 'held', label: 'Held', y: slotsY + 85 }
        ];

        for (const slot of slots) {
            this.ctx.fillStyle = 'rgba(255, 183, 197, 0.2)';
            this.ctx.beginPath();
            this.ctx.roundRect(slotsX, slot.y - 5, 150, 26, 6);
            this.ctx.fill();

            this.ctx.fillStyle = '#999';
            this.ctx.font = '12px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText(slot.label + ':', slotsX + 8, slot.y + 12);

            const equipped = equippedItems[slot.key];
            if (equipped) {
                this.ctx.font = '14px sans-serif';
                this.ctx.fillText(equipped.emoji, slotsX + 55, slot.y + 13);
                this.ctx.fillStyle = '#5d4037';
                this.ctx.font = '12px "M PLUS Rounded 1c", sans-serif';
                this.ctx.fillText(equipped.name, slotsX + 75, slot.y + 12);
            } else {
                this.ctx.fillStyle = '#ccc';
                this.ctx.fillText('—', slotsX + 60, slot.y + 12);
            }
        }

        // Items list
        const listStartY = 220;
        const itemHeight = 55;

        this.ctx.fillStyle = '#5d4037';
        this.ctx.font = 'bold 16px "M PLUS Rounded 1c", sans-serif';
        this.ctx.fillText('Your Items:', 30, listStartY - 10);

        if (inventory.length === 0) {
            this.ctx.fillStyle = '#999';
            this.ctx.font = '14px "M PLUS Rounded 1c", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('No items yet! Visit a shop to buy some~', this.viewWidth / 2, listStartY + 40);
            this.ctx.textAlign = 'left';
        } else {
            for (let i = 0; i < inventory.length; i++) {
                const item = inventory[i];
                const y = listStartY + i * itemHeight;
                const isSelected = i === selectedIndex;
                const isEquipped = equippedItems[item.slot]?.instanceId === item.instanceId;

                // Item background
                if (isSelected) {
                    this.ctx.fillStyle = 'rgba(255, 183, 197, 0.4)';
                    this.ctx.strokeStyle = '#ffb7c5';
                    this.ctx.lineWidth = 3;
                } else {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    this.ctx.strokeStyle = '#ddd';
                    this.ctx.lineWidth = 1;
                }

                this.ctx.beginPath();
                this.ctx.roundRect(30, y, this.viewWidth - 200, itemHeight - 8, 10);
                this.ctx.fill();
                this.ctx.stroke();

                // Item emoji
                this.ctx.font = '28px sans-serif';
                this.ctx.fillText(item.emoji, 50, y + 35);

                // Item name
                this.ctx.fillStyle = '#5d4037';
                this.ctx.font = 'bold 16px "M PLUS Rounded 1c", sans-serif';
                this.ctx.fillText(item.name, 95, y + 25);

                // Slot type
                this.ctx.fillStyle = '#999';
                this.ctx.font = '11px "M PLUS Rounded 1c", sans-serif';
                this.ctx.fillText(`[${item.slot}]`, 95, y + 42);

                // Equipped badge
                if (isEquipped) {
                    this.ctx.fillStyle = '#4caf50';
                    this.ctx.beginPath();
                    this.ctx.roundRect(this.viewWidth - 280, y + 12, 70, 22, 6);
                    this.ctx.fill();

                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = 'bold 11px "M PLUS Rounded 1c", sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('EQUIPPED', this.viewWidth - 245, y + 27);
                    this.ctx.textAlign = 'left';
                }
            }
        }

        // Instructions
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.font = '14px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('↑↓ Select • Space/Enter to Equip/Unequip • I/Q/ESC to Close', this.viewWidth / 2, this.viewHeight - 20);
        this.ctx.textAlign = 'left';
    }

    drawDialogue(name, text, choices = null, selectedChoice = 0) {
        const boxX = 30;
        const boxWidth = this.viewWidth - 60;
        const textPadding = 30;
        const maxTextWidth = boxWidth - textPadding * 2;

        // Set font before measuring text
        this.ctx.font = '18px "M PLUS Rounded 1c", sans-serif';
        const wrappedLines = this.wrapText(text, maxTextWidth);
        const lineHeight = 24;
        const textHeight = wrappedLines.length * lineHeight;

        // Calculate box height based on text lines and choices
        const baseHeight = 60 + textHeight;
        const choiceHeight = choices ? choices.length * 35 + 20 : 0;
        const boxHeight = baseHeight + choiceHeight;
        const boxY = this.viewHeight - boxHeight - 30;

        // Background
        this.ctx.fillStyle = 'rgba(255, 248, 240, 0.95)';
        this.ctx.strokeStyle = '#ffb7c5';
        this.ctx.lineWidth = 4;

        // Rounded rectangle
        this.ctx.beginPath();
        this.ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 16);
        this.ctx.fill();
        this.ctx.stroke();

        // Name tag
        this.ctx.fillStyle = '#ffb7c5';
        this.ctx.beginPath();
        this.ctx.roundRect(boxX + 20, boxY - 16, 120, 32, 12);
        this.ctx.fill();

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(name, boxX + 80, boxY + 6);
        this.ctx.textAlign = 'left';

        // Dialogue text (word wrapped)
        this.ctx.fillStyle = '#5d4037';
        this.ctx.font = '18px "M PLUS Rounded 1c", sans-serif';
        for (let i = 0; i < wrappedLines.length; i++) {
            this.ctx.fillText(wrappedLines[i], boxX + textPadding, boxY + 45 + i * lineHeight);
        }

        if (choices && choices.length > 0) {
            // Draw choices (position based on text height)
            const choiceStartY = boxY + 50 + textHeight;

            for (let i = 0; i < choices.length; i++) {
                const choiceY = choiceStartY + i * 35;
                const choiceText = choices[i].text;
                const isSelected = i === selectedChoice;

                // Choice background - highlight selected
                if (isSelected) {
                    this.ctx.fillStyle = 'rgba(255, 183, 197, 0.6)';
                    this.ctx.strokeStyle = '#ffb7c5';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.roundRect(boxX + 25, choiceY - 5, boxWidth - 50, 30, 8);
                    this.ctx.fill();
                    this.ctx.stroke();
                } else {
                    this.ctx.fillStyle = 'rgba(255, 183, 197, 0.2)';
                    this.ctx.beginPath();
                    this.ctx.roundRect(boxX + 25, choiceY - 5, boxWidth - 50, 30, 8);
                    this.ctx.fill();
                }

                // Number badge - brighter if selected
                this.ctx.fillStyle = isSelected ? '#ff8fa3' : '#ffb7c5';
                this.ctx.beginPath();
                this.ctx.arc(boxX + 45, choiceY + 10, 12, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = 'bold 14px "M PLUS Rounded 1c", sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText((i + 1).toString(), boxX + 45, choiceY + 15);
                this.ctx.textAlign = 'left';

                // Choice text - bolder if selected
                this.ctx.fillStyle = isSelected ? '#3d2017' : '#5d4037';
                this.ctx.font = isSelected ? 'bold 16px "M PLUS Rounded 1c", sans-serif' : '16px "M PLUS Rounded 1c", sans-serif';
                this.ctx.fillText(choiceText, boxX + 70, choiceY + 15);

                // Selection arrow for selected choice
                if (isSelected) {
                    this.ctx.fillStyle = '#ff8fa3';
                    this.ctx.font = '14px sans-serif';
                    this.ctx.fillText('▶', boxX + 30, choiceY + 15);
                }
            }

            // Hint text
            this.ctx.fillStyle = '#999';
            this.ctx.font = 'italic 12px "M PLUS Rounded 1c", sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText('↑↓ to select, Space/Enter to confirm', boxX + boxWidth - 30, boxY + boxHeight - 15);
            this.ctx.textAlign = 'left';
        } else {
            // Continue indicator (no choices - just show continue prompt)
            const bounce = Math.sin(Date.now() / 200) * 3;
            this.ctx.fillStyle = '#ffb7c5';
            this.ctx.beginPath();
            this.ctx.moveTo(boxX + boxWidth - 50, boxY + boxHeight - 30 + bounce);
            this.ctx.lineTo(boxX + boxWidth - 35, boxY + boxHeight - 22 + bounce);
            this.ctx.lineTo(boxX + boxWidth - 50, boxY + boxHeight - 14 + bounce);
            this.ctx.fill();

            // Hint text
            this.ctx.fillStyle = '#999';
            this.ctx.font = 'italic 12px "M PLUS Rounded 1c", sans-serif';
            this.ctx.textAlign = 'right';
            this.ctx.fillText('Press Space to continue', boxX + boxWidth - 30, boxY + boxHeight - 15);
            this.ctx.textAlign = 'left';
        }
    }

    // ============================================
    // MINI-GAME RENDERING
    // ============================================

    drawRPS(rps) {
        // Background
        this.ctx.fillStyle = '#fff8f0';
        this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

        // Title
        this.ctx.fillStyle = '#ffb7c5';
        this.ctx.fillRect(0, 0, this.viewWidth, 70);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 28px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('✊ Rock Paper Scissors ✌️', this.viewWidth / 2, 45);

        // Score
        this.ctx.fillStyle = '#5d4037';
        this.ctx.font = 'bold 20px "M PLUS Rounded 1c", sans-serif';
        this.ctx.fillText(`Round ${rps.round}/3`, this.viewWidth / 2, 100);
        this.ctx.fillText(`You: ${rps.playerScore} - ${rps.npcScore} :NPC`, this.viewWidth / 2, 130);

        // Choices area
        const centerY = this.viewHeight / 2;
        const choiceEmojis = { rock: '✊', paper: '✋', scissors: '✌️' };

        if (rps.phase === 'choosing') {
            // Show options
            this.ctx.font = '18px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText('Choose your move!', this.viewWidth / 2, centerY - 60);

            const options = [
                { key: 'rock', emoji: '✊', label: '[1/A] Rock' },
                { key: 'paper', emoji: '✋', label: '[2/S] Paper' },
                { key: 'scissors', emoji: '✌️', label: '[3/D] Scissors' }
            ];

            for (let i = 0; i < options.length; i++) {
                const x = this.viewWidth / 2 + (i - 1) * 120;

                // Option box
                this.ctx.fillStyle = 'rgba(255, 183, 197, 0.3)';
                this.ctx.beginPath();
                this.ctx.roundRect(x - 45, centerY - 30, 90, 100, 12);
                this.ctx.fill();

                // Emoji
                this.ctx.font = '48px sans-serif';
                this.ctx.fillText(options[i].emoji, x, centerY + 25);

                // Label
                this.ctx.fillStyle = '#5d4037';
                this.ctx.font = '14px "M PLUS Rounded 1c", sans-serif';
                this.ctx.fillText(options[i].label, x, centerY + 60);
            }
        } else if (rps.phase === 'reveal' || rps.phase === 'gameover') {
            // Show results
            const playerX = this.viewWidth / 2 - 100;
            const npcX = this.viewWidth / 2 + 100;

            // Player choice
            this.ctx.font = '72px sans-serif';
            this.ctx.fillText(choiceEmojis[rps.playerChoice], playerX, centerY + 20);
            this.ctx.fillStyle = '#5d4037';
            this.ctx.font = '16px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText('You', playerX, centerY + 60);

            // VS
            this.ctx.font = 'bold 24px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText('VS', this.viewWidth / 2, centerY + 10);

            // NPC choice
            this.ctx.font = '72px sans-serif';
            this.ctx.fillText(choiceEmojis[rps.npcChoice], npcX, centerY + 20);
            this.ctx.fillStyle = '#5d4037';
            this.ctx.font = '16px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText('Little Sprout', npcX, centerY + 60);

            // Result text
            const resultColors = { win: '#4caf50', lose: '#f44336', tie: '#ff9800' };
            const resultText = { win: 'You Win!', lose: 'You Lose!', tie: "It's a Tie!" };
            this.ctx.fillStyle = resultColors[rps.result];
            this.ctx.font = 'bold 28px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText(resultText[rps.result], this.viewWidth / 2, centerY + 110);

            if (rps.phase === 'gameover') {
                const won = rps.playerScore > rps.npcScore;
                this.ctx.fillStyle = won ? '#4caf50' : '#f44336';
                this.ctx.font = 'bold 24px "M PLUS Rounded 1c", sans-serif';
                this.ctx.fillText(won ? '🎉 You Won 40 Coins! 🎉' : '😢 Better Luck Next Time!', this.viewWidth / 2, centerY + 150);
            }
        }

        // Instructions
        this.ctx.fillStyle = '#999';
        this.ctx.font = '14px "M PLUS Rounded 1c", sans-serif';
        this.ctx.fillText('ESC to quit', this.viewWidth / 2, this.viewHeight - 20);
        this.ctx.textAlign = 'left';
    }

    drawRhythm(rhythm) {
        // Background - kitchen theme
        this.ctx.fillStyle = '#ffecd2';
        this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

        // Title bar
        this.ctx.fillStyle = '#ff9966';
        this.ctx.fillRect(0, 0, this.viewWidth, 60);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🥟 Rhythm Cooking 🥟', this.viewWidth / 2, 40);

        // Score and combo
        this.ctx.fillStyle = '#5d4037';
        this.ctx.font = 'bold 18px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${rhythm.score}`, 20, 90);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Combo: ${rhythm.combo}x`, this.viewWidth - 20, 90);

        if (rhythm.phase === 'ready') {
            this.ctx.fillStyle = '#5d4037';
            this.ctx.font = 'bold 24px "M PLUS Rounded 1c", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Press SPACE to Start Cooking!', this.viewWidth / 2, this.viewHeight / 2);
            this.ctx.font = '16px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText('Use A S D F keys to hit the notes!', this.viewWidth / 2, this.viewHeight / 2 + 40);
        } else if (rhythm.phase === 'playing' || rhythm.phase === 'results') {
            // Draw lanes
            const laneKeys = ['a', 's', 'd', 'f'];
            const laneWidth = 80;
            const startX = this.viewWidth / 2 - (laneWidth * 2);
            const targetY = this.viewHeight - 100;

            // Target line
            this.ctx.strokeStyle = '#ff6600';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(startX - 20, targetY);
            this.ctx.lineTo(startX + laneWidth * 4 + 20, targetY);
            this.ctx.stroke();

            // Lane backgrounds and labels
            for (let i = 0; i < 4; i++) {
                const x = startX + i * laneWidth + laneWidth / 2;

                // Lane background
                this.ctx.fillStyle = 'rgba(255, 153, 102, 0.2)';
                this.ctx.fillRect(x - 35, 110, 70, this.viewHeight - 160);

                // Target zone
                this.ctx.fillStyle = 'rgba(255, 102, 0, 0.3)';
                this.ctx.beginPath();
                this.ctx.roundRect(x - 35, targetY - 20, 70, 40, 8);
                this.ctx.fill();

                // Key label
                this.ctx.fillStyle = '#ff6600';
                this.ctx.font = 'bold 24px "M PLUS Rounded 1c", sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(laneKeys[i].toUpperCase(), x, this.viewHeight - 40);
            }

            // Draw notes
            for (const note of rhythm.notes) {
                if (note.hit || note.missed) continue;

                const laneIndex = laneKeys.indexOf(note.key);
                const x = startX + laneIndex * laneWidth + laneWidth / 2;

                // Calculate Y based on time until hit
                const timeUntilHit = note.time - rhythm.currentTime;
                const y = targetY - (timeUntilHit / 2000) * (targetY - 120);

                // Note
                this.ctx.fillStyle = '#ff6600';
                this.ctx.beginPath();
                this.ctx.arc(x, y, 25, 0, Math.PI * 2);
                this.ctx.fill();

                // Dumpling emoji on note
                this.ctx.font = '20px sans-serif';
                this.ctx.fillText('🥟', x, y + 7);
            }

            // Hit feedback
            if (rhythm.hitFeedback) {
                const feedbackColors = {
                    'Perfect!': '#ff6600',
                    'Good!': '#ffaa00',
                    'OK': '#aaa',
                    'Miss!': '#f44336'
                };
                this.ctx.fillStyle = feedbackColors[rhythm.hitFeedback] || '#5d4037';
                this.ctx.font = 'bold 28px "M PLUS Rounded 1c", sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(rhythm.hitFeedback, this.viewWidth / 2, 140);
            }

            // Progress bar
            const progress = rhythm.currentTime / rhythm.songLength;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.fillRect(50, this.viewHeight - 20, this.viewWidth - 100, 8);
            this.ctx.fillStyle = '#ff6600';
            this.ctx.fillRect(50, this.viewHeight - 20, (this.viewWidth - 100) * progress, 8);
        }

        if (rhythm.phase === 'results') {
            // Results overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 36px "M PLUS Rounded 1c", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🎉 Cooking Complete! 🎉', this.viewWidth / 2, this.viewHeight / 2 - 40);

            this.ctx.font = 'bold 24px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText(`Final Score: ${rhythm.score}`, this.viewWidth / 2, this.viewHeight / 2 + 10);
            this.ctx.fillText(`Max Combo: ${rhythm.maxCombo}x`, this.viewWidth / 2, this.viewHeight / 2 + 50);

            const reward = Math.floor(rhythm.score / 10) * 5 + 20;
            this.ctx.fillStyle = '#4caf50';
            this.ctx.fillText(`+${reward} coins!`, this.viewWidth / 2, this.viewHeight / 2 + 90);
        }

        this.ctx.textAlign = 'left';
    }

    drawFishing(fishing) {
        // Background - pond/water theme
        this.ctx.fillStyle = '#e3f2fd';
        this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

        // Water
        this.ctx.fillStyle = '#64b5f6';
        this.ctx.fillRect(0, this.viewHeight / 2, this.viewWidth, this.viewHeight / 2);

        // Waves
        this.ctx.strokeStyle = '#42a5f5';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const y = this.viewHeight / 2 + 30 + i * 40;
            const offset = Math.sin(Date.now() / 500 + i) * 10;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            for (let x = 0; x < this.viewWidth; x += 20) {
                this.ctx.lineTo(x, y + Math.sin((x + offset) / 30) * 5);
            }
            this.ctx.stroke();
        }

        // Title
        this.ctx.fillStyle = '#1976d2';
        this.ctx.font = 'bold 28px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🎣 Fishing 🐟', this.viewWidth / 2, 50);

        const centerX = this.viewWidth / 2;
        const centerY = this.viewHeight / 2 - 30;

        // Fishing line
        this.ctx.strokeStyle = '#795548';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, 80);

        if (fishing.phase === 'casting') {
            const progress = fishing.timer / 0.5;
            this.ctx.lineTo(centerX, 80 + progress * 150);
        } else {
            this.ctx.lineTo(centerX, centerY + 50);

            // Bobber
            const bobberBounce = fishing.phase === 'biting' ? Math.sin(Date.now() / 50) * 10 : Math.sin(Date.now() / 300) * 3;
            this.ctx.stroke();

            this.ctx.fillStyle = fishing.phase === 'biting' ? '#f44336' : '#ff9800';
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY + 50 + bobberBounce, fishing.phase === 'biting' ? 18 : 12, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.stroke();

        // Status text
        this.ctx.fillStyle = '#1976d2';
        this.ctx.font = 'bold 24px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';

        if (fishing.phase === 'casting') {
            this.ctx.fillText('Casting...', centerX, centerY + 120);
        } else if (fishing.phase === 'waiting') {
            this.ctx.fillText('Waiting for a bite...', centerX, centerY + 120);
            this.ctx.font = '16px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillStyle = '#666';
            this.ctx.fillText('(Watch the bobber!)', centerX, centerY + 150);
        } else if (fishing.phase === 'biting') {
            this.ctx.fillStyle = '#f44336';
            this.ctx.font = 'bold 32px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText('🚨 FISH ON! Press SPACE! 🚨', centerX, centerY + 120);
        } else if (fishing.phase === 'reeling') {
            this.ctx.fillText('Reel it in! Mash SPACE!', centerX, centerY + 120);

            // Progress bar
            const barWidth = 200;
            const barX = centerX - barWidth / 2;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(barX, centerY + 140, barWidth, 20);
            this.ctx.fillStyle = '#4caf50';
            this.ctx.fillRect(barX, centerY + 140, barWidth * fishing.reelProgress, 20);

            // Fish emoji pulling
            this.ctx.font = '32px sans-serif';
            this.ctx.fillText(fishing.fishType.emoji, centerX, centerY + 200);
        } else if (fishing.phase === 'caught') {
            this.ctx.fillStyle = '#4caf50';
            this.ctx.font = 'bold 28px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText(`🎉 Caught: ${fishing.fishType.name}! 🎉`, centerX, centerY + 100);
            this.ctx.font = '48px sans-serif';
            this.ctx.fillText(fishing.fishType.emoji, centerX, centerY + 160);
            this.ctx.fillStyle = '#4caf50';
            this.ctx.font = 'bold 24px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText(`+${fishing.fishType.value} coins!`, centerX, centerY + 200);
        } else if (fishing.phase === 'escaped') {
            this.ctx.fillStyle = '#f44336';
            this.ctx.font = 'bold 24px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText('The fish got away...', centerX, centerY + 120);
            this.ctx.font = '40px sans-serif';
            this.ctx.fillText('🐟💨', centerX, centerY + 170);
        }

        // Instructions
        this.ctx.fillStyle = '#666';
        this.ctx.font = '14px "M PLUS Rounded 1c", sans-serif';
        this.ctx.fillText('ESC to leave', centerX, this.viewHeight - 20);
        this.ctx.textAlign = 'left';
    }

    drawTreasureHunt(treasure) {
        // If found, show celebration overlay
        if (treasure.found) {
            // Semi-transparent overlay
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

            // Draw sparkles/confetti
            const time = Date.now() / 100;
            const confettiColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'];
            for (let i = 0; i < 30; i++) {
                const x = (this.viewWidth / 2) + Math.sin(time + i * 0.5) * (100 + i * 5);
                const y = (this.viewHeight / 2) + Math.cos(time + i * 0.7) * (80 + i * 3);
                const size = 5 + Math.sin(time + i) * 3;
                this.ctx.fillStyle = confettiColors[i % confettiColors.length];
                this.ctx.beginPath();
                if (i % 3 === 0) {
                    // Star shape
                    this.ctx.font = `${size * 3}px sans-serif`;
                    this.ctx.fillText('✦', x, y);
                } else {
                    // Circle
                    this.ctx.arc(x, y, size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }

            // Big treasure chest
            this.ctx.font = '80px sans-serif';
            this.ctx.textAlign = 'center';
            const bounce = Math.sin(Date.now() / 150) * 10;
            this.ctx.fillText('💰', this.viewWidth / 2, this.viewHeight / 2 + bounce);

            // Congratulations banner
            this.ctx.fillStyle = 'rgba(76, 175, 80, 0.95)';
            this.ctx.beginPath();
            this.ctx.roundRect(this.viewWidth / 2 - 180, this.viewHeight / 2 - 100, 360, 60, 16);
            this.ctx.fill();

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 28px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText('🎉 TREASURE FOUND! 🎉', this.viewWidth / 2, this.viewHeight / 2 - 62);

            // Prize amount
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
            this.ctx.beginPath();
            this.ctx.roundRect(this.viewWidth / 2 - 100, this.viewHeight / 2 + 50, 200, 45, 12);
            this.ctx.fill();

            this.ctx.fillStyle = '#5d4037';
            this.ctx.font = 'bold 24px "M PLUS Rounded 1c", sans-serif';
            this.ctx.fillText(`+${treasure.prize} coins!`, this.viewWidth / 2, this.viewHeight / 2 + 82);

            this.ctx.textAlign = 'left';
            return;
        }

        // Normal treasure hunt overlay (not found yet)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.beginPath();
        this.ctx.roundRect(this.viewWidth / 2 - 150, 10, 300, 60, 12);
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🔍 Treasure Hunt!', this.viewWidth / 2, 32);

        // Temperature hint with color
        this.ctx.font = 'bold 20px "M PLUS Rounded 1c", sans-serif';
        if (treasure.hintText.includes('BURNING')) {
            this.ctx.fillStyle = '#ff4444';
        } else if (treasure.hintText.includes('HOT')) {
            this.ctx.fillStyle = '#ff6b6b';
        } else if (treasure.hintText.includes('Very Hot')) {
            this.ctx.fillStyle = '#ff8844';
        } else if (treasure.hintText.includes('Warm')) {
            this.ctx.fillStyle = '#ffaa00';
        } else if (treasure.hintText.includes('Cool')) {
            this.ctx.fillStyle = '#64b5f6';
        } else {
            this.ctx.fillStyle = '#4fc3f7';
        }
        this.ctx.fillText(treasure.hintText, this.viewWidth / 2, 58);

        // Prize amount
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px "M PLUS Rounded 1c", sans-serif';
        this.ctx.fillText(`Prize: ${treasure.prize} coins | ESC to quit`, this.viewWidth / 2, this.viewHeight - 15);

        this.ctx.textAlign = 'left';
    }

    // ============================================
    // BOAT INTERIOR RENDERING
    // ============================================

    drawBoatInterior(boatRide, playerPos, player, equippedItems = null, nearbyPassenger = null) {
        // Clear and fill with ocean background
        this.ctx.fillStyle = '#1e90ff';
        this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

        // Animated water waves
        const waveOffset = boatRide.waterOffset || 0;
        this.ctx.fillStyle = '#4169e1';
        for (let i = 0; i < 6; i++) {
            const waveY = 30 + i * 60 + Math.sin((waveOffset + i * 20) * 0.1) * 10;
            this.ctx.beginPath();
            this.ctx.moveTo(0, waveY);
            for (let x = 0; x < this.viewWidth; x += 40) {
                this.ctx.quadraticCurveTo(
                    x + 20, waveY + 15,
                    x + 40, waveY
                );
            }
            this.ctx.lineTo(this.viewWidth, this.viewHeight);
            this.ctx.lineTo(0, this.viewHeight);
            this.ctx.fill();
        }

        // Boat interior frame
        const boatX = (this.viewWidth - 420) / 2;
        const boatY = 80;
        const boatW = 420;
        const boatH = 320;

        // Boat hull (outer)
        this.ctx.fillStyle = '#8b4513';
        this.ctx.beginPath();
        this.ctx.roundRect(boatX - 10, boatY - 10, boatW + 20, boatH + 20, 20);
        this.ctx.fill();

        // Boat deck (inner floor)
        this.ctx.fillStyle = '#deb887';
        this.ctx.beginPath();
        this.ctx.roundRect(boatX, boatY, boatW, boatH, 15);
        this.ctx.fill();

        // Deck planks
        this.ctx.strokeStyle = '#d2691e';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(boatX, boatY + 40 + i * 40);
            this.ctx.lineTo(boatX + boatW, boatY + 40 + i * 40);
            this.ctx.stroke();
        }

        // Cabin area (top portion)
        this.ctx.fillStyle = '#a0522d';
        this.ctx.fillRect(boatX, boatY, boatW, 70);

        // Windows in cabin
        for (let i = 0; i < 4; i++) {
            const winX = boatX + 50 + i * 90;
            const winY = boatY + 15;

            // Window frame
            this.ctx.fillStyle = '#654321';
            this.ctx.fillRect(winX - 2, winY - 2, 54, 44);

            // Window (shows water/sky)
            this.ctx.fillStyle = '#87ceeb';
            this.ctx.fillRect(winX, winY, 50, 40);

            // Water through window
            this.ctx.fillStyle = '#4169e1';
            this.ctx.fillRect(winX, winY + 25, 50, 15);
        }

        // Benches
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(boatX + 30, boatY + 130, 80, 25);
        this.ctx.fillRect(boatX + boatW - 110, boatY + 130, 80, 25);
        this.ctx.fillRect(boatX + 30, boatY + 200, 80, 25);
        this.ctx.fillRect(boatX + boatW - 110, boatY + 200, 80, 25);

        // Draw passengers (kid NPCs)
        if (boatRide.passengers) {
            for (const kid of boatRide.passengers) {
                if (kid.boatX && kid.boatY) {
                    const kidX = boatX + kid.boatX - 16;
                    const kidY = boatY + kid.boatY - 16;

                    if (kid === nearbyPassenger) {
                        this.ctx.strokeStyle = '#ffd54f';
                        this.ctx.lineWidth = 3;
                        this.ctx.beginPath();
                        this.ctx.ellipse(kidX + 16 * this.scale, kidY + 31 * this.scale, 16 * this.scale, 7 * this.scale, 0, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }

                    this.drawDumplingAt(kid, kidX, kidY, this.scale);
                }
            }
        }

        // Draw player
        if (player && playerPos) {
            const pX = boatX + playerPos.x - 16;
            const pY = boatY + playerPos.y - 16;
            this.drawDumplingAt(player, pX, pY, this.scale, equippedItems);
        }

        // Progress bar at top
        this.drawBoatProgress(boatRide);

        if (nearbyPassenger) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
            this.ctx.beginPath();
            this.ctx.roundRect(this.viewWidth / 2 - 140, this.viewHeight - 92, 280, 30, 10);
            this.ctx.fill();

            this.ctx.fillStyle = '#5d4037';
            this.ctx.font = 'bold 13px "M PLUS Rounded 1c", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Press E to talk to ${nearbyPassenger.name}`, this.viewWidth / 2, this.viewHeight - 72);
            this.ctx.textAlign = 'left';
        }

        // Phase message
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.beginPath();
        this.ctx.roundRect(this.viewWidth / 2 - 120, this.viewHeight - 50, 240, 35, 12);
        this.ctx.fill();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';

        const destinationName = boatRide.destination === 'village' ? 'Dumpling Town' : 'School Island';
        let phaseMessage = `Sailing to ${destinationName}...`;
        if (boatRide.phase === 'boarding') {
            phaseMessage = 'All aboard! Setting sail...';
        } else if (boatRide.phase === 'arriving') {
            phaseMessage = `Arriving at ${destinationName}!`;
        }
        this.ctx.fillText(phaseMessage, this.viewWidth / 2, this.viewHeight - 28);
        this.ctx.textAlign = 'left';
    }

    drawBoatProgress(boatRide) {
        const barWidth = 300;
        const barHeight = 24;
        const x = (this.viewWidth - barWidth) / 2;
        const y = 20;

        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.beginPath();
        this.ctx.roundRect(x - 10, y - 5, barWidth + 20, barHeight + 30, 12);
        this.ctx.fill();

        // Progress bar background
        this.ctx.fillStyle = '#444';
        this.ctx.beginPath();
        this.ctx.roundRect(x, y + 20, barWidth, barHeight, 12);
        this.ctx.fill();

        // Progress fill
        const progress = Math.min(1, boatRide.timer / boatRide.duration);
        this.ctx.fillStyle = '#4caf50';
        this.ctx.beginPath();
        this.ctx.roundRect(x, y + 20, barWidth * progress, barHeight, 12);
        this.ctx.fill();

        // Time remaining
        const remaining = Math.max(0, boatRide.duration - boatRide.timer);
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px "M PLUS Rounded 1c", sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`🚢 ${timeStr} remaining`, this.viewWidth / 2, y + 14);
        this.ctx.textAlign = 'left';
    }

    // Helper to draw dumpling at specific screen position
    drawDumplingAt(dumpling, x, y, scale, equippedItems = null) {
        const s = scale;
        const drawY = y - (dumpling.bounceOffset || 0);
        const filling = dumpling.fillingData;
        if (!filling) return;

        // Shadow
        this.ctx.fillStyle = this.colors.shadow;
        this.ctx.beginPath();
        this.ctx.ellipse(x + 16 * s, y + 30 * s, 12 * s, 4 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Body - match the standard overworld/interior dumpling shape.
        this.ctx.fillStyle = filling.color;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 4 * s, drawY + 24 * s);
        this.ctx.quadraticCurveTo(x + 4 * s, drawY + 8 * s, x + 16 * s, drawY + 4 * s);
        this.ctx.quadraticCurveTo(x + 28 * s, drawY + 8 * s, x + 28 * s, drawY + 24 * s);
        this.ctx.quadraticCurveTo(x + 16 * s, drawY + 28 * s, x + 4 * s, drawY + 24 * s);
        this.ctx.fill();

        // Pleats
        this.ctx.strokeStyle = filling.accent;
        this.ctx.lineWidth = 1.5 * s;
        for (let i = 0; i < 3; i++) {
            const px = x + (10 + i * 4) * s;
            this.ctx.beginPath();
            this.ctx.moveTo(px, drawY + 6 * s);
            this.ctx.quadraticCurveTo(px + 1 * s, drawY + 10 * s, px, drawY + 14 * s);
            this.ctx.stroke();
        }

        // Face
        this.drawFace(x + 16 * s, drawY + 18 * s, dumpling.direction || 'down', dumpling.isBlinking || false, s);

        // Cheek blush
        this.ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
        this.ctx.beginPath();
        this.ctx.ellipse(x + 8 * s, drawY + 19 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(x + 24 * s, drawY + 19 * s, 3 * s, 2 * s, 0, 0, Math.PI * 2);
        this.ctx.fill();

        if (equippedItems) {
            this.drawEquippedItems(x, drawY, s, equippedItems);
        }

        if (dumpling.name && dumpling.name !== 'You') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.font = 'bold 12px "M PLUS Rounded 1c", sans-serif';
            const nameWidth = this.ctx.measureText(dumpling.name).width;
            this.ctx.fillRect(x + 16 * s - nameWidth / 2 - 4, drawY - 10, nameWidth + 8, 16);

            this.ctx.fillStyle = '#5d4037';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(dumpling.name, x + 16 * s, drawY + 2);
            this.ctx.textAlign = 'left';
        }
    }
}
