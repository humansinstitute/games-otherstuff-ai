const DEFAULT_TEXT = 'WASD / Arrow keys to move • Herd all sheep into the pen before time runs out'
const AUTO_HIDE_MS = 7000

/** Lightweight control hint that fades away automatically or on demand. */
export class HelpOverlay {
  private readonly root: HTMLDivElement
  private hideTimeout?: number
  private visible = false

  constructor(private readonly text: string = DEFAULT_TEXT) {
    HelpOverlay.injectStyles()
    this.root = document.createElement('div')
    this.root.className = 'help-overlay'
    this.root.textContent = text
    document.body.appendChild(this.root)
    this.show()
  }

  /** Shows the hint and optionally auto-hides after AUTO_HIDE_MS. */
  show(autoHide = true): void {
    window.clearTimeout(this.hideTimeout)
    this.visible = true
    this.root.style.opacity = '1'
    this.root.style.pointerEvents = 'none'
    this.root.style.display = 'block'
    if (autoHide) {
      this.hideTimeout = window.setTimeout(() => this.hide(), AUTO_HIDE_MS)
    }
  }

  hide(): void {
    if (!this.visible) {
      return
    }
    this.visible = false
    window.clearTimeout(this.hideTimeout)
    this.root.style.opacity = '0'
    this.root.style.pointerEvents = 'none'
  }

  /** Useful when restarting the level so the hint fades again. */
  reset(): void {
    this.hide()
    this.show()
  }

  private static stylesInjected = false

  private static injectStyles(): void {
    if (HelpOverlay.stylesInjected) {
      return
    }
    const style = document.createElement('style')
    style.textContent = `
      .help-overlay {
        position: fixed;
        bottom: 24px;
        left: 24px;
        max-width: 360px;
        background: rgba(0, 0, 0, 0.55);
        color: #fff;
        padding: 10px 18px;
        border-radius: 12px;
        font-family: sans-serif;
        font-size: 14px;
        line-height: 1.4;
        box-shadow: 0 10px 18px rgba(0,0,0,0.25);
        transition: opacity 0.3s ease;
        z-index: 950;
        pointer-events: none;
      }
    `
    document.head.appendChild(style)
    HelpOverlay.stylesInjected = true
  }
}
