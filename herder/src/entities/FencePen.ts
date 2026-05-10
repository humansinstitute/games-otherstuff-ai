import * as THREE from 'three'

export interface FencePenConfig {
  x: number
  z: number
  width: number
  depth: number
  gateWidth?: number
}

const POST_SIZE = 0.35
const POST_HEIGHT = 1.4
const RAIL_THICKNESS = 0.15
const RAIL_DEPTH = 0.12
const RAIL_HEIGHTS = [0.45, 0.95]
export const DEFAULT_GATE_WIDTH = 3.2
const MATERIAL = new THREE.MeshStandardMaterial({ color: 0x8a5c2c, roughness: 0.75 })

/** Returns a voxel-styled fence centered at the provided position. */
export function createFencePen(config: FencePenConfig): THREE.Group {
  const group = new THREE.Group()
  group.position.set(config.x, 0, config.z)
  const gateWidth = Math.max(1, Math.min(config.gateWidth ?? DEFAULT_GATE_WIDTH, config.width - POST_SIZE))

  addPosts(group, config)
  addRails(group, { ...config, gateWidth })
  return group
}

function addPosts(group: THREE.Group, config: FencePenConfig): void {
  const postGeometry = new THREE.BoxGeometry(POST_SIZE, POST_HEIGHT, POST_SIZE)
  const halfWidth = config.width / 2
  const halfDepth = config.depth / 2

  const positions: THREE.Vector3[] = [
    new THREE.Vector3(-halfWidth, POST_HEIGHT / 2, -halfDepth),
    new THREE.Vector3(halfWidth, POST_HEIGHT / 2, -halfDepth),
    new THREE.Vector3(-halfWidth, POST_HEIGHT / 2, halfDepth),
    new THREE.Vector3(halfWidth, POST_HEIGHT / 2, halfDepth)
  ]

  for (const pos of positions) {
    const post = new THREE.Mesh(postGeometry, MATERIAL)
    post.position.copy(pos)
    post.castShadow = true
    group.add(post)
  }
}

function addRails(group: THREE.Group, config: FencePenConfig & { gateWidth: number }): void {
  const innerWidth = config.width - POST_SIZE
  const innerDepth = config.depth - POST_SIZE
  const halfWidth = config.width / 2
  const halfDepth = config.depth / 2
  const gateWidth = config.gateWidth
  const segmentWidth = (innerWidth - gateWidth) / 2

  for (const railHeight of RAIL_HEIGHTS) {
    const railZGeometry = new THREE.BoxGeometry(RAIL_DEPTH, RAIL_THICKNESS, innerDepth)
    const leftRail = new THREE.Mesh(railZGeometry, MATERIAL)
    leftRail.position.set(-halfWidth + POST_SIZE / 2, railHeight, 0)

    const rightRail = leftRail.clone()
    rightRail.position.x = halfWidth - POST_SIZE / 2

    const horizontalSegments: THREE.Mesh[] = []
    if (segmentWidth > 0) {
      const segmentGeometry = new THREE.BoxGeometry(segmentWidth, RAIL_THICKNESS, RAIL_DEPTH)
      const leftSegment = new THREE.Mesh(segmentGeometry, MATERIAL)
      leftSegment.position.set(-(gateWidth / 2 + segmentWidth / 2), railHeight, halfDepth - POST_SIZE / 2)
      const rightSegment = leftSegment.clone()
      rightSegment.position.x *= -1
      const backLeftSegment = leftSegment.clone()
      backLeftSegment.position.z = -halfDepth + POST_SIZE / 2
      const backRightSegment = rightSegment.clone()
      backRightSegment.position.z = -halfDepth + POST_SIZE / 2
      horizontalSegments.push(leftSegment, rightSegment, backLeftSegment, backRightSegment)
    }

    for (const rail of [leftRail, rightRail, ...horizontalSegments]) {
      rail.castShadow = true
      rail.receiveShadow = true
      group.add(rail)
    }

  }
}

// Gates intentionally left open for clarity; optional panels can be added later if needed.
