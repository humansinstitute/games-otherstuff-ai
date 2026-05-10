import * as THREE from 'three'
import type { PenSettings } from '../config'
import { DEFAULT_GATE_WIDTH, createFencePen } from './FencePen'

export class Pen {
  public readonly mesh: THREE.Group
  private readonly halfWidth: number
  private readonly halfHeight: number
  private readonly gateWidth: number
  private readonly colliders: Collider[]
  private readonly position = new THREE.Vector3()
  private readonly fenceMaterials: THREE.MeshStandardMaterial[] = []
  private readonly baseColors = new Map<THREE.MeshStandardMaterial, THREE.Color>()
  private highlightTimeout?: number

  constructor(private readonly settings: PenSettings) {
    this.gateWidth = Math.min(settings.width - 0.5, DEFAULT_GATE_WIDTH)

    this.mesh = createFencePen({
      x: settings.position.x,
      z: settings.position.z,
      width: settings.width,
      depth: settings.height,
      gateWidth: this.gateWidth
    })
    this.halfWidth = settings.width / 2
    this.halfHeight = settings.height / 2
    this.colliders = this.createColliders()
    this.captureFenceMaterials()

    this.position.set(settings.position.x, 0, settings.position.z)
  }

  flashHighlight(): void {
    const highlightColor = new THREE.Color(0xffe9b0)
    const mixAmount = 0.75
    for (const mat of this.fenceMaterials) {
      const base = this.baseColors.get(mat)
      if (base) {
        mat.color.copy(base).lerp(highlightColor, mixAmount)
        if ('emissive' in mat && mat.emissive instanceof THREE.Color) {
          mat.emissive.setHex(0x442200)
        }
      }
    }
    window.clearTimeout(this.highlightTimeout)
    this.highlightTimeout = window.setTimeout(() => {
      this.clearHighlight()
    }, 300)
  }

  clearHighlight(): void {
    window.clearTimeout(this.highlightTimeout)
    for (const mat of this.fenceMaterials) {
      const base = this.baseColors.get(mat)
      if (base) {
        mat.color.copy(base)
        if ('emissive' in mat && mat.emissive instanceof THREE.Color) {
          mat.emissive.setHex(0)
        }
      }
    }
  }

  isSheepInside(sheepPosition: THREE.Vector3): boolean {
    const localX = sheepPosition.x - this.position.x
    const localZ = sheepPosition.z - this.position.z
    return Math.abs(localX) <= this.halfWidth && Math.abs(localZ) <= this.halfHeight
  }

  /** Returns true if a collision occurred (currentWorld reset to previousWorld). */
  enforceCollision(
    previousWorld: THREE.Vector3,
    currentWorld: THREE.Vector3,
    radius = 0.35,
    collisionNormal?: THREE.Vector3
  ): boolean {
    const local = currentWorld.clone().sub(this.position)
    for (const collider of this.colliders) {
      if (resolveCircleCollision(local, radius, collider)) {
        currentWorld.copy(local.add(this.position))
        if (collisionNormal) {
          collisionNormal.copy(tempNormal)
        }
        return true
      }
    }
    return false
  }

  private createColliders(): Collider[] {
    const thickness = 0.35
    const gateHalf = this.gateWidth / 2
    const colliders: Collider[] = []

    // Left/right walls
    colliders.push({
      minX: -this.halfWidth - thickness,
      maxX: -this.halfWidth + thickness,
      minZ: -this.halfHeight,
      maxZ: this.halfHeight,
      normal: new THREE.Vector3(1, 0, 0)
    })
    colliders.push({
      minX: this.halfWidth - thickness,
      maxX: this.halfWidth + thickness,
      minZ: -this.halfHeight,
      maxZ: this.halfHeight,
      normal: new THREE.Vector3(-1, 0, 0)
    })

    const frontZ = this.halfHeight
    const backZ = -this.halfHeight

    const addHorizontalSegment = (startX: number, endX: number, z: number, normal: THREE.Vector3) => {
      if (Math.abs(endX - startX) <= 0) {
        return
      }
      colliders.push({
        minX: Math.min(startX, endX),
        maxX: Math.max(startX, endX),
        minZ: z - thickness,
        maxZ: z + thickness,
        normal
      })
    }

    // Front wall segments left/right of gate
    addHorizontalSegment(-this.halfWidth, -gateHalf, frontZ, new THREE.Vector3(0, 0, -1))
    addHorizontalSegment(gateHalf, this.halfWidth, frontZ, new THREE.Vector3(0, 0, -1))

    // Back wall segments left/right of gate
    addHorizontalSegment(-this.halfWidth, -gateHalf, backZ, new THREE.Vector3(0, 0, 1))
    addHorizontalSegment(gateHalf, this.halfWidth, backZ, new THREE.Vector3(0, 0, 1))

    return colliders
  }

  private captureFenceMaterials(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const material = child.material
        if (!this.baseColors.has(material)) {
          this.fenceMaterials.push(material)
          this.baseColors.set(material, material.color.clone())
        }
      }
    })
  }
}

interface Collider {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  normal: THREE.Vector3
}

const tempNormal = new THREE.Vector3()

function resolveCircleCollision(point: THREE.Vector3, radius: number, collider: Collider): boolean {
  const clampedX = THREE.MathUtils.clamp(point.x, collider.minX, collider.maxX)
  const clampedZ = THREE.MathUtils.clamp(point.z, collider.minZ, collider.maxZ)
  const dx = point.x - clampedX
  const dz = point.z - clampedZ
  const distSq = dx * dx + dz * dz
  if (distSq > radius * radius) {
    return false
  }

  if (distSq > 0.000001) {
    tempNormal.set(dx, 0, dz).normalize()
  } else {
    tempNormal.copy(collider.normal)
  }

  const dist = Math.sqrt(Math.max(distSq, 0.000001))
  const penetration = radius - dist + 0.02
  point.addScaledVector(tempNormal, penetration)
  return true
}
