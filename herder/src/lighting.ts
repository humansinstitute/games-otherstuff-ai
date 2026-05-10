import * as THREE from 'three'

interface LightingOptions {
  scene: THREE.Scene
  shadowSize: number
  terrainSize: number
}

/**
 * Adds a warm sun + ambient fill to the scene and returns the directional light
 * so the caller can adjust it further if needed.
 */
export function setupLighting({ scene, shadowSize, terrainSize }: LightingOptions): THREE.DirectionalLight {
  const ambient = new THREE.AmbientLight(0xf8f1e1, 0.45)
  scene.add(ambient)

  const sun = new THREE.DirectionalLight(0xffce9a, 1.35)
  sun.position.set(35, 60, 25)
  sun.target.position.set(0, 0, 0)
  sun.castShadow = true
  sun.shadow.mapSize.set(shadowSize, shadowSize)
  sun.shadow.camera.near = 5
  sun.shadow.camera.far = 140
  const half = terrainSize / 2 + 8
  sun.shadow.camera.left = -half
  sun.shadow.camera.right = half
  sun.shadow.camera.top = half
  sun.shadow.camera.bottom = -half
  sun.shadow.bias = -0.0006
  scene.add(sun)
  scene.add(sun.target)
  return sun
}
