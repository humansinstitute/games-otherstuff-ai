export type EndState = 'won' | 'lost'

type RestartHandler = () => void

const PANEL_STYLE = {
  background: 'rgba(255,255,255,0.95)',
  padding: '32px 40px',
  borderRadius: '24px',
  boxShadow: '0 18px 38px rgba(0,0,0,0.35)',
  fontFamily: 'sans-serif',
  textAlign: 'center' as const,
  minWidth: '280px'
}

export class EndScreen {
  private readonly root: HTMLDivElement
  private readonly titleEl: HTMLHeadingElement
  private readonly messageEl: HTMLParagraphElement
  private readonly button: HTMLButtonElement

  constructor(private readonly restartHandler: RestartHandler) {
    this.root = document.createElement('div')
    Object.assign(this.root.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'none',
      zIndex: '1000'
    })

    const panel = document.createElement('div')
    Object.assign(panel.style, PANEL_STYLE)

    this.titleEl = document.createElement('h2')
    this.titleEl.style.margin = '0 0 8px'

    this.messageEl = document.createElement('p')
    this.messageEl.style.margin = '0 0 16px'

    this.button = document.createElement('button')
    this.button.textContent = 'Restart'
    Object.assign(this.button.style, {
      border: 'none',
      borderRadius: '12px',
      background: '#2f8d3a',
      color: '#fff',
      padding: '10px 24px',
      fontSize: '16px',
      cursor: 'pointer',
      fontWeight: 'bold'
    })
    this.button.addEventListener('click', () => this.restartHandler())

    panel.appendChild(this.titleEl)
    panel.appendChild(this.messageEl)
    panel.appendChild(this.button)
    this.root.appendChild(panel)
    document.body.appendChild(this.root)
  }

  show(state: EndState, timeRemaining: number): void {
    if (state === 'won') {
      this.titleEl.textContent = 'Level Complete!'
      this.messageEl.textContent = `${Math.ceil(timeRemaining)}s left`
    } else {
      this.titleEl.textContent = "Time's up!"
      this.messageEl.textContent = 'Try again to herd every sheep.'
    }
    this.root.style.display = 'block'
  }

  hide(): void {
    this.root.style.display = 'none'
  }
}
