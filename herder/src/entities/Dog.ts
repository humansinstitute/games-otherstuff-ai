import * as THREE from 'three'
import type { InputState } from '../input/Input'
import type { MovementBounds } from '../types'

export interface DogConfig {
  moveSpeed: number
  acceleration: number
}

const DEFAULT_HEIGHT = 0.6
const IDLE_BOB_AMPLITUDE = 0.05
const IDLE_BOB_SPEED = 2.2
const IDLE_ROTATION_AMPLITUDE = 0.03

/** Simple voxel-inspired placeholder the player will control. */
export class Dog {
  public readonly mesh: THREE.Group
  public moveSpeed: number
  public acceleration: number

  private bounds?: MovementBounds
  private readonly velocity = new THREE.Vector3()
  private readonly workVector = new THREE.Vector3()
  private time = 0
  private heading = 0

  constructor(config: DogConfig) {
    this.moveSpeed = config.moveSpeed
    this.acceleration = config.acceleration

    this.mesh = this.buildMesh()
    this.mesh.castShadow = true
    this.mesh.position.y = DEFAULT_HEIGHT / 2
  }

  reset(position: THREE.Vector3): void {
    this.velocity.set(0, 0, 0)
    this.workVector.set(0, 0, 0)
    this.mesh.position.copy(position)
    this.mesh.position.y = DEFAULT_HEIGHT / 2
    this.mesh.rotation.set(0, 0, 0)
  }

  update(deltaTime: number, input: InputState): void {
    this.time += deltaTime
    const x = (input.right ? 1 : 0) - (input.left ? 1 : 0)
    const z = (input.backward ? 1 : 0) - (input.forward ? 1 : 0)
    this.workVector.set(x, 0, z)

    if (this.workVector.lengthSq() > 0) {
      this.workVector.normalize()
    }

    const targetVelocity = this.workVector.multiplyScalar(this.moveSpeed)
    const lerpFactor = Math.min(1, this.acceleration * deltaTime)
    this.velocity.lerp(targetVelocity, lerpFactor)

    this.mesh.position.addScaledVector(this.velocity, deltaTime)
    this.applyMovementBounds()
    const speed = this.velocity.length()
    const bobIntensity = speed < 0.1 ? 1 : 0.2
    const bob = Math.sin(this.time * IDLE_BOB_SPEED) * IDLE_BOB_AMPLITUDE * bobIntensity
    this.mesh.position.y = DEFAULT_HEIGHT / 2 + bob

    if (this.velocity.lengthSq() > 0.0001) {
      this.heading = Math.atan2(this.velocity.x, this.velocity.z)
    }

    if (speed < 0.1) {
      const sway = Math.sin(this.time * IDLE_BOB_SPEED * 0.6) * IDLE_ROTATION_AMPLITUDE
      this.mesh.rotation.y = this.heading + sway
    } else {
      this.mesh.rotation.y = this.heading
    }
  }

  setMovementBounds(bounds: MovementBounds): void {
    this.bounds = bounds
  }

  private buildMesh(): THREE.Group {
    const group = new THREE.Group()

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.55, 1.35),
      new THREE.MeshStandardMaterial({ color: 0x936348, roughness: 0.8 })
    )
    body.position.y = 0.35
    body.castShadow = true

    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x2b3144 })
    )
    collar.position.set(0, 0.5, 0.3)
    collar.castShadow = true

    const neckYOffset = 0.65
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.4, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xbd8f6c })
    )
    head.position.set(0, neckYOffset, 0.65)
    head.castShadow = true

    const muzzle = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.22, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xd5a37f })
    )
    muzzle.position.set(0, neckYOffset - 0.1, 0.9)
    muzzle.castShadow = true

    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x7a4e32 })
    )
    tail.position.set(0, 0.65, -0.85)
    tail.castShadow = true
    tail.rotation.x = Math.PI / 5

    const earMaterial = new THREE.MeshStandardMaterial({ color: 0x4b2f1f })
    const earGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.08)
    const leftEar = new THREE.Mesh(earGeometry, earMaterial)
    leftEar.position.set(-0.2, 0.8, 0.52)
    leftEar.castShadow = true
    const rightEar = leftEar.clone()
    rightEar.position.x *= -1

    const legGeometry = new THREE.BoxGeometry(0.18, 0.45, 0.18)
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x5d3a27 })
    const pawMaterial = new THREE.MeshStandardMaterial({ color: 0x3a241a })
    const legOffsets: Array<[number, number]> = [
      [-0.25, 0.35],
      [0.25, 0.35],
      [-0.25, -0.4],
      [0.25, -0.4]
    ]
    for (const [x, z] of legOffsets) {
      const leg = new THREE.Mesh(legGeometry, legMaterial)
      leg.position.set(x, 0.2, z)
      leg.castShadow = true
      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.18), pawMaterial)
      paw.position.set(0, -0.25, 0)
      paw.castShadow = true
      leg.add(paw)
      group.add(leg)
    }

    group.add(body, collar, head, muzzle, tail, leftEar, rightEar)
    group.castShadow = true

    return group
  }

  private applyMovementBounds(): void {
    if (!this.bounds) {
      return
    }
    const padding = this.bounds.padding ?? 0
    const halfWidth = this.bounds.width / 2 - padding
    const halfHeight = this.bounds.height / 2 - padding
    this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, -halfWidth, halfWidth)
    this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z, -halfHeight, halfHeight)
  }
}
