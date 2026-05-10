import type { Group, PerspectiveCamera, Scene } from 'three'
import * as THREE from 'three'
import type { GameSettings } from './config'
import { Dog } from './entities/Dog'
import { Pen } from './entities/Pen'
import { SheepManager } from './entities/SheepManager'
import { InputController } from './input/Input'
import type { MovementBounds } from './types'
import { HUD } from './ui/HUD'
import { HelpOverlay } from './ui/HelpOverlay'
import { EndScreen } from './ui/EndScreen'
import { MusicController } from './audio/MusicController'
import { MusicToggle } from './ui/MusicToggle'

export interface GameConfig {
  scene: Scene
  terrain: Group
  camera: PerspectiveCamera
  settings: GameSettings
  music?: MusicController
}

export interface GameSystem {
  name: string
  update(delta: number): void
}

/**
 * Central coordinator for Shepherd's Path. Future dog/sheep/pen systems should
 * register themselves via `registerSystem` so they tick in the main loop.
 */
export class Game {
  private readonly scene: Scene
  private readonly terrain: Group
  private readonly camera: PerspectiveCamera
  private readonly settings: GameSettings
  private readonly input = new InputController()
  private readonly dog: Dog
  private readonly pen: Pen
  private readonly sheepManager: SheepManager
  private readonly hud: HUD
  private readonly endScreen: EndScreen
  private readonly helpOverlay: HelpOverlay
  private readonly music?: MusicController
  private readonly musicToggle?: MusicToggle
  private readonly cameraOffset = new THREE.Vector3(18, 16, 18)
  private readonly systems: GameSystem[] = []
  // Simple state machine so gameplay only advances during active play.
  private state: 'waiting' | 'playing' | 'won' | 'lost' = 'waiting'
  private remainingTime: number
  private readonly collisionNormal = new THREE.Vector3()
  private elapsed = 0
  private sheepInsideLast = 0
  private readonly dogSpawn = new THREE.Vector3()
  private helpOverlayDismissed = false

  constructor(config: GameConfig) {
    this.scene = config.scene
    this.terrain = config.terrain
    this.camera = config.camera
    this.settings = config.settings
    this.music = config.music

    this.dog = new Dog(this.settings.dog)
    const terrainBounds: MovementBounds = {
      width: this.settings.terrainSize,
      height: this.settings.terrainSize,
      padding: this.settings.dog.boundPadding
    }
    this.dog.setMovementBounds(terrainBounds)
    this.scene.add(this.dog.mesh)
    this.dogSpawn.copy(this.dog.mesh.position)

    this.pen = new Pen(this.settings.pen)
    this.scene.add(this.pen.mesh)

    this.sheepManager = new SheepManager({
      scene: this.scene,
      bounds: {
        width: this.settings.terrainSize,
        height: this.settings.terrainSize,
        padding: this.settings.sheep.boundsPadding
      },
      settings: this.settings.sheep
    })

    this.hud = new HUD()
    this.helpOverlay = new HelpOverlay()
    this.helpOverlay.hide()
    this.endScreen = new EndScreen(() => this.restart())
    this.remainingTime = this.settings.levelTimerSeconds
    this.hud.updateTimer(this.remainingTime)
    this.hud.resetSheepCounter(this.sheepManager.totalSheep)
    this.input.setEnabled(false)
    this.resetLevelState(false)
    this.setEntitiesVisible(false)
    if (this.music) {
      this.musicToggle = new MusicToggle((enabled) => {
        if (enabled) {
          this.music?.start()
        } else {
          this.music?.stop()
        }
      })
      this.musicToggle.setState(true)
    }
  }

  registerSystem(system: GameSystem): void {
    this.systems.push(system)
  }

  /** Called once per frame by the render loop. */
  update(delta: number): void {
    if (this.state !== 'playing') {
      return
    }

    this.elapsed += delta
    this.updateTimer(delta)

    if (this.state === 'playing') {
      const dogPrevious = this.dog.mesh.position.clone()
      const inputState = this.input.getState()
      const movementIntent = inputState.forward || inputState.backward || inputState.left || inputState.right
      if (movementIntent && !this.helpOverlayDismissed) {
        this.helpOverlay.hide()
        this.helpOverlayDismissed = true
      }
      this.dog.update(delta, inputState)
      this.pen.enforceCollision(dogPrevious, this.dog.mesh.position, 0.45)

      this.sheepManager.update(delta, this.dog.mesh.position, (sheep, prev, current) => {
        if (this.pen.enforceCollision(prev, current, 0.35, this.collisionNormal)) {
          sheep.bounceFromFence(this.collisionNormal)
        }
      })
    }

    this.trackPenProgress()
    this.updateCameraFollow()
    for (const system of this.systems) {
      system.update(delta)
    }
  }

  /** Simple hook for querying time-based effects later. */
  get time(): number {
    return this.elapsed
  }

  /** Placeholder to keep linting happy until the scene needs orchestrating. */
  get activeScene(): Scene {
    return this.scene
  }

  /** Reference to the terrain for attaching pens, props, etc. */
  get ground(): Group {
    return this.terrain
  }

  get player(): Dog {
    return this.dog
  }

  private trackPenProgress(): void {
    const sheepInside = this.sheepManager
      .getAll()
      .filter((sheep) => this.pen.isSheepInside(sheep.position)).length
    const delta = sheepInside - this.sheepInsideLast
    this.hud.updateSheepCount(sheepInside, this.sheepManager.totalSheep, delta)
    if (delta > 0) {
      this.pen.flashHighlight()
    }
    this.sheepInsideLast = sheepInside

    if (this.state === 'playing' && sheepInside === this.sheepManager.totalSheep && this.sheepManager.totalSheep > 0) {
      this.handleLevelComplete()
    }
  }

  private updateTimer(delta: number): void {
    this.remainingTime = Math.max(0, this.remainingTime - delta)
    this.hud.updateTimer(this.remainingTime)
    if (this.remainingTime <= 0 && this.state === 'playing') {
      const allInPen = this.sheepInsideLast === this.sheepManager.totalSheep && this.sheepManager.totalSheep > 0
      if (!allInPen) {
        this.handleTimeExpired()
      }
    }
  }

  private handleLevelComplete(): void {
    this.state = 'won'
    this.input.setEnabled(false)
    this.endScreen.show('won', this.remainingTime)
    this.music?.stop()
  }

  private handleTimeExpired(): void {
    this.state = 'lost'
    this.input.setEnabled(false)
    this.endScreen.show('lost', this.remainingTime)
    this.music?.stop()
  }

  start(): void {
    if (this.state === 'playing') {
      return
    }
    this.resetLevelState(true)
    this.setEntitiesVisible(true)
    this.state = 'playing'
    this.input.setEnabled(true)
    this.music?.start()
  }

  private restart(): void {
    this.endScreen.hide()
    this.start()
  }

  private updateCameraFollow(): void {
    const desiredPosition = this.dog.mesh.position.clone().add(this.cameraOffset)
    this.camera.position.lerp(desiredPosition, 0.1)
    this.camera.lookAt(this.dog.mesh.position)
  }

  private resetLevelState(showHelpOverlay: boolean): void {
    this.pen.clearHighlight()
    this.sheepManager.resetAll()
    this.sheepInsideLast = 0
    this.dog.reset(this.dogSpawn)
    this.remainingTime = this.settings.levelTimerSeconds
    this.elapsed = 0
    this.sheepInsideLast = 0
    this.hud.updateTimer(this.remainingTime)
    this.hud.resetSheepCounter(this.sheepManager.totalSheep)
    if (showHelpOverlay) {
      this.helpOverlay.reset()
      this.helpOverlayDismissed = false
    } else {
      this.helpOverlay.hide()
      this.helpOverlayDismissed = true
    }
  }

  private setEntitiesVisible(visible: boolean): void {
    this.dog.mesh.visible = visible
    this.sheepManager.setVisible(visible)
  }
}
