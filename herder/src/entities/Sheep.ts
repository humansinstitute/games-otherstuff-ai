import * as THREE from 'three'
import type { SheepSettings } from '../config'
import type { MovementBounds, SpawnPoint } from '../types'

export enum SheepState {
  Idle = 'Idle',
  Wander = 'Wander',
  Flee = 'Flee'
}

export interface SheepConfig extends Omit<SheepSettings, 'spawnPoints' | 'boundsPadding'> {
  bounds: MovementBounds
  spawnPoint: SpawnPoint
  boundsPadding: number
}

const SHEEP_HEIGHT = 0.45
const BODY_COLOR = 0xf4f1e5
const FLUFF_COLOR = 0xfaf7ef
const HEAD_COLOR = 0x4f4a43
const LEG_COLOR = 0x6a6862
const HOOF_COLOR = 0x3b362f
const TAIL_COLOR = 0xfaf7ef
const IDLE_BOB_AMPLITUDE = 0.035
const IDLE_BOB_SPEED = 1.8
const HEAD_TILT_AMPLITUDE = 0.08

export class Sheep {
  public readonly mesh: THREE.Group
  private state: SheepState = SheepState.Idle
  private stateTimer = 0
  private readonly velocity = new THREE.Vector3()
  private readonly desiredVelocity = new THREE.Vector3()
  private readonly wanderDirection = new THREE.Vector3(1, 0, 0)
  private elapsed = 0
  private head?: THREE.Mesh

  constructor(private readonly config: SheepConfig) {
    this.mesh = this.buildMesh()
    this.mesh.position.set(config.spawnPoint.x, SHEEP_HEIGHT / 2, config.spawnPoint.z)
    this.applyState(SheepState.Idle)
  }

  resetToSpawn(): void {
    this.mesh.position.set(this.config.spawnPoint.x, SHEEP_HEIGHT / 2, this.config.spawnPoint.z)
    this.velocity.set(0, 0, 0)
    this.desiredVelocity.set(0, 0, 0)
    this.applyState(SheepState.Idle)
  }

  update(deltaTime: number, dogPosition: THREE.Vector3): void {
    this.elapsed += deltaTime
    const flatDog = new THREE.Vector3(dogPosition.x, 0, dogPosition.z)
    const flatPos = new THREE.Vector3(this.mesh.position.x, 0, this.mesh.position.z)
    const distanceToDog = flatPos.distanceTo(flatDog)

    if (distanceToDog <= this.config.fearRadius) {
      this.setState(SheepState.Flee)
    } else if (this.state === SheepState.Flee && distanceToDog > this.config.fearRadius * 1.3) {
      this.setState(SheepState.Wander)
    }

    if (this.state !== SheepState.Flee) {
      this.stateTimer -= deltaTime
      if (this.stateTimer <= 0) {
        this.setState(this.state === SheepState.Idle ? SheepState.Wander : SheepState.Idle)
      }
    }

    this.computeDesiredVelocity(flatDog)
    this.velocity.lerp(this.desiredVelocity, Math.min(1, deltaTime * 3))
    this.mesh.position.addScaledVector(this.velocity, deltaTime)
    const bob = Math.sin(this.elapsed * IDLE_BOB_SPEED) * IDLE_BOB_AMPLITUDE
    this.mesh.position.y = SHEEP_HEIGHT / 2 + bob
    this.enforceBounds()

    if (this.velocity.lengthSq() > 0.0001) {
      this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z)
    }

    if (this.head) {
      this.head.rotation.z = Math.sin(this.elapsed * (IDLE_BOB_SPEED + 0.5)) * HEAD_TILT_AMPLITUDE
    }
  }

  get position(): THREE.Vector3 {
    return this.mesh.position
  }

  private computeDesiredVelocity(flatDog: THREE.Vector3): void {
    switch (this.state) {
      case SheepState.Idle:
        this.desiredVelocity.set(0, 0, 0)
        break
      case SheepState.Wander:
        this.desiredVelocity.copy(this.wanderDirection).multiplyScalar(this.config.wanderSpeed)
        break
      case SheepState.Flee: {
        const fleeDir = this.mesh.position.clone().setY(0).sub(flatDog)
        if (fleeDir.lengthSq() === 0) {
          fleeDir.set(Math.random() - 0.5, 0, Math.random() - 0.5)
        }
        fleeDir.normalize()
        this.desiredVelocity.copy(fleeDir).multiplyScalar(this.config.fleeSpeed)
        break
      }
    }
  }

  bounceFromFence(normal: THREE.Vector3): void {
    const incident = this.velocity.lengthSq() > 0 ? this.velocity.clone() : this.wanderDirection.clone()
    if (incident.lengthSq() === 0) {
      incident.set(Math.random() - 0.5, 0, Math.random() - 0.5)
    }
    incident.normalize()
    const reflected = incident.reflect(normal).normalize()
    this.wanderDirection.copy(reflected)
    this.state = SheepState.Wander
    this.stateTimer = randomInRange(this.config.wanderDuration)
    this.desiredVelocity.copy(reflected).multiplyScalar(this.config.wanderSpeed)
    this.velocity.copy(reflected).multiplyScalar(this.config.wanderSpeed * 0.5)
  }

  private setState(next: SheepState): void {
    if (this.state === next) {
      return
    }
    this.applyState(next)
  }

  private applyState(next: SheepState): void {
    this.state = next
    switch (next) {
      case SheepState.Idle:
        this.stateTimer = randomInRange(this.config.idleDuration)
        this.desiredVelocity.set(0, 0, 0)
        break
      case SheepState.Wander: {
        this.stateTimer = randomInRange(this.config.wanderDuration)
        const angle = Math.random() * Math.PI * 2
        this.wanderDirection.set(Math.cos(angle), 0, Math.sin(angle))
        break
      }
      case SheepState.Flee:
        this.stateTimer = 0
        break
    }
  }

  private enforceBounds(): void {
    const padding = this.config.bounds.padding ?? this.config.boundsPadding
    const halfWidth = this.config.bounds.width / 2 - padding
    const halfHeight = this.config.bounds.height / 2 - padding
    this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, -halfWidth, halfWidth)
    this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z, -halfHeight, halfHeight)
  }

  private buildMesh(): THREE.Group {
    const group = new THREE.Group()

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.9 })
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 1.2), bodyMaterial)
    body.position.y = 0.22
    body.castShadow = true

    const fluff = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.27, 1.35),
      new THREE.MeshStandardMaterial({ color: FLUFF_COLOR })
    )
    fluff.position.y = 0.5
    fluff.castShadow = true

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.32, 0.46),
      new THREE.MeshStandardMaterial({ color: HEAD_COLOR })
    )
    head.position.set(0, 0.48, 0.6)
    head.rotation.x = -0.08
    this.head = head

    const muzzle = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.18, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xdcd2c1 })
    )
    muzzle.position.set(0, 0.42, 0.8)

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.2), new THREE.MeshStandardMaterial({ color: TAIL_COLOR }))
    tail.position.set(0, 0.4, -0.55)

    const earMaterial = new THREE.MeshStandardMaterial({ color: HEAD_COLOR })
    const earGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.05)
    const leftEar = new THREE.Mesh(earGeometry, earMaterial)
    leftEar.position.set(-0.18, 0.52, 0.54)
    const rightEar = leftEar.clone()
    rightEar.position.x *= -1

    const legGeometry = new THREE.BoxGeometry(0.14, 0.32, 0.14)
    const legMaterial = new THREE.MeshStandardMaterial({ color: LEG_COLOR })
    const hoofMaterial = new THREE.MeshStandardMaterial({ color: HOOF_COLOR })
    const offsets = [
      [-0.25, -0.4],
      [0.25, -0.4],
      [-0.25, 0.45],
      [0.25, 0.45]
    ] as const
    for (const [x, z] of offsets) {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.set(x, 0.175, z)
      leg.castShadow = true
      group.add(leg)
      const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.14), hoofMaterial)
      hoof.position.set(0, -0.2, 0)
      hoof.castShadow = true
      leg.add(hoof)
    }

    head.castShadow = true
    group.add(body, fluff, head, muzzle, tail, leftEar, rightEar)
    group.castShadow = true
    group.receiveShadow = false
    return group
  }
}

function randomInRange([min, max]: [number, number]): number {
  return Math.random() * (max - min) + min
}
