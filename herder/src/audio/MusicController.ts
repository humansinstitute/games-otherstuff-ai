interface MusicOptions {
  maxVolume?: number
  fadeDurationMs?: number
}

/** Handles looping background music with simple fade helpers. */
export class MusicController {
  private readonly audio: HTMLAudioElement
  private readonly maxVolume: number
  private readonly fadeDuration: number
  private fadeRaf?: number
  private enabled = true

  constructor(src: string, options: MusicOptions = {}) {
    this.audio = new Audio(src)
    this.audio.volume = 0
    this.audio.loop = true
    this.maxVolume = options.maxVolume ?? 0.25
    this.fadeDuration = options.fadeDurationMs ?? 2000
  }

  async start(): Promise<void> {
    if (!this.enabled) {
      return
    }
    try {
      await this.audio.play()
    } catch (err) {
      console.warn('Music playback failed. User interaction may be required.', err)
      return
    }
    this.fadeTo(this.maxVolume)
  }

  stop(): void {
    this.fadeTo(0, () => this.audio.pause())
  }

  toggle(): void {
    this.enabled = !this.enabled
    if (this.enabled) {
      this.start()
    } else {
      this.stop()
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  private fadeTo(target: number, onComplete?: () => void): void {
    if (this.fadeRaf) {
      cancelAnimationFrame(this.fadeRaf)
    }
    const startVolume = this.audio.volume
    const delta = target - startVolume
    const start = performance.now()

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / this.fadeDuration)
      this.audio.volume = startVolume + delta * t
      if (t < 1) {
        this.fadeRaf = requestAnimationFrame(step)
      } else {
        onComplete?.()
      }
    }

    this.fadeRaf = requestAnimationFrame(step)
  }
}
