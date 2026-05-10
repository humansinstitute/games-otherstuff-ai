export class MusicToggle {
  private readonly button: HTMLButtonElement
  private isOn = true

  constructor(private readonly onToggle: (enabled: boolean) => void) {
    MusicToggle.injectStyles()
    this.button = document.createElement('button')
    this.button.className = 'music-toggle'
    this.button.textContent = '♪ Music On'
    this.button.addEventListener('click', () => this.handleClick())
    document.body.appendChild(this.button)
  }

  setState(enabled: boolean): void {
    this.isOn = enabled
    this.button.textContent = enabled ? '♪ Music On' : '♪ Music Off'
  }

  private handleClick(): void {
    this.setState(!this.isOn)
    this.onToggle(this.isOn)
  }

  private static stylesInjected = false

  private static injectStyles(): void {
    if (MusicToggle.stylesInjected) {
      return
    }
    const style = document.createElement('style')
    style.textContent = `
      .music-toggle {
        position: fixed;
        bottom: 24px;
        right: 24px;
        border: none;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.85);
        color: #1b2315;
        padding: 8px 16px;
        font-family: sans-serif;
        cursor: pointer;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 980;
      }
    `
    document.head.appendChild(style)
    MusicToggle.stylesInjected = true
  }
}
