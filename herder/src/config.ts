import type { SpawnPoint } from './types'

export interface DogSettings {
  moveSpeed: number
  acceleration: number
  boundPadding: number
}

export interface SheepSettings {
  fearRadius: number
  wanderSpeed: number
  fleeSpeed: number
  wanderDuration: [number, number]
  idleDuration: [number, number]
  spawnPoints: SpawnPoint[]
  boundsPadding: number
}

export interface PenSettings {
  width: number
  height: number
  position: SpawnPoint
}

export interface GameSettings {
  terrainSize: number
  terrainHeight: number
  dog: DogSettings
  sheep: SheepSettings
  pen: PenSettings
  levelTimerSeconds: number
}

export const GAME_CONFIG: GameSettings = {
  terrainSize: 40,
  terrainHeight: 1.5,
  levelTimerSeconds: 60,
  dog: {
    moveSpeed: 6,
    acceleration: 18,
    boundPadding: 0.75
  },
  sheep: {
    fearRadius: 6,
    wanderSpeed: 1.1,
    fleeSpeed: 3.8,
    wanderDuration: [2.5, 4.5],
    idleDuration: [1.2, 2.6],
    boundsPadding: 1.2,
    spawnPoints: [
      { x: -8, z: 6 },
      { x: -3, z: 5 },
      { x: 2, z: 6 },
      { x: 7, z: 4 },
      { x: -6, z: 1 },
      { x: -1, z: 2 },
      { x: 4, z: 3 },
      { x: -9, z: -1 },
      { x: -2, z: -2 },
      { x: 2, z: -1 }
    ]
  },
  pen: {
    width: 12,
    height: 9,
    position: { x: 12, z: -6 }
  }
}
