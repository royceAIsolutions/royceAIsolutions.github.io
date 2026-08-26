import * as THREE from 'three';

const canvas = document.getElementById('game-canvas');
const startOverlay = document.getElementById('start-overlay');
const startTitle = document.getElementById('start-title');
const startDesc = document.getElementById('start-desc');
const hud = document.getElementById('hud');
const crosshair = document.getElementById('crosshair');
const fpsEl = document.getElementById('fps');
const healthVal = document.getElementById('health-val');
const ammoVal = document.getElementById('ammo-val');
const ammoReserve = document.getElementById('ammo-reserve');
const scoreVal = document.getElementById('score-val');
const levelEl = document.getElementById('level');
const targetsEl = document.getElementById('targets');
const timerEl = document.getElementById('timer');
const levelClearEl = document.getElementById('level-clear');
const victoryOverlay = document.getElementById('victory-overlay');
const victoryScore = document.getElementById('victory-score');
const playAgainBtn = document.getElementById('play-again');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 10, 80);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.7, 0);

const listener = new THREE.AudioListener();
camera.add(listener);

const floorGeo = new THREE.PlaneGeometry(80, 80);
const gridCanvas = document.createElement('canvas');
gridCanvas.width = 512;
gridCanvas.height = 512;
const gctx = gridCanvas.getContext('2d');
gctx.fillStyle = '#2a2a3a';
gctx.fillRect(0, 0, 512, 512);
gctx.strokeStyle = '#3a3a4a';
gctx.lineWidth = 2;
for (let i = 0; i <= 512; i += 32) {
  gctx.beginPath(); gctx.moveTo(i, 0); gctx.lineTo(i, 512); gctx.stroke();
  gctx.beginPath(); gctx.moveTo(0, i); gctx.lineTo(512, i); gctx.stroke();
}
const gridTexture = new THREE.CanvasTexture(gridCanvas);
gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;
gridTexture.repeat.set(20, 20);
gridTexture.colorSpace = THREE.SRGBColorSpace;
const floorMat = new THREE.MeshStandardMaterial({ map: gridTexture, roughness: 0.9, metalness: 0.1 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, roughness: 0.8, metalness: 0.2 });
const wallH = 20, wallThick = 1, arena = 40;
const walls = [
  new THREE.Mesh(new THREE.BoxGeometry(arena * 2, wallH, wallThick), wallMat),
  new THREE.Mesh(new THREE.BoxGeometry(arena * 2, wallH, wallThick), wallMat),
  new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, arena * 2), wallMat),
  new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallH, arena * 2), wallMat),
];
walls[0].position.set(0, wallH / 2, -arena);
walls[1].position.set(0, wallH / 2, arena);
walls[2].position.set(-arena, wallH / 2, 0);
walls[3].position.set(arena, wallH / 2, 0);
walls.forEach(w => { w.castShadow = true; w.receiveShadow = true; scene.add(w); });

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444466, 1.2);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(30, 50, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 150;
dirLight.shadow.camera.left = -60;
dirLight.shadow.camera.right = 60;
dirLight.shadow.camera.top = 60;
dirLight.shadow.camera.bottom = -60;
scene.add(dirLight);

const gunGroup = new THREE.Group();
const receiverGeo = new THREE.BoxGeometry(0.12, 0.18, 0.5);
const receiverMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.8 });
const receiver = new THREE.Mesh(receiverGeo, receiverMat);
receiver.position.set(0.15, -0.08, -0.25);
gunGroup.add(receiver);
const barrelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12);
const barrelMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.2, metalness: 0.9 });
const barrel = new THREE.Mesh(barrelGeo, barrelMat);
barrel.rotation.x = Math.PI / 2;
barrel.position.set(0.15, -0.08, -0.55);
gunGroup.add(barrel);
const magGeo = new THREE.BoxGeometry(0.08, 0.25, 0.12);
const magMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 });
const mag = new THREE.Mesh(magGeo, magMat);
mag.position.set(0.15, -0.25, -0.15);
gunGroup.add(mag);
gunGroup.position.set(0.35, -0.35, -0.5);
gunGroup.rotation.y = -0.15;
camera.add(gunGroup);

const muzzleLight = new THREE.PointLight(0xffaa00, 0, 5);
muzzleLight.position.set(0.15, -0.08, -0.75);
gunGroup.add(muzzleLight);
const spriteMat = new THREE.SpriteMaterial({ color: 0xffaa00, transparent: true, opacity: 0, depthWrite: false });
const muzzleSprite = new THREE.Sprite(spriteMat);
muzzleSprite.scale.set(0.3, 0.3, 0.3);
muzzleSprite.position.set(0.15, -0.08, -0.75);
gunGroup.add(muzzleSprite);

const tracerGeo = new THREE.BufferGeometry();
const tracerMat = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0 });
const tracerLine = new THREE.Line(tracerGeo, tracerMat);
scene.add(tracerLine);

const sparkGeo = new THREE.BufferGeometry();
const sparkPositions = new Float32Array(50 * 3);
const sparkSizes = new Float32Array(50);
const sparkVelocities = [];
for (let i = 0; i < 50; i++) {
  sparkPositions[i * 3] = 0;
  sparkPositions[i * 3 + 1] = 0;
  sparkPositions[i * 3 + 2] = 0;
  sparkSizes[i] = 0.1 + Math.random() * 0.1;
  sparkVelocities.push(new THREE.Vector3());
}
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
sparkGeo.setAttribute('size', new THREE.BufferAttribute(sparkSizes, 1));
const sparkMat = new THREE.PointsMaterial({ color: 0xffaa00, size: 0.1, transparent: true, opacity: 1, sizeAttenuation: true });
const sparks = new THREE.Points(sparkGeo, sparkMat);
scene.add(sparks);

const keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
const mouse = { x: 0, y: 0 };
let pointerLocked = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let canJump = false;
let health = 100;
let ammo = 30;
let reserveAmmo = 90;
let score = 0;
let recoil = 0;
let muzzleTime = 0;
let tracerTime = 0;
let sparkTime = 0;
let lastTime = performance.now();
let frames = 0;
let fps = 0;

let currentLevel = 1;
const maxLevel = 3;
let targetsRemaining = 0;
let levelTimer = 0;
let levelTimerActive = false;
let isTransitioning = false;
let boxes = [];
let patrolBoxes = [];

const levelConfigs = [
  { targetCount: 5, layout: 'scattered', timeLimit: 0, patrolCount: 0 },
  { targetCount: 10, layout: 'grid', timeLimit: 0, patrolCount: 3 },
  { targetCount: 15, layout: 'ring', timeLimit: 90, patrolCount: 5 }
];

function updateHUD() {
  healthVal.textContent = health;
  ammoVal.textContent = ammo;
  ammoReserve.textContent = reserveAmmo;
  scoreVal.textContent = score;
  levelEl.textContent = `LEVEL: ${currentLevel}`;
  targetsEl.textContent = `TARGETS: ${targetsRemaining}/${levelConfigs[currentLevel - 1].targetCount}`;
  if (levelTimerActive) {
    timerEl.textContent = `TIME: ${Math.ceil(levelTimer)}s`;
    timerEl.style.display = 'block';
  } else {
    timerEl.style.display = 'none';
  }
}

function createCrate(x, z, size = 2, isPatrol = false, patrolRange = 0) {
  const boxGeo = new THREE.BoxGeometry(size, size, size);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, roughness: 0.7, metalness: 0.3 });
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(x, size / 2, z);
  box.castShadow = true;
  box.receiveShadow = true;
  box.userData = { hits: 0, isPatrol, patrolRange, patrolStartX: x, patrolDirection: 1, patrolSpeed: 0.5 + Math.random() * 0.5 };
  scene.add(box);
  return box;
}

function generateLevel(level) {
  boxes.forEach(box => scene.remove(box));
  boxes = [];
  patrolBoxes = [];

  const config = levelConfigs[level - 1];
  targetsRemaining = config.targetCount;

  const positions = [];
  const spacing = 8;
  const halfArena = arena - 5;

  if (config.layout === 'grid') {
    const cols = Math.ceil(Math.sqrt(config.targetCount));
    const rows = Math.ceil(config.targetCount / cols);
    const startX = -((cols - 1) * spacing) / 2;
    const startZ = -((rows - 1) * spacing) / 2;
    for (let i = 0; i < config.targetCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({ x: startX + col * spacing, z: startZ + row * spacing });
    }
  } else if (config.layout === 'scattered') {
    for (let i = 0; i < config.targetCount; i++) {
      let x, z, valid;
      do {
        x = (Math.random() - 0.5) * 60;
        z = (Math.random() - 0.5) * 60;
        valid = true;
        for (const p of positions) {
          if (Math.hypot(p.x - x, p.z - z) < 6) { valid = false; break; }
        }
      } while (!valid);
      positions.push({ x, z });
    }
  } else if (config.layout === 'ring') {
    const radius = 15;
    for (let i = 0; i < config.targetCount; i++) {
      const angle = (i / config.targetCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 3;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 3;
      positions.push({ x, z });
    }
  }

  for (let i = 0; i < config.targetCount; i++) {
    const pos = positions[i];
    const size = 1.5 + Math.random() * 1.5;
    const isPatrol = config.patrolCount > 0 && i < config.patrolCount;
    const patrolRange = isPatrol ? 5 + Math.random() * 5 : 0;
    const box = createCrate(pos.x, pos.z, size, isPatrol, patrolRange);
    boxes.push(box);
    if (isPatrol) patrolBoxes.push(box);
  }

  updateHUD();
}

function showStartOverlay() {
  const config = levelConfigs[currentLevel - 1];
  startTitle.textContent = `LEVEL ${currentLevel}`;
  startDesc.textContent = `Destroy ${config.targetCount} targets${config.timeLimit > 0 ? ` in ${config.timeLimit}s` : ''}`;
  startOverlay.classList.remove('hidden');
  hud.classList.remove('visible');
  crosshair.classList.remove('visible');
}

function showLevelClear() {
  levelClearEl.classList.add('visible');
  isTransitioning = true;
  setTimeout(() => {
    levelClearEl.classList.remove('visible');
    isTransitioning = false;
    currentLevel++;
    if (currentLevel > maxLevel) {
      showVictory();
    } else {
      generateLevel(currentLevel);
      showStartOverlay();
    }
  }, 2500);
}

function showVictory() {
  victoryScore.textContent = score;
  victoryOverlay.classList.remove('hidden');
  hud.classList.remove('visible');
  crosshair.classList.remove('visible');
}

function resetGame() {
  currentLevel = 1;
  score = 0;
  ammo = 30;
  reserveAmmo = 90;
  health = 100;
  camera.position.set(0, 1.7, 0);
  velocity.set(0, 0, 0);
  mouse.x = 0;
  mouse.y = 0;
  generateLevel(1);
  victoryOverlay.classList.add('hidden');
  showStartOverlay();
}

function shoot() {
  if (ammo <= 0 || isTransitioning) return;
  ammo--;
  updateHUD();

  recoil = 0.03;
  muzzleTime = 0.1;
  muzzleLight.intensity = 50;
  muzzleLight.distance = 10;
  spriteMat.opacity = 1;

  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.applyEuler(new THREE.Euler(-recoil * 2, 0, 0));

  const ray = new THREE.Raycaster(origin, dir, 0, 100);
  const intersects = ray.intersectObjects([...walls, ...boxes, floor], true);

  tracerGeo.setFromPoints([origin.clone(), intersects[0] ? intersects[0].point : origin.clone().addScaledVector(dir, 100)]);
  tracerMat.opacity = 1;
  tracerTime = 0.08;

  if (intersects.length > 0) {
    const hit = intersects[0];
    if (hit.object !== floor) {
      for (let i = 0; i < 50; i++) {
        sparkPositions[i * 3] = hit.point.x;
        sparkPositions[i * 3 + 1] = hit.point.y;
        sparkPositions[i * 3 + 2] = hit.point.z;
        const v = sparkVelocities[i];
        v.set((Math.random() - 0.5) * 10, Math.random() * 5 + 2, (Math.random() - 0.5) * 10);
      }
      sparkGeo.attributes.position.needsUpdate = true;
      sparkMat.opacity = 1;
      sparkTime = 0.5;

      if (hit.object.userData.hits === undefined) hit.object.userData.hits = 0;
      hit.object.userData.hits++;
      if (hit.object.userData.hits >= 3) {
        scene.remove(hit.object);
        const idx = boxes.indexOf(hit.object);
        if (idx > -1) boxes.splice(idx, 1);
        const pIdx = patrolBoxes.indexOf(hit.object);
        if (pIdx > -1) patrolBoxes.splice(pIdx, 1);
        targetsRemaining--;
        score += 100;
        updateHUD();
        if (targetsRemaining <= 0) {
          showLevelClear();
        }
      }
    }
  }
}

function startGame() {
  startOverlay.classList.add('hidden');
  hud.classList.add('visible');
  crosshair.classList.add('visible');
  canvas.requestPointerLock();
}

window.startGame = startGame;

function onPointerLockChange() {
  pointerLocked = document.pointerLockElement === canvas;
  if (!pointerLocked && !isTransitioning && !victoryOverlay.classList.contains('hidden')) {
    return;
  }
  if (!pointerLocked && !isTransitioning) {
    showStartOverlay();
  }
}

function onMouseMove(e) {
  if (!pointerLocked) return;
  mouse.x -= e.movementX * 0.002;
  mouse.y -= e.movementY * 0.002;
  mouse.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouse.y));
}

function onKeyDown(e) {
  const k = e.code.toLowerCase();
  if (k === 'keyw') keys.w = true;
  if (k === 'keya') keys.a = true;
  if (k === 'keys') keys.s = true;
  if (k === 'keyd') keys.d = true;
  if (k === 'shiftleft' || k === 'shiftright') keys.shift = true;
  if (k === 'space' && canJump) { velocity.y = 7; canJump = false; keys.space = true; }
  if (k === 'keyr' && ammo < 30 && reserveAmmo > 0) {
    const need = 30 - ammo;
    const take = Math.min(need, reserveAmmo);
    ammo += take;
    reserveAmmo -= take;
    updateHUD();
  }
}

function onKeyUp(e) {
  const k = e.code.toLowerCase();
  if (k === 'keyw') keys.w = false;
  if (k === 'keya') keys.a = false;
  if (k === 'keys') keys.s = false;
  if (k === 'keyd') keys.d = false;
  if (k === 'shiftleft' || k === 'shiftright') keys.shift = false;
  if (k === 'space') keys.space = false;
}

function onClick() {
  if (pointerLocked) shoot();
}

playAgainBtn.addEventListener('click', () => {
  resetGame();
});

function animate(time) {
  requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  frames++;
  if (time - lastTime > 1000) { fps = frames; frames = 0; lastTime = time; }
  fpsEl.textContent = `FPS: ${fps}`;

  if (pointerLocked && !isTransitioning) {
    direction.z = Number(keys.w) - Number(keys.s);
    direction.x = Number(keys.d) - Number(keys.a);
    direction.normalize();

    const speed = keys.shift ? 12 : 6;
    if (keys.w || keys.s) velocity.z -= direction.z * speed * dt;
    if (keys.a || keys.d) velocity.x -= direction.x * speed * dt;

    velocity.y -= 20 * dt;

    const playerBox = new THREE.Box3().setFromCenterAndSize(camera.position.clone(), new THREE.Vector3(0.6, 1.7, 0.6));
    let moveX = velocity.x * dt;
    let moveZ = velocity.z * dt;

    const testBoxX = playerBox.clone().translate(new THREE.Vector3(moveX, 0, 0));
    const testBoxZ = playerBox.clone().translate(new THREE.Vector3(0, 0, moveZ));

    let hitWall = false;
    for (const wall of walls) {
      const wallBox = new THREE.Box3().setFromObject(wall);
      if (testBoxX.intersectsBox(wallBox)) { moveX = 0; velocity.x = 0; hitWall = true; }
      if (testBoxZ.intersectsBox(wallBox)) { moveZ = 0; velocity.z = 0; hitWall = true; }
    }
    for (const box of boxes) {
      const boxBox = new THREE.Box3().setFromObject(box);
      if (testBoxX.intersectsBox(boxBox)) { moveX = 0; velocity.x = 0; }
      if (testBoxZ.intersectsBox(boxBox)) { moveZ = 0; velocity.z = 0; }
    }

    camera.position.x += moveX;
    camera.position.z += moveZ;

    if (camera.position.y <= 1.7) {
      camera.position.y = 1.7;
      velocity.y = 0;
      canJump = true;
    } else {
      camera.position.y += velocity.y * dt;
    }

    velocity.x *= 0.9;
    velocity.z *= 0.9;

    camera.rotation.y = mouse.x;
    camera.rotation.x = mouse.y;

    if (recoil > 0) {
      camera.rotation.x -= recoil;
      recoil *= 0.9;
    }

    for (const box of patrolBoxes) {
      const ud = box.userData;
      box.position.x += ud.patrolDirection * ud.patrolSpeed * dt;
      if (Math.abs(box.position.x - ud.patrolStartX) >= ud.patrolRange) {
        ud.patrolDirection *= -1;
        box.position.x = ud.patrolStartX + ud.patrolDirection * ud.patrolRange;
      }
    }

    if (levelTimerActive) {
      levelTimer -= dt;
      updateHUD();
      if (levelTimer <= 0) {
        levelTimer = 0;
        levelTimerActive = false;
        showLevelClear();
      }
    }
  }

  if (muzzleTime > 0) {
    muzzleTime -= dt;
    if (muzzleTime <= 0) {
      muzzleLight.intensity = 0;
      spriteMat.opacity = 0;
    }
  }
  if (tracerTime > 0) {
    tracerTime -= dt;
    if (tracerTime <= 0) tracerMat.opacity = 0;
  }
  if (sparkTime > 0) {
    sparkTime -= dt;
    const positions = sparkGeo.attributes.position.array;
    for (let i = 0; i < 50; i++) {
      const v = sparkVelocities[i];
      v.y -= 20 * dt;
      positions[i * 3] += v.x * dt;
      positions[i * 3 + 1] += v.y * dt;
      positions[i * 3 + 2] += v.z * dt;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkMat.opacity = Math.max(0, sparkTime * 2);
    if (sparkTime <= 0) sparkMat.opacity = 0;
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('pointerlockchange', onPointerLockChange);
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);
canvas.addEventListener('click', onClick);

generateLevel(1);
animate(performance.now());
updateHUD();