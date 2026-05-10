/**
 * Dumpling Town - World System
 * Manages the town layout, tiles, buildings, and decorations
 */

import { House, Decoration } from './entities.js';

export class World {
    constructor() {
        // World dimensions (in tiles) - larger for fullscreen
        this.widthTiles = 60;
        this.heightTiles = 45;
        this.tileSize = 16;

        // World dimensions in pixels
        this.width = this.widthTiles * this.tileSize;
        this.height = this.heightTiles * this.tileSize;

        // Tile map
        this.tiles = this.generateTileMap();

        // Houses
        this.houses = this.generateHouses();

        // Decorations
        this.decorations = this.generateDecorations();

        // Spawn point (center of town)
        this.spawnPoint = { x: this.width / 2 - 16, y: this.height / 2 - 16 };
    }

    generateTileMap() {
        const tiles = [];

        for (let y = 0; y < this.heightTiles; y++) {
            tiles[y] = [];
            for (let x = 0; x < this.widthTiles; x++) {
                tiles[y][x] = this.determineTile(x, y);
            }
        }

        return tiles;
    }

    determineTile(x, y) {
        // Border walls
        if (x === 0 || x === this.widthTiles - 1 || y === 0 || y === this.heightTiles - 1) {
            return 'wall';
        }

        // Main paths (cross pattern through town)
        const centerX = Math.floor(this.widthTiles / 2);
        const centerY = Math.floor(this.heightTiles / 2);

        // Soy Sauce River - runs horizontally through the middle of town
        // Position it between the top houses and bottom houses
        const riverY = centerY + 5;  // Just below center
        const riverWidth = 2; // 2 tiles wide

        // Check if this is the river
        if (y >= riverY && y < riverY + riverWidth && x > 1 && x < this.widthTiles - 2) {
            // Main bridge - wide and centered on the main path
            if (x >= centerX - 3 && x <= centerX + 3) {
                return 'bridge';
            }
            // West bridge
            if (x >= 10 && x <= 14) {
                return 'bridge';
            }
            // East bridge
            if (x >= this.widthTiles - 15 && x <= this.widthTiles - 11) {
                return 'bridge';
            }
            return 'soy_sauce';
        }

        // Horizontal main path
        if (y >= centerY - 1 && y <= centerY + 1) {
            return 'path';
        }

        // Vertical main path - extends all the way down (crosses river via bridge)
        if (x >= centerX - 1 && x <= centerX + 1) {
            return 'path';
        }

        // Paths leading to bridges
        // West bridge path
        if (x >= 11 && x <= 13 && y >= riverY - 3 && y < riverY + riverWidth + 3) {
            return 'path';
        }
        // East bridge path
        if (x >= this.widthTiles - 14 && x <= this.widthTiles - 12 && y >= riverY - 3 && y < riverY + riverWidth + 3) {
            return 'path';
        }

        // Town square area (center)
        const distFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
        if (distFromCenter < 5) {
            return 'path';
        }

        // Small decorative pond in corner (away from river)
        if (x >= 5 && x <= 9 && y >= 5 && y <= 9) {
            return 'water';
        }

        // Side paths to houses
        if ((y === 10 || y === 38) && (x > 5 && x < this.widthTiles - 5)) {
            if (x % 8 < 3) return 'path';
        }

        return 'grass';
    }

    generateHouses() {
        const houses = [];
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Houses for each dumpling type - arranged around town center
        // type: 'home' (may have NPC), 'shop', 'empty'
        const houseData = [
            // Top row
            {
                x: centerX - 200, y: centerY - 180,
                filling: 'pork', name: "Buta-kun's House",
                type: 'home',
                interior: {
                    decorations: [
                        { emoji: '🍵', x: 120, y: 175, name: 'Tea set' },
                        { emoji: '🪴', x: 280, y: 165, name: 'Potted plant' },
                        { emoji: '🧶', x: 100, y: 220, name: 'Knitting basket' },
                        { emoji: '🖼️', x: 200, y: 145, name: 'Family portrait' },
                        { emoji: '🥧', x: 260, y: 220, name: 'Fresh pie' }
                    ],
                    npc: {
                        name: 'Grandma Gyoza',
                        filling: 'pork',
                        dialogue: {
                            start: {
                                text: "Oh my, a visitor! Come in, come in! Would you like some tea?",
                                questCheck: 'ebiDelivery',
                                choices: [
                                    { text: "Yes please!", next: 'tea' },
                                    { text: "Can I help cook?", next: 'cook' },
                                    { text: "Nice home!", next: 'home' }
                                ]
                            },
                            start_active: {
                                text: "Oh my, a visitor! Come in, come in!",
                                choices: [
                                    { text: "I have a message from Ebi-chan!", next: 'delivery' },
                                    { text: "Just visiting!", next: 'tea' }
                                ]
                            },
                            delivery: {
                                text: "From Ebi-chan? Oh wonderful! The festival is next week? How exciting! Thank you so much, dear!",
                                questProgress: 'ebiDelivery',
                                next: 'deliveryThanks'
                            },
                            deliveryThanks: {
                                text: "Please tell Ebi-chan I'll bake my special dumplings for the festival! Here, have some tea before you go~",
                                next: null
                            },
                            tea: {
                                text: "Here you go, dear! It's my special ginger tea. Warms you right up!",
                                next: null
                            },
                            cook: {
                                text: "Oh how wonderful! A young dumpling interested in cooking! I was just about to make my famous gyoza...",
                                choices: [
                                    { text: "I'd love to help!", next: 'cook_start' },
                                    { text: "Maybe another time", next: null }
                                ]
                            },
                            cook_start: {
                                text: "Splendid! Let me teach you my secret recipe. Watch the rhythm and fold along with me!",
                                startMiniGame: 'rhythm'
                            },
                            home: {
                                text: "Thank you! I decorated it myself. That's my late husband's portrait~",
                                next: null
                            }
                        }
                    }
                }
            },
            {
                x: centerX - 60, y: centerY - 180,
                filling: 'shrimp', name: "Dumpling Shop",
                type: 'shop',
                interior: {
                    shopkeeper: {
                        name: 'Shopkeeper Shumai',
                        filling: 'shrimp'
                    },
                    items: [
                        { id: 'hat_bow', name: 'Cute Bow', price: 25, emoji: '🎀', slot: 'hat', description: 'A pretty bow for your head!' },
                        { id: 'hat_chef', name: 'Chef Hat', price: 40, emoji: '👨‍🍳', slot: 'hat', description: 'Look like a real dumpling chef!' },
                        { id: 'accessory_flower', name: 'Flower Pin', price: 15, emoji: '🌸', slot: 'accessory', description: 'A lovely sakura flower' },
                        { id: 'accessory_star', name: 'Star Badge', price: 20, emoji: '⭐', slot: 'accessory', description: 'Sparkle and shine!' }
                    ]
                }
            },
            {
                x: centerX + 80, y: centerY - 180,
                filling: 'veggie', name: "Yasai-san's House",
                type: 'home',
                interior: {
                    decorations: [
                        { emoji: '🧸', x: 100, y: 180, name: 'Teddy bear' },
                        { emoji: '🧱', x: 280, y: 175, name: 'Building blocks' },
                        { emoji: '🎨', x: 120, y: 220, name: 'Crayons' },
                        { emoji: '⚽', x: 260, y: 215, name: 'Soccer ball' },
                        { emoji: '📚', x: 90, y: 160, name: 'Picture books' }
                    ],
                    npc: {
                        name: 'Little Sprout',
                        filling: 'veggie',
                        dialogue: {
                            start: {
                                text: "*playing with toys* Hi! Are you friends with my mom?",
                                choices: [
                                    { text: "I just met her!", next: 'met' },
                                    { text: "What are you playing?", next: 'playing' },
                                    { text: "Wanna play a game?", next: 'game' }
                                ]
                            },
                            met: {
                                text: "Mom's the best! She makes yummy veggie soup!",
                                next: null
                            },
                            playing: {
                                text: "I'm pretending to be a BIG dumpling! RAWR! Hehe~ Wanna play Rock Paper Scissors?",
                                choices: [
                                    { text: "Sure!", next: 'rps_start' },
                                    { text: "Maybe later", next: null }
                                ]
                            },
                            game: {
                                text: "Ooh ooh! Let's play Rock Paper Scissors! I'm REALLY good at it! If you win, I'll give you coins!",
                                choices: [
                                    { text: "You're on!", next: 'rps_start' },
                                    { text: "Not right now", next: null }
                                ]
                            },
                            rps_start: {
                                text: "Yay! Ready? Here we go! Rock... Paper... Scissors...",
                                startMiniGame: 'rps'
                            }
                        }
                    }
                }
            },
            {
                x: centerX + 220, y: centerY - 180,
                filling: 'sweet', name: "Ichigo's House",
                type: 'home',
                interior: {
                    decorations: [
                        { emoji: '🪞', x: 100, y: 165, name: 'Vanity mirror' },
                        { emoji: '💄', x: 130, y: 175, name: 'Makeup kit' },
                        { emoji: '🎀', x: 280, y: 170, name: 'Pink bow' },
                        { emoji: '🧸', x: 260, y: 210, name: 'Bunny plushie' },
                        { emoji: '🕯️', x: 110, y: 215, name: 'Strawberry candle' },
                        { emoji: '💕', x: 200, y: 150, name: 'Heart decoration' }
                    ],
                    npc: {
                        name: 'Ichigo',
                        filling: 'sweet',
                        dialogue: {
                            start: {
                                text: "*brushing hair* Oh hi~! Welcome to my super cute room! Isn't it adorable?",
                                choices: [
                                    { text: "It's so pink!", next: 'pink' },
                                    { text: "What are you up to?", next: 'doing' },
                                    { text: "I love the strawberry smell!", next: 'smell' }
                                ]
                            },
                            pink: {
                                text: "Pink is the BEST color! It makes everything look kawaii~ Do you like fashion too?",
                                choices: [
                                    { text: "I love it!", next: 'fashion_yes' },
                                    { text: "Not really my thing", next: 'fashion_no' }
                                ]
                            },
                            fashion_yes: {
                                text: "OMG we should go shopping together sometime! The Dumpling Shop has the cutest accessories~",
                                next: null
                            },
                            fashion_no: {
                                text: "That's okay! Everyone has their own style. Yours is... unique! Hehe~",
                                next: null
                            },
                            doing: {
                                text: "I'm practicing my makeup! I want to look perfect for the next festival. Want me to do yours?",
                                choices: [
                                    { text: "Sure!", next: 'makeup_yes' },
                                    { text: "Maybe another time", next: 'makeup_no' }
                                ]
                            },
                            makeup_yes: {
                                text: "*applies sparkly powder* There! You look SO cute now! Like a little star~",
                                next: null
                            },
                            makeup_no: {
                                text: "Okay okay! But if you change your mind, I have ALL the colors!",
                                next: null
                            },
                            smell: {
                                text: "Right?! It's my homemade strawberry candle! I could give you the recipe... for a small favor~",
                                choices: [
                                    { text: "What kind of favor?", next: 'favor' },
                                    { text: "No thanks", next: null }
                                ]
                            },
                            favor: {
                                text: "Tell me some jokes! I've been SO bored lately. Make me laugh and I'll pay you 60 coins!",
                                choices: [
                                    { text: "Why did the dumpling blush? It saw the salad dressing!", next: 'joke_good' },
                                    { text: "I don't know any jokes...", next: 'joke_bad' }
                                ]
                            },
                            joke_good: {
                                text: "*giggles uncontrollably* HAHAHAHA! Oh that's SO silly! Here's your coins, funny friend!",
                                reward: 60,
                                next: null
                            },
                            joke_bad: {
                                text: "Aww, that's okay! Maybe next time you'll think of something funny~",
                                next: null
                            }
                        }
                    }
                }
            },

            // Bottom row
            {
                x: centerX - 140, y: centerY + 140,
                filling: 'pork', name: "Nikuman's House",
                type: 'home',
                interior: {
                    decorations: [
                        { emoji: '🏋️', x: 100, y: 175, name: 'Dumbbells' },
                        { emoji: '🥊', x: 280, y: 160, name: 'Punching bag' },
                        { emoji: '🧘', x: 120, y: 220, name: 'Yoga mat' },
                        { emoji: '🏆', x: 200, y: 145, name: 'Trophy' },
                        { emoji: '💪', x: 260, y: 215, name: 'Motivation poster' },
                        { emoji: '🥤', x: 90, y: 160, name: 'Protein shake' }
                    ],
                    npc: {
                        name: 'Nikuman',
                        filling: 'pork',
                        dialogue: {
                            start: {
                                text: "*doing push-ups* HUP! HUP! Oh! A visitor! 47... 48... Come in! 49... 50! YEAH!",
                                questCheck: 'butaBoxes',
                                choices: [
                                    { text: "Wow, you're strong!", next: 'strong' },
                                    { text: "Do you ever rest?", next: 'rest' },
                                    { text: "Can I work out too?", next: 'workout' }
                                ]
                            },
                            start_active: {
                                text: "*doing push-ups* HUP! Oh! A visitor! 47... 48... What brings you here?",
                                choices: [
                                    { text: "Buta-kun sent your protein powder!", next: 'delivery' },
                                    { text: "Just watching you work out!", next: 'strong' }
                                ]
                            },
                            delivery: {
                                text: "MY PROTEIN POWDER! FINALLY! *flexes excitedly* Tell Buta-kun I said THANK YOU! Now I can get EVEN STRONGER!",
                                questProgress: 'butaBoxes',
                                next: 'delivery_thanks'
                            },
                            delivery_thanks: {
                                text: "You're a real champ for carrying that heavy box! Want to do some push-ups with me? No? Okay, LATER THEN!",
                                next: null
                            },
                            strong: {
                                text: "Thanks bro! I train every day! A healthy dumpling is a happy dumpling! Want to do some squats?",
                                choices: [
                                    { text: "Let's do it!", next: 'squats_yes' },
                                    { text: "I'll pass", next: 'squats_no' }
                                ]
                            },
                            squats_yes: {
                                text: "*counts along* 1! 2! 3! Great form! You're a natural athlete! Keep it up, champ!",
                                next: null
                            },
                            squats_no: {
                                text: "No worries! But remember - the body is a temple! A steamy, delicious temple!",
                                next: null
                            },
                            rest: {
                                text: "REST?! Rest is for... okay, fine. Even I need a break sometimes. Want to hear about my training?",
                                choices: [
                                    { text: "Sure!", next: 'training' },
                                    { text: "Maybe later", next: null }
                                ]
                            },
                            training: {
                                text: "I do 100 push-ups, 100 sit-ups, 100 squats, and a 10km roll around town! EVERY. SINGLE. DAY!",
                                choices: [
                                    { text: "That's intense!", next: 'intense' },
                                    { text: "Isn't that from an anime?", next: 'anime' }
                                ]
                            },
                            intense: {
                                text: "You gotta push yourself! Pain is just weakness leaving the body! ...Or steam. Could be steam.",
                                next: null
                            },
                            anime: {
                                text: "*sweats nervously* W-what? No! I came up with this totally on my own! ...Don't tell anyone.",
                                next: null
                            },
                            workout: {
                                text: "YEAH! That's the spirit! Tell you what - help me move these heavy boxes and I'll pay you 50 coins!",
                                choices: [
                                    { text: "Let's lift!", next: 'lift_yes' },
                                    { text: "Too tired today", next: 'lift_no' }
                                ]
                            },
                            lift_yes: {
                                text: "*after moving boxes* GREAT WORK! You've got potential! Here's your payment, training partner!",
                                reward: 50,
                                next: null
                            },
                            lift_no: {
                                text: "That's okay! Come back when you're ready to PUMP! IT! UP!",
                                next: null
                            }
                        }
                    }
                }
            },
            {
                x: centerX - 60, y: centerY + 140,
                filling: 'shrimp', name: "Tako-san's House",
                type: 'home',
                interior: {
                    decorations: [
                        { emoji: '📜', x: 100, y: 170, name: 'Poetry scroll' },
                        { emoji: '🖋️', x: 130, y: 180, name: 'Ink and brush' },
                        { emoji: '📚', x: 280, y: 165, name: 'Book collection' },
                        { emoji: '🪷', x: 260, y: 210, name: 'Meditation lotus' },
                        { emoji: '🕯️', x: 90, y: 215, name: 'Reading candle' },
                        { emoji: '🎋', x: 200, y: 150, name: 'Bamboo arrangement' }
                    ],
                    npc: {
                        name: 'Tako-san',
                        filling: 'shrimp',
                        dialogue: {
                            start: {
                                text: "Welcome to my humble abode! I was just writing poetry~",
                                questCheck: 'ichigoFeedback',
                                choices: [
                                    { text: "Can I hear some?", next: 'poetry' },
                                    { text: "Nice place!", next: 'place' },
                                    { text: "I'll leave you to it", next: null }
                                ]
                            },
                            start_active: {
                                text: "Welcome! I sense you bring news from the outside world... What is it?",
                                choices: [
                                    { text: "Ichigo wants feedback on her jokes!", next: 'feedback' },
                                    { text: "Just visiting!", next: 'poetry' }
                                ]
                            },
                            feedback: {
                                text: "*strokes chin* 'To get a little FILLING'... Hmm. The pun subverts expectations. It's... brilliant in its simplicity!",
                                questProgress: 'ichigoFeedback',
                                next: 'feedback_more'
                            },
                            feedback_more: {
                                text: "Tell little Ichigo her comedy has DEPTH! The dumpling seeks knowledge... we ALL seek filling! It's... *wipes tear* ...beautiful.",
                                next: null
                            },
                            poetry: {
                                text: "Ahem... 'Steam rises softly, Dumpling dreams of being eaten, Existential dread.' ...Too dark?",
                                choices: [
                                    { text: "That's... interesting", next: 'interesting' },
                                    { text: "Maybe try something happier?", next: 'happier' }
                                ]
                            },
                            place: {
                                text: "Thank you! The ink paintings are my own work. I find art... soothing.",
                                next: null
                            },
                            interesting: {
                                text: "Art should make you FEEL things! Even uncomfortable things!",
                                next: null
                            },
                            happier: {
                                text: "Hmm... 'Soft and warm inside, Friendship fills my dumpling heart, Joy in every bite!' Better?",
                                next: null
                            }
                        }
                    }
                }
            },
            {
                x: centerX + 80, y: centerY + 140,
                filling: 'veggie', name: "Community Center",
                type: 'home',
                interior: {
                    decorations: [
                        { emoji: '🗂️', x: 100, y: 175, name: 'Filing cabinet' },
                        { emoji: '📋', x: 130, y: 165, name: 'Bulletin board' },
                        { emoji: '🏛️', x: 200, y: 145, name: 'Town seal' },
                        { emoji: '📰', x: 280, y: 170, name: 'Town newspaper' },
                        { emoji: '🪑', x: 260, y: 215, name: 'Meeting chair' },
                        { emoji: '🎖️', x: 90, y: 210, name: 'Service awards' }
                    ],
                    npc: {
                        name: 'Mayor Mochi',
                        filling: 'veggie',
                        dialogue: {
                            start: {
                                text: "*adjusting glasses* Ah, welcome to Dumpling Town's Community Center! I'm Mayor Mochi!",
                                questCheck: 'yasaiGardening',
                                choices: [
                                    { text: "Nice to meet you, Mayor!", next: 'greet' },
                                    { text: "What happens here?", next: 'center' },
                                    { text: "Any news about the town?", next: 'news' }
                                ]
                            },
                            start_active: {
                                text: "*adjusting glasses* Ah, welcome! What can I do for you today?",
                                choices: [
                                    { text: "Yasai-san needs fertilizer!", next: 'fertilizer' },
                                    { text: "Just visiting!", next: 'greet' }
                                ]
                            },
                            fertilizer: {
                                text: "Ah yes, the organic veggie fertilizer! Yasai-san's garden is the pride of our town. Here you go!",
                                questProgress: 'yasaiGardening',
                                next: 'fertilizer_done'
                            },
                            fertilizer_done: {
                                text: "Please tell Yasai-san I said hello! And that her cabbage won first place at last year's festival~",
                                next: null
                            },
                            greet: {
                                text: "The pleasure is mine! As mayor, I ensure every dumpling in town is happy and well-steamed!",
                                choices: [
                                    { text: "How long have you been mayor?", next: 'history' },
                                    { text: "That's a big responsibility!", next: 'responsibility' }
                                ]
                            },
                            history: {
                                text: "Oh my, 15 years now! I started as a humble cabbage roll and worked my way up. Hard work pays off!",
                                next: null
                            },
                            responsibility: {
                                text: "Indeed! But I love serving our community. Every dumpling matters, no matter their filling!",
                                next: null
                            },
                            center: {
                                text: "This is where we hold town meetings, festivals, and celebrations! The annual Dumpling Festival is coming soon~",
                                choices: [
                                    { text: "Tell me about the festival!", next: 'festival' },
                                    { text: "Sounds fun!", next: null }
                                ]
                            },
                            festival: {
                                text: "It's our biggest event! There's dancing, games, and a cooking competition. Everyone brings their best recipes!",
                                choices: [
                                    { text: "Can I help prepare?", next: 'help' },
                                    { text: "I can't wait!", next: null }
                                ]
                            },
                            help: {
                                text: "How wonderful! We'll need lots of volunteers. Come back closer to the festival date and we'll have decorations to hang!",
                                next: 'help_thanks'
                            },
                            help_thanks: {
                                text: "In the meantime, feel free to explore town! The community center is always open~",
                                next: null
                            },
                            news: {
                                text: "Let's see... The pond was cleaned last week, Anko's Bakery has new treats, and Nikuman broke another punching bag!",
                                choices: [
                                    { text: "Sounds like a lively town!", next: 'lively' },
                                    { text: "Another punching bag?!", next: 'punching' }
                                ]
                            },
                            lively: {
                                text: "It truly is! Every day brings something new. That's the charm of Dumpling Town!",
                                next: null
                            },
                            punching: {
                                text: "*sighs* That's the third one this month. We had to order reinforced ones from the city...",
                                next: null
                            }
                        }
                    }
                }
            },
            {
                x: centerX + 220, y: centerY + 140,
                filling: 'sweet', name: "Anko's Bakery",
                type: 'shop',
                interior: {
                    shopkeeper: {
                        name: 'Baker Anko',
                        filling: 'sweet'
                    },
                    items: [
                        { id: 'food_dorayaki', name: 'Dorayaki', price: 15, emoji: '🥞', slot: 'held', description: 'Sweet red bean pancake!' },
                        { id: 'food_taiyaki', name: 'Taiyaki', price: 20, emoji: '🐟', slot: 'held', description: 'Fish-shaped cake with filling!' },
                        { id: 'food_dango', name: 'Dango', price: 12, emoji: '🍡', slot: 'held', description: 'Colorful rice dumplings!' },
                        { id: 'hat_strawberry', name: 'Strawberry Hat', price: 35, emoji: '🍓', slot: 'hat', description: 'A sweet berry on your head!' }
                    ]
                }
            },
            // Furniture Shop
            {
                x: centerX - 220, y: centerY + 140,
                filling: 'veggie', name: "Futon & Friends",
                type: 'shop',
                interior: {
                    shopkeeper: {
                        name: 'Tatami Tim',
                        filling: 'veggie'
                    },
                    items: [
                        { id: 'furn_futon', name: 'Cozy Futon', price: 100, emoji: '🛏️', slot: 'furniture', isBed: true, description: 'A comfy futon for sleeping!' },
                        { id: 'furn_plant', name: 'Potted Bamboo', price: 30, emoji: '🎋', slot: 'furniture', description: 'A lucky bamboo plant!' },
                        { id: 'furn_lantern', name: 'Paper Lantern', price: 25, emoji: '🏮', slot: 'furniture', description: 'Warm ambient lighting~' },
                        { id: 'furn_bonsai', name: 'Bonsai Tree', price: 45, emoji: '🌳', slot: 'furniture', description: 'A tiny peaceful tree' },
                        { id: 'furn_fan', name: 'Folding Fan', price: 20, emoji: '🪭', slot: 'furniture', description: 'Decorative wall fan' },
                        { id: 'furn_vase', name: 'Flower Vase', price: 35, emoji: '🏺', slot: 'furniture', description: 'For pretty flowers!' },
                        { id: 'furn_cat', name: 'Lucky Cat', price: 50, emoji: '🐱', slot: 'furniture', description: 'Maneki-neko brings fortune!' },
                        { id: 'furn_cushion', name: 'Floor Cushion', price: 15, emoji: '🛋️', slot: 'furniture', description: 'Comfy zabuton cushion' },
                        { id: 'furn_painting', name: 'Mt. Fuji Art', price: 60, emoji: '🗻', slot: 'furniture', description: 'Beautiful mountain painting' },
                        { id: 'furn_fish', name: 'Koi Pond', price: 75, emoji: '🐠', slot: 'furniture', description: 'Miniature koi pond!' },
                        { id: 'furn_tea', name: 'Tea Set', price: 40, emoji: '🍵', slot: 'furniture', description: 'Traditional tea ceremony set' }
                    ]
                }
            },
            // Player's home - special house they can decorate
            {
                x: centerX, y: centerY + 140,
                filling: 'pork', name: "Your Home",
                type: 'playerHome',
                interior: {
                    description: "Home sweet home! This is your cozy dumpling house."
                }
            }
        ];

        for (const data of houseData) {
            const house = new House(data.x, data.y, data.filling, data.name);
            house.buildingType = data.type;
            house.interior = data.interior;
            houses.push(house);
        }

        return houses;
    }

    generateDecorations() {
        const decorations = [];

        // Trees around the border
        for (let i = 0; i < 15; i++) {
            decorations.push(new Decoration(
                30 + Math.random() * (this.width - 80),
                20 + Math.random() * 30,
                'tree'
            ));
            decorations.push(new Decoration(
                30 + Math.random() * (this.width - 80),
                this.height - 60 + Math.random() * 20,
                'tree'
            ));
        }

        // Side trees
        for (let i = 0; i < 8; i++) {
            decorations.push(new Decoration(
                20 + Math.random() * 40,
                80 + Math.random() * (this.height - 160),
                'tree'
            ));
            decorations.push(new Decoration(
                this.width - 60 + Math.random() * 30,
                80 + Math.random() * (this.height - 160),
                'tree'
            ));
        }

        // Flowers scattered around
        const flowerColors = ['#ff69b4', '#ff6b6b', '#ffeb3b', '#bb86fc', '#64b5f6'];
        for (let i = 0; i < 30; i++) {
            decorations.push(new Decoration(
                50 + Math.random() * (this.width - 100),
                50 + Math.random() * (this.height - 100),
                'flower'
            ));
            decorations[decorations.length - 1].color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        }

        // Lanterns along paths (around town center)
        const cx = this.width / 2;
        const cy = this.height / 2;
        const lanternPositions = [
            { x: cx - 60, y: cy - 20 },
            { x: cx + 40, y: cy - 20 },
            { x: cx - 10, y: cy - 60 },
            { x: cx - 10, y: cy + 40 },
            // More lanterns around the edges
            { x: cx - 150, y: cy },
            { x: cx + 130, y: cy },
        ];
        for (const pos of lanternPositions) {
            decorations.push(new Decoration(pos.x, pos.y, 'lantern'));
        }

        // Rocks near pond (adjusted for larger world)
        decorations.push(new Decoration(720, 520, 'rock'));
        decorations.push(new Decoration(740, 540, 'rock'));
        decorations.push(new Decoration(760, 530, 'rock'));

        // Fishing spot at pond
        const fishingSpot = new Decoration(700, 530, 'fishing_spot');
        fishingSpot.interactive = true;
        decorations.push(fishingSpot);

        // Boat dock on the east side (near river)
        const dock = new Decoration(900, 370, 'dock');
        dock.interactive = true;
        decorations.push(dock);

        return decorations;
    }

    getTile(x, y) {
        if (x < 0 || x >= this.widthTiles || y < 0 || y >= this.heightTiles) {
            return 'wall';
        }
        return this.tiles[y][x];
    }

    getSpawnPoint() {
        return { ...this.spawnPoint };
    }

    getBounds() {
        return {
            width: this.width,
            height: this.height
        };
    }

    canMoveTo(x, y, width, height) {
        // Check all corners of the entity
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

            if (tile === 'wall' || tile === 'water' || tile === 'soy_sauce') {
                return false;
            }
        }

        // Check collision with houses
        for (const house of this.houses) {
            // Simple AABB collision with house base
            const houseBox = {
                x: house.x + 8,
                y: house.y + 20,
                width: 48,
                height: 40
            };

            if (
                x < houseBox.x + houseBox.width &&
                x + width > houseBox.x &&
                y < houseBox.y + houseBox.height &&
                y + height > houseBox.y
            ) {
                return false;
            }
        }

        // Check collision with trees (only trunk area)
        for (const deco of this.decorations) {
            if (deco.type === 'tree') {
                const treeBox = {
                    x: deco.x + 6,
                    y: deco.y + 20,
                    width: 12,
                    height: 10
                };

                if (
                    x < treeBox.x + treeBox.width &&
                    x + width > treeBox.x &&
                    y < treeBox.y + treeBox.height &&
                    y + height > treeBox.y
                ) {
                    return false;
                }
            }
        }

        return true;
    }

    checkInteraction(playerX, playerY) {
        // Check if player is near a house
        for (const house of this.houses) {
            const dx = playerX - (house.x + 32);
            const dy = playerY - (house.y + 50);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 40) {
                return {
                    type: 'house',
                    message: `${house.data.ownerName}'s house`,
                    data: house
                };
            }
        }

        // Check for other interactive objects
        for (const deco of this.decorations) {
            if (deco.type === 'lantern') {
                const dx = playerX - (deco.x + 8);
                const dy = playerY - (deco.y + 12);
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 30) {
                    return {
                        type: 'lantern',
                        message: 'A warm, glowing lantern~'
                    };
                }
            }

            if (deco.type === 'fishing_spot') {
                const dx = playerX - (deco.x + 8);
                const dy = playerY - (deco.y + 8);
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 40) {
                    return {
                        type: 'fishing_spot',
                        message: 'Press E to fish! 🎣'
                    };
                }
            }

            if (deco.type === 'dock') {
                const dx = playerX - (deco.x + 16);
                const dy = playerY - (deco.y + 16);
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 50) {
                    return {
                        type: 'dock',
                        message: 'Press E to board boat to School Island! 🚢'
                    };
                }
            }
        }

        return null;
    }
}
