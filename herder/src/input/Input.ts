export interface InputState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  bark: boolean
}

const KEY_MAP: Record<string, keyof InputState | undefined> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'bark'
}

const DEFAULT_STATE: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  bark: false
}

/** Simple keyboard/touch controller for WASD/arrow keys plus a bark action. */
export class InputController {
  private readonly state: InputState = { ...DEFAULT_STATE }
  private readonly pressedKeys = new Set<string>()
  private readonly touch = { active: false, startX: 0, startY: 0 }
  private enabled = true

  constructor(private readonly target: Window = window) {
    this.target.addEventListener('keydown', this.handleKeyDown)
    this.target.addEventListener('keyup', this.handleKeyUp)
    this.target.addEventListener('blur', this.reset)
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      window.addEventListener('touchstart', this.handleTouchStart, { passive: false })
      window.addEventListener('touchmove', this.handleTouchMove, { passive: false })
      window.addEventListener('touchend', this.handleTouchEnd)
      window.addEventListener('touchcancel', this.handleTouchEnd)
    }
  }

  dispose(): void {
    this.reset()
    this.target.removeEventListener('keydown', this.handleKeyDown)
    this.target.removeEventListener('keyup', this.handleKeyUp)
    this.target.removeEventListener('blur', this.reset)
    window.removeEventListener('touchstart', this.handleTouchStart)
    window.removeEventListener('touchmove', this.handleTouchMove)
    window.removeEventListener('touchend', this.handleTouchEnd)
    window.removeEventListener('touchcancel', this.handleTouchEnd)
  }

  getState(): InputState {
    if (!this.enabled) {
      return { ...DEFAULT_STATE }
    }
    return { ...this.state }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.reset()
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const action = KEY_MAP[event.code]
    if (!action) {
      return
    }
    this.pressedKeys.add(event.code)
    this.state[action] = true
    if (action === 'bark') {
      event.preventDefault()
    }
  }

  private handleKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_MAP[event.code]
    if (!action) {
      return
    }
    this.pressedKeys.delete(event.code)
    this.state[action] = false
  }

  private reset = (): void => {
    this.pressedKeys.clear()
    Object.assign(this.state, DEFAULT_STATE)
    this.touch.active = false
  }

  private handleTouchStart = (event: TouchEvent): void => {
    const touch = event.touches[0]
    if (!touch) {
      return
    }
    this.touch.active = true
    this.touch.startX = touch.clientX
    this.touch.startY = touch.clientY
    this.applyTouchDirection(0, 0)
    event.preventDefault()
  }

  private handleTouchMove = (event: TouchEvent): void => {
    if (!this.touch.active) {
      return
    }
    const touch = event.touches[0]
    if (!touch) {
      return
    }
    const dx = touch.clientX - this.touch.startX
    const dy = touch.clientY - this.touch.startY
    this.applyTouchDirection(dx, dy)
    event.preventDefault()
  }

  private handleTouchEnd = (): void => {
    this.touch.active = false
    this.applyTouchDirection(0, 0)
  }

  private applyTouchDirection(dx: number, dy: number): void {
    const threshold = 15
    this.state.left = dx < -threshold
    this.state.right = dx > threshold
    this.state.forward = dy < -threshold
    this.state.backward = dy > threshold
  }
}
