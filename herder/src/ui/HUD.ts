export class HUD {
  private readonly root: HTMLDivElement
  private readonly titleEl: HTMLDivElement
  private readonly timerEl: HTMLDivElement
  private readonly sheepEl: HTMLDivElement
  private readonly messageEl: HTMLDivElement
  private lastSheepCount = 0
  private sheepTimeout?: number

  constructor() {
    HUD.injectStyles()
    this.root = document.createElement('div')
    this.root.style.position = 'fixed'
    this.root.style.top = '0'
    this.root.style.left = '0'
    this.root.style.right = '0'
    this.root.style.padding = '16px'
    this.root.style.display = 'grid'
    this.root.style.gridTemplateColumns = '1fr auto 1fr'
    this.root.style.alignItems = 'center'
    this.root.style.justifyContent = 'space-between'
    this.root.style.fontFamily = 'sans-serif'
    this.root.style.color = '#1b2315'
    this.root.style.fontSize = '18px'
    this.root.style.pointerEvents = 'none'
    this.root.style.textShadow = '0 1px 3px rgba(255,255,255,0.6)'

    this.titleEl = document.createElement('div')
    this.titleEl.textContent = 'Yuletide Herding'
    this.titleEl.style.fontFamily = '"Press Start 2P", monospace'
    this.titleEl.style.fontSize = '18px'
    this.titleEl.style.letterSpacing = '0.25px'
    this.titleEl.style.textTransform = 'uppercase'
    this.titleEl.style.textAlign = 'center'
    this.titleEl.style.justifySelf = 'center'

    this.timerEl = document.createElement('div')
    this.timerEl.style.fontWeight = '700'
    this.sheepEl = document.createElement('div')
    this.sheepEl.style.justifySelf = 'end'
    this.sheepEl.className = 'hud-sheep-counter'

    this.messageEl = document.createElement('div')
    this.messageEl.style.position = 'fixed'
    this.messageEl.style.top = '50%'
    this.messageEl.style.left = '50%'
    this.messageEl.style.transform = 'translate(-50%, -50%)'
    this.messageEl.style.background = 'rgba(255, 255, 255, 0.9)'
    this.messageEl.style.padding = '24px 32px'
    this.messageEl.style.borderRadius = '12px'
    this.messageEl.style.fontSize = '28px'
    this.messageEl.style.fontWeight = 'bold'
    this.messageEl.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)'
    this.messageEl.style.display = 'none'

    this.root.appendChild(this.timerEl)
    this.root.appendChild(this.titleEl)
    this.root.appendChild(this.sheepEl)
    document.body.appendChild(this.root)
    document.body.appendChild(this.messageEl)
  }

  updateTimer(seconds: number): void {
    const remaining = Math.max(0, Math.ceil(seconds))
    this.timerEl.textContent = `Time: ${remaining.toString()}s`
    this.timerEl.style.color = remaining <= 15 ? '#b02a37' : '#1b2315'
  }

  updateSheepCount(inPen: number, total: number, delta = 0): void {
    this.sheepEl.textContent = `Sheep: ${inPen}/${total}`
    if (delta === 0) {
      return
    }
    const className = delta > 0 ? 'hud-counter-positive' : 'hud-counter-negative'
    this.applyCounterPulse(className)
    this.lastSheepCount = inPen
  }

  showMessage(text: string): void {
    this.messageEl.textContent = text
    this.messageEl.style.display = 'block'
  }

  hideMessage(): void {
    this.messageEl.style.display = 'none'
  }

  resetSheepCounter(total: number): void {
    window.clearTimeout(this.sheepTimeout)
    this.sheepEl.classList.remove('hud-counter-positive', 'hud-counter-negative')
    this.updateSheepCount(0, total)
  }

  private applyCounterPulse(effect: string): void {
    this.sheepEl.classList.remove('hud-counter-positive', 'hud-counter-negative')
    // Force reflow so animation can replay even if the same class is applied consecutively.
    void this.sheepEl.offsetWidth
    this.sheepEl.classList.add(effect)
    window.clearTimeout(this.sheepTimeout)
    this.sheepTimeout = window.setTimeout(() => {
      this.sheepEl.classList.remove(effect)
    }, 350)
  }

  private static stylesInjected = false

  private static injectStyles(): void {
    if (HUD.stylesInjected) {
      return
    }
    const style = document.createElement('style')
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
      .hud-sheep-counter {
        transition: transform 0.3s ease, color 0.3s ease;
        font-weight: 600;
      }
      .hud-sheep-counter.hud-counter-positive {
        transform: scale(1.2);
        color: #2f8d3a;
      }
      .hud-sheep-counter.hud-counter-negative {
        transform: scale(0.9);
        color: #b02a37;
      }
    `
    document.head.appendChild(style)
    HUD.stylesInjected = true
  }
}
