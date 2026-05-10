// ============================================
// MINI-GAMES MODULE
// Extracted from game.js for maintainability
// ============================================

import { GameState } from './game.js';

// Initial state structures for mini-games
export function createMiniGameState() {
    return {
        // Rock Paper Scissors
        rps: {
            playerChoice: null,
            npcChoice: null,
            playerScore: 0,
            npcScore: 0,
            round: 1,
            phase: 'choosing', // choosing, reveal, result
            result: null,
            timer: 0
        },
        // Rhythm Cooking
        rhythm: {
            notes: [],          // { key, time, hit }
            currentTime: 0,
            score: 0,
            combo: 0,
            maxCombo: 0,
            phase: 'ready',     // ready, playing, results
            songLength: 8000,   // 8 seconds
            lastSpawn: 0,
            hitFeedback: null,
            hitFeedbackTimer: 0
        },
        // Fishing
        fishing: {
            phase: 'casting',   // casting, waiting, biting, reeling, caught, failed
            timer: 0,
            biteTime: 0,
            reelProgress: 0,
            fishType: null,
            catchWindow: 0
        },
        // Treasure Hunt
        treasure: {
            active: false,
            targetX: 0,
            targetY: 0,
            hintText: '',
            prize: 0,
            found: false
        }
    };
}

// ============================================
// ROCK PAPER SCISSORS
// ============================================

export function startRPS(game) {
    game.miniGame.rps = {
        playerChoice: null,
        npcChoice: null,
        playerScore: 0,
        npcScore: 0,
        round: 1,
        phase: 'choosing',
        result: null,
        timer: 0
    };
    game.state = GameState.MINIGAME_RPS;
}

export function updateRPS(game, deltaTime) {
    const rps = game.miniGame.rps;

    if (rps.phase === 'reveal') {
        rps.timer += deltaTime;
        if (rps.timer > 1.5) {
            rps.timer = 0;
            // Check if game is over (best of 3)
            if (rps.playerScore >= 2 || rps.npcScore >= 2) {
                rps.phase = 'gameover';
            } else {
                rps.round++;
                rps.phase = 'choosing';
                rps.playerChoice = null;
                rps.npcChoice = null;
                rps.result = null;
            }
        }
    } else if (rps.phase === 'gameover') {
        rps.timer += deltaTime;
        if (rps.timer > 2) {
            // Give reward if player won
            if (rps.playerScore > rps.npcScore) {
                game.playerCoins += 40;
                game.rewardMessage = "You won 40 coins!";
                game.rewardMessageTimer = 2;
                game.saveGame();
            }
            game.state = GameState.INSIDE_BUILDING;
        }
    }
}

export function handleRPSInput(game, choice) {
    const rps = game.miniGame.rps;
    if (rps.phase !== 'choosing') return;

    rps.playerChoice = choice;
    rps.npcChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];

    // Determine winner
    if (rps.playerChoice === rps.npcChoice) {
        rps.result = 'tie';
    } else if (
        (rps.playerChoice === 'rock' && rps.npcChoice === 'scissors') ||
        (rps.playerChoice === 'paper' && rps.npcChoice === 'rock') ||
        (rps.playerChoice === 'scissors' && rps.npcChoice === 'paper')
    ) {
        rps.result = 'win';
        rps.playerScore++;
    } else {
        rps.result = 'lose';
        rps.npcScore++;
    }

    rps.phase = 'reveal';
    rps.timer = 0;
}

export function handleRPSTap(game, x, y) {
    const rps = game.miniGame.rps;
    if (rps.phase !== 'choosing') return;

    const centerY = game.viewHeight / 2;
    const options = ['rock', 'paper', 'scissors'];

    for (let i = 0; i < 3; i++) {
        const optX = game.viewWidth / 2 + (i - 1) * 120;
        // Check if tap is within option box (90x100)
        if (x >= optX - 45 && x <= optX + 45 &&
            y >= centerY - 30 && y <= centerY + 70) {
            handleRPSInput(game, options[i]);
            return;
        }
    }
}

// ============================================
// RHYTHM COOKING
// ============================================

export function startRhythm(game) {
    game.miniGame.rhythm = {
        notes: [],
        currentTime: 0,
        score: 0,
        combo: 0,
        maxCombo: 0,
        phase: 'ready',
        songLength: 10000,
        lastSpawn: 0,
        hitFeedback: null,
        hitFeedbackTimer: 0
    };
    game.state = GameState.MINIGAME_RHYTHM;
}

export function updateRhythm(game, deltaTime) {
    const rhythm = game.miniGame.rhythm;

    // Update hit feedback timer
    if (rhythm.hitFeedbackTimer > 0) {
        rhythm.hitFeedbackTimer -= deltaTime;
        if (rhythm.hitFeedbackTimer <= 0) {
            rhythm.hitFeedback = null;
        }
    }

    if (rhythm.phase === 'ready') {
        // Waiting for player to start
        return;
    }

    if (rhythm.phase === 'playing') {
        rhythm.currentTime += deltaTime * 1000;

        // Spawn notes at regular intervals
        const spawnInterval = 600; // ms between notes
        if (rhythm.currentTime - rhythm.lastSpawn > spawnInterval && rhythm.currentTime < rhythm.songLength - 1000) {
            const keys = ['a', 's', 'd', 'f'];
            rhythm.notes.push({
                key: keys[Math.floor(Math.random() * keys.length)],
                time: rhythm.currentTime + 2000, // 2 seconds to reach target
                hit: false,
                missed: false
            });
            rhythm.lastSpawn = rhythm.currentTime;
        }

        // Check for missed notes
        for (const note of rhythm.notes) {
            if (!note.hit && !note.missed && rhythm.currentTime > note.time + 200) {
                note.missed = true;
                rhythm.combo = 0;
                rhythm.hitFeedback = 'Miss!';
                rhythm.hitFeedbackTimer = 0.3;
            }
        }

        // Remove old notes
        rhythm.notes = rhythm.notes.filter(n => rhythm.currentTime < n.time + 500);

        // Check if song is over
        if (rhythm.currentTime >= rhythm.songLength && rhythm.notes.length === 0) {
            rhythm.phase = 'results';
        }
    }

    if (rhythm.phase === 'results') {
        rhythm.timer = (rhythm.timer || 0) + deltaTime;
        if (rhythm.timer > 3) {
            // Calculate reward based on score
            const reward = Math.floor(rhythm.score / 10) * 5 + 20;
            game.playerCoins += reward;
            game.rewardMessage = `Cooking complete! +${reward} coins!`;
            game.rewardMessageTimer = 2;
            game.saveGame();
            game.state = GameState.INSIDE_BUILDING;
        }
    }
}

export function handleRhythmInput(game, key) {
    const rhythm = game.miniGame.rhythm;

    if (rhythm.phase === 'ready') {
        rhythm.phase = 'playing';
        return;
    }

    if (rhythm.phase !== 'playing') return;

    // Check if key matches any note in the hit window
    const hitWindow = 150; // ms tolerance
    for (const note of rhythm.notes) {
        if (note.hit || note.missed) continue;
        if (note.key === key) {
            const diff = Math.abs(rhythm.currentTime - note.time);
            if (diff < hitWindow) {
                note.hit = true;
                rhythm.combo++;
                if (rhythm.combo > rhythm.maxCombo) {
                    rhythm.maxCombo = rhythm.combo;
                }

                // Score based on timing
                if (diff < 50) {
                    rhythm.score += 100 + (rhythm.combo * 10);
                    rhythm.hitFeedback = 'Perfect!';
                } else if (diff < 100) {
                    rhythm.score += 50 + (rhythm.combo * 5);
                    rhythm.hitFeedback = 'Good!';
                } else {
                    rhythm.score += 25;
                    rhythm.hitFeedback = 'OK';
                }
                rhythm.hitFeedbackTimer = 0.3;
                return;
            }
        }
    }
}

export function handleRhythmTap(game, x, y) {
    const rhythm = game.miniGame.rhythm;

    // Tap anywhere to start if ready
    if (rhythm.phase === 'ready') {
        rhythm.phase = 'playing';
        return;
    }

    if (rhythm.phase !== 'playing') return;

    // Check which lane was tapped (4 columns)
    const laneWidth = 80;
    const startX = game.viewWidth / 2 - (laneWidth * 2);
    const laneKeys = ['a', 's', 'd', 'f'];

    for (let i = 0; i < 4; i++) {
        const laneStart = startX + i * laneWidth;
        const laneEnd = laneStart + laneWidth;
        if (x >= laneStart && x <= laneEnd) {
            handleRhythmInput(game, laneKeys[i]);
            return;
        }
    }
}

// ============================================
// FISHING
// ============================================

export function startFishing(game) {
    game.miniGame.fishing = {
        phase: 'casting',
        timer: 0,
        biteTime: 2 + Math.random() * 3, // 2-5 seconds wait
        reelProgress: 0,
        fishType: null,
        catchWindow: 1.5
    };
    game.state = GameState.MINIGAME_FISHING;
}

export function updateFishing(game, deltaTime) {
    const fish = game.miniGame.fishing;

    if (fish.phase === 'casting') {
        fish.timer += deltaTime;
        if (fish.timer > 0.5) {
            fish.phase = 'waiting';
            fish.timer = 0;
        }
    }

    if (fish.phase === 'waiting') {
        fish.timer += deltaTime;
        if (fish.timer >= fish.biteTime) {
            fish.phase = 'biting';
            fish.timer = 0;
            // Determine fish type
            const rand = Math.random();
            if (rand < 0.5) {
                fish.fishType = { name: 'Small Carp', emoji: '🐟', value: 15 };
            } else if (rand < 0.8) {
                fish.fishType = { name: 'Koi Fish', emoji: '🐠', value: 30 };
            } else if (rand < 0.95) {
                fish.fishType = { name: 'Golden Fish', emoji: '🐡', value: 50 };
            } else {
                fish.fishType = { name: 'Legendary Dumpling Fish', emoji: '🥟', value: 100 };
            }
        }
    }

    if (fish.phase === 'biting') {
        fish.timer += deltaTime;
        if (fish.timer > fish.catchWindow) {
            fish.phase = 'escaped';
            fish.timer = 0;
        }
    }

    if (fish.phase === 'reeling') {
        fish.timer += deltaTime;
        fish.reelProgress -= deltaTime * 0.3; // Slowly loses progress
        if (fish.reelProgress <= 0) fish.reelProgress = 0;
        if (fish.reelProgress >= 1) {
            fish.phase = 'caught';
            fish.timer = 0;
        }
    }

    if (fish.phase === 'caught') {
        fish.timer += deltaTime;
        if (fish.timer > 2) {
            game.playerCoins += fish.fishType.value;
            game.rewardMessage = `Caught ${fish.fishType.name}! +${fish.fishType.value} coins!`;
            game.rewardMessageTimer = 2;
            game.saveGame();
            game.state = GameState.PLAYING;
        }
    }

    if (fish.phase === 'escaped') {
        fish.timer += deltaTime;
        if (fish.timer > 1.5) {
            game.state = GameState.PLAYING;
        }
    }
}

export function handleFishingInput(game) {
    const fish = game.miniGame.fishing;

    if (fish.phase === 'biting') {
        fish.phase = 'reeling';
        fish.timer = 0;
        fish.reelProgress = 0.3;
    } else if (fish.phase === 'reeling') {
        fish.reelProgress += 0.15;
    } else if (fish.phase === 'waiting') {
        // Too early! Fish scared away
        fish.phase = 'escaped';
        fish.timer = 0;
    }
}

// ============================================
// TREASURE HUNT
// ============================================

export function startTreasureHunt(game) {
    // Pick random location in world
    const margin = 100;
    game.miniGame.treasure = {
        active: true,
        targetX: margin + Math.random() * (game.world.width - margin * 2),
        targetY: margin + Math.random() * (game.world.height - margin * 2),
        hintText: '',
        prize: 50 + Math.floor(Math.random() * 50), // 50-100 coins
        found: false
    };
    game.state = GameState.MINIGAME_TREASURE;
}

export function updateTreasureHunt(game, deltaTime) {
    const treasure = game.miniGame.treasure;
    if (!treasure.active) return;

    // Update celebration timer if found
    if (treasure.found) {
        if (treasure.celebrationTimer > 0) {
            treasure.celebrationTimer -= deltaTime;
        }
        return;
    }

    // Calculate distance to treasure
    const dx = game.player.x - treasure.targetX;
    const dy = game.player.y - treasure.targetY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Update hint based on distance
    if (distance < 30) {
        treasure.hintText = "🔥 YOU FOUND IT! 🔥";
        treasure.found = true;
        treasure.celebrationTimer = 2; // 2 seconds of celebration
        game.playerCoins += treasure.prize;
        game.rewardMessage = `Found the treasure! +${treasure.prize} coins!`;
        game.rewardMessageTimer = 2;
        // Auto-save after finding treasure
        game.saveGame();
        // Return to playing after celebration
        setTimeout(() => {
            game.miniGame.treasure.active = false;
            game.state = GameState.PLAYING;
        }, 2000);
    } else if (distance < 80) {
        treasure.hintText = "🔥 BURNING HOT! 🔥";
    } else if (distance < 150) {
        treasure.hintText = "🌡️ Very Hot!";
    } else if (distance < 250) {
        treasure.hintText = "☀️ Warm~";
    } else if (distance < 400) {
        treasure.hintText = "😐 Lukewarm";
    } else if (distance < 550) {
        treasure.hintText = "❄️ Cold...";
    } else {
        treasure.hintText = "🥶 Freezing Cold!";
    }
}

export function exitTreasureHunt(game) {
    game.miniGame.treasure.active = false;
    game.state = GameState.PLAYING;
}
