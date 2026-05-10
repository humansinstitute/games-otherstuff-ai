import * as THREE from 'three'

const TOP_COLOR = 0x5eb057
const EDGE_COLOR = 0x3c5b32
const SHADOW_COLOR = 0x2f3b29

/**
 * Builds a floating island-like terrain with a grassy grid top and darker sides.
 * `thickness` controls how far the island extends downward.
 */
export function createTerrain(width: number, depth: number, thickness = 2): THREE.Group {
  const group = new THREE.Group()

  const baseGeometry = new THREE.BoxGeometry(width, thickness, depth)
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: EDGE_COLOR,
    roughness: 0.85
  })
  const base = new THREE.Mesh(baseGeometry, baseMaterial)
  base.position.y = -thickness / 2 - 0.15
  base.castShadow = true
  base.receiveShadow = true
  group.add(base)

  const skirtGeometry = new THREE.BoxGeometry(width * 0.92, thickness * 0.85, depth * 0.92)
  const skirtMaterial = new THREE.MeshStandardMaterial({
    color: SHADOW_COLOR,
    roughness: 0.9
  })
  const skirt = new THREE.Mesh(skirtGeometry, skirtMaterial)
  skirt.position.y = -thickness - 0.4
  skirt.castShadow = true
  group.add(skirt)

  const topMaterial = new THREE.MeshStandardMaterial({ color: TOP_COLOR, roughness: 0.9 })
  const top = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), topMaterial)
  top.rotation.x = -Math.PI / 2
  top.position.y = 0.01
  top.receiveShadow = true
  group.add(top)

  const gridSize = Math.max(width, depth)
  const grid = new THREE.GridHelper(gridSize, gridSize, 0xffffff, 0xffffff)
  grid.scale.set(width / gridSize, 1, depth / gridSize)
  const gridMaterial = grid.material as THREE.LineBasicMaterial
  gridMaterial.opacity = 0.2
  gridMaterial.transparent = true
  grid.position.y = 0.02
  group.add(grid)

  return group
}
