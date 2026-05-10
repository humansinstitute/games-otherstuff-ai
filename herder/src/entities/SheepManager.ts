import * as THREE from 'three'
import type { Scene } from 'three'
import type { SheepSettings } from '../config'
import type { MovementBounds } from '../types'
import { Sheep } from './Sheep'

interface SheepManagerConfig {
  scene: Scene
  bounds: MovementBounds
  settings: SheepSettings
}

type SheepMoveCallback = (sheep: Sheep, previous: THREE.Vector3, current: THREE.Vector3) => void

export class SheepManager {
  private readonly sheep: Sheep[]

  constructor(config: SheepManagerConfig) {
    const { spawnPoints, boundsPadding, ...behavior } = config.settings
    this.sheep = spawnPoints.map((spawnPoint) =>
      new Sheep({
        ...behavior,
        bounds: config.bounds,
        spawnPoint,
        boundsPadding
      })
    )

    for (const sheep of this.sheep) {
      config.scene.add(sheep.mesh)
    }
  }

  update(deltaTime: number, dogPosition: THREE.Vector3, onMove?: SheepMoveCallback): void {
    for (const sheep of this.sheep) {
      const prev = sheep.position.clone()
      sheep.update(deltaTime, dogPosition)
      onMove?.(sheep, prev, sheep.position)
    }
  }

  get totalSheep(): number {
    return this.sheep.length
  }

  getAll(): readonly Sheep[] {
    return this.sheep
  }

  resetAll(): void {
    for (const sheep of this.sheep) {
      sheep.resetToSpawn()
    }
  }

  setVisible(visible: boolean): void {
    for (const sheep of this.sheep) {
      sheep.mesh.visible = visible
    }
  }
}
