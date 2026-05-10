/**
 * Dumpling Town - Game Controller
 * Manages game state, input, and the main game loop
 */

import { Renderer } from './renderer.js';
import { Player, NPC } from './entities.js';
import { World } from './world.js';
import * as MiniGames from './minigames.js';
import { GameTime, getKidLocation } from './schedule.js';
import { createKidNpcData, createKidNpcs, updateKidLocations, KidLocation } from './kidNpcs.js';
import * as Boat from './boat.js';
import { createSchoolIsland, SchoolRooms } from './school.js';

export const GameState = {
    LOADING: 'loading',
    START_SCREEN: 'start_screen',
    FILLING_SELECT: 'filling_select',
    PLAYING: 'playing',
    PAUSED: 'paused',
    DIALOGUE: 'dialogue',
    INSIDE_BUILDING: 'inside_building',
    SHOPPING: 'shopping',
    INVENTORY: 'inventory',
    // Mini-games
    MINIGAME_RPS: 'minigame_rps',           // Rock Paper Scissors
    MINIGAME_RHYTHM: 'minigame_rhythm',     // Rhythm Cooking
    MINIGAME_FISHING: 'minigame_fishing',   // Fishing
    MINIGAME_TREASURE: 'minigame_treasure', // Hot/Cold Treasure Hunt
    // Boat ride
    BOAT_RIDE: 'boat_ride'                  // Traveling to/from school island
};

export class Game {
    constructor(canvas, api = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.renderer = new Renderer(canvas, this.ctx);
        this.api = api; // GameAPI instance (optional, for server backup)

        this.state = GameState.START_SCREEN;
        this.player = null;
        this.world = new World();
        this.villageWorld = this.world; // Keep reference to village
        this.schoolWorld = createSchoolIsland(); // Create school island
        this.npcs = [];
        this.kidNpcs = []; // Kid NPCs for school
        this.boatRide = Boat.createBoatRideState();
        this.boatPlayerPos = { x: 200, y: 200 };
        this.currentMap = 'village'; // Track current map location
        this.villageDock = { x: 900, y: 370 }; // Dock position for return

        // Input state
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            interact: false
        };
        this.tapTarget = null; // For tap-to-move

        // Camera
        this.camera = { x: 0, y: 0 };

        // View dimensions (updated on resize)
        const rect = canvas.getBoundingClientRect();
        this.viewWidth = rect.width || canvas.width;
        this.viewHeight = rect.height || canvas.height;
        this.renderer.onResize(this.viewWidth, this.viewHeight);

        // Dialogue state
        this.currentDialogue = null;
        this.dialogueIndex = 0;
        this.selectedDialogueChoice = 0; // For arrow key navigation

        // Building interior state
        this.currentBuilding = null;
        this.interiorNpcs = [];
        this.playerInteriorPos = { x: 0, y: 0 };

        // School room navigation
        this.currentSchoolRoom = null; // 'hallway', 'art', 'music', 'science', 'japanese', 'gym'
        this.schoolRoomDoors = [];     // Door positions in current room

        // Shop state
        this.shopItems = [];
        this.selectedShopItem = 0;
        this.playerCoins = 100; // Start with some coins

        // Inventory and equipment
        this.playerInventory = []; // Items owned
        this.equippedItems = {
            hat: null,       // Hats, bows, etc.
            accessory: null, // Pins, flowers, etc.
            held: null       // Food items being held
        };
        this.selectedInventoryItem = 0;
        this.purchaseMessage = null;
        this.purchaseMessageTimer = 0;
        this.rewardMessage = null;
        this.rewardMessageTimer = 0;

        // Player's home decorations
        this.homeDecorations = []; // Items placed in player's home
        this.isPlacingItem = false;
        this.placingItemIndex = 0;
        this.placementCursor = { x: 120, y: 120 };
        this.sleepMessage = null;
        this.sleepMessageTimer = 0;

        // Quest tracking
        // States: none -> active -> delivered -> complete
        this.activeQuests = {
            ebiDelivery: 'none',      // Ebi-chan -> Grandma Gyoza message
            yasaiGardening: 'none',   // Yasai-san -> Mayor Mochi for fertilizer
            butaBoxes: 'none',        // Buta-kun -> Nikuman for box delivery
            ichigoFeedback: 'none'    // Ichigo -> Tako-san for joke feedback
        };

        // Mini-game states (initialized from minigames.js)
        this.miniGame = MiniGames.createMiniGameState();

        // Game time system (for school schedule)
        this.gameTime = new GameTime();

        // Animation
        this.lastTime = 0;
        this.animationId = null;

        // Initialize world and NPCs
        this.initializeWorld();
    }

    initializeWorld() {
        // Create some NPC dumplings around town (relative to world center)
        const cx = this.world.width / 2;
        const cy = this.world.height / 2;

        // Dialogue with choices - each node has text and optional choices
        // Choices lead to other nodes by id
        const npcData = [
            { x: cx - 60, y: cy - 50, filling: 'shrimp', name: 'Ebi-chan', dialogue: {
                start: {
                    text: "Welcome to Dumpling Town! I'm Ebi-chan~",
                    choices: [
                        { text: "Nice to meet you!", next: 'nice' },
                        { text: "Any jobs available?", next: 'jobs' },
                        { text: "What is this place?", next: 'about' }
                    ]
                },
                nice: {
                    text: "Aww, you're so sweet! Just like a dessert dumpling!",
                    choices: [
                        { text: "Tell me about the town", next: 'about' },
                        { text: "Any work I can do?", next: 'jobs' },
                        { text: "Bye bye!", next: null }
                    ]
                },
                jobs: {
                    text: "Hmm, let me think... Oh! I need someone to deliver a message to Grandma Gyoza. 80 coins?",
                    questCheck: 'ebiDelivery',
                    choices: [
                        { text: "I'll do it!", next: 'acceptDelivery' },
                        { text: "Not right now", next: null }
                    ]
                },
                jobs_active: {
                    text: "Did you deliver my message to Grandma Gyoza yet? She lives in the house on the top-left!",
                    next: null
                },
                jobs_delivered: {
                    text: "You delivered it! Thank you so much! Here's your 80 coins as promised!",
                    reward: 80,
                    questComplete: 'ebiDelivery',
                    next: 'delivered'
                },
                acceptDelivery: {
                    text: "Great! Please tell Grandma Gyoza that the town festival is next week. She's in the top-left house!",
                    questStart: 'ebiDelivery',
                    next: null
                },
                delivered: {
                    text: "You're such a reliable helper! Come back later if you want more delivery jobs~",
                    next: null
                },
                about: {
                    text: "This is Dumpling Town! We're all different flavors living together in harmony~",
                    choices: [
                        { text: "That's wonderful!", next: 'wonderful' },
                        { text: "Who else lives here?", next: 'residents' },
                        { text: "Goodbye!", next: null }
                    ]
                },
                wonderful: {
                    text: "Right?! Feel free to explore and make friends!",
                    next: null
                },
                residents: {
                    text: "There's Buta-kun the pork dumpling, Yasai-san who loves veggies, and sweet little Ichigo!",
                    choices: [
                        { text: "I'll go meet them!", next: null },
                        { text: "Thanks for the info!", next: null }
                    ]
                }
            }},
            { x: cx + 80, y: cy + 60, filling: 'veggie', name: 'Yasai-san', dialogue: {
                start: {
                    text: "Ah, a visitor! Welcome to my little garden corner~",
                    choices: [
                        { text: "Hello! Nice garden!", next: 'garden' },
                        { text: "Need any help today?", next: 'work' },
                        { text: "Just passing through!", next: null }
                    ]
                },
                garden: {
                    text: "Thank you! I grow bamboo shoots, cabbage, and mushrooms here.",
                    choices: [
                        { text: "Can I help garden?", next: 'work' },
                        { text: "Sounds peaceful", next: 'peaceful' },
                        { text: "Bye!", next: null }
                    ]
                },
                work: {
                    text: "Actually, yes! I need some special fertilizer from Mayor Mochi at the Community Center. 100 coins if you get it?",
                    questCheck: 'yasaiGardening',
                    choices: [
                        { text: "I'll get it for you!", next: 'acceptWork' },
                        { text: "Maybe another time", next: 'nowork' }
                    ]
                },
                work_active: {
                    text: "Did you get the fertilizer from Mayor Mochi? The Community Center is in the bottom row of houses!",
                    next: null
                },
                work_delivered: {
                    text: "You got the fertilizer! Perfect! Now let's do some gardening together... *You plant and water* Here's 100 coins!",
                    reward: 100,
                    questComplete: 'yasaiGardening',
                    next: 'done'
                },
                acceptWork: {
                    text: "Wonderful! Please ask Mayor Mochi for the organic veggie fertilizer. He keeps it at the Community Center!",
                    questStart: 'yasaiGardening',
                    next: null
                },
                done: {
                    text: "Thank you so much! The garden looks beautiful. Come back anytime you want to help!",
                    next: null
                },
                nowork: {
                    text: "No worries! The offer is always open. Enjoy your day~",
                    next: null
                },
                peaceful: {
                    text: "It really is. Nothing like fresh vegetables and good friends!",
                    next: null
                }
            }},
            { x: cx - 120, y: cy + 80, filling: 'pork', name: 'Buta-kun', dialogue: {
                start: {
                    text: "Hey hey! New friend! Wanna play?",
                    choices: [
                        { text: "Sure! What game?", next: 'game' },
                        { text: "I'm looking for work", next: 'work' },
                        { text: "Maybe later~", next: 'later' }
                    ]
                },
                game: {
                    text: "Hmm... how about hide and seek? Or a race? Winner gets coins!",
                    choices: [
                        { text: "Let's race!", next: 'race' },
                        { text: "Hide and seek!", next: 'hide' },
                        { text: "Another time!", next: null }
                    ]
                },
                race: {
                    text: "Ready... set... GO! *You both run around* Wow, you're fast! You win! Here's 50 coins!",
                    reward: 50,
                    next: 'racewin'
                },
                racewin: {
                    text: "That was so fun! *panting* Let's race again sometime!",
                    next: null
                },
                work: {
                    text: "Work? Hmm... OH! Nikuman needs his protein powder delivered! He's at his house. 75 coins if you take it?",
                    questCheck: 'butaBoxes',
                    choices: [
                        { text: "I'll deliver it!", next: 'acceptBoxes' },
                        { text: "Not right now", next: null }
                    ]
                },
                work_active: {
                    text: "Did you deliver the protein powder to Nikuman yet? His house is in the bottom-left!",
                    next: null
                },
                work_delivered: {
                    text: "You delivered it! Nikuman must be so happy! Here's your 75 coins, delivery champion!",
                    reward: 75,
                    questComplete: 'butaBoxes',
                    next: 'boxesdone'
                },
                acceptBoxes: {
                    text: "*hands you a heavy box* Here! It's Nikuman's special protein powder. His house is bottom-left!",
                    questStart: 'butaBoxes',
                    next: null
                },
                boxesdone: {
                    text: "Thanks for helping! You're really strong for a dumpling!",
                    next: null
                },
                later: {
                    text: "Aww okay! Come back when you wanna have fun!",
                    next: null
                },
                hide: {
                    text: "Yay! Okay okay, you count to 10! ...wait, we're still talking. Later then!",
                    next: null
                }
            }},
            { x: cx + 150, y: cy - 80, filling: 'sweet', name: 'Ichigo', dialogue: {
                start: {
                    text: "Teehee! Hi hi! I'm Ichigo, the sweetest dumpling in town!",
                    choices: [
                        { text: "You seem very cheerful!", next: 'cheerful' },
                        { text: "Need help with anything?", next: 'help' },
                        { text: "Wanna play a game?", next: 'game' }
                    ]
                },
                cheerful: {
                    text: "Life is sweet when you're filled with strawberry jam! Get it? Sweet?",
                    choices: [
                        { text: "Haha, good one!", next: 'laugh' },
                        { text: "That's... a pun", next: 'pun' }
                    ]
                },
                game: {
                    text: "Ooh ooh! I LOVE games! Let's play treasure hunt! I'll hide something and you find it! Prize is 50-100 coins!",
                    choices: [
                        { text: "Let's play!", next: 'treasure_start' },
                        { text: "Maybe later", next: null }
                    ]
                },
                treasure_start: {
                    text: "*hides something* Okay! I hid a special treasure somewhere in town! I'll tell you if you're hot or cold! GO!",
                    startMiniGame: 'treasure'
                },
                help: {
                    text: "Ooh ooh! I need feedback on my jokes for the talent show! Can you ask Tako-san? He's a poet! 60 coins?",
                    questCheck: 'ichigoFeedback',
                    choices: [
                        { text: "I'll ask him!", next: 'acceptFeedback' },
                        { text: "Maybe later", next: null }
                    ]
                },
                help_active: {
                    text: "Did you get feedback from Tako-san yet? He lives in the house in the bottom row! He's super artsy!",
                    next: null
                },
                help_delivered: {
                    text: "He said my jokes are BRILLIANT?! And have... depth?! OMG! Thank you thank you! Here's 60 coins!",
                    reward: 60,
                    questComplete: 'ichigoFeedback',
                    next: 'jokesdone'
                },
                acceptFeedback: {
                    text: "YAY! Tell him my joke: 'Why did the dumpling go to school? To get a little FILLING!' See what he thinks!",
                    questStart: 'ichigoFeedback',
                    next: null
                },
                jokesdone: {
                    text: "You're the best! I'm gonna WIN that talent show! Come see me perform sometime!",
                    next: null
                },
                laugh: {
                    text: "Teehee! I have a million more! What do you call a sad strawberry? A blueberry!",
                    next: null
                },
                pun: {
                    text: "The BEST kind of joke! Puns are the highest form of comedy!",
                    next: null
                }
            }}
        ];

        this.npcs = npcData.map((data, index) => {
            const npc = new NPC(data.x, data.y, data.filling, data.name, data.dialogue);

            // Set up wander areas for each NPC (around their spawn point)
            const wanderRadius = 80;
            npc.setWanderArea(
                data.x - wanderRadius,
                data.y - wanderRadius,
                wanderRadius * 2,
                wanderRadius * 2
            );

            // Assign home houses to some NPCs
            // Ebi-chan -> Dumpling Shop area, Yasai-san -> near her garden
            // Buta-kun -> Nikuman's House, Ichigo -> Anko's Bakery area
            const houseAssignments = [
                1,  // Ebi-chan near Dumpling Shop
                2,  // Yasai-san near Yasai-san's House
                4,  // Buta-kun at Nikuman's House
                7   // Ichigo near Anko's Bakery
            ];

            if (houseAssignments[index] !== undefined) {
                const houseIndex = houseAssignments[index];
                if (this.world.houses[houseIndex]) {
                    npc.setHomeHouse(this.world.houses[houseIndex]);
                }
            }

            return npc;
        });

        // Create kid NPCs for school
        const worldCenter = { x: cx, y: cy };
        const kidData = createKidNpcData(worldCenter);
        this.kidNpcs = createKidNpcs(NPC, kidData);

        // Add kids to main NPC list so they're updated and rendered
        this.npcs = [...this.npcs, ...this.kidNpcs];
    }

    setPlayerFilling(filling) {
        // Create player at spawn point
        const spawn = this.world.getSpawnPoint();
        this.player = new Player(spawn.x, spawn.y, filling);

        // Try to load saved game state
        const hadSave = this.loadGame();

        // If no save existed, set up default home furniture
        if (!hadSave) {
            this.initializeDefaultHome();
        }

        // If loaded, update player filling from save (if different)
        if (this.player) {
            this.player.filling = filling;
            this.player.fillingData = this.player.fillingData || {};
        }

        // Save current state
        this.saveGame();
    }

    // Set up default furniture for a new player's home
    initializeDefaultHome() {
        this.homeDecorations = [
            {
                id: 'home_bed',
                name: 'Cozy Futon',
                emoji: '🛏️',
                slot: 'furniture',
                isBed: true,
                x: 280,
                y: 180,
                instanceId: 'bed_default'
            }
        ];
    }

    // ============================================
    // SAVE / LOAD SYSTEM
    // ============================================

    saveGame() {
        const saveData = {
            version: 1,
            savedAt: Date.now(),
            playerFilling: this.player?.filling || 'pork',
            playerCoins: this.playerCoins,
            playerInventory: this.playerInventory,
            equippedItems: this.equippedItems,
            homeDecorations: this.homeDecorations,
            activeQuests: this.activeQuests,
            gameTime: this.gameTime.toJSON()
        };

        try {
            localStorage.setItem('dumplingtown.save.v1', JSON.stringify(saveData));
        } catch (e) {
            console.warn('Failed to save game:', e);
        }

        // Fire-and-forget server backup
        if (this.api) {
            this.api.pushSave(saveData).catch(() => {});
        }
    }

    loadGame() {
        try {
            const saved = localStorage.getItem('dumplingtown.save.v1');
            if (!saved) return false;

            const saveData = JSON.parse(saved);
            this._applySaveData(saveData);

            console.log('Game loaded from save');
            return true;
        } catch (e) {
            console.warn('Failed to load game:', e);
            return false;
        }
    }

    /**
     * Try to load from server if it has a newer save than localStorage.
     * Call after initial loadGame() — async, non-blocking.
     */
    async tryServerLoad() {
        if (!this.api) return;

        try {
            const serverSave = await this.api.pullSave();
            if (!serverSave) return;

            const localRaw = localStorage.getItem('dumplingtown.save.v1');
            const localSavedAt = localRaw ? JSON.parse(localRaw).savedAt ?? 0 : 0;
            const serverSavedAt = serverSave.savedAt ?? 0;

            if (serverSavedAt > localSavedAt) {
                console.log('Server save is newer, applying...');
                this._applySaveData(serverSave);
                // Update localStorage with the newer server data
                localStorage.setItem('dumplingtown.save.v1', JSON.stringify(serverSave));
            }
        } catch (e) {
            console.warn('Failed to check server save:', e);
        }
    }

    _applySaveData(saveData) {
        if (saveData.playerCoins !== undefined) {
            this.playerCoins = saveData.playerCoins;
        }
        if (saveData.playerInventory) {
            this.playerInventory = saveData.playerInventory;
        }
        if (saveData.equippedItems) {
            this.equippedItems = saveData.equippedItems;
        }
        if (saveData.homeDecorations) {
            this.homeDecorations = saveData.homeDecorations;
        }
        if (saveData.activeQuests) {
            this.activeQuests = saveData.activeQuests;
        }
        if (saveData.gameTime) {
            this.gameTime.fromJSON(saveData.gameTime);
        }
    }

    // Check if there's a saved game
    hasSavedGame() {
        return localStorage.getItem('dumplingtown.save.v1') !== null;
    }

    // Clear saved game
    clearSave() {
        localStorage.removeItem('dumplingtown.save.v1');
    }

    // Load saved game and start directly (skips filling selection)
    loadAndStart() {
        try {
            const saved = localStorage.getItem('dumplingtown.save.v1');
            if (!saved) {
                console.warn('No save found, cannot continue');
                return false;
            }

            const saveData = JSON.parse(saved);
            const filling = saveData.playerFilling || 'pork';

            // Create player with saved filling
            const spawn = this.world.getSpawnPoint();
            this.player = new Player(spawn.x, spawn.y, filling);

            // Load all saved state
            if (saveData.playerCoins !== undefined) {
                this.playerCoins = saveData.playerCoins;
            }
            if (saveData.playerInventory) {
                this.playerInventory = saveData.playerInventory;
            }
            if (saveData.equippedItems) {
                this.equippedItems = saveData.equippedItems;
            }
            if (saveData.homeDecorations && saveData.homeDecorations.length > 0) {
                this.homeDecorations = saveData.homeDecorations;
            } else {
                // Old save without furniture - initialize default home
                this.initializeDefaultHome();
            }
            if (saveData.activeQuests) {
                this.activeQuests = saveData.activeQuests;
            }

            console.log('Continuing from save with filling:', filling);

            // Start the game
            this.start();

            // Check server for newer save (async, non-blocking)
            this.tryServerLoad();

            return true;
        } catch (e) {
            console.error('Failed to load and start:', e);
            return false;
        }
    }

    start() {
        this.state = GameState.PLAYING;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    pause() {
        this.state = GameState.PAUSED;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    resume() {
        if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
            this.lastTime = performance.now();
            this.gameLoop();
        }
    }

    gameLoop(currentTime = performance.now()) {
        if (this.state !== GameState.PLAYING &&
            this.state !== GameState.DIALOGUE &&
            this.state !== GameState.INSIDE_BUILDING &&
            this.state !== GameState.SHOPPING &&
            this.state !== GameState.INVENTORY &&
            this.state !== GameState.BOAT_RIDE &&
            this.state !== GameState.MINIGAME_RPS &&
            this.state !== GameState.MINIGAME_RHYTHM &&
            this.state !== GameState.MINIGAME_FISHING &&
            this.state !== GameState.MINIGAME_TREASURE) {
            return;
        }

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Update purchase message timer
        if (this.purchaseMessageTimer > 0) {
            this.purchaseMessageTimer -= deltaTime;
            if (this.purchaseMessageTimer <= 0) {
                this.purchaseMessage = null;
            }
        }

        // Update reward message timer
        if (this.rewardMessageTimer > 0) {
            this.rewardMessageTimer -= deltaTime;
            if (this.rewardMessageTimer <= 0) {
                this.rewardMessage = null;
            }
        }

        // Update sleep message timer
        if (this.sleepMessageTimer > 0) {
            this.sleepMessageTimer -= deltaTime;
            if (this.sleepMessageTimer <= 0) {
                this.sleepMessage = null;
            }
        }

        this.update(deltaTime);
        this.render();

        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(deltaTime) {
        // Update game time (always advances unless paused)
        if (this.state === GameState.PLAYING ||
            this.state === GameState.INSIDE_BUILDING ||
            this.state === GameState.MINIGAME_TREASURE) {
            this.gameTime.update(deltaTime);

            // Update kid NPC locations based on time/schedule
            updateKidLocations(this.kidNpcs, this.gameTime, getKidLocation);
            this.syncKidMapPositions();
        }

        if (this.state === GameState.DIALOGUE ||
            this.state === GameState.SHOPPING ||
            this.state === GameState.INVENTORY) {
            return; // Don't update movement during dialogue, shopping, or inventory
        }

        // Update mini-games (using minigames.js module)
        if (this.state === GameState.MINIGAME_RPS) {
            MiniGames.updateRPS(this, deltaTime);
            return;
        }
        if (this.state === GameState.MINIGAME_RHYTHM) {
            MiniGames.updateRhythm(this, deltaTime);
            return;
        }
        if (this.state === GameState.MINIGAME_FISHING) {
            MiniGames.updateFishing(this, deltaTime);
            return;
        }
        if (this.state === GameState.MINIGAME_TREASURE) {
            MiniGames.updateTreasureHunt(this, deltaTime);
            // Don't return - allow normal movement updates below
        }

        // Update boat ride
        if (this.state === GameState.BOAT_RIDE) {
            Boat.updateBoatRide(this, deltaTime);
            return;
        }

        // Update interior NPCs and player movement inside
        if (this.state === GameState.INSIDE_BUILDING) {
            for (const npc of this.interiorNpcs) {
                npc.update(deltaTime);
            }

            // Handle smooth interior movement (unless placing item)
            if (!this.isPlacingItem) {
                let dx = 0, dy = 0;
                if (this.keys.up) dy = -1;
                if (this.keys.down) dy = 1;
                if (this.keys.left) dx = -1;
                if (this.keys.right) dx = 1;

                // Normalize diagonal movement
                if (dx !== 0 && dy !== 0) {
                    dx *= 0.707;
                    dy *= 0.707;
                }

                const speed = 2.5;
                const newX = this.playerInteriorPos.x + dx * speed * deltaTime * 60;
                const newY = this.playerInteriorPos.y + dy * speed * deltaTime * 60;

                // Clamp to interior bounds - match the cozy room layout
                const margin = 40;
                const roomX = margin;
                const roomY = margin + 20;
                const roomW = this.viewWidth - margin * 2;
                const roomH = this.viewHeight - margin * 2 - 40;
                const wallHeight = 80;
                const floorTop = roomY + wallHeight + 20;  // Below wall
                const floorBottom = roomY + roomH - 80;     // Above door

                this.playerInteriorPos.x = Math.max(roomX + 50, Math.min(roomX + roomW - 50, newX));
                this.playerInteriorPos.y = Math.max(floorTop, Math.min(floorBottom, newY));

                // Update player animation
                if (this.player) {
                    this.player.update(deltaTime, dx, dy);
                }
            } else if (this.player) {
                this.player.update(deltaTime, 0, 0);
            }
            return;
        }

        // Update player
        if (this.player) {
            // Handle input
            let dx = 0, dy = 0;
            if (this.keys.up) dy = -1;
            if (this.keys.down) dy = 1;
            if (this.keys.left) dx = -1;
            if (this.keys.right) dx = 1;

            // Tap-to-move: if no keyboard input and we have a tap target
            if (dx === 0 && dy === 0 && this.tapTarget) {
                const targetDx = this.tapTarget.x - (this.player.x + this.player.width / 2);
                const targetDy = this.tapTarget.y - (this.player.y + this.player.height / 2);
                const distance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);

                if (distance < 10) {
                    // Reached target, clear it
                    this.tapTarget = null;
                } else {
                    // Move toward target
                    dx = targetDx / distance;
                    dy = targetDy / distance;
                }
            }

            // Clear tap target if using keyboard
            if (this.keys.up || this.keys.down || this.keys.left || this.keys.right) {
                this.tapTarget = null;
            }

            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                const len = Math.sqrt(dx * dx + dy * dy);
                dx /= len;
                dy /= len;
            }

            // Try to move
            const newX = this.player.x + dx * this.player.speed * deltaTime * 60;
            const newY = this.player.y + dy * this.player.speed * deltaTime * 60;

            // Check world bounds and collisions
            if (this.world.canMoveTo(newX, newY, this.player.width, this.player.height)) {
                this.player.x = newX;
                this.player.y = newY;
            } else {
                // Try sliding along walls
                if (this.world.canMoveTo(newX, this.player.y, this.player.width, this.player.height)) {
                    this.player.x = newX;
                } else if (this.world.canMoveTo(this.player.x, newY, this.player.width, this.player.height)) {
                    this.player.y = newY;
                }
            }

            // Update animation
            this.player.update(deltaTime, dx, dy);

            // Update camera to follow player
            this.updateCamera();
        }

        // Update NPCs (pass world for collision checking)
        // Only update NPCs that are at the current location
        for (const npc of this.npcs) {
            if (this.shouldNpcBeVisible(npc)) {
                npc.update(deltaTime, this.world);
            }
        }
    }

    // Check if an NPC should be visible at the current location
    shouldNpcBeVisible(npc) {
        // Kid NPCs have location-based visibility
        if (npc.isKid) {
            // In village map, show kids who are in village
            if (this.currentMap === 'village') {
                return npc.currentLocation === KidLocation.VILLAGE;
            }
            // At school island outside, show kids in SCHOOL location (break time)
            if (this.currentMap === 'school_island') {
                return npc.currentLocation === KidLocation.SCHOOL;
            }
            return false;
        }
        // Regular NPCs are always visible in village
        return this.currentMap === 'village';
    }

    updateCamera() {
        // Use scaled view dimensions for camera
        const viewW = this.viewWidth / this.renderer.scale;
        const viewH = this.viewHeight / this.renderer.scale;

        // Center camera on player
        const targetX = this.player.x - viewW / 2 + this.player.width / 2;
        const targetY = this.player.y - viewH / 2 + this.player.height / 2;

        // Smooth camera follow
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;

        // Clamp to world bounds
        const worldBounds = this.world.getBounds();
        this.camera.x = Math.max(0, Math.min(this.camera.x, worldBounds.width - viewW));
        this.camera.y = Math.max(0, Math.min(this.camera.y, worldBounds.height - viewH));
    }

    render() {
        // Render mini-games
        if (this.state === GameState.MINIGAME_RPS) {
            this.renderer.drawRPS(this.miniGame.rps);
            return;
        }
        if (this.state === GameState.MINIGAME_RHYTHM) {
            this.renderer.drawRhythm(this.miniGame.rhythm);
            return;
        }
        if (this.state === GameState.MINIGAME_FISHING) {
            this.renderer.drawFishing(this.miniGame.fishing);
            return;
        }
        if (this.state === GameState.MINIGAME_TREASURE) {
            // Draw normal world but with treasure hunt overlay
            this.renderer.clear();
            this.renderer.drawWorld(this.world, this.camera);
            for (const npc of this.npcs) {
                if (!npc.isIndoors && this.shouldNpcBeVisible(npc)) {
                    this.renderer.drawDumpling(npc, this.camera);
                }
            }
            if (this.player) {
                this.renderer.drawDumpling(this.player, this.camera, this.equippedItems);
            }
            this.renderer.drawCoinsHUD(this.playerCoins, this.rewardMessage);
            this.renderer.drawTimeHUD(
                this.gameTime.getDisplayTime(),
                this.gameTime.getPeriodName(),
                this.gameTime.dayNumber
            );
            this.renderer.drawTreasureHunt(this.miniGame.treasure);
            return;
        }

        // Render boat ride
        if (this.state === GameState.BOAT_RIDE) {
            this.renderer.drawBoatInterior(
                this.boatRide,
                this.boatPlayerPos,
                this.player,
                this.equippedItems,
                Boat.getNearbyPassenger(this)
            );
            return;
        }

        // Render boat conversations over the paused boat ride.
        if (this.state === GameState.DIALOGUE &&
            this.currentDialogue?.returnState === GameState.BOAT_RIDE &&
            this.boatRide?.active) {
            this.renderer.drawBoatInterior(
                this.boatRide,
                this.boatPlayerPos,
                this.player,
                this.equippedItems,
                this.currentDialogue.npc
            );
            this.renderer.drawDialogue(
                this.currentDialogue.name,
                this.currentDialogue.text,
                this.currentDialogue.choices,
                this.selectedDialogueChoice
            );
            return;
        }

        // Check if we're inside a building
        if (this.state === GameState.INSIDE_BUILDING ||
            (this.state === GameState.DIALOGUE && this.currentBuilding)) {
            this.renderer.drawInterior(
                this.currentBuilding,
                this.playerInteriorPos,
                this.interiorNpcs,
                this.player,
                this.equippedItems,
                {
                    homeDecorations: this.homeDecorations,
                    isPlacingItem: this.isPlacingItem,
                    placementCursor: this.placementCursor,
                    placingItem: this.isPlacingItem ? this.playerInventory[this.placingItemIndex] : null,
                    sleepMessage: this.sleepMessage,
                    // School room data
                    schoolRoom: this.currentSchoolRoom,
                    schoolRoomDoors: this.schoolRoomDoors
                }
            );

            // Draw dialogue if active inside building
            if (this.state === GameState.DIALOGUE && this.currentDialogue) {
                this.renderer.drawDialogue(
                    this.currentDialogue.name,
                    this.currentDialogue.text,
                    this.currentDialogue.choices,
                    this.selectedDialogueChoice
                );
            }
            return;
        }

        if (this.state === GameState.SHOPPING) {
            this.renderer.drawShop(
                this.currentBuilding,
                this.shopItems,
                this.selectedShopItem,
                this.playerCoins,
                this.purchaseMessage
            );
            return;
        }

        if (this.state === GameState.INVENTORY) {
            this.renderer.drawInventory(
                this.playerInventory,
                this.equippedItems,
                this.selectedInventoryItem,
                this.player
            );
            return;
        }

        this.renderer.clear();
        this.renderer.drawWorld(this.world, this.camera);

        // Draw NPCs (only those who are outdoors and at current location)
        for (const npc of this.npcs) {
            if (!npc.isIndoors && this.shouldNpcBeVisible(npc)) {
                this.renderer.drawDumpling(npc, this.camera);
            }
        }

        // Draw player with equipped items
        if (this.player) {
            this.renderer.drawDumpling(this.player, this.camera, this.equippedItems);
        }

        // Draw HUD elements
        this.renderer.drawCoinsHUD(this.playerCoins, this.rewardMessage);
        this.renderer.drawTimeHUD(
            this.gameTime.getDisplayTime(),
            this.gameTime.getPeriodName(),
            this.gameTime.dayNumber
        );

        // Draw dialogue if active
        if (this.state === GameState.DIALOGUE && this.currentDialogue) {
            this.renderer.drawDialogue(
                this.currentDialogue.name,
                this.currentDialogue.text,
                this.currentDialogue.choices,
                this.selectedDialogueChoice
            );
        }
    }

    interact() {
        if (this.state === GameState.DIALOGUE) {
            // If dialogue has choices, select the current one
            if (this.currentDialogue?.choices) {
                this.selectDialogueChoice(this.selectedDialogueChoice);
            } else {
                // Advance dialogue
                this.advanceDialogue();
            }
            return;
        }

        if (this.state === GameState.BOAT_RIDE) {
            const passenger = Boat.getNearbyPassenger(this);
            if (passenger) {
                this.startDialogue(passenger);
            } else {
                this.showNotification('Move close to a passenger to talk.');
            }
            return;
        }

        if (this.state === GameState.INSIDE_BUILDING) {
            // Check for interior NPC interaction
            if (this.interiorNpcs.length > 0) {
                for (const npc of this.interiorNpcs) {
                    const dx = Math.abs(this.playerInteriorPos.x - npc.x);
                    const dy = Math.abs(this.playerInteriorPos.y - npc.y);
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 60) {
                        this.startDialogue(npc);
                        return;
                    }
                }
            }

            // Check for school door interaction
            if (this.currentSchoolRoom) {
                const nearbyDoor = this.getNearbySchoolDoor();
                if (nearbyDoor) {
                    this.handleSchoolDoor(nearbyDoor);
                    return;
                }
                return; // Don't use normal exit in school rooms
            }

            // Check if near door to exit (bottom center of room) - for normal buildings
            const doorCenterX = this.viewWidth / 2;
            const margin = 40;
            const roomY = margin + 20;
            const roomH = this.viewHeight - margin * 2 - 40;
            const doorY = roomY + roomH - 50;

            const nearDoorX = Math.abs(this.playerInteriorPos.x - doorCenterX) < 60;
            const nearDoorY = this.playerInteriorPos.y > doorY - 30;

            if (nearDoorX && nearDoorY) {
                this.exitBuilding();
            }
            return;
        }

        if (this.state === GameState.SHOPPING) {
            // Buy selected item
            this.buySelectedItem();
            return;
        }

        if (!this.player) return;

        // Check for nearby houses first
        for (const house of this.world.houses) {
            const doorX = house.x + 32;
            const doorY = house.y + 50;
            const dx = Math.abs(this.player.x + 16 - doorX);
            const dy = Math.abs(this.player.y + 16 - doorY);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 45) {
                this.enterBuilding(house);
                return;
            }
        }

        // Check for nearby NPCs (only those who are outdoors)
        for (const npc of this.npcs) {
            if (npc.isIndoors) continue; // Skip indoor NPCs

            const dx = Math.abs(this.player.x - npc.x);
            const dy = Math.abs(this.player.y - npc.y);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 50) {
                this.startDialogue(npc);
                return;
            }
        }

        // Check for interactive objects in world
        const interaction = this.world.checkInteraction(this.player.x, this.player.y);
        if (interaction) {
            if (interaction.type === 'fishing_spot') {
                MiniGames.startFishing(this);
                return;
            }
            if (interaction.type === 'dock') {
                // Start boat ride to school island (from village)
                Boat.startBoatRide(this, Boat.BoatDestination.SCHOOL_ISLAND);
                return;
            }
            if (interaction.type === 'dock_return') {
                // Start boat ride back to village (from school island)
                Boat.startBoatRide(this, Boat.BoatDestination.VILLAGE);
                return;
            }
            this.showNotification(interaction.message);
        }
    }

    // Convert proportional (0-1) coordinates to absolute pixels on the walkable floor area
    resolveFloorPos(px, py) {
        const margin = 40;
        const roomX = margin;
        const roomY = margin + 20;
        const roomW = this.viewWidth - margin * 2;
        const roomH = this.viewHeight - margin * 2 - 40;
        const wallHeight = 80;
        const floorX = roomX + 30;
        const floorY = roomY + wallHeight + 10;
        const floorW = roomW - 60;
        const floorH = roomH - wallHeight - 60;
        return {
            x: floorX + px * floorW,
            y: floorY + py * floorH
        };
    }

    enterBuilding(house) {
        this.currentBuilding = house;
        // Start in center of floor area
        this.playerInteriorPos = this.resolveFloorPos(0.5, 0.5);
        this.isPlacingItem = false;

        // Set up interior based on building type
        if (house.buildingType === 'shop') {
            this.state = GameState.SHOPPING;
            this.shopItems = house.interior.items;
            this.selectedShopItem = 0;
        } else if (house.buildingType === 'school') {
            // Enter school - start in hallway
            this.enterSchoolRoom('hallway');
        } else if (house.buildingType === 'playerHome') {
            this.state = GameState.INSIDE_BUILDING;
            this.interiorNpcs = [];
            // Player's home - no NPCs, but has bed and decorations
        } else {
            this.state = GameState.INSIDE_BUILDING;

            // Create interior NPC if exists (static house NPC)
            // Position near kotatsu in center of room
            const npcPos = this.resolveFloorPos(0.4, 0.3);

            this.interiorNpcs = [];
            if (house.interior?.npc) {
                const npcData = house.interior.npc;
                const interiorNpc = new NPC(npcPos.x, npcPos.y, npcData.filling, npcData.name, npcData.dialogue);
                this.interiorNpcs.push(interiorNpc);
            }

            // Check if any wandering NPCs are "at home" in this building
            for (const npc of this.npcs) {
                if (npc.isIndoors && npc.homeHouse === house) {
                    // Create a temporary interior NPC based on the wandering NPC
                    const homeNpcPos = this.resolveFloorPos(0.6, 0.4);
                    const homeNpc = new NPC(homeNpcPos.x, homeNpcPos.y, npc.filling, npc.name, npc.dialogue);
                    this.interiorNpcs.push(homeNpc);
                }
            }
        }
    }

    // Enter a specific room in the school
    enterSchoolRoom(roomName) {
        const room = SchoolRooms[roomName];
        if (!room) return;

        this.currentSchoolRoom = roomName;
        this.schoolRoomDoors = room.doors || [];
        this.state = GameState.INSIDE_BUILDING;
        this.interiorNpcs = [];

        // Position player at entrance (bottom center for hallway, near door for classrooms)
        if (roomName === 'hallway') {
            this.playerInteriorPos = this.resolveFloorPos(0.5, 0.8);
        } else {
            this.playerInteriorPos = this.resolveFloorPos(0.15, 0.75);
        }

        // Create teacher NPC if room has one
        if (room.teacher) {
            const teacher = room.teacher;
            const teacherPos = this.resolveFloorPos(0.5, 0.15);
            const teacherNpc = new NPC(
                teacherPos.x,
                teacherPos.y,
                teacher.filling,
                teacher.name,
                teacher.dialogue
            );
            this.interiorNpcs.push(teacherNpc);
        }

        // Add kid NPCs to classroom during school hours
        if (roomName !== 'hallway' && room.subject) {
            const currentSubject = this.gameTime.getCurrentSubject?.();
            // Kids are in classroom during their class period
            if (currentSubject === room.subject) {
                // 2x3 desk grid spread proportionally across the floor
                const deskPositions = [
                    this.resolveFloorPos(0.25, 0.35), this.resolveFloorPos(0.5, 0.35), this.resolveFloorPos(0.75, 0.35),
                    this.resolveFloorPos(0.3, 0.55), this.resolveFloorPos(0.55, 0.55), this.resolveFloorPos(0.8, 0.55)
                ];

                let posIdx = 0;
                for (const kid of this.kidNpcs) {
                    if (kid.currentLocation === KidLocation.CLASSROOM && posIdx < deskPositions.length) {
                        const pos = deskPositions[posIdx];
                        const kidNpc = new NPC(pos.x, pos.y, kid.filling, kid.name, kid.dialogue);
                        kidNpc.isKid = true;
                        this.interiorNpcs.push(kidNpc);
                        posIdx++;
                    }
                }
            }
        }

        // Add kids to hallway during breaks
        if (roomName === 'hallway' && this.gameTime.isBreakTime?.()) {
            const hallwayPositions = [
                this.resolveFloorPos(0.2, 0.25), this.resolveFloorPos(0.45, 0.35), this.resolveFloorPos(0.7, 0.25),
                this.resolveFloorPos(0.3, 0.55), this.resolveFloorPos(0.55, 0.45), this.resolveFloorPos(0.8, 0.55)
            ];

            let posIdx = 0;
            for (const kid of this.kidNpcs) {
                if (kid.currentLocation === KidLocation.SCHOOL && posIdx < hallwayPositions.length) {
                    const pos = hallwayPositions[posIdx];
                    const kidNpc = new NPC(pos.x, pos.y, kid.filling, kid.name, kid.dialogue);
                    kidNpc.isKid = true;
                    this.interiorNpcs.push(kidNpc);
                    posIdx++;
                }
            }
        }
    }

    syncKidMapPositions() {
        const schoolyardPositions = this.getSchoolyardKidPositions();

        this.kidNpcs.forEach((kid, index) => {
            if (!kid.villagePos) {
                kid.villagePos = { x: kid.x, y: kid.y };
                kid.villageWanderRadius = kid.wanderArea ? kid.wanderArea.width / 2 : 50;
            }

            let target = null;
            let key = null;
            let radius = kid.villageWanderRadius || 50;

            if (kid.currentLocation === KidLocation.VILLAGE) {
                target = kid.villagePos;
                key = 'village';
            } else if (kid.currentLocation === KidLocation.SCHOOL) {
                target = schoolyardPositions[index % schoolyardPositions.length];
                key = 'schoolyard';
                radius = 28;
            }

            if (!target || kid.mapPositionKey === key) return;

            kid.x = target.x;
            kid.y = target.y;
            kid.mapPositionKey = key;
            kid.setWanderArea(
                target.x - radius,
                target.y - radius,
                radius * 2,
                radius * 2
            );
        });
    }

    getSchoolyardKidPositions() {
        const centerX = this.schoolWorld.width / 2;
        const centerY = this.schoolWorld.height / 2;

        return [
            { x: centerX - 110, y: centerY + 10 },
            { x: centerX - 65, y: centerY + 65 },
            { x: centerX - 15, y: centerY + 30 },
            { x: centerX + 45, y: centerY + 70 },
            { x: centerX + 95, y: centerY + 20 },
            { x: centerX + 5, y: centerY + 105 }
        ];
    }

    getDialogueReturnState() {
        if (this.state === GameState.BOAT_RIDE) {
            return GameState.BOAT_RIDE;
        }
        if (this.state === GameState.INSIDE_BUILDING) {
            return GameState.INSIDE_BUILDING;
        }
        return GameState.PLAYING;
    }

    // Check if player is near a school door
    getNearbySchoolDoor() {
        if (!this.currentSchoolRoom || !this.schoolRoomDoors.length) return null;

        for (const door of this.schoolRoomDoors) {
            const resolved = this.resolveFloorPos(door.px, door.py);
            const dx = Math.abs(this.playerInteriorPos.x - resolved.x);
            const dy = Math.abs(this.playerInteriorPos.y - resolved.y);
            if (dx < 35 && dy < 35) {
                return door;
            }
        }
        return null;
    }

    // Handle school door interaction
    handleSchoolDoor(door) {
        if (door.to === 'exit') {
            // Leave the school
            this.exitBuilding();
            this.currentSchoolRoom = null;
            this.schoolRoomDoors = [];
        } else if (door.to === 'hallway') {
            // Return to hallway from classroom
            this.enterSchoolRoom('hallway');
        } else {
            // Enter classroom
            this.enterSchoolRoom(door.to);
        }
    }

    // Check if player is near the bed (finds bed in homeDecorations)
    isNearBed() {
        if (this.currentBuilding?.buildingType !== 'playerHome') return false;

        // Find the bed in home decorations
        const bed = this.homeDecorations.find(d => d.isBed);
        if (!bed) return false;

        const dx = Math.abs(this.playerInteriorPos.x - bed.x);
        const dy = Math.abs(this.playerInteriorPos.y - bed.y);
        return dx < 50 && dy < 60;
    }

    // Find the bed decoration (for rendering)
    getBedDecoration() {
        return this.homeDecorations.find(d => d.isBed);
    }

    // Sleep in bed
    goToSleep() {
        if (!this.isNearBed()) return;

        // Advance time to morning
        this.gameTime.sleepUntilMorning();

        // Show sleep message with new day info
        this.sleepMessage = `Zzz... Good morning! Day ${this.gameTime.dayNumber}`;
        this.sleepMessageTimer = 2;

        // Save game after sleeping
        this.saveGame();
    }

    // Start placing an item
    startPlacingItem() {
        if (this.currentBuilding?.buildingType !== 'playerHome') return;
        if (this.playerInventory.length === 0) return;

        this.isPlacingItem = true;
        this.placingItemIndex = 0;
        this.placementCursor = { ...this.playerInteriorPos };
    }

    // Place the current item
    placeCurrentItem() {
        if (!this.isPlacingItem) return;

        const item = this.playerInventory[this.placingItemIndex];
        if (!item) return;

        // Add to home decorations
        this.homeDecorations.push({
            ...item,
            x: this.placementCursor.x,
            y: this.placementCursor.y
        });

        // Remove from inventory
        this.playerInventory.splice(this.placingItemIndex, 1);

        // Exit placement mode
        this.isPlacingItem = false;

        // Adjust index if needed
        if (this.placingItemIndex >= this.playerInventory.length) {
            this.placingItemIndex = Math.max(0, this.playerInventory.length - 1);
        }

        // Auto-save after placing furniture
        this.saveGame();
    }

    // Pick up a placed decoration
    pickUpDecoration() {
        if (this.currentBuilding?.buildingType !== 'playerHome') return;

        // Find decoration near player
        for (let i = 0; i < this.homeDecorations.length; i++) {
            const deco = this.homeDecorations[i];
            const dx = Math.abs(this.playerInteriorPos.x - deco.x);
            const dy = Math.abs(this.playerInteriorPos.y - deco.y);
            if (dx < 30 && dy < 30) {
                // Add back to inventory
                this.playerInventory.push({
                    id: deco.id,
                    name: deco.name,
                    price: deco.price,
                    emoji: deco.emoji,
                    slot: deco.slot,
                    description: deco.description,
                    instanceId: deco.instanceId
                });
                // Remove from decorations
                this.homeDecorations.splice(i, 1);
                // Auto-save after picking up
                this.saveGame();
                return true;
            }
        }
        return false;
    }

    exitBuilding() {
        this.state = GameState.PLAYING;
        this.currentBuilding = null;
        this.interiorNpcs = [];
        this.shopItems = [];
        // Clear school room state
        this.currentSchoolRoom = null;
        this.schoolRoomDoors = [];
    }

    buySelectedItem() {
        if (!this.shopItems.length) return;

        const item = this.shopItems[this.selectedShopItem];
        if (this.playerCoins >= item.price) {
            this.playerCoins -= item.price;
            // Add to inventory (create a copy with unique instance id)
            const purchasedItem = { ...item, instanceId: Date.now() + Math.random() };
            this.playerInventory.push(purchasedItem);

            // Auto-equip if slot is empty
            if (item.slot && !this.equippedItems[item.slot]) {
                this.equippedItems[item.slot] = purchasedItem;
            }

            // Show purchase message
            this.purchaseMessage = `Bought ${item.name}!`;
            this.purchaseMessageTimer = 2; // 2 seconds

            // Auto-save after purchase
            this.saveGame();
        }
    }

    startDialogue(npc) {
        const returnState = this.getDialogueReturnState();
        this.state = GameState.DIALOGUE;
        this.selectedDialogueChoice = 0; // Reset choice selection

        // Check for quest-based starting node
        let startNodeId = 'start';
        const startNode = npc.dialogue.start;

        if (startNode.questCheck) {
            const questState = this.activeQuests[startNode.questCheck];
            // Check for state-specific alternate nodes
            if (questState === 'active' && npc.dialogue['start_active']) {
                startNodeId = 'start_active';
            } else if (questState === 'delivered' && npc.dialogue['start_delivered']) {
                startNodeId = 'start_delivered';
            }
        }

        const node = npc.dialogue[startNodeId];
        this.currentDialogue = {
            npc: npc,
            name: npc.name,
            dialogueTree: npc.dialogue,
            currentNode: startNodeId,
            text: node.text,
            choices: node.choices || null,
            returnState
        };
    }

    advanceDialogue() {
        if (!this.currentDialogue) return;

        const node = this.currentDialogue.dialogueTree[this.currentDialogue.currentNode];

        // If there are choices, don't advance - wait for choice selection
        if (this.currentDialogue.choices) {
            return;
        }

        // Check if there's a next node
        if (node.next) {
            this.goToDialogueNode(node.next);
        } else {
            // End dialogue
            this.endDialogue();
        }
    }

    selectDialogueChoice(choiceIndex) {
        if (!this.currentDialogue || !this.currentDialogue.choices) return;

        const choices = this.currentDialogue.choices;
        if (choiceIndex < 0 || choiceIndex >= choices.length) return;

        const choice = choices[choiceIndex];
        if (choice.next) {
            this.goToDialogueNode(choice.next);
        } else {
            // Choice ends dialogue
            this.endDialogue();
        }
    }

    goToDialogueNode(nodeId) {
        let node = this.currentDialogue.dialogueTree[nodeId];
        if (!node) {
            this.endDialogue();
            return;
        }

        // Check for quest-based redirect (e.g., jobs -> jobs_active if quest is active)
        if (node.questCheck) {
            const questState = this.activeQuests[node.questCheck];
            const alternateNodeId = nodeId + '_' + questState;
            if (this.currentDialogue.dialogueTree[alternateNodeId]) {
                nodeId = alternateNodeId;
                node = this.currentDialogue.dialogueTree[nodeId];
            }
        }

        // Handle quest state changes
        let stateChanged = false;
        if (node.questStart) {
            this.activeQuests[node.questStart] = 'active';
            stateChanged = true;
        }
        if (node.questProgress) {
            this.activeQuests[node.questProgress] = 'delivered';
            stateChanged = true;
        }
        if (node.questComplete) {
            this.activeQuests[node.questComplete] = 'complete';
            stateChanged = true;
        }

        // Check for coin reward
        if (node.reward) {
            this.playerCoins += node.reward;
            this.rewardMessage = `+${node.reward} coins!`;
            this.rewardMessageTimer = 2.5;
            stateChanged = true;
        }

        // Auto-save if something important changed
        if (stateChanged) {
            this.saveGame();
        }

        // Check for mini-game trigger (using minigames.js module)
        if (node.startMiniGame) {
            this.endDialogue();
            switch (node.startMiniGame) {
                case 'rps':
                    MiniGames.startRPS(this);
                    break;
                case 'rhythm':
                    MiniGames.startRhythm(this);
                    break;
                case 'fishing':
                    MiniGames.startFishing(this);
                    break;
                case 'treasure':
                    MiniGames.startTreasureHunt(this);
                    break;
            }
            return;
        }

        this.currentDialogue.currentNode = nodeId;
        this.currentDialogue.text = node.text;
        this.currentDialogue.choices = node.choices || null;
        this.selectedDialogueChoice = 0; // Reset selection for new choices
    }

    endDialogue() {
        const returnState = this.currentDialogue?.returnState;
        this.currentDialogue = null;
        // Return to appropriate state
        if (returnState === GameState.BOAT_RIDE && this.boatRide?.active) {
            this.state = GameState.BOAT_RIDE;
        } else if (this.currentBuilding) {
            this.state = GameState.INSIDE_BUILDING;
        } else {
            this.state = GameState.PLAYING;
        }
    }

    showNotification(message) {
        // Simple notification - could be enhanced later
        console.log('Notification:', message);
    }

    openInventory() {
        if (this.playerInventory.length === 0) {
            this.showNotification("Your bag is empty!");
            return;
        }
        this.state = GameState.INVENTORY;
        this.selectedInventoryItem = 0;
    }

    closeInventory() {
        this.state = GameState.PLAYING;
    }

    toggleEquipItem() {
        if (!this.playerInventory.length) return;

        const item = this.playerInventory[this.selectedInventoryItem];
        if (!item || !item.slot) return;

        // Check if this item is currently equipped
        const isEquipped = this.equippedItems[item.slot]?.instanceId === item.instanceId;

        if (isEquipped) {
            // Unequip
            this.equippedItems[item.slot] = null;
        } else {
            // Equip (replace current)
            this.equippedItems[item.slot] = item;
        }

        // Auto-save after equip change
        this.saveGame();
    }

    // Input handling
    handleKeyDown(e) {
        // Handle mini-game states (using minigames.js module)
        if (this.state === GameState.MINIGAME_RPS) {
            switch (e.key.toLowerCase()) {
                case '1':
                case 'a':
                    MiniGames.handleRPSInput(this, 'rock');
                    e.preventDefault();
                    break;
                case '2':
                case 's':
                    MiniGames.handleRPSInput(this, 'paper');
                    e.preventDefault();
                    break;
                case '3':
                case 'd':
                    MiniGames.handleRPSInput(this, 'scissors');
                    e.preventDefault();
                    break;
                case 'escape':
                    this.state = GameState.INSIDE_BUILDING;
                    e.preventDefault();
                    break;
            }
            return;
        }

        if (this.state === GameState.MINIGAME_RHYTHM) {
            const key = e.key.toLowerCase();
            if (['a', 's', 'd', 'f'].includes(key)) {
                MiniGames.handleRhythmInput(this, key);
                e.preventDefault();
            } else if (key === ' ' || key === 'enter') {
                if (this.miniGame.rhythm.phase === 'ready') {
                    MiniGames.handleRhythmInput(this, key);
                    e.preventDefault();
                }
            } else if (key === 'escape') {
                this.state = GameState.INSIDE_BUILDING;
                e.preventDefault();
            }
            return;
        }

        if (this.state === GameState.MINIGAME_FISHING) {
            if (e.key === ' ' || e.key.toLowerCase() === 'e') {
                MiniGames.handleFishingInput(this);
                e.preventDefault();
            } else if (e.key.toLowerCase() === 'escape') {
                this.state = GameState.PLAYING;
                e.preventDefault();
            }
            return;
        }

        if (this.state === GameState.MINIGAME_TREASURE) {
            // Movement is handled normally, but ESC exits
            if (e.key.toLowerCase() === 'escape') {
                MiniGames.exitTreasureHunt(this);
                e.preventDefault();
                return;
            }
            // Allow movement keys to pass through
            switch (e.key.toLowerCase()) {
                case 'arrowup':
                case 'w':
                    this.keys.up = true;
                    e.preventDefault();
                    break;
                case 'arrowdown':
                case 's':
                    this.keys.down = true;
                    e.preventDefault();
                    break;
                case 'arrowleft':
                case 'a':
                    this.keys.left = true;
                    e.preventDefault();
                    break;
                case 'arrowright':
                case 'd':
                    this.keys.right = true;
                    e.preventDefault();
                    break;
            }
            return;
        }

        // Handle inventory state
        if (this.state === GameState.INVENTORY) {
            switch (e.key.toLowerCase()) {
                case 'arrowup':
                case 'w':
                    this.selectedInventoryItem = Math.max(0, this.selectedInventoryItem - 1);
                    e.preventDefault();
                    break;
                case 'arrowdown':
                case 's':
                    this.selectedInventoryItem = Math.min(this.playerInventory.length - 1, this.selectedInventoryItem + 1);
                    e.preventDefault();
                    break;
                case ' ':
                case 'e':
                case 'enter':
                    this.toggleEquipItem();
                    e.preventDefault();
                    break;
                case 'escape':
                case 'q':
                case 'i':
                    this.closeInventory();
                    e.preventDefault();
                    break;
            }
            return;
        }

        // Handle shopping state
        if (this.state === GameState.SHOPPING) {
            switch (e.key.toLowerCase()) {
                case 'arrowup':
                case 'w':
                    this.selectedShopItem = Math.max(0, this.selectedShopItem - 1);
                    e.preventDefault();
                    break;
                case 'arrowdown':
                case 's':
                    this.selectedShopItem = Math.min(this.shopItems.length - 1, this.selectedShopItem + 1);
                    e.preventDefault();
                    break;
                case ' ':
                case 'e':
                case 'enter':
                    this.buySelectedItem();
                    e.preventDefault();
                    break;
                case 'escape':
                case 'q':
                    this.exitBuilding();
                    e.preventDefault();
                    break;
            }
            return;
        }

        // Handle inside building state
        if (this.state === GameState.INSIDE_BUILDING) {
            // Placement mode controls
            if (this.isPlacingItem) {
                const roomWidth = this.viewWidth / 2;
                const roomHeight = this.viewHeight / 2;
                switch (e.key.toLowerCase()) {
                    case 'arrowup':
                    case 'w':
                        this.placementCursor.y = Math.max(70, this.placementCursor.y - 10);
                        e.preventDefault();
                        break;
                    case 'arrowdown':
                    case 's':
                        this.placementCursor.y = Math.min(roomHeight - 60, this.placementCursor.y + 10);
                        e.preventDefault();
                        break;
                    case 'arrowleft':
                    case 'a':
                        this.placementCursor.x = Math.max(30, this.placementCursor.x - 10);
                        e.preventDefault();
                        break;
                    case 'arrowright':
                    case 'd':
                        this.placementCursor.x = Math.min(roomWidth - 30, this.placementCursor.x + 10);
                        e.preventDefault();
                        break;
                    case 'tab':
                        // Cycle through items
                        if (this.playerInventory.length > 0) {
                            this.placingItemIndex = (this.placingItemIndex + 1) % this.playerInventory.length;
                        }
                        e.preventDefault();
                        break;
                    case ' ':
                    case 'e':
                    case 'enter':
                        this.placeCurrentItem();
                        e.preventDefault();
                        break;
                    case 'escape':
                    case 'p':
                        this.isPlacingItem = false;
                        e.preventDefault();
                        break;
                }
                return;
            }

            // Normal interior controls
            switch (e.key.toLowerCase()) {
                case 'arrowup':
                case 'w':
                    this.keys.up = true;
                    e.preventDefault();
                    break;
                case 'arrowdown':
                case 's':
                    this.keys.down = true;
                    e.preventDefault();
                    break;
                case 'arrowleft':
                case 'a':
                    this.keys.left = true;
                    e.preventDefault();
                    break;
                case 'arrowright':
                case 'd':
                    this.keys.right = true;
                    e.preventDefault();
                    break;
                case ' ':
                case 'e':
                    // Check for bed first
                    if (this.isNearBed()) {
                        this.goToSleep();
                    } else {
                        this.interact();
                    }
                    e.preventDefault();
                    break;
                case 'p':
                    // Start placement mode (only in player home)
                    if (this.currentBuilding?.buildingType === 'playerHome' && this.playerInventory.length > 0) {
                        this.startPlacingItem();
                    }
                    e.preventDefault();
                    break;
                case 'x':
                    // Pick up decoration
                    this.pickUpDecoration();
                    e.preventDefault();
                    break;
                case 'escape':
                case 'q':
                    // Handle school room navigation - go back to hallway first
                    if (this.currentSchoolRoom && this.currentSchoolRoom !== 'hallway') {
                        this.enterSchoolRoom('hallway');
                    } else {
                        this.exitBuilding();
                    }
                    e.preventDefault();
                    break;
            }
            return;
        }

        // Handle boat ride movement keys
        if (this.state === GameState.BOAT_RIDE) {
            switch (e.key.toLowerCase()) {
                case 'arrowup':
                case 'w':
                    this.keys.up = true;
                    e.preventDefault();
                    break;
                case 'arrowdown':
                case 's':
                    this.keys.down = true;
                    e.preventDefault();
                    break;
                case 'arrowleft':
                case 'a':
                    this.keys.left = true;
                    e.preventDefault();
                    break;
                case 'arrowright':
                case 'd':
                    this.keys.right = true;
                    e.preventDefault();
                    break;
                case ' ':
                case 'e':
                case 'enter':
                    this.interact();
                    e.preventDefault();
                    break;
            }
            return;
        }

        if (this.state !== GameState.PLAYING && this.state !== GameState.DIALOGUE) {
            return;
        }

        // Handle dialogue with choices
        if (this.state === GameState.DIALOGUE && this.currentDialogue?.choices) {
            const choices = this.currentDialogue.choices;
            const key = e.key.toLowerCase();

            // Number keys for direct selection
            const num = parseInt(e.key);
            if (num >= 1 && num <= choices.length) {
                this.selectDialogueChoice(num - 1);
                e.preventDefault();
                return;
            }

            // Arrow keys to navigate choices
            if (key === 'arrowup' || key === 'w') {
                this.selectedDialogueChoice = Math.max(0, this.selectedDialogueChoice - 1);
                e.preventDefault();
                return;
            }
            if (key === 'arrowdown' || key === 's') {
                this.selectedDialogueChoice = Math.min(choices.length - 1, this.selectedDialogueChoice + 1);
                e.preventDefault();
                return;
            }

            // Space/Enter/E to confirm selected choice
            if (key === ' ' || key === 'enter' || key === 'e') {
                this.selectDialogueChoice(this.selectedDialogueChoice);
                e.preventDefault();
                return;
            }

            return; // Don't process other keys during choice selection
        }

        switch (e.key.toLowerCase()) {
            case 'arrowup':
            case 'w':
                this.keys.up = true;
                e.preventDefault();
                break;
            case 'arrowdown':
            case 's':
                this.keys.down = true;
                e.preventDefault();
                break;
            case 'arrowleft':
            case 'a':
                this.keys.left = true;
                e.preventDefault();
                break;
            case 'arrowright':
            case 'd':
                this.keys.right = true;
                e.preventDefault();
                break;
            case ' ':
            case 'e':
                this.interact();
                e.preventDefault();
                break;
            case 'i':
                if (this.state === GameState.PLAYING) {
                    this.openInventory();
                    e.preventDefault();
                }
                break;
            case 'escape':
            case 'p':
                this.togglePause();
                e.preventDefault();
                break;
        }
    }

    handleKeyUp(e) {
        // Key up applies to both outside and inside building movement
        switch (e.key.toLowerCase()) {
            case 'arrowup':
            case 'w':
                this.keys.up = false;
                break;
            case 'arrowdown':
            case 's':
                this.keys.down = false;
                break;
            case 'arrowleft':
            case 'a':
                this.keys.left = false;
                break;
            case 'arrowright':
            case 'd':
                this.keys.right = false;
                break;
        }
    }

    setMobileInput(direction, pressed) {
        // Handle dialogue choice navigation
        if (pressed && this.state === GameState.DIALOGUE && this.currentDialogue?.choices) {
            const choices = this.currentDialogue.choices;
            if (direction === 'up') {
                this.selectedDialogueChoice = Math.max(0, this.selectedDialogueChoice - 1);
                return;
            }
            if (direction === 'down') {
                this.selectedDialogueChoice = Math.min(choices.length - 1, this.selectedDialogueChoice + 1);
                return;
            }
        }

        // Handle shop navigation
        if (pressed && this.state === GameState.SHOPPING) {
            if (direction === 'up') {
                this.selectedShopItem = Math.max(0, this.selectedShopItem - 1);
                return;
            }
            if (direction === 'down') {
                this.selectedShopItem = Math.min(this.shopItems.length - 1, this.selectedShopItem + 1);
                return;
            }
        }

        // Default: set movement keys
        if (this.keys.hasOwnProperty(direction)) {
            this.keys[direction] = pressed;
        }
    }

    handleTap(x, y) {
        // Route tap based on game state
        if (this.state === GameState.PLAYING) {
            this.handleWorldTap(x, y);
        } else if (this.state === GameState.DIALOGUE) {
            this.handleDialogueTap(x, y);
        } else if (this.state === GameState.SHOPPING) {
            this.handleShopTap(x, y);
        } else if (this.state === GameState.MINIGAME_RPS) {
            MiniGames.handleRPSTap(this, x, y);
        } else if (this.state === GameState.MINIGAME_RHYTHM) {
            MiniGames.handleRhythmTap(this, x, y);
        }
    }

    handleWorldTap(x, y) {
        // Tap-to-move disabled for now
        return;

        if (!this.player) return;

        // Convert screen coordinates to world coordinates
        const worldX = x + this.camera.x;
        const worldY = y + this.camera.y;

        // Set target position for player to move toward
        this.tapTarget = { x: worldX, y: worldY };
    }

    handleDialogueTap(x, y) {
        if (!this.currentDialogue?.choices) {
            // No choices - tap advances dialogue
            this.advanceDialogue();
            return;
        }

        // Calculate dialogue box layout (must match renderer)
        const choices = this.currentDialogue.choices;
        const boxX = 30;
        const boxWidth = this.viewWidth - 60;

        // Estimate text height (simplified - assume 2 lines max for tap purposes)
        const textHeight = 48;
        const baseHeight = 60 + textHeight;
        const choiceHeight = choices.length * 35 + 20;
        const boxHeight = baseHeight + choiceHeight;
        const boxY = this.viewHeight - boxHeight - 30;
        const choiceStartY = boxY + 50 + textHeight;

        // Check if tap is on a choice
        for (let i = 0; i < choices.length; i++) {
            const choiceY = choiceStartY + i * 35;
            if (x >= boxX + 25 && x <= boxX + boxWidth - 25 &&
                y >= choiceY - 5 && y <= choiceY + 25) {
                this.selectDialogueChoice(i);
                return;
            }
        }
    }

    handleShopTap(x, y) {
        // Shop items start at y=110, each item is 70px tall
        const startY = 110;
        const itemHeight = 70;

        for (let i = 0; i < this.shopItems.length; i++) {
            const itemY = startY + i * itemHeight;
            if (y >= itemY && y <= itemY + itemHeight) {
                if (this.selectedShopItem === i) {
                    // Double tap to buy
                    this.buySelectedItem();
                } else {
                    // First tap to select
                    this.selectedShopItem = i;
                }
                return;
            }
        }
    }

    togglePause() {
        if (this.state === GameState.PLAYING) {
            this.pause();
        } else if (this.state === GameState.PAUSED) {
            this.resume();
        }
    }

    onResize(width, height) {
        // Update logical dimensions
        this.viewWidth = width || this.canvas.width;
        this.viewHeight = height || this.canvas.height;
        // Update renderer with new canvas size
        this.renderer.onResize(this.viewWidth, this.viewHeight);
        // Force a re-render if we're in a static state
        if (this.state !== GameState.PLAYING && this.state !== GameState.DIALOGUE) {
            this.render();
        }
    }

}
