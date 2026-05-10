// ============================================
// SCHOOL ISLAND
// A separate island with Dumpling Academy
// ============================================

import { House, Decoration } from './entities.js';

// School island world dimensions
const ISLAND_WIDTH_TILES = 40;
const ISLAND_HEIGHT_TILES = 30;
const TILE_SIZE = 16;

export class SchoolIslandWorld {
    constructor() {
        this.widthTiles = ISLAND_WIDTH_TILES;
        this.heightTiles = ISLAND_HEIGHT_TILES;
        this.tileSize = TILE_SIZE;

        this.width = this.widthTiles * this.tileSize;
        this.height = this.heightTiles * this.tileSize;

        // Generate island
        this.tiles = this.generateTileMap();
        this.houses = this.generateBuildings();
        this.decorations = this.generateDecorations();

        // Dock spawn point (south side of island)
        this.dockSpawn = { x: this.width / 2, y: this.height - 80 };
    }

    generateTileMap() {
        const tiles = [];
        const centerX = Math.floor(this.widthTiles / 2);
        const centerY = Math.floor(this.heightTiles / 2);

        for (let y = 0; y < this.heightTiles; y++) {
            tiles[y] = [];
            for (let x = 0; x < this.widthTiles; x++) {
                tiles[y][x] = this.determineTile(x, y, centerX, centerY);
            }
        }

        return tiles;
    }

    determineTile(x, y, centerX, centerY) {
        const landingBeach = y >= this.heightTiles - 7 && x >= centerX - 6 && x <= centerX + 6;
        if (landingBeach) {
            if (y >= this.heightTiles - 4 && x >= centerX - 2 && x <= centerX + 2) {
                return 'bridge';
            }
            return 'sand';
        }

        // Island shape - ellipse with sandy beach border
        const distX = (x - centerX) / (this.widthTiles / 2 - 2);
        const distY = (y - centerY) / (this.heightTiles / 2 - 2);
        const dist = Math.sqrt(distX * distX + distY * distY);

        // Outside island = water
        if (dist > 1) {
            return 'water';
        }

        // Beach border (outer ring of island)
        if (dist > 0.85) {
            return 'sand';
        }

        // Path from dock to school
        if (x >= centerX - 2 && x <= centerX + 2) {
            if (y >= centerY - 5 && y <= this.heightTiles - 4) {
                return 'path';
            }
        }

        // Main campus paths around the academy and side buildings
        if (y >= centerY - 6 && y <= centerY - 4) {
            if (x >= centerX - 11 && x <= centerX + 11) {
                return 'path';
            }
        }
        if (y >= centerY - 1 && y <= centerY + 1) {
            if (x >= centerX - 12 && x <= centerX + 12) {
                return 'path';
            }
        }
        if (y >= centerY + 5 && y <= centerY + 7) {
            if (x >= centerX - 12 && x <= centerX + 12) {
                return 'path';
            }
        }
        if (y >= centerY - 5 && y <= centerY + 8) {
            if ((x >= centerX - 10 && x <= centerX - 8) ||
                (x >= centerX + 8 && x <= centerX + 10)) {
                return 'path';
            }
        }

        // Dock area at south
        if (y >= this.heightTiles - 4 && x >= centerX - 3 && x <= centerX + 3) {
            return 'bridge'; // Dock uses bridge tiles
        }

        // Grass everywhere else on island
        return 'grass';
    }

    generateBuildings() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Dumpling Academy - the main school building
        const school = new House(centerX - 40, centerY - 120, 'veggie', 'Dumpling Academy');
        school.buildingType = 'school';
        school.interior = {
            type: 'multi_room',
            currentRoom: 'hallway',
            rooms: ['hallway', 'art', 'music', 'science', 'japanese', 'gym']
        };

        const library = this.createCampusBuilding(centerX - 170, centerY - 55, 'shrimp', 'Island Library', {
            decorations: [
                { emoji: '📚', x: 100, y: 165, name: 'Picture books' },
                { emoji: '📖', x: 230, y: 170, name: 'Open storybook' },
                { emoji: '🖋️', x: 285, y: 210, name: 'Study desk' },
                { emoji: '🪟', x: 145, y: 215, name: 'Reading nook' }
            ],
            npc: {
                name: 'Librarian Shiso',
                filling: 'veggie',
                dialogue: {
                    start: {
                        text: "Welcome to the island library. The best adventures fit inside a lunchbox or a book.",
                        choices: [
                            { text: "Any school stories?", next: 'stories' },
                            { text: "I'll read quietly.", next: null }
                        ]
                    },
                    stories: {
                        text: "The first students landed right on the south beach, then carried their books up this path every morning.",
                        next: null
                    }
                }
            }
        });

        const cafeteria = this.createCampusBuilding(centerX + 105, centerY - 55, 'pork', 'Steam Cafeteria', {
            decorations: [
                { emoji: '🍙', x: 100, y: 175, name: 'Rice balls' },
                { emoji: '🥢', x: 180, y: 170, name: 'Lunch trays' },
                { emoji: '🍵', x: 260, y: 205, name: 'Tea station' },
                { emoji: '🥟', x: 300, y: 165, name: 'Dumpling basket' }
            ],
            npc: {
                name: 'Cook Bao',
                filling: 'pork',
                dialogue: {
                    start: {
                        text: "Lunch is almost ready! Sea breeze makes everyone extra hungry after the boat ride.",
                        choices: [
                            { text: "What's cooking?", next: 'menu' },
                            { text: "Smells great!", next: null }
                        ]
                    },
                    menu: {
                        text: "Miso soup, rice balls, and tiny gyoza for tiny scholars. Simple, warm, perfect.",
                        next: null
                    }
                }
            }
        });

        const dorm = this.createCampusBuilding(centerX - 170, centerY + 75, 'sweet', 'Nap Dorm', {
            decorations: [
                { emoji: '🛏️', x: 105, y: 185, name: 'Nap futon' },
                { emoji: '🧸', x: 250, y: 180, name: 'Comfort plush' },
                { emoji: '🌙', x: 295, y: 215, name: 'Moon lamp' },
                { emoji: '🎒', x: 150, y: 220, name: 'School bags' }
            ],
            description: 'A quiet dorm for students who need a soft break between classes.'
        });

        const boatClub = this.createCampusBuilding(centerX + 105, centerY + 75, 'shrimp', 'Boat Club', {
            decorations: [
                { emoji: '🧭', x: 105, y: 170, name: 'Compass' },
                { emoji: '🪢', x: 175, y: 205, name: 'Dock ropes' },
                { emoji: '🗺️', x: 260, y: 170, name: 'Island map' },
                { emoji: '🚢', x: 300, y: 215, name: 'Model boat' }
            ],
            npc: {
                name: 'Captain Miso',
                filling: 'shrimp',
                dialogue: {
                    start: {
                        text: "Keep your sea legs ready. Boats connect every dumpling on this island to town.",
                        choices: [
                            { text: "How's the beach?", next: 'beach' },
                            { text: "Aye aye!", next: null }
                        ]
                    },
                    beach: {
                        text: "Soft sand, calm waves, and a clear walk up to campus. Best landing spot around.",
                        next: null
                    }
                }
            }
        });

        return [school, library, cafeteria, dorm, boatClub];
    }

    createCampusBuilding(x, y, filling, name, interior) {
        const building = new House(x, y, filling, name);
        building.buildingType = 'home';
        building.interior = interior;
        return building;
    }

    generateDecorations() {
        const decorations = [];
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Palm trees around the beach
        const palmPositions = [
            { x: 60, y: 100 },
            { x: 100, y: 60 },
            { x: this.width - 80, y: 80 },
            { x: this.width - 60, y: 140 },
            { x: 50, y: this.height - 120 },
            { x: this.width - 70, y: this.height - 100 }
        ];

        for (const pos of palmPositions) {
            decorations.push(new Decoration(pos.x, pos.y, 'palm_tree'));
        }

        // Flowers around the school path
        const flowerColors = ['#ff69b4', '#ffd700', '#ff6347', '#9370db'];
        for (let i = 0; i < 12; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            const x = centerX + side * (40 + Math.random() * 30);
            const y = centerY + (i - 6) * 25 + Math.random() * 10;
            const flower = new Decoration(x, y, 'flower');
            flower.color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
            decorations.push(flower);
        }

        // Dock at south
        const dock = new Decoration(centerX - 20, this.height - 60, 'dock');
        dock.interactive = true;
        decorations.push(dock);

        // Beach landing markers
        const umbrellaLeft = new Decoration(centerX - 82, this.height - 104, 'beach_umbrella');
        umbrellaLeft.color = '#ff8a80';
        decorations.push(umbrellaLeft);

        const umbrellaRight = new Decoration(centerX + 62, this.height - 100, 'beach_umbrella');
        umbrellaRight.color = '#64b5f6';
        decorations.push(umbrellaRight);

        // School sign
        const sign = new Decoration(centerX - 30, centerY - 60, 'school_sign');
        decorations.push(sign);

        return decorations;
    }

    getTile(x, y) {
        if (x < 0 || x >= this.widthTiles || y < 0 || y >= this.heightTiles) {
            return 'water';
        }
        return this.tiles[y][x];
    }

    getDockSpawn() {
        return { ...this.dockSpawn };
    }

    getSpawnPoint() {
        return this.getDockSpawn();
    }

    getBounds() {
        return {
            width: this.width,
            height: this.height
        };
    }

    canMoveTo(x, y, width, height) {
        // Check all corners
        const corners = [
            { x: x, y: y },
            { x: x + width, y: y },
            { x: x, y: y + height },
            { x: x + width, y: y + height }
        ];

        for (const corner of corners) {
            const tileX = Math.floor(corner.x / this.tileSize);
            const tileY = Math.floor(corner.y / this.tileSize);
            const tile = this.getTile(tileX, tileY);

            if (tile === 'water') {
                return false;
            }
        }

        // Check building collision
        for (const house of this.houses) {
            const houseBox = {
                x: house.x + 8,
                y: house.y + 20,
                width: house.width || 64,
                height: 50
            };

            if (x < houseBox.x + houseBox.width &&
                x + width > houseBox.x &&
                y < houseBox.y + houseBox.height &&
                y + height > houseBox.y) {
                return false;
            }
        }

        return true;
    }

    checkInteraction(playerX, playerY) {
        // Check building interaction
        for (const house of this.houses) {
            const doorX = house.x + 32;
            const doorY = house.y + 50;
            const dx = playerX - doorX;
            const dy = playerY - doorY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 40) {
                return {
                    type: 'house',
                    data: house,
                    message: `Enter ${house.data.ownerName}`
                };
            }
        }

        // Check decoration interaction (dock for return trip)
        for (const deco of this.decorations) {
            if (deco.type === 'dock') {
                const dx = playerX - (deco.x + 20);
                const dy = playerY - (deco.y + 20);
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 50) {
                    return {
                        type: 'dock_return',
                        message: 'Press E to return to Village! 🚢'
                    };
                }
            }
        }

        return null;
    }
}

// School room definitions
export const SchoolRooms = {
    hallway: {
        name: 'Main Hallway',
        description: 'The central hallway of Dumpling Academy',
        doors: [
            { to: 'art', px: 0.2, py: 0.2, label: 'Art Room' },
            { to: 'music', px: 0.45, py: 0.2, label: 'Music Room' },
            { to: 'science', px: 0.7, py: 0.2, label: 'Science Lab' },
            { to: 'japanese', px: 0.2, py: 0.6, label: 'Japanese Class' },
            { to: 'gym', px: 0.45, py: 0.6, label: 'Gymnasium' },
            { to: 'exit', px: 0.7, py: 0.6, label: 'Exit' }
        ],
        decorations: ['lockers', 'bulletin_board', 'clock']
    },
    art: {
        name: 'Art Room',
        teacher: {
            name: 'Palette-sensei',
            filling: 'sweet',
            dialogue: {
                start: {
                    text: "Welcome to Art class! Today we're exploring color and creativity. Every dumpling is a work of art!",
                    next: null
                }
            }
        },
        doors: [{ to: 'hallway', px: 0.08, py: 0.85, label: 'Back to Hall' }],
        decorations: ['easels', 'paint_supplies', 'artwork'],
        subject: 'art'
    },
    music: {
        name: 'Music Room',
        teacher: {
            name: 'Melody-sensei',
            filling: 'shrimp',
            dialogue: {
                start: {
                    text: "Ah, music is the steam that rises from a freshly cooked dumpling! Let's make beautiful sounds together!",
                    next: null
                }
            }
        },
        doors: [{ to: 'hallway', px: 0.08, py: 0.85, label: 'Back to Hall' }],
        decorations: ['piano', 'drums', 'music_stands'],
        subject: 'music'
    },
    science: {
        name: 'Science Laboratory',
        teacher: {
            name: 'Bunsen-sensei',
            filling: 'veggie',
            dialogue: {
                start: {
                    text: "Science! The study of why dumplings are delicious at exactly 165 degrees! Let's experiment!",
                    next: null
                }
            }
        },
        doors: [{ to: 'hallway', px: 0.08, py: 0.85, label: 'Back to Hall' }],
        decorations: ['lab_tables', 'microscopes', 'beakers'],
        subject: 'science'
    },
    japanese: {
        name: 'Japanese Language Class',
        teacher: {
            name: 'Kanji-sensei',
            filling: 'pork',
            dialogue: {
                start: {
                    text: "Konnichiwa! Today we learn the beautiful characters of Japanese. The word for dumpling is 'gyoza' - 餃子!",
                    next: null
                }
            }
        },
        doors: [{ to: 'hallway', px: 0.08, py: 0.85, label: 'Back to Hall' }],
        decorations: ['calligraphy', 'kanji_charts', 'writing_desks'],
        subject: 'japanese'
    },
    gym: {
        name: 'Gymnasium',
        teacher: {
            name: 'Coach Mochi',
            filling: 'sweet',
            dialogue: {
                start: {
                    text: "Let's get those dumpling bodies moving! A healthy dumpling is a happy dumpling! Stretch, roll, bounce!",
                    next: null
                }
            }
        },
        doors: [{ to: 'hallway', px: 0.08, py: 0.85, label: 'Back to Hall' }],
        decorations: ['gym_mats', 'basketballs', 'climbing_rope'],
        subject: 'pe'
    }
};

// Create the school island world instance
export function createSchoolIsland() {
    return new SchoolIslandWorld();
}
