// ============================================
// KID NPC DEFINITIONS
// Child dumplings that attend school
// ============================================

// Kid location states
export const KidLocation = {
    VILLAGE: 'village',
    BOAT: 'boat',
    SCHOOL: 'school',
    CLASSROOM: 'classroom'
};

// Kid NPC data definitions
export function createKidNpcData(worldCenter) {
    const cx = worldCenter.x;
    const cy = worldCenter.y;

    return [
        {
            name: 'Mochi-chan',
            filling: 'sweet',
            spawnPos: { x: cx - 100, y: cy + 80 },
            wanderRadius: 60,
            personality: 'cheerful',
            favoriteSubject: 'art',
            dialogue: {
                start: {
                    text: "Hi hi! I'm Mochi-chan! I loooove drawing!",
                    choices: [
                        { text: "What do you like to draw?", next: 'drawing' },
                        { text: "Are you going to school today?", next: 'school' },
                        { text: "Nice to meet you!", next: null }
                    ]
                },
                drawing: {
                    text: "I draw cute animals and flowers! Art class is the best! Want to see my sketchbook sometime?",
                    choices: [
                        { text: "Sure, sounds fun!", next: null },
                        { text: "Maybe later", next: null }
                    ]
                },
                school: {
                    text: "Yep! The boat to school island is so fun! We get to see the ocean and talk with friends!",
                    next: null
                }
            }
        },
        {
            name: 'Shumai Jr.',
            filling: 'shrimp',
            spawnPos: { x: cx + 80, y: cy - 60 },
            wanderRadius: 50,
            personality: 'curious',
            favoriteSubject: 'science',
            dialogue: {
                start: {
                    text: "Hey! Did you know that dumplings are scientifically the perfect food?",
                    choices: [
                        { text: "Really? Tell me more!", next: 'science' },
                        { text: "What are you up to?", next: 'activity' },
                        { text: "Interesting theory!", next: null }
                    ]
                },
                science: {
                    text: "It's true! The ratio of wrapper to filling creates optimal flavor distribution! I learned that in science class!",
                    next: null
                },
                activity: {
                    text: "I'm collecting data on the local wildlife! There are so many cool bugs near the pond!",
                    next: null
                }
            }
        },
        {
            name: 'Gyoza-kun',
            filling: 'pork',
            spawnPos: { x: cx - 40, y: cy + 120 },
            wanderRadius: 70,
            personality: 'sporty',
            favoriteSubject: 'pe',
            dialogue: {
                start: {
                    text: "Yo! Wanna race? I'm the fastest dumpling in school!",
                    choices: [
                        { text: "Maybe later, speedster!", next: 'later' },
                        { text: "What sports do you play?", next: 'sports' },
                        { text: "Good luck with that!", next: null }
                    ]
                },
                later: {
                    text: "Alright, but don't forget! Coach Mochi says I have natural talent!",
                    next: null
                },
                sports: {
                    text: "Everything! Running, jumping, rolling... PE is definitely my favorite class. Being a dumpling is perfect for rolling!",
                    next: null
                }
            }
        },
        {
            name: 'Nira-chan',
            filling: 'veggie',
            spawnPos: { x: cx + 100, y: cy + 40 },
            wanderRadius: 55,
            personality: 'musical',
            favoriteSubject: 'music',
            dialogue: {
                start: {
                    text: "La la la~ Oh, hello! I was just practicing a new song!",
                    choices: [
                        { text: "Can you sing it for me?", next: 'sing' },
                        { text: "Do you play any instruments?", next: 'instruments' },
                        { text: "Keep practicing!", next: null }
                    ]
                },
                sing: {
                    text: "Maybe at the school concert! Melody-sensei says I have a lovely voice~ I'm a bit shy though...",
                    next: null
                },
                instruments: {
                    text: "I'm learning the taiko drums! BOOM BOOM! It's so much fun! Music class is the highlight of my day!",
                    next: null
                }
            }
        },
        {
            name: 'Bamboo-tan',
            filling: 'veggie',
            spawnPos: { x: cx - 80, y: cy - 80 },
            wanderRadius: 45,
            personality: 'studious',
            favoriteSubject: 'japanese',
            dialogue: {
                start: {
                    text: "Ah, konnichiwa! I was just memorizing some new kanji...",
                    choices: [
                        { text: "That sounds hard!", next: 'kanji' },
                        { text: "Do you like studying?", next: 'study' },
                        { text: "Ganbare! (Good luck!)", next: null }
                    ]
                },
                kanji: {
                    text: "It's fun once you get the hang of it! Each character tells a story. Did you know the kanji for 'dumpling' is so cute?",
                    next: null
                },
                study: {
                    text: "Very much! Knowledge is like filling - the more you have, the better! Kanji-sensei always says I'm a model student.",
                    next: null
                }
            }
        },
        {
            name: 'Curry-chan',
            filling: 'sweet',
            spawnPos: { x: cx + 40, y: cy + 100 },
            wanderRadius: 60,
            personality: 'creative',
            favoriteSubject: 'art',
            dialogue: {
                start: {
                    text: "Ooh, hello! I just had the BEST idea for a new invention!",
                    choices: [
                        { text: "What is it?", next: 'invention' },
                        { text: "Are you always inventing things?", next: 'always' },
                        { text: "Sounds exciting!", next: null }
                    ]
                },
                invention: {
                    text: "A self-steaming dumpling basket! Imagine - warm dumplings ANYWHERE! I'll present it in art class!",
                    next: null
                },
                always: {
                    text: "Always! My brain never stops! I carry a notebook everywhere. Palette-sensei loves my creative projects!",
                    next: null
                }
            }
        }
    ];
}

// Create NPC instances from kid data
export function createKidNpcs(NPC, kidData) {
    return kidData.map(kid => {
        const npc = new NPC(
            kid.spawnPos.x,
            kid.spawnPos.y,
            kid.filling,
            kid.name,
            kid.dialogue
        );

        // Set wander area around spawn point
        npc.setWanderArea(
            kid.spawnPos.x - kid.wanderRadius,
            kid.spawnPos.y - kid.wanderRadius,
            kid.wanderRadius * 2,
            kid.wanderRadius * 2
        );

        // Mark as kid NPC for special handling
        npc.isKid = true;
        npc.personality = kid.personality;
        npc.favoriteSubject = kid.favoriteSubject;
        npc.currentLocation = KidLocation.VILLAGE;

        return npc;
    });
}

// Get kids for a specific location
export function getKidsAtLocation(kids, location) {
    return kids.filter(kid => kid.currentLocation === location);
}

// Move a kid to a new location
export function moveKidToLocation(kid, location) {
    kid.currentLocation = location;
}

// Move all kids to a location
export function moveAllKidsToLocation(kids, location) {
    kids.forEach(kid => {
        kid.currentLocation = location;
    });
}

// Update kid locations based on game time and schedule
export function updateKidLocations(kids, gameTime, getKidLocationFn) {
    const targetLocation = getKidLocationFn(gameTime);

    for (const kid of kids) {
        // Map schedule locations to KidLocation
        switch (targetLocation) {
            case 'village':
                kid.currentLocation = KidLocation.VILLAGE;
                break;
            case 'classroom':
                kid.currentLocation = KidLocation.CLASSROOM;
                // Store which classroom based on kid's favorite subject or current class
                kid.currentClassroom = gameTime.getCurrentSubject?.() || kid.favoriteSubject;
                break;
            case 'schoolyard':
                // During breaks, kids are at school but in hallway/outside
                kid.currentLocation = KidLocation.SCHOOL;
                break;
            default:
                kid.currentLocation = KidLocation.VILLAGE;
        }
    }
}

// Get the classroom a kid should be in based on their favorite subject and current period
export function getKidClassroom(kid, gameTime) {
    // During class periods, all kids attend the same class
    const currentSubject = gameTime.getCurrentSubject?.();
    if (currentSubject) {
        return currentSubject;
    }
    // Outside class, kids hang out near their favorite subject room
    return kid.favoriteSubject;
}
