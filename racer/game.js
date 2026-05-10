/**
 * Micro Machines Style Racing - Game Controller
 * Top-down racing with lap tracking and checkpoints
 */

import { PlayerCar } from './entities.js';
import { getTrack } from './levels.js';
import { Renderer } from './renderer.js';

// Game states
export const GameState = {
  START_SCREEN: 'start',
  COUNTDOWN: 'countdown',
  RACING: 'racing',
  LAP_COMPLETE: 'lap_complete',
  RACE_FINISH: 'race_finish',
  PAUSED: 'paused'
};

const STORAGE_KEY = 'microracer.best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderer = new Renderer(canvas);

    // State
    this.state = GameState.START_SCREEN;
    this.stateTimer = 0;

    // Game config
    this.totalLaps = 3;
    this.currentLap = 0;
    this.currentTrackIndex = 0;

    // Track
    this.track = null;

    // Player
    this.player = null;
    this.prevX = 0;
    this.prevY = 0;

    // Checkpoint tracking
    this.nextCheckpoint = 0;
    this.isOffTrack = false;
    this.lapCooldown = 0; // Prevent double-counting laps
    this.fellOffTimer = 0; // Visual feedback for falling off

    // Scoring
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
    this.raceTime = 0;
    this.lapTimes = [];
    this.lapStartTime = 0;

    // Input state
    this.input = { left: false, right: false, accelerate: false, brake: false };

    // Timing
    this.lastTime = 0;
    this.running = false;

    // Callbacks for UI
    this.onStateChange = null;
    this.onScoreChange = null;
    this.onLapChange = null;
    this.onSpeedChange = null;
  }

  setState(newState, data = {}) {
    const oldState = this.state;
    this.state = newState;
    this.stateTimer = 0;

    if (this.onStateChange) {
      this.onStateChange(newState, oldState, data);
    }

    this.onStateEnter(newState, data);
  }

  onStateEnter(state, data) {
    switch (state) {
      case GameState.COUNTDOWN:
        this.stateTimer = 180; // 3 seconds at 60fps
        break;

      case GameState.LAP_COMPLETE:
        this.stateTimer = 60; // 1 second
        const lapTime = this.raceTime - this.lapStartTime;
        this.lapTimes.push(lapTime);
        this.lapStartTime = this.raceTime;
        this.currentLap++;

        // Reset checkpoints for next lap (start at 1, finish line already passed)
        for (const cp of this.track.checkpoints) {
          cp.reset();
        }
        this.track.checkpoints[0].passed = true;
        this.nextCheckpoint = 1;
        break;

      case GameState.RACE_FINISH:
        this.calculateFinalScore();
        this.saveBestScore();
        break;
    }
  }

  start() {
    // Reset game state
    this.score = 0;
    this.currentLap = 0;
    this.raceTime = 0;
    this.lapTimes = [];
    this.lapStartTime = 0;
    this.nextCheckpoint = 0;
    this.isOffTrack = false;

    // Load track
    this.track = getTrack(this.currentTrackIndex);

    // Create player at start position
    this.player = new PlayerCar(
      this.track.start.x,
      this.track.start.y,
      this.track.start.angle
    );
    this.prevX = this.player.x;
    this.prevY = this.player.y;

    // Reset checkpoint states - start at checkpoint 1 (skip finish line at start)
    for (const cp of this.track.checkpoints) {
      cp.reset();
    }
    // Mark finish line as already passed (we start there)
    this.track.checkpoints[0].passed = true;
    this.nextCheckpoint = 1;

    // Reset renderer cache for new track
    this.renderer.resetTrackCache();

    // Center camera on player immediately
    this.renderer.updateCamera(this.player.x, this.player.y, true);

    // Start countdown
    this.setState(GameState.COUNTDOWN);

    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  gameLoop(timestamp) {
    if (!this.running) return;

    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    switch (this.state) {
      case GameState.COUNTDOWN:
        this.stateTimer--;
        if (this.stateTimer <= 0) {
          this.setState(GameState.RACING);
        }
        break;

      case GameState.RACING:
        this.updateRacing(dt);
        break;

      case GameState.LAP_COMPLETE:
        this.stateTimer--;
        this.updateRacing(dt);
        if (this.stateTimer <= 0 && this.currentLap < this.totalLaps) {
          this.setState(GameState.RACING);
        }
        break;
    }
  }

  updateRacing(dt) {
    // Store previous position for checkpoint detection
    this.prevX = this.player.x;
    this.prevY = this.player.y;

    // Update race time
    this.raceTime += dt;

    // Update fell off timer
    if (this.fellOffTimer > 0) this.fellOffTimer--;

    // Update player physics
    this.player.update(dt, this.input);

    // Check if fallen off table!
    if (this.track.tableEdges) {
      const edges = this.track.tableEdges;
      if (this.player.x < edges.left || this.player.x > edges.right ||
          this.player.y < edges.top || this.player.y > edges.bottom) {
        // Fell off the table! Reset to last checkpoint
        this.respawnPlayer();
        return;
      }
    }

    // Check if on track
    this.isOffTrack = !this.isPointOnTrack(this.player.x, this.player.y);

    if (this.isOffTrack) {
      this.player.applyOffTrackPenalty();
    }

    // Check checkpoint crossings
    this.checkCheckpoints();

    // Update camera to follow player
    this.renderer.updateCamera(this.player.x, this.player.y);

    // Update score based on distance traveled
    const dist = Math.sqrt(
      (this.player.x - this.prevX) ** 2 +
      (this.player.y - this.prevY) ** 2
    );
    this.score += Math.floor(dist * 0.5);

    if (this.onScoreChange) {
      this.onScoreChange(this.score);
    }

    if (this.onSpeedChange) {
      this.onSpeedChange(Math.floor(Math.abs(this.player.speed)));
    }
  }

  isPointOnTrack(x, y) {
    // Check against all track segments
    for (const segment of this.track.segments) {
      if (segment.isPointOnTrack(x, y)) {
        return true;
      }
    }
    return false;
  }

  respawnPlayer() {
    // Find the last passed checkpoint to respawn at
    let respawnPoint = this.track.start;
    let respawnAngle = this.track.start.angle;

    // Find the most recent checkpoint we passed
    const passedIndex = Math.max(0, this.nextCheckpoint - 1);
    if (passedIndex > 0 && passedIndex < this.track.checkpoints.length) {
      const cp = this.track.checkpoints[passedIndex];
      respawnPoint = { x: cp.x, y: cp.y };
      respawnAngle = cp.angle;
    } else if (this.nextCheckpoint >= this.track.checkpoints.length) {
      // Passed all checkpoints, respawn near finish
      const cp = this.track.checkpoints[this.track.checkpoints.length - 1];
      respawnPoint = { x: cp.x, y: cp.y };
      respawnAngle = cp.angle;
    }

    // Reset player position
    this.player.reset(respawnPoint.x, respawnPoint.y, respawnAngle);

    // Time penalty
    this.raceTime += 2;

    // Visual feedback
    this.fellOffTimer = 45; // Show "FELL OFF!" for ~0.75 sec
  }

  checkCheckpoints() {
    // Don't check during cooldown
    if (this.lapCooldown > 0) {
      this.lapCooldown--;
      return;
    }

    const checkpoints = this.track.checkpoints;

    // If we've passed all non-finish checkpoints, look for finish line
    if (this.nextCheckpoint >= checkpoints.length) {
      // Check if crossing finish line (checkpoint 0)
      const finish = checkpoints[0];
      if (finish.checkCrossing(this.player, this.prevX, this.prevY)) {
        this.lapCooldown = 60; // 1 second cooldown

        // Lap complete!
        if (this.currentLap + 1 >= this.totalLaps) {
          this.setState(GameState.RACE_FINISH);
        } else {
          this.setState(GameState.LAP_COMPLETE);
        }
      }
      return;
    }

    const nextCp = checkpoints[this.nextCheckpoint];
    if (!nextCp) return;

    // Check if player crossed this checkpoint
    if (nextCp.checkCrossing(this.player, this.prevX, this.prevY)) {
      nextCp.passed = true;
      this.nextCheckpoint++;
    }
  }

  calculateFinalScore() {
    // Base score from distance
    const distanceScore = this.score;

    // Time bonus (faster = more points)
    const targetTime = 60 * this.totalLaps; // Target: 1 minute per lap
    const timeBonus = Math.max(0, Math.floor((targetTime - this.raceTime) * 100));

    // Completion bonus
    const completionBonus = 5000;

    this.score = distanceScore + timeBonus + completionBonus;

    if (this.onScoreChange) {
      this.onScoreChange(this.score);
    }
  }

  saveBestScore() {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(STORAGE_KEY, this.bestScore.toString());
    }
  }

  render() {
    const r = this.renderer;

    // Clear with track ground color
    r.clear(this.track ? this.track.groundColor : '#3d8b3d');

    // Draw track
    if (this.track) {
      r.drawTrack(this.track);
    }

    // Draw particles behind car
    if (this.player && this.state !== GameState.START_SCREEN) {
      r.drawParticles(this.player, this.input.brake);
    }

    // Draw player car
    if (this.player && this.state !== GameState.START_SCREEN) {
      r.drawCar(this.player);
    }

    // Draw off-track warning
    if (this.isOffTrack && this.state === GameState.RACING) {
      r.drawOffTrack();
    }

    // Draw HUD
    if (this.state === GameState.RACING || this.state === GameState.LAP_COMPLETE) {
      r.drawHUD(
        this.player.speed,
        this.player.maxSpeed,
        this.currentLap + 1,
        this.totalLaps,
        this.raceTime,
        this.score
      );
    }

    // Draw countdown
    if (this.state === GameState.COUNTDOWN) {
      r.drawCountdown(Math.ceil(this.stateTimer / 60));
    }

    // Draw lap complete message
    if (this.state === GameState.LAP_COMPLETE) {
      const lastLapTime = this.lapTimes[this.lapTimes.length - 1];
      r.drawLapComplete(this.currentLap, lastLapTime);
    }

    // Draw fell off indicator
    if (this.fellOffTimer > 0) {
      r.drawFellOff();
    }
  }

  // Input methods
  setInput(key, value) {
    this.input[key] = value;
  }

  restart() {
    this.start();
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % 4;
    this.start();
  }

  selectTrack(index) {
    this.currentTrackIndex = index;
  }

  isRaceFinish() {
    return this.state === GameState.RACE_FINISH;
  }

  isStartScreen() {
    return this.state === GameState.START_SCREEN;
  }

  getRaceTime() {
    return this.raceTime;
  }

  getLapTimes() {
    return this.lapTimes;
  }

  getTrackName() {
    return this.track ? this.track.name : '';
  }
}
