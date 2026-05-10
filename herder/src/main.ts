import * as THREE from 'three'
import { GAME_CONFIG } from './config'
import { Game } from './Game'
import { setupLighting } from './lighting'
import { createTerrain } from './Terrain'
import { StartScreen } from './ui/StartScreen'
import { MusicController } from './audio/MusicController'

// Dev workflow: run `npm install` once, then `npm run dev` to spin up Vite's server and hot module reload loop.

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xb7dba5)
scene.fog = new THREE.Fog(scene.background.getHex(), 30, 90)

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  150
)
camera.position.set(18, 20, 18) // Slightly elevated for an isometric-ish angle
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.style.margin = '0'
document.body.appendChild(renderer.domElement)

const config = GAME_CONFIG
setupLighting({ scene, shadowSize: 2048, terrainSize: config.terrainSize })
const terrain = createTerrain(config.terrainSize, config.terrainSize, config.terrainHeight)
scene.add(terrain)

const music = new MusicController('/audio/background.mp3')

const game = new Game({
  scene,
  terrain,
  camera,
  settings: config,
  music
})
// Future dog, sheep, and pen systems should instantiate their Three.js objects here and call `game.registerSystem(...)`.

const startScreen = new StartScreen(() => {
  game.start()
})
startScreen.show()

const clock = new THREE.Clock()

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('resize', onWindowResize)

function renderLoop(): void {
  const delta = clock.getDelta()
  game.update(delta)
  renderer.render(scene, camera)
  requestAnimationFrame(renderLoop)
}

renderLoop()
