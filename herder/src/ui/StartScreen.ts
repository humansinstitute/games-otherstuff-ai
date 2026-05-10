const TITLE = 'Yuletide Herding'
const DESCRIPTION = 'Herd all the sheep into the pen before time runs out.'
const CONTROLS = 'WASD or Arrow keys to move.'

export class StartScreen {
  private readonly root: HTMLDivElement
  private readonly button: HTMLButtonElement

  constructor(private readonly onStart: () => void) {
    this.root = document.createElement('div')
    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(16, 20, 12, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1500'
    })

    const panel = document.createElement('div')
    Object.assign(panel.style, {
      background: '#fffef7',
      padding: '36px 48px',
      borderRadius: '24px',
      boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
      textAlign: 'center',
      fontFamily: 'sans-serif',
      maxWidth: '420px'
    })

    const titleEl = document.createElement('h1')
    titleEl.textContent = TITLE
    Object.assign(titleEl.style, {
      margin: '0 0 12px',
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px'
    })

    const descEl = document.createElement('p')
    descEl.textContent = DESCRIPTION
    Object.assign(descEl.style, {
      margin: '0 0 10px',
      fontSize: '16px'
    })

    const controlsEl = document.createElement('p')
    controlsEl.textContent = CONTROLS
    Object.assign(controlsEl.style, {
      margin: '0 0 24px',
      fontWeight: '600'
    })

    this.button = document.createElement('button')
    this.button.textContent = 'Start Game'
    Object.assign(this.button.style, {
      border: 'none',
      borderRadius: '14px',
      background: '#2f8d3a',
      color: '#fff',
      padding: '12px 32px',
      fontSize: '16px',
      cursor: 'pointer',
      fontWeight: 'bold'
    })
    this.button.addEventListener('click', () => {
      this.hide()
      this.onStart()
    })

    panel.append(titleEl, descEl, controlsEl, this.button)
    this.root.appendChild(panel)
    document.body.appendChild(this.root)
    this.hide()
  }

  hide(): void {
    this.root.style.display = 'none'
  }

  show(): void {
    this.root.style.display = 'flex'
  }
}
