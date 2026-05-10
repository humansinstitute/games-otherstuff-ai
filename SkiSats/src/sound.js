// Sound Manager for SkiSats
// Generates retro 8-bit sound effects using Web Audio API

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.masterVolume = 0.3;
    this.initialized = false;
    this.swooshOscillator = null;
    this.swooshGain = null;
  }

  // Initialize audio context (must be called after user interaction)
  init() {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      console.log('Sound system initialized');
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  // Ensure audio context is running (browsers require user interaction)
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Coin collect sound - bright 8-bit ding
  playCoinCollect() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    // Bright ascending notes
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);

    gain.gain.setValueAtTime(this.masterVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Tree crash sound - harsh noise burst
  playTreeCrash() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Noise burst
    const bufferSize = this.audioContext.sampleRate * 0.3;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(400, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(this.masterVolume * 0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.3);

    // Add descending tone
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);

    oscGain.gain.setValueAtTime(this.masterVolume * 0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(oscGain);
    oscGain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Shrub thud sound - low speed collision
  playShrubThud() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    gain.gain.setValueAtTime(this.masterVolume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Shrub fire sound - whoosh + ignite
  playShrubFire() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Whoosh (filtered noise)
    const bufferSize = this.audioContext.sampleRate * 0.2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 0.2);

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(this.masterVolume * 0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.2);

    // Fire crackle
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

    oscGain.gain.setValueAtTime(0, now + 0.1);
    oscGain.gain.linearRampToValueAtTime(this.masterVolume * 0.2, now + 0.15);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(oscGain);
    oscGain.connect(this.audioContext.destination);

    osc.start(now + 0.1);
    osc.stop(now + 0.3);
  }

  // Yeti appears sound - ominous low growl
  playYetiAppear() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.audioContext.destination);

    // Low rumbling frequencies
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, now);
    osc1.frequency.linearRampToValueAtTime(60, now + 0.8);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(83, now);
    osc2.frequency.linearRampToValueAtTime(63, now + 0.8);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.masterVolume * 0.4, now + 0.1);
    gain.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc1.start(now);
    osc1.stop(now + 0.8);
    osc2.start(now);
    osc2.stop(now + 0.8);
  }

  // Yeti catch sound - dramatic roar
  playYetiCatch() {
    if (!this.initialized) return;
    this.resume();

    const now = this.audioContext.currentTime;

    // Roar (filtered noise burst)
    const bufferSize = this.audioContext.sampleRate * 0.6;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(200, now + 0.3);
    filter.frequency.linearRampToValueAtTime(100, now + 0.6);

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(this.masterVolume * 0.6, now + 0.05);
    noiseGain.gain.linearRampToValueAtTime(this.masterVolume * 0.4, now + 0.3);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);

    noise.start(now);
    noise.stop(now + 0.6);

    // Low rumble
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);

    oscGain.gain.setValueAtTime(this.masterVolume * 0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  // Start continuous skiing swoosh (speed-based)
  startSkiingSwoosh(speed = 0) {
    if (!this.initialized) return;
    this.resume();

    // Stop existing swoosh if any
    this.stopSkiingSwoosh();

    const now = this.audioContext.currentTime;

    // Create filtered noise for wind/swoosh effect
    const bufferSize = this.audioContext.sampleRate * 2; // 2 second loop
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.swooshOscillator = this.audioContext.createBufferSource();
    this.swooshOscillator.buffer = buffer;
    this.swooshOscillator.loop = true;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1;

    this.swooshGain = this.audioContext.createGain();
    this.swooshGain.gain.value = 0;

    this.swooshOscillator.connect(filter);
    filter.connect(this.swooshGain);
    this.swooshGain.connect(this.audioContext.destination);

    // Store filter reference for updating
    this.swooshFilter = filter;

    this.swooshOscillator.start(now);

    // Update based on speed
    this.updateSkiingSwoosh(speed);
  }

  // Update skiing swoosh based on speed
  updateSkiingSwoosh(speed) {
    if (!this.swooshGain || !this.swooshFilter) return;

    const normalizedSpeed = Math.min(speed / 350, 1); // 350 is max speed from config

    // Volume increases with speed
    const targetVolume = this.masterVolume * 0.15 * normalizedSpeed;
    this.swooshGain.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + 0.1);

    // Pitch (filter frequency) increases with speed
    const baseFreq = 500;
    const maxFreq = 2000;
    const targetFreq = baseFreq + (maxFreq - baseFreq) * normalizedSpeed;
    this.swooshFilter.frequency.linearRampToValueAtTime(targetFreq, this.audioContext.currentTime + 0.1);
  }

  // Stop skiing swoosh
  stopSkiingSwoosh() {
    if (this.swooshOscillator) {
      try {
        const now = this.audioContext.currentTime;
        this.swooshGain.gain.linearRampToValueAtTime(0, now + 0.2);
        this.swooshOscillator.stop(now + 0.3);
      } catch (e) {
        // Already stopped
      }
      this.swooshOscillator = null;
      this.swooshGain = null;
      this.swooshFilter = null;
    }
  }
}

// Create singleton instance
export const soundManager = new SoundManager();
