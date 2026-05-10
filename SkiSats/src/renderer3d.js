import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { isLeftPressed, isRightPressed, isTouchLeft, isTouchRight } from './input.js';

let renderer;
let scene;
let camera;
let containerElement;
let slopeGroup;
let playerMesh;
let rendererConfig = {
  xScale: 1,
  depthScale: 1,
  viewDistance: 200,
  behindDistance: 10,
  cameraHeight: 70,
  cameraOffsetZ: 120,
  cameraLookForward: 80,
};
const obstacleMeshes = [];
const coinMeshes = [];
const shrubMeshes = [];
let yetiMesh = null;

function createGroundPlane() {
  const geometry = new THREE.PlaneGeometry(2000, 2000, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xf8fbff });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  return ground;
}

function createPlayerMesh() {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();

  // Head
  const headGeometry = new THREE.SphereGeometry(2.5, 16, 16);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffe0bd });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 14;
  bodyGroup.add(head);

  // Helmet/goggles accent
  const helmetGeometry = new THREE.SphereGeometry(2.7, 16, 16);
  const helmetMaterial = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
  const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
  helmet.position.y = 14.5;
  helmet.scale.y = 0.6;
  bodyGroup.add(helmet);

  // Torso (jacket)
  const torsoGeometry = new THREE.BoxGeometry(4, 7, 3);
  const torsoMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
  const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
  torso.position.y = 9;
  bodyGroup.add(torso);

  // Left arm
  const armGeometry = new THREE.CapsuleGeometry(0.8, 6, 4, 8);
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-3, 9, 0);
  leftArm.rotation.z = Math.PI / 6;
  bodyGroup.add(leftArm);

  // Right arm
  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(3, 9, 0);
  rightArm.rotation.z = -Math.PI / 6;
  bodyGroup.add(rightArm);

  // Legs/pants
  const legGeometry = new THREE.CapsuleGeometry(1.2, 6, 4, 8);
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-1.3, 4.5, 0);
  bodyGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(1.3, 4.5, 0);
  bodyGroup.add(rightLeg);

  // Left ski pole
  const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 12, 8);
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const leftPole = new THREE.Mesh(poleGeometry, poleMaterial);
  leftPole.position.set(-4.5, 8, 2);
  leftPole.rotation.x = Math.PI / 8;
  bodyGroup.add(leftPole);

  // Right ski pole
  const rightPole = new THREE.Mesh(poleGeometry, poleMaterial);
  rightPole.position.set(4.5, 8, 2);
  rightPole.rotation.x = Math.PI / 8;
  bodyGroup.add(rightPole);

  group.add(bodyGroup);

  // Left ski
  const skiGeometry = new THREE.BoxGeometry(1.5, 0.4, 10);
  const skiMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444 });
  const leftSki = new THREE.Mesh(skiGeometry, skiMaterial);
  leftSki.position.set(-1.3, 0.8, 0);
  group.add(leftSki);

  // Right ski
  const rightSki = new THREE.Mesh(skiGeometry, skiMaterial);
  rightSki.position.set(1.3, 0.8, 0);
  group.add(rightSki);

  // Store references for animation
  group.userData.bodyGroup = bodyGroup;
  group.userData.leftSki = leftSki;
  group.userData.rightSki = rightSki;
  group.userData.head = head;
  group.userData.helmet = helmet;
  group.userData.torso = torso;
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.leftLeg = leftLeg;
  group.userData.rightLeg = rightLeg;
  group.userData.leftPole = leftPole;
  group.userData.rightPole = rightPole;
  group.userData.isCrashed = false;

  // Store original positions and rotations for reset
  group.userData.originalState = {
    leftArm: { pos: leftArm.position.clone(), rot: leftArm.rotation.clone() },
    rightArm: { pos: rightArm.position.clone(), rot: rightArm.rotation.clone() },
    leftLeg: { pos: leftLeg.position.clone(), rot: leftLeg.rotation.clone() },
    rightLeg: { pos: rightLeg.position.clone(), rot: rightLeg.rotation.clone() },
    leftPole: { pos: leftPole.position.clone(), rot: leftPole.rotation.clone() },
    rightPole: { pos: rightPole.position.clone(), rot: rightPole.rotation.clone() },
    leftSki: { pos: leftSki.position.clone(), rot: leftSki.rotation.clone() },
    rightSki: { pos: rightSki.position.clone(), rot: rightSki.rotation.clone() },
    bodyGroup: { rot: new THREE.Euler(0, 0, 0) }
  };

  group.position.y = 0;
  return group;
}

function triggerPlayerCrash() {
  if (!playerMesh || playerMesh.userData.isCrashed) return;

  playerMesh.userData.isCrashed = true;

  // Randomly tangle the limbs
  const leftArmCrash = {
    rotation: new THREE.Euler(
      (Math.random() - 0.5) * Math.PI,
      (Math.random() - 0.5) * Math.PI,
      Math.random() * Math.PI - Math.PI / 4
    ),
    position: new THREE.Vector3(-3 + Math.random() * 2, 9 + Math.random() * 2, Math.random() * 3)
  };

  const rightArmCrash = {
    rotation: new THREE.Euler(
      (Math.random() - 0.5) * Math.PI,
      (Math.random() - 0.5) * Math.PI,
      -Math.random() * Math.PI + Math.PI / 4
    ),
    position: new THREE.Vector3(3 - Math.random() * 2, 9 + Math.random() * 2, Math.random() * 3)
  };

  const leftLegCrash = {
    rotation: new THREE.Euler(
      (Math.random() - 0.5) * Math.PI / 2,
      (Math.random() - 0.5) * Math.PI / 2,
      Math.random() * Math.PI / 4
    ),
    position: new THREE.Vector3(-1.3 + Math.random() * 1, 4.5, Math.random() * 2)
  };

  const rightLegCrash = {
    rotation: new THREE.Euler(
      (Math.random() - 0.5) * Math.PI / 2,
      (Math.random() - 0.5) * Math.PI / 2,
      -Math.random() * Math.PI / 4
    ),
    position: new THREE.Vector3(1.3 - Math.random() * 1, 4.5, Math.random() * 2)
  };

  // Ski poles flying
  const leftPoleCrash = {
    rotation: new THREE.Euler(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    ),
    position: new THREE.Vector3(-5 + Math.random() * 2, 8 + Math.random() * 4, 2 + Math.random() * 3)
  };

  const rightPoleCrash = {
    rotation: new THREE.Euler(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    ),
    position: new THREE.Vector3(5 - Math.random() * 2, 8 + Math.random() * 4, 2 + Math.random() * 3)
  };

  // Skis in wild positions
  const leftSkiCrash = {
    rotation: new THREE.Euler(
      Math.random() * Math.PI - Math.PI / 2,
      Math.random() * Math.PI,
      Math.random() * Math.PI - Math.PI / 2
    ),
    position: new THREE.Vector3(-2 + Math.random() * 3, 0.8 + Math.random() * 2, Math.random() * 3)
  };

  const rightSkiCrash = {
    rotation: new THREE.Euler(
      Math.random() * Math.PI - Math.PI / 2,
      Math.random() * Math.PI,
      Math.random() * Math.PI - Math.PI / 2
    ),
    position: new THREE.Vector3(2 - Math.random() * 3, 0.8 + Math.random() * 2, Math.random() * 3)
  };

  // Apply crash animations
  playerMesh.userData.leftArm.position.copy(leftArmCrash.position);
  playerMesh.userData.leftArm.rotation.copy(leftArmCrash.rotation);

  playerMesh.userData.rightArm.position.copy(rightArmCrash.position);
  playerMesh.userData.rightArm.rotation.copy(rightArmCrash.rotation);

  playerMesh.userData.leftLeg.position.copy(leftLegCrash.position);
  playerMesh.userData.leftLeg.rotation.copy(leftLegCrash.rotation);

  playerMesh.userData.rightLeg.position.copy(rightLegCrash.position);
  playerMesh.userData.rightLeg.rotation.copy(rightLegCrash.rotation);

  playerMesh.userData.leftPole.position.copy(leftPoleCrash.position);
  playerMesh.userData.leftPole.rotation.copy(leftPoleCrash.rotation);

  playerMesh.userData.rightPole.position.copy(rightPoleCrash.position);
  playerMesh.userData.rightPole.rotation.copy(rightPoleCrash.rotation);

  playerMesh.userData.leftSki.position.copy(leftSkiCrash.position);
  playerMesh.userData.leftSki.rotation.copy(leftSkiCrash.rotation);

  playerMesh.userData.rightSki.position.copy(rightSkiCrash.position);
  playerMesh.userData.rightSki.rotation.copy(rightSkiCrash.rotation);

  // Tilt the whole body
  playerMesh.userData.bodyGroup.rotation.x = (Math.random() - 0.5) * Math.PI / 3;
  playerMesh.userData.bodyGroup.rotation.z = (Math.random() - 0.5) * Math.PI / 2;
}

function resetPlayerCrash() {
  if (!playerMesh || !playerMesh.userData.isCrashed) return;

  playerMesh.userData.isCrashed = false;

  const orig = playerMesh.userData.originalState;

  // Reset all body parts to original state
  playerMesh.userData.leftArm.position.copy(orig.leftArm.pos);
  playerMesh.userData.leftArm.rotation.copy(orig.leftArm.rot);

  playerMesh.userData.rightArm.position.copy(orig.rightArm.pos);
  playerMesh.userData.rightArm.rotation.copy(orig.rightArm.rot);

  playerMesh.userData.leftLeg.position.copy(orig.leftLeg.pos);
  playerMesh.userData.leftLeg.rotation.copy(orig.leftLeg.rot);

  playerMesh.userData.rightLeg.position.copy(orig.rightLeg.pos);
  playerMesh.userData.rightLeg.rotation.copy(orig.rightLeg.rot);

  playerMesh.userData.leftPole.position.copy(orig.leftPole.pos);
  playerMesh.userData.leftPole.rotation.copy(orig.leftPole.rot);

  playerMesh.userData.rightPole.position.copy(orig.rightPole.pos);
  playerMesh.userData.rightPole.rotation.copy(orig.rightPole.rot);

  playerMesh.userData.leftSki.position.copy(orig.leftSki.pos);
  playerMesh.userData.leftSki.rotation.copy(orig.leftSki.rot);

  playerMesh.userData.rightSki.position.copy(orig.rightSki.pos);
  playerMesh.userData.rightSki.rotation.copy(orig.rightSki.rot);

  playerMesh.userData.bodyGroup.rotation.copy(orig.bodyGroup.rot);
}

export function playerCrashAnimation() {
  triggerPlayerCrash();
}

export function resetPlayerAnimation() {
  resetPlayerCrash();
}

function createObstacleMesh(treeType = 'normal') {
  const group = new THREE.Group();

  if (treeType === 'tall') {
    // Tall pine tree - very tall and narrow
    const trunkGeometry = new THREE.CylinderGeometry(2, 2, 24, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x654321, flatShading: true });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 12;
    group.add(trunk);

    // Multiple layers of thin foliage
    for (let i = 0; i < 4; i++) {
      const foliageGeometry = new THREE.ConeGeometry(7 - i * 1.2, 12, 6);
      const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x0d4d2d, flatShading: true });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = 16 + i * 10;
      group.add(foliage);
    }
  } else if (treeType === 'short') {
    // Short bushy tree - short and wide
    const trunkGeometry = new THREE.CylinderGeometry(2, 2, 8, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, flatShading: true });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 4;
    group.add(trunk);

    // Wide, round bushy top
    const foliageGeometry = new THREE.SphereGeometry(10, 8, 8);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2d6e3f, flatShading: true });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 12;
    foliage.scale.y = 0.8;
    group.add(foliage);
  } else {
    // Normal tree (default)
    const trunkGeometry = new THREE.CylinderGeometry(2.66, 2.66, 16, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, flatShading: true });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 8;
    group.add(trunk);

    const foliageGeometry = new THREE.ConeGeometry(13.33, 32, 6);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x1f8a4b, flatShading: true });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 32;
    group.add(foliage);
  }

  group.userData.treeType = treeType;
  group.visible = false;
  return group;
}

function createCoinMesh() {
  const group = new THREE.Group();

  // Main coin body with beveled edge
  const coinGeometry = new THREE.CylinderGeometry(3, 3, 0.6, 32);
  const coinMaterial = new THREE.MeshStandardMaterial({
    color: 0xffc233,
    metalness: 0.8,
    roughness: 0.2
  });
  const coinBody = new THREE.Mesh(coinGeometry, coinMaterial);
  coinBody.rotation.x = Math.PI / 2;
  group.add(coinBody);

  // Coin rim/edge (darker)
  const rimGeometry = new THREE.CylinderGeometry(3.1, 3.1, 0.5, 32);
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4a017,
    metalness: 0.9,
    roughness: 0.4
  });
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1, 1, 1);
  group.add(rim);

  // Create Bitcoin "₿" symbol as flat embossed geometry
  const symbolMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4a017,
    metalness: 0.9,
    roughness: 0.3
  });

  // Front face symbol
  const symbolFront = createBitcoinSymbol(symbolMaterial);
  symbolFront.position.z = 0.35;
  group.add(symbolFront);

  // Back face symbol
  const symbolBack = createBitcoinSymbol(symbolMaterial);
  symbolBack.position.z = -0.35;
  symbolBack.rotation.y = Math.PI;
  group.add(symbolBack);

  group.visible = false;
  group.userData.spinSpeed = 2 + Math.random() * 1.5;
  group.userData.bounceOffset = Math.random() * Math.PI * 2;

  return group;
}

function createBitcoinSymbol(material) {
  const symbolGroup = new THREE.Group();

  // Create a flatter, more coin-like "B" with stripes through it
  // Vertical stripes of the B
  const stripe1Geometry = new THREE.BoxGeometry(0.3, 3.5, 0.15);
  const stripe1 = new THREE.Mesh(stripe1Geometry, material);
  stripe1.position.set(-0.6, 0, 0);
  symbolGroup.add(stripe1);

  const stripe2Geometry = new THREE.BoxGeometry(0.3, 3.5, 0.15);
  const stripe2 = new THREE.Mesh(stripe2Geometry, material);
  stripe2.position.set(0.6, 0, 0);
  symbolGroup.add(stripe2);

  // Top arc of B
  const arcTop = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.25, 8, 16, Math.PI),
    material
  );
  arcTop.rotation.z = -Math.PI / 2;
  arcTop.position.set(0.1, 0.9, 0);
  symbolGroup.add(arcTop);

  // Bottom arc of B
  const arcBottom = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.25, 8, 16, Math.PI),
    material
  );
  arcBottom.rotation.z = -Math.PI / 2;
  arcBottom.position.set(0.1, -0.9, 0);
  symbolGroup.add(arcBottom);

  // Vertical bar of B
  const barGeometry = new THREE.BoxGeometry(0.35, 4, 0.15);
  const bar = new THREE.Mesh(barGeometry, material);
  bar.position.set(-0.3, 0, 0);
  symbolGroup.add(bar);

  return symbolGroup;
}

function createShrubMesh() {
  const group = new THREE.Group();

  // Create a bushy shrub with multiple spheres
  const bushMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d5016,
    flatShading: true
  });

  // Main bush body - larger sphere
  const mainBushGeometry = new THREE.SphereGeometry(3, 8, 8);
  const mainBush = new THREE.Mesh(mainBushGeometry, bushMaterial);
  mainBush.position.y = 2.5;
  mainBush.scale.set(1, 0.8, 1); // Slightly flattened
  group.add(mainBush);

  // Additional smaller spheres for bushier look
  const smallBushGeometry = new THREE.SphereGeometry(2, 8, 8);

  const leftBush = new THREE.Mesh(smallBushGeometry, bushMaterial);
  leftBush.position.set(-2, 2, 0);
  leftBush.scale.set(0.9, 0.7, 0.9);
  group.add(leftBush);

  const rightBush = new THREE.Mesh(smallBushGeometry, bushMaterial);
  rightBush.position.set(2, 2, 0);
  rightBush.scale.set(0.9, 0.7, 0.9);
  group.add(rightBush);

  const frontBush = new THREE.Mesh(smallBushGeometry, bushMaterial);
  frontBush.position.set(0, 2.5, 2);
  frontBush.scale.set(0.8, 0.7, 0.8);
  group.add(frontBush);

  // Store references for fire effect
  group.userData.bushParts = [mainBush, leftBush, rightBush, frontBush];
  group.userData.isOnFire = false;
  group.userData.originalColor = 0x2d5016;
  group.userData.fireParticles = [];
  group.userData.smokeParticles = [];

  group.visible = false;
  return group;
}

function createFireParticle() {
  const geometry = new THREE.SphereGeometry(0.4, 8, 8);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 1
  });
  const particle = new THREE.Mesh(geometry, material);
  particle.userData.lifetime = 0;
  particle.userData.maxLifetime = 0.8 + Math.random() * 0.4;
  particle.userData.velocity = {
    x: (Math.random() - 0.5) * 2,
    y: 3 + Math.random() * 2,
    z: (Math.random() - 0.5) * 2
  };
  return particle;
}

function createSmokeParticle() {
  const geometry = new THREE.SphereGeometry(0.6, 8, 8);
  const material = new THREE.MeshBasicMaterial({
    color: 0x555555,
    transparent: true,
    opacity: 0.6
  });
  const particle = new THREE.Mesh(geometry, material);
  particle.userData.lifetime = 0;
  particle.userData.maxLifetime = 1.2 + Math.random() * 0.6;
  particle.userData.velocity = {
    x: (Math.random() - 0.5) * 1.5,
    y: 2 + Math.random() * 1,
    z: (Math.random() - 0.5) * 1.5
  };
  return particle;
}

function updateFireParticles(shrubMesh, dt) {
  if (!shrubMesh.userData.fireParticles) return;

  // Update existing particles
  shrubMesh.userData.fireParticles.forEach((particle, index) => {
    particle.userData.lifetime += dt;
    const progress = particle.userData.lifetime / particle.userData.maxLifetime;

    if (progress >= 1) {
      shrubMesh.remove(particle);
      shrubMesh.userData.fireParticles.splice(index, 1);
      return;
    }

    // Move particle
    particle.position.x += particle.userData.velocity.x * dt;
    particle.position.y += particle.userData.velocity.y * dt;
    particle.position.z += particle.userData.velocity.z * dt;

    // Fade out and change color (yellow to red)
    particle.material.opacity = 1 - progress;
    const colorValue = Math.floor((1 - progress) * 255);
    particle.material.color.setRGB(1, colorValue / 255, 0);
  });

  // Update smoke particles
  shrubMesh.userData.smokeParticles.forEach((particle, index) => {
    particle.userData.lifetime += dt;
    const progress = particle.userData.lifetime / particle.userData.maxLifetime;

    if (progress >= 1) {
      shrubMesh.remove(particle);
      shrubMesh.userData.smokeParticles.splice(index, 1);
      return;
    }

    // Move particle
    particle.position.x += particle.userData.velocity.x * dt;
    particle.position.y += particle.userData.velocity.y * dt;
    particle.position.z += particle.userData.velocity.z * dt;

    // Fade out and expand
    particle.material.opacity = 0.6 * (1 - progress);
    particle.scale.setScalar(1 + progress * 2);
  });

  // Spawn new particles if on fire
  if (Math.random() < 0.8) {
    const fireParticle = createFireParticle();
    fireParticle.position.set(
      (Math.random() - 0.5) * 4,
      2,
      (Math.random() - 0.5) * 4
    );
    shrubMesh.add(fireParticle);
    shrubMesh.userData.fireParticles.push(fireParticle);
  }

  if (Math.random() < 0.4) {
    const smokeParticle = createSmokeParticle();
    smokeParticle.position.set(
      (Math.random() - 0.5) * 4,
      3,
      (Math.random() - 0.5) * 4
    );
    shrubMesh.add(smokeParticle);
    shrubMesh.userData.smokeParticles.push(smokeParticle);
  }
}

function createYetiMesh() {
  const group = new THREE.Group();

  // Fur material - slightly off-white with roughness
  const furMaterial = new THREE.MeshStandardMaterial({
    color: 0xDDDDDD,
    flatShading: true,
    roughness: 0.9,
  });

  // Large imposing body (bigger and more hunched)
  const bodyGeometry = new THREE.BoxGeometry(16, 24, 12);
  const body = new THREE.Mesh(bodyGeometry, furMaterial);
  body.position.y = 14;
  body.rotation.x = 0.1; // Slight forward hunch
  group.add(body);

  // Add fur tufts to body for texture (fixed positions for consistency)
  const tuftPositions = [
    [-5, 20, 4], [5, 20, 4], [-6, 15, 3], [6, 15, 3],
    [0, 22, 5], [-3, 12, 4], [3, 12, 4], [0, 10, 3]
  ];
  tuftPositions.forEach(pos => {
    const tuftGeometry = new THREE.SphereGeometry(2, 6, 6);
    const tuft = new THREE.Mesh(tuftGeometry, furMaterial);
    tuft.position.set(pos[0], pos[1], pos[2]);
    group.add(tuft);
  });

  // Massive head
  const headGeometry = new THREE.SphereGeometry(9, 8, 8);
  const head = new THREE.Mesh(headGeometry, furMaterial);
  head.position.y = 32;
  head.scale.set(1, 0.9, 1.1); // Slightly squashed, forward-stretched
  group.add(head);

  // Snout/muzzle
  const snoutGeometry = new THREE.BoxGeometry(6, 4, 4);
  const snout = new THREE.Mesh(snoutGeometry, furMaterial);
  snout.position.set(0, 30, 10);
  group.add(snout);

  // Menacing red eyes with glow
  const eyeGeometry = new THREE.SphereGeometry(1.5, 8, 8);
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xFF0000,
    emissive: 0xFF0000,
    emissiveIntensity: 1.2,
  });

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-3.5, 33, 8);
  group.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(3.5, 33, 8);
  group.add(rightEye);

  // Eye glow effect
  const glowGeometry = new THREE.SphereGeometry(2.5, 8, 8);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF3333,
    transparent: true,
    opacity: 0.4,
  });
  const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  leftGlow.position.set(-3.5, 33, 8);
  group.add(leftGlow);

  const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
  rightGlow.position.set(3.5, 33, 8);
  group.add(rightGlow);

  // Mouth with dark interior
  const mouthGeometry = new THREE.BoxGeometry(4, 2, 2);
  const mouthMaterial = new THREE.MeshStandardMaterial({
    color: 0x220000,
    flatShading: true,
  });
  const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
  mouth.position.set(0, 28, 11);
  group.add(mouth);

  // Teeth
  const toothMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
  const toothPositions = [-2, -1.2, -0.4, 0.4, 1.2, 2];
  toothPositions.forEach(xPos => {
    const toothGeometry = new THREE.ConeGeometry(0.5, 2, 4);
    const tooth = new THREE.Mesh(toothGeometry, toothMaterial);
    tooth.position.set(xPos, 29, 11);
    tooth.rotation.x = Math.PI;
    group.add(tooth);
  });

  // Long menacing arms reaching forward
  const armGeometry = new THREE.CapsuleGeometry(3, 20, 4, 8);
  const leftArm = new THREE.Mesh(armGeometry, furMaterial);
  leftArm.position.set(-9, 18, 4);
  leftArm.rotation.z = Math.PI / 5;
  leftArm.rotation.x = -Math.PI / 6; // Reaching forward
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, furMaterial);
  rightArm.position.set(9, 18, 4);
  rightArm.rotation.z = -Math.PI / 5;
  rightArm.rotation.x = -Math.PI / 6; // Reaching forward
  group.add(rightArm);

  // Clawed hands
  const clawMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  [-12, 12].forEach(handX => {
    const handGeometry = new THREE.SphereGeometry(2.5, 6, 6);
    const hand = new THREE.Mesh(handGeometry, furMaterial);
    hand.position.set(handX, 12, 12);
    group.add(hand);

    // Claws
    [-1.2, 0, 1.2].forEach(clawOffset => {
      const clawGeometry = new THREE.ConeGeometry(0.4, 3, 4);
      const claw = new THREE.Mesh(clawGeometry, clawMaterial);
      claw.position.set(handX + clawOffset, 10, 13);
      claw.rotation.x = Math.PI / 2;
      group.add(claw);
    });
  });

  // Thick powerful legs
  const legGeometry = new THREE.CapsuleGeometry(4, 14, 4, 8);
  const leftLeg = new THREE.Mesh(legGeometry, furMaterial);
  leftLeg.position.set(-5, 5, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeometry, furMaterial);
  rightLeg.position.set(5, 5, 0);
  group.add(rightLeg);

  // Large feet
  const footGeometry = new THREE.BoxGeometry(4, 2, 6);
  const leftFoot = new THREE.Mesh(footGeometry, furMaterial);
  leftFoot.position.set(-5, 0, 2);
  group.add(leftFoot);

  const rightFoot = new THREE.Mesh(footGeometry, furMaterial);
  rightFoot.position.set(5, 0, 2);
  group.add(rightFoot);

  // Store references for animation
  group.userData.leftArm = leftArm;
  group.userData.rightArm = rightArm;
  group.userData.body = body;
  group.userData.leftEye = leftEye;
  group.userData.rightEye = rightEye;
  group.userData.leftGlow = leftGlow;
  group.userData.rightGlow = rightGlow;

  group.visible = false;
  return group;
}

function getOrCreateShrubMesh(index) {
  if (!slopeGroup) {
    return null;
  }
  if (!shrubMeshes[index]) {
    const mesh = createShrubMesh();
    shrubMeshes[index] = mesh;
    slopeGroup.add(mesh);
  }
  return shrubMeshes[index];
}

function getOrCreateObstacleMesh(index, treeType = 'normal') {
  if (!slopeGroup) {
    return null;
  }

  // Check if mesh exists and has correct tree type
  if (obstacleMeshes[index] && obstacleMeshes[index].userData.treeType === treeType) {
    return obstacleMeshes[index];
  }

  // Remove old mesh if tree type changed
  if (obstacleMeshes[index]) {
    slopeGroup.remove(obstacleMeshes[index]);
  }

  // Create new mesh with correct type
  const mesh = createObstacleMesh(treeType);
  obstacleMeshes[index] = mesh;
  slopeGroup.add(mesh);

  return obstacleMeshes[index];
}

function getOrCreateCoinMesh(index) {
  if (!slopeGroup) {
    return null;
  }
  if (!coinMeshes[index]) {
    const mesh = createCoinMesh();
    coinMeshes[index] = mesh;
    slopeGroup.add(mesh);
  }
  return coinMeshes[index];
}

export function init3DRenderer(container, config = {}) {
  if (!container) {
    console.warn('3D renderer container missing.');
    return;
  }

  containerElement = container;
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  rendererConfig = {
    xScale: config?.render3d?.xScale ?? 1.1,
    depthScale: config?.render3d?.depthScale ?? 0.2,
    viewDistance: config?.render3d?.viewDistance ?? config?.viewDistance ?? 220,
    behindDistance: config?.render3d?.behindDistance ?? 20,
    cameraHeight: config?.render3d?.cameraHeight ?? 70,
    cameraOffsetZ: config?.render3d?.cameraOffsetZ ?? 130,
    cameraLookForward: config?.render3d?.cameraLookForward ?? 85,
  };

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87cefa);
  scene.fog = new THREE.Fog(0x87cefa, 80, 380);

  slopeGroup = new THREE.Group();
  const slopeAngleRad = THREE.MathUtils.degToRad(config?.slope?.angleDeg ?? 12);
  slopeGroup.rotation.x = -slopeAngleRad;
  scene.add(slopeGroup);

  camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1500);
  camera.position.set(0, 50, 120);
  camera.lookAt(new THREE.Vector3(0, 0, 0));

  renderer = new THREE.WebGLRenderer({ antialias: false });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);
  renderer.setClearColor(0x87cefa, 1);

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.95);
  directionalLight.position.set(50, 100, 40);
  scene.add(directionalLight);

  const ground = createGroundPlane();
  slopeGroup.add(ground);

  playerMesh = createPlayerMesh();
  slopeGroup.add(playerMesh);

  return {
    renderer,
    scene,
    camera,
    container: containerElement,
  };
}

export function resize3DRenderer(width, height) {
  if (!renderer || !camera) {
    return;
  }
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

export function render3DFrame() {
  if (!renderer || !scene || !camera) {
    return;
  }
  renderer.render(scene, camera);
}

export function updatePlayer3D(player) {
  if (!playerMesh || !player) {
    return;
  }
  playerMesh.position.x = player.x * rendererConfig.xScale;
  playerMesh.position.z = 0;

  // Don't apply normal animations if crashed
  if (playerMesh.userData.isCrashed) {
    return;
  }

  // Calculate lean based on input (keyboard or touch)
  const leftPressed = isLeftPressed();
  const rightPressed = isRightPressed();

  // Try to get touch state - with fallback to window state if imports don't work
  let touchLeft = isTouchLeft();
  let touchRight = isTouchRight();

  // Fallback: check window-level input state directly
  if (touchLeft === undefined || touchRight === undefined) {
    const state = window.__inputState;
    if (state && state.touchActive && state.touchCurrentX !== null) {
      const screenWidth = window.innerWidth || 0;
      touchLeft = state.touchCurrentX < screenWidth / 2;
      touchRight = state.touchCurrentX >= screenWidth / 2;
    } else {
      touchLeft = false;
      touchRight = false;
    }
  }

  let targetLean = 0;
  if (leftPressed || touchLeft) {
    targetLean = 0.35;
  } else if (rightPressed || touchRight) {
    targetLean = -0.35;
  }

  // Smooth lean transition
  const currentLean = playerMesh.rotation.z || 0;
  playerMesh.rotation.z = currentLean + (targetLean - currentLean) * 0.15;

  // Lean the body more dramatically
  if (playerMesh.userData.bodyGroup) {
    playerMesh.userData.bodyGroup.rotation.z = playerMesh.rotation.z * 1.5;
  }

  // Tilt skis to show edge control
  if (playerMesh.userData.leftSki && playerMesh.userData.rightSki) {
    const skiTilt = playerMesh.rotation.z * 2;
    playerMesh.userData.leftSki.rotation.x = skiTilt;
    playerMesh.userData.rightSki.rotation.x = skiTilt;
  }
}

export function updateCamera3D(/* player */) {
  if (!camera || !playerMesh) {
    return;
  }
  camera.position.x = playerMesh.position.x;
  camera.position.y = playerMesh.position.y + rendererConfig.cameraHeight;
  camera.position.z = playerMesh.position.z + rendererConfig.cameraOffsetZ;
  camera.lookAt(
    playerMesh.position.x,
    playerMesh.position.y,
    playerMesh.position.z - rendererConfig.cameraLookForward,
  );
}

export function updateObstacles3D(obstacles = [], playerDistance = 0) {
  if (!obstacles) {
    obstacles = [];
  }
  obstacles.forEach((obstacle, index) => {
    const treeType = obstacle.treeType || 'normal';
    const mesh = getOrCreateObstacleMesh(index, treeType);
    if (!mesh) {
      return;
    }
    const depth = obstacle.y - playerDistance;
    if (depth < -rendererConfig.behindDistance || depth > rendererConfig.viewDistance) {
      mesh.visible = false;
      return;
    }
    mesh.position.x = obstacle.x * rendererConfig.xScale;
    mesh.position.z = -depth * rendererConfig.depthScale;
    mesh.position.y = 0;
    mesh.visible = true;
  });

  for (let i = obstacles.length; i < obstacleMeshes.length; i += 1) {
    if (obstacleMeshes[i]) {
      obstacleMeshes[i].visible = false;
    }
  }
}

export function updateCoins3D(coins = [], playerDistance = 0) {
  if (!coins) {
    coins = [];
  }
  const time = Date.now() * 0.001; // Convert to seconds

  coins.forEach((coin, index) => {
    const mesh = getOrCreateCoinMesh(index);
    if (!mesh) {
      return;
    }
    const depth = coin.y - playerDistance;
    if (depth < -rendererConfig.behindDistance || depth > rendererConfig.viewDistance) {
      mesh.visible = false;
      return;
    }

    // Base position
    mesh.position.x = coin.x * rendererConfig.xScale;
    mesh.position.z = -depth * rendererConfig.depthScale;

    // Higher off ground + subtle bouncing animation
    const baseHeight = 8;
    const bounceHeight = 1.5;
    const bounceSpeed = 2.5;
    const bounce = Math.sin(time * bounceSpeed + mesh.userData.bounceOffset) * bounceHeight;
    mesh.position.y = baseHeight + bounce;

    // Spinning animation
    mesh.rotation.y = time * mesh.userData.spinSpeed;

    mesh.visible = true;
  });

  for (let i = coins.length; i < coinMeshes.length; i += 1) {
    if (coinMeshes[i]) {
      coinMeshes[i].visible = false;
    }
  }
}

export function updateShrubs3D(shrubs = [], playerDistance = 0) {
  if (!shrubs) {
    shrubs = [];
  }

  const dt = 1 / 60; // Approximate delta time

  shrubs.forEach((shrub, index) => {
    const mesh = getOrCreateShrubMesh(index);
    if (!mesh) {
      return;
    }
    const depth = shrub.y - playerDistance;
    if (depth < -rendererConfig.behindDistance || depth > rendererConfig.viewDistance) {
      mesh.visible = false;
      return;
    }
    mesh.position.x = shrub.x * rendererConfig.xScale;
    mesh.position.z = -depth * rendererConfig.depthScale;
    mesh.position.y = 0;

    // Update fire effect based on shrub state
    if (mesh.userData.bushParts) {
      if (shrub.isOnFire) {
        // Set on fire
        mesh.userData.bushParts.forEach((part) => {
          part.material.color.setHex(0xff4500);
          part.material.emissive.setHex(0xff6600);
          part.material.emissiveIntensity = 0.5;
        });
        // Update fire particles
        updateFireParticles(mesh, dt);
      } else {
        // Reset to normal green
        mesh.userData.bushParts.forEach((part) => {
          part.material.color.setHex(mesh.userData.originalColor);
          part.material.emissive.setHex(0x000000);
          part.material.emissiveIntensity = 0;
        });
        // Clear any existing particles
        if (mesh.userData.fireParticles) {
          mesh.userData.fireParticles.forEach(p => mesh.remove(p));
          mesh.userData.fireParticles = [];
        }
        if (mesh.userData.smokeParticles) {
          mesh.userData.smokeParticles.forEach(p => mesh.remove(p));
          mesh.userData.smokeParticles = [];
        }
      }
    }

    mesh.visible = true;
  });

  for (let i = shrubs.length; i < shrubMeshes.length; i += 1) {
    if (shrubMeshes[i]) {
      shrubMeshes[i].visible = false;
      // Reset any lingering fire effects
      if (shrubMeshes[i].userData.bushParts) {
        shrubMeshes[i].userData.bushParts.forEach((part) => {
          part.material.color.setHex(shrubMeshes[i].userData.originalColor);
          part.material.emissive.setHex(0x000000);
          part.material.emissiveIntensity = 0;
        });
      }
      // Clear particles
      if (shrubMeshes[i].userData.fireParticles) {
        shrubMeshes[i].userData.fireParticles.forEach(p => shrubMeshes[i].remove(p));
        shrubMeshes[i].userData.fireParticles = [];
      }
      if (shrubMeshes[i].userData.smokeParticles) {
        shrubMeshes[i].userData.smokeParticles.forEach(p => shrubMeshes[i].remove(p));
        shrubMeshes[i].userData.smokeParticles = [];
      }
    }
  }
}

export function updateYeti3D(yeti, playerDistance) {
  if (!yeti || !yeti.active) {
    if (yetiMesh) {
      yetiMesh.visible = false;
    }
    return null;
  }

  if (!yetiMesh && slopeGroup) {
    try {
      yetiMesh = createYetiMesh();
      slopeGroup.add(yetiMesh);
    } catch (error) {
      console.error('Error creating yeti mesh:', error);
      return null;
    }
  }

  if (!yetiMesh) {
    return null;
  }

  const depth = yeti.y - playerDistance;
  if (depth < -rendererConfig.behindDistance || depth > rendererConfig.viewDistance) {
    yetiMesh.visible = false;
    return null;
  }

  yetiMesh.position.x = yeti.x * rendererConfig.xScale;
  yetiMesh.position.z = -depth * rendererConfig.depthScale;
  yetiMesh.position.y = 0;

  const time = Date.now() * 0.001;

  // Aggressive running animation - faster bobbing
  const bobSpeed = 6;
  const bobAmount = 3;
  const swingSpeed = 5;

  yetiMesh.position.y += Math.sin(time * bobSpeed) * bobAmount;

  // Swing arms menacingly
  if (yetiMesh.userData.leftArm && yetiMesh.userData.rightArm) {
    const swingAmount = 0.3;
    yetiMesh.userData.leftArm.rotation.x = -Math.PI / 6 + Math.sin(time * swingSpeed) * swingAmount;
    yetiMesh.userData.rightArm.rotation.x = -Math.PI / 6 + Math.sin(time * swingSpeed + Math.PI) * swingAmount;
  }

  // Body lurching forward
  if (yetiMesh.userData.body) {
    yetiMesh.userData.body.rotation.x = 0.1 + Math.sin(time * bobSpeed) * 0.1;
  }

  // Pulsing eye glow (more intense when closer)
  if (yetiMesh.userData.leftGlow && yetiMesh.userData.rightGlow) {
    const pulseIntensity = 0.3 + Math.sin(time * 3) * 0.15;
    yetiMesh.userData.leftGlow.material.opacity = pulseIntensity;
    yetiMesh.userData.rightGlow.material.opacity = pulseIntensity;
  }

  // Slight side-to-side sway as it runs
  yetiMesh.rotation.y = Math.sin(time * swingSpeed) * 0.1;

  yetiMesh.visible = true;

  // Return distance for screen shake calculation
  return Math.abs(depth);
}
