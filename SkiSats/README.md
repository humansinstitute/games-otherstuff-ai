# SkiSats ⛷️

A retro-style 3D skiing game where you race down an endless slope, collecting Bitcoin sats while dodging trees, shrubs, and the legendary Yeti!

![SkiSats](https://img.shields.io/badge/status-playable-success)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🎮 About

SkiSats is a modern tribute to the classic SkiFree game, featuring:
- Smooth 3D graphics with retro 8-bit UI
- Progressive difficulty as you gain speed
- Bitcoin-themed collectibles (sats)
- Interactive shrubs that catch fire at high speeds
- The terrifying Yeti chase sequence
- Randomized gameplay for high replayability

## ✨ Features

### Core Gameplay
- **Endless Skiing**: Race down an infinite slope with accelerating speed
- **Dynamic Obstacles**: Navigate through randomly generated trees of varying types
- **Collect Sats**: Grab spinning Bitcoin coins scattered across the slope
- **Shrub Mechanics**: Slow shrubs slow you down, but blast through them at high speed to set them ablaze!

### The Yeti
- **Random Encounters**: 85% of games feature the legendary Yeti
- **Unpredictable Spawn**: Appears anytime after 45 seconds with increasing probability
- **Inevitable Catch**: The Yeti accelerates faster than you can, creating intense chase sequences
- **Visual Warnings**: Screen shake intensifies as the Yeti closes in
- **No-Yeti Runs**: 15% of games are Yeti-free, making the game theoretically beatable!

### Visual Features
- 3D low-poly graphics with Three.js
- Retro 8-bit "Press Start 2P" font
- Golden glowing title screens
- Enhanced HUD with color-coded stats
- Particle effects for burning shrubs
- Smooth camera following and player animations

## 🕹️ Controls

- **Arrow Keys** or **A/D**: Steer left and right
- **Enter**: Start game / Restart after game over

## 🎯 Game Mechanics

### Speed & Physics
- Base speed: 75 m/s
- Acceleration: 4 m/s²
- Maximum speed: 350 m/s
- Horizontal steering: 50 m/s

### Obstacles
- **Trees**: Instant crash on collision
- **Boundary Markers**: Hit the slope edges and it's game over
- **Shrubs**:
  - Speed < 150: Slows you to 60% speed
  - Speed ≥ 150: Sets the shrub on fire (with particles!)

### Collectibles
- **Sats (Bitcoin coins)**: Collect spinning coins for points
- Coins bounce and spin at varying heights
- Track your total sats collected in the HUD

### The Yeti System
- **Game Probability**: 85% chance of being enabled per run
- **Minimum Spawn Time**: 45 seconds
- **Spawn Rate**: 4% chance per second after minimum time
- **Average Spawn**: Around 1:10-1:20 into the game
- **Initial Speed**: 100 m/s
- **Acceleration**: 15 m/s² (faster than player!)
- **Max Speed**: 500 m/s
- **Catch Time**: Typically catches you in 15-20 seconds

## 🚀 Getting Started

### Prerequisites
- Modern web browser with WebGL support
- No build tools required - pure JavaScript!

### Installation

1. Clone the repository:
```bash
git clone https://github.com/andymdavid/SkiSats.git
cd SkiSats
```

2. Start a local web server:
```bash
# Using Python 3
python3 -m http.server 8000

# Or using Node.js
npx serve

# Or using PHP
php -S localhost:8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

4. Press **Enter** to start skiing!

## 🛠️ Technology Stack

- **Three.js** - 3D graphics rendering
- **Vanilla JavaScript** - No framework dependencies
- **HTML5 Canvas** - 2D UI overlay
- **CSS3** - Styling and layout
- **Google Fonts** - "Press Start 2P" retro font

## 📁 Project Structure

```
SkiSats/
├── index.html              # Main HTML file
├── styles.css              # Global styles
├── src/
│   ├── main.js            # Game loop and initialization
│   ├── config.js          # Game configuration and constants
│   ├── gameState.js       # State management (menu, playing, game over)
│   ├── player.js          # Player physics and controls
│   ├── world.js           # World generation and collision detection
│   ├── renderer3d.js      # Three.js 3D rendering
│   ├── hud.js             # Heads-up display
│   └── input.js           # Keyboard input handling
└── README.md              # This file
```

## 🎨 Customization

All game parameters can be adjusted in `src/config.js`:

- **Player speed and acceleration**
- **Obstacle spawn rates and density**
- **Yeti spawn probabilities and behavior**
- **Camera angles and fog settings**
- **Collision detection radii**
- **Shrub fire mechanics**

## 🏆 Tips & Strategies

1. **Early Game**: Focus on collecting sats while obstacles are sparse
2. **Mid Game (45s+)**: Stay alert - the Yeti could appear at any moment
3. **Shrub Management**: Use shrubs strategically to control speed
4. **High Speed**: At 150+ m/s, blast through shrubs instead of avoiding them
5. **Yeti Encounter**: When screen shakes, the Yeti is closing in - make your final seconds count!
6. **Lateral Movement**: Quick side-to-side movements help avoid obstacles at high speeds

## 🐛 Known Issues

- Screen shake may be intense on some displays
- Performance may vary on older devices
- Yeti mesh is complex and may cause brief lag on first spawn

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Inspired by the classic **SkiFree** by Chris Pirih (1991)
- Bitcoin community for the sats culture
- Three.js team for the amazing 3D library
- Press Start 2P font by CodeMan38

## 🎮 Play Now!

Ready to face the Yeti? Start the game and see how long you can survive!

---

Made with ⛷️ by Andy David

🤖 Generated with [Claude Code](https://claude.com/claude-code)
