import * as THREE from 'three';

// ==== DOM ELEMENTS ====
const canvas = document.getElementById('game-canvas');
const startOverlay = document.getElementById('start-overlay');
const startTitle = document.getElementById('start-title');
const startDesc = document.getElementById('start-desc');
const hud = document.getElementById('hud');
const crosshair = document.getElementById('crosshair');
const fpsEl = document.getElementById('fps');
const healthVal = document.getElementById('health-val');
const armorVal = document.getElementById('armor-val');
const moneyVal = document.getElementById('money-val');
const weaponNameEl = document.getElementById('weapon-name');
const ammoVal = document.getElementById('ammo-val');
const ammoReserve = document.getElementById('ammo-reserve');
const ctWinsEl = document.getElementById('ct-wins');
const tWinsEl = document.getElementById('t-wins');
const roundDisplay = document.getElementById('round-display');
const timerEl = document.getElementById('timer');
const freezetimeEl = document.getElementById('freezetime');
const roundWonEl = document.getElementById('round-won');
const roundLostEl = document.getElementById('round-lost');
const victoryOverlay = document.getElementById('victory-overlay');
const victoryTitle = document.getElementById('victory-title');
const victoryCt = document.getElementById('victory-ct');
const victoryT = document.getElementById('victory-t');
const playAgainBtn = document.getElementById('play-again');
const damageFlash = document.getElementById('damage-flash');
const gameOverOverlay = document.getElementById('game-over');
const gameOverScore = document.getElementById('game-over-score');
const retryBtn = document.getElementById('retry-btn');
const buyMenu = document.getElementById('buy-menu');
const buyPistolBtn = document.querySelector('#buy-pistol button');
const buySmgBtn = document.querySelector('#buy-smg button');
const buyRifleBtn = document.querySelector('#buy-rifle button');
const buyArmorBtn = document.querySelector('#buy-armor button');

// ==== TOUCH MODE (iPad / mobile) ====
const touchMode = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
let touchFiring = false;
let joyDX = 0, joyDY = 0;
let joyPointerId = null;
let lookPointerId = null, lookLastX = 0, lookLastY = 0;
if (touchMode) document.body.classList.add('touch-mode');

// ==== THREE.JS SETUP ====
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 10, 80);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 1.7, 10);

const listener = new THREE.AudioListener();
camera.add(listener);

// Floor
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

// Walls
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
const wallBoxes = walls.map(w => new THREE.Box3().setFromObject(w));

// Lights
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

// ==== PLAYER GUN (CT blue-dark) ====
const gunGroup = new THREE.Group();
const receiverGeo = new THREE.BoxGeometry(0.12, 0.18, 0.5);
const receiverMat = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.3, metalness: 0.8 });
const receiver = new THREE.Mesh(receiverGeo, receiverMat);
receiver.position.set(0.15, -0.08, -0.25);
gunGroup.add(receiver);
const barrelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12);
const barrelMat = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, roughness: 0.2, metalness: 0.9 });
const barrel = new THREE.Mesh(barrelGeo, barrelMat);
barrel.rotation.x = Math.PI / 2;
barrel.position.set(0.15, -0.08, -0.55);
gunGroup.add(barrel);
const magGeo = new THREE.BoxGeometry(0.08, 0.25, 0.12);
const magMat = new THREE.MeshStandardMaterial({ color: 0x1a2a4a, roughness: 0.4, metalness: 0.7 });
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

// Tracers
const tracerGeo = new THREE.BufferGeometry();
const tracerMat = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0 });
const tracerLine = new THREE.Line(tracerGeo, tracerMat);
scene.add(tracerLine);

const botTracerGeo = new THREE.BufferGeometry();
const botTracerMat = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });
const botTracerLine = new THREE.Line(botTracerGeo, botTracerMat);
scene.add(botTracerLine);

// Sparks
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

const botSparkGeo = new THREE.BufferGeometry();
const botSparkPositions = new Float32Array(30 * 3);
const botSparkSizes = new Float32Array(30);
const botSparkVelocities = [];
for (let i = 0; i < 30; i++) {
  botSparkPositions[i * 3] = 0;
  botSparkPositions[i * 3 + 1] = 0;
  botSparkPositions[i * 3 + 2] = 0;
  botSparkSizes[i] = 0.08 + Math.random() * 0.08;
  botSparkVelocities.push(new THREE.Vector3());
}
botSparkGeo.setAttribute('position', new THREE.BufferAttribute(botSparkPositions, 3));
botSparkGeo.setAttribute('size', new THREE.BufferAttribute(botSparkSizes, 1));
const botSparkMat = new THREE.PointsMaterial({ color: 0xff0000, size: 0.08, transparent: true, opacity: 1, sizeAttenuation: true });
const botSparks = new THREE.Points(botSparkGeo, botSparkMat);
scene.add(botSparks);

// ==== INPUT ====
const keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
const mouse = { x: 0, y: 0 };
let pointerLocked = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let canJump = false;

// ==== ROUND SYSTEM ====
const MAX_ROUNDS = 7;
const ROUNDS_TO_WIN = 4;
let currentRound = 1;
let ctWins = 0;
let tWins = 0;
let roundTimer = 60;
let roundTimerActive = false;
let isFreezetime = false;
let freezetimeTimer = 8;
let isRoundEnding = false;
let isMatchOver = false;

// ==== ECONOMY ====
let money = 800;
const KILL_REWARD = 300;
const ROUND_WIN_REWARD = 2500;
const ROUND_LOSS_REWARD = 1400;

// ==== WEAPON SYSTEM ====
const WEAPONS = {
  pistol: {
    name: 'PISTOL',
    damage: 25,
    fireRate: 8, // shots per second
    magSize: 12,
    reserve: 48,
    reloadTime: 1.5,
    spread: 0.02,
    fullAuto: false,
    price: 0
  },
  smg: {
    name: 'MP5',
    damage: 22,
    fireRate: 15,
    magSize: 30,
    reserve: 120,
    reloadTime: 2.0,
    spread: 0.08,
    fullAuto: true,
    price: 1500
  },
  rifle: {
    name: 'M4',
    damage: 34,
    fireRate: 10,
    magSize: 30,
    reserve: 90,
    reloadTime: 2.5,
    spread: 0.03,
    fullAuto: true,
    price: 3100
  }
};

let primaryWeapon = { ...WEAPONS.pistol }; // starts with pistol as primary
let currentWeapon = { ...WEAPONS.pistol };
let currentAmmo = WEAPONS.pistol.magSize;
let reserveAmmo = WEAPONS.pistol.reserve;
let isReloading = false;
let reloadTimer = 0;
let lastShotTime = 0;
let recoil = 0;
let muzzleTime = 0;
let tracerTime = 0;
let botTracerTime = 0;
let sparkTime = 0;
let botSparkTime = 0;

// ==== ARMOR ====
let armor = 0;
const MAX_ARMOR = 100;
const ARMOR_PRICE = 650;
const ARMOR_ABSORPTION = 0.5;

// ==== PLAYER STATE ====
let health = 100;
let isGameOver = false;
let lastTime = performance.now();
let lastFpsTime = performance.now();
let frames = 0;
let fps = 0;

// ==== BOTS ====
let bots = [];
const raycaster = new THREE.Raycaster();
const losRaycaster = new THREE.Raycaster();
const tempVec3 = new THREE.Vector3();
const tempVec3b = new THREE.Vector3();
const tempBox3 = new THREE.Box3();

// Bot materials (T palette)
const botBodyMat = new THREE.MeshStandardMaterial({ color: 0x8a7355, roughness: 0.7, metalness: 0.2 }); // khaki/tan
const botHeadMat = new THREE.MeshStandardMaterial({ color: 0x6e5c43, roughness: 0.7, metalness: 0.2 }); // darker tan
const botGunMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.8 }); // black
const botHitMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0.2 });
const botDeathMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9, metalness: 0.1 });

// ==== HUD UPDATE ====
function updateHUD() {
  healthVal.textContent = health;
  armorVal.textContent = armor;
  moneyVal.textContent = money;
  weaponNameEl.textContent = `WEAPON: ${currentWeapon.name}`;
  ammoVal.textContent = currentAmmo;
  ammoReserve.textContent = reserveAmmo;
  ctWinsEl.textContent = ctWins;
  tWinsEl.textContent = tWins;
  roundDisplay.textContent = `ROUND ${currentRound}/${MAX_ROUNDS}`;
  
  if (roundTimerActive) {
    timerEl.textContent = `TIME: ${Math.ceil(roundTimer)}s`;
    timerEl.style.display = 'block';
    if (roundTimer < 10) timerEl.style.color = '#ff3333';
    else timerEl.style.color = '#ff4444';
  } else {
    timerEl.style.display = 'none';
  }
  
  // Freezetime display
  if (isFreezetime) {
    freezetimeEl.textContent = `FREEZETIME: ${Math.ceil(freezetimeTimer)}`;
    freezetimeEl.style.display = 'block';
  } else {
    freezetimeEl.style.display = 'none';
  }
  
  // Buy button states
  buySmgBtn.disabled = money < WEAPONS.smg.price || primaryWeapon === WEAPONS.smg;
  buyRifleBtn.disabled = money < WEAPONS.rifle.price || primaryWeapon === WEAPONS.rifle;
  buyArmorBtn.disabled = money < ARMOR_PRICE || armor >= MAX_ARMOR;
  buyPistolBtn.disabled = true; // always owned
}

// ==== BOT CREATION ====
function createBot(x, z, isPatrol = false, patrolRange = 0, isRifleBot = false) {
  const botGroup = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(0.8, 1.1, 0.45);
  const body = new THREE.Mesh(bodyGeo, botBodyMat.clone());
  body.position.set(0, 1.1 / 2 + 0.35, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  botGroup.add(body);

  const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  const head = new THREE.Mesh(headGeo, botHeadMat.clone());
  head.position.set(0, 1.1 + 0.35 + 0.175, 0);
  head.castShadow = true;
  head.receiveShadow = true;
  botGroup.add(head);

  // Visual variant: rifle bot has longer barrel
  const gunLength = isRifleBot ? 0.8 : 0.5;
  const gunGeo = new THREE.BoxGeometry(0.08, 0.08, gunLength);
  const gun = new THREE.Mesh(gunGeo, botGunMat.clone());
  gun.position.set(0.45, 1.1 + 0.1, 0);
  gun.castShadow = true;
  botGroup.add(gun);

  botGroup.position.set(x, 0, z);
  botGroup.userData = {
    health: 100,
    alive: true,
    state: isPatrol ? 'patrol' : 'idle',
    homePos: new THREE.Vector3(x, 0, z),
    patrolRange: patrolRange,
    patrolDir: 1,
    speed: 2.5 + Math.random() * 1.0,
    shotCooldown: isRifleBot ? 0.9 + (Math.random() - 0.5) * 0.4 : 1.1 + (Math.random() - 0.5) * 0.6,
    shotTimer: 0,
    nextLOScheck: Math.random() * 0.15,
    lastShot: 0,
    LOSlostTimer: 0,
    hasLOS: false,
    bodyMesh: body,
    headMesh: head,
    gunMesh: gun,
    originalBodyColor: body.material.color.clone(),
    hitFlashTimer: 0,
    deathTimer: 0,
    isDying: false,
    isRifleBot: isRifleBot,
    botDamage: isRifleBot ? 8 + Math.floor(Math.random() * 7) : 5 + Math.floor(Math.random() * 5) // 8-14 or 5-9
  };

  scene.add(botGroup);
  return botGroup;
}

// ==== SPAWN BOTS FOR ROUND ====
function spawnBotsForRound(round) {
  bots.forEach(bot => {
    scene.remove(bot);
    bot.userData.bodyMesh.geometry.dispose();
    bot.userData.headMesh.geometry.dispose();
    bot.userData.gunMesh.geometry.dispose();
  });
  bots = [];

  let botCount = 3;
  if (round === 2) botCount = 4;
  else if (round >= 3) botCount = 5;

  const positions = [];
  const halfArena = arena - 5;

  for (let i = 0; i < botCount; i++) {
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

  // ~half rifle bots
  const rifleCount = Math.floor(botCount / 2);
  
  for (let i = 0; i < botCount; i++) {
    const pos = positions[i];
    const isRifle = i < rifleCount;
    const bot = createBot(pos.x, pos.z, false, 0, isRifle);
    bots.push(bot);
  }
}

// ==== ROUND FLOW ====
function startMatch() {
  currentRound = 1;
  ctWins = 0;
  tWins = 0;
  money = 800;
  armor = 0;
  primaryWeapon = { ...WEAPONS.pistol };
  currentWeapon = { ...WEAPONS.pistol };
  currentAmmo = WEAPONS.pistol.magSize;
  reserveAmmo = WEAPONS.pistol.reserve;
  health = 100;
  isMatchOver = false;
  isGameOver = false;
  camera.position.set(0, 1.7, 10);
  velocity.set(0, 0, 0);
  mouse.x = 0;
  mouse.y = 0;
  touchFiring = false;
  joyDX = 0; joyDY = 0;
  joyPointerId = null;
  lookPointerId = null;
  if (touchMode) document.body.classList.remove('playing');
  damageFlash.classList.remove('active');
  gameOverOverlay.classList.remove('visible');
  victoryOverlay.classList.remove('visible');
  roundWonEl.classList.remove('visible');
  roundLostEl.classList.remove('visible');
  buyMenu.classList.remove('visible');
  startRound();
}

function startRound() {
  isRoundEnding = false;
  health = 100;
  currentAmmo = currentWeapon.magSize;
  reserveAmmo = currentWeapon.reserve;
  isReloading = false;
  reloadTimer = 0;
  
  camera.position.set(0, 1.7, 10);
  camera.rotation.y = Math.PI;
  mouse.x = Math.PI;
  mouse.y = 0;
  velocity.set(0, 0, 0);
  
  spawnBotsForRound(currentRound);
  roundTimer = 60;
  roundTimerActive = true;
  
  isFreezetime = true;
  freezetimeTimer = 8;
  
  updateHUD();
  showStartOverlay();
}

function showStartOverlay() {
  startTitle.textContent = `ROUND ${currentRound}`;
  startDesc.textContent = `Eliminate ${bots.length} terrorists | FREEZETIME: 8s`;
  startOverlay.classList.remove('hidden');
  hud.classList.remove('visible');
  crosshair.classList.remove('visible');
  if (touchMode) document.body.classList.remove('playing');
}

function endFreezetime() {
  isFreezetime = false;
  startOverlay.classList.add('hidden');
  hud.classList.add('visible');
  crosshair.classList.add('visible');
  if (!touchMode) canvas.requestPointerLock();
  if (touchMode) document.body.classList.add('playing');
}

function roundWon() {
  if (isRoundEnding) return;
  isRoundEnding = true;
  roundTimerActive = false;
  ctWins++;
  money += ROUND_WIN_REWARD;
  
  roundWonEl.classList.add('visible');
  hud.classList.remove('visible');
  crosshair.classList.remove('visible');
  
  setTimeout(() => {
    roundWonEl.classList.remove('visible');
    checkMatchEnd();
  }, 2500);
}

function roundLost() {
  if (isRoundEnding) return;
  isRoundEnding = true;
  roundTimerActive = false;
  tWins++;
  money += ROUND_LOSS_REWARD;
  
  roundLostEl.classList.add('visible');
  hud.classList.remove('visible');
  crosshair.classList.remove('visible');
  
  setTimeout(() => {
    roundLostEl.classList.remove('visible');
    checkMatchEnd();
  }, 2500);
}

function checkMatchEnd() {
  if (ctWins >= ROUNDS_TO_WIN) {
    matchWon();
  } else if (tWins >= ROUNDS_TO_WIN) {
    matchLost();
  } else {
    currentRound++;
    startRound();
  }
}

function matchWon() {
  isMatchOver = true;
  victoryTitle.textContent = 'MATCH WON';
  victoryTitle.style.color = '#00ff88';
  victoryTitle.style.textShadow = '0 0 30px #00ff88';
  victoryCt.textContent = ctWins;
  victoryT.textContent = tWins;
  victoryOverlay.classList.add('visible');
  hud.classList.remove('visible');
  crosshair.classList.remove('visible');
}

function matchLost() {
  isMatchOver = true;
  isGameOver = true;
  victoryTitle.textContent = 'MATCH LOST';
  victoryTitle.style.color = '#ff3333';
  victoryTitle.style.textShadow = '0 0 30px #ff3333';
  victoryCt.textContent = ctWins;
  victoryT.textContent = tWins;
  victoryOverlay.classList.add('visible');
  hud.classList.remove('visible');
  crosshair.classList.remove('visible');
}

function resetMatch() {
  startMatch();
}

// ==== BUY MENU ====
let buyMenuOpen = false;

function toggleBuyMenu() {
  if (isRoundEnding || isMatchOver) return;
  buyMenuOpen = !buyMenuOpen;
  if (buyMenuOpen) {
    buyMenu.classList.add('visible');
    updateHUD(); // refresh button states
  } else {
    buyMenu.classList.remove('visible');
  }
}

function buyWeapon(type) {
  const weapon = WEAPONS[type];
  if (money >= weapon.price && primaryWeapon !== weapon) {
    money -= weapon.price;
    primaryWeapon = { ...weapon };
    // If currently holding primary, switch to it
    if (currentWeapon !== WEAPONS.pistol) {
      currentWeapon = { ...primaryWeapon };
      currentAmmo = primaryWeapon.magSize;
      reserveAmmo = primaryWeapon.reserve;
    }
    updateHUD();
  }
}

function buyArmor() {
  if (money >= ARMOR_PRICE && armor < MAX_ARMOR) {
    money -= ARMOR_PRICE;
    armor = MAX_ARMOR;
    updateHUD();
  }
}

buyPistolBtn.addEventListener('click', () => {}); // owned, no-op
buySmgBtn.addEventListener('click', () => buyWeapon('smg'));
buyRifleBtn.addEventListener('click', () => buyWeapon('rifle'));
buyArmorBtn.addEventListener('click', buyArmor);

buyMenu.addEventListener('click', (e) => {
  if (e.target === buyMenu) toggleBuyMenu();
});

// ==== WEAPON SWITCHING ====
function switchWeapon(slot) {
  if (isReloading || isRoundEnding) return;
  if (slot === 1) { // Primary
    if (primaryWeapon !== WEAPONS.pistol) {
      currentWeapon = { ...primaryWeapon };
      currentAmmo = primaryWeapon.magSize;
      reserveAmmo = primaryWeapon.reserve;
    }
  } else if (slot === 2) { // Pistol
    currentWeapon = { ...WEAPONS.pistol };
    currentAmmo = WEAPONS.pistol.magSize;
    reserveAmmo = WEAPONS.pistol.reserve;
  }
  isReloading = false;
  reloadTimer = 0;
  updateHUD();
}

// ==== SHOOTING ====
function shoot() {
  if (currentAmmo <= 0 || isReloading || isFreezetime || isRoundEnding || isMatchOver) return;
  
  const now = performance.now() / 1000;
  const timeSinceLastShot = now - lastShotTime;
  const minInterval = 1 / currentWeapon.fireRate;
  
  if (!currentWeapon.fullAuto && timeSinceLastShot < minInterval) return;
  if (currentWeapon.fullAuto && timeSinceLastShot < minInterval) return;
  
  lastShotTime = now;
  currentAmmo--;
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
  
  // Apply spread
  dir.x += (Math.random() - 0.5) * currentWeapon.spread;
  dir.y += (Math.random() - 0.5) * currentWeapon.spread;
  dir.z += (Math.random() - 0.5) * currentWeapon.spread;
  dir.normalize();
  
  dir.applyEuler(new THREE.Euler(-recoil * 2, 0, 0));

  raycastShoot(origin, dir, true);
}

function raycastShoot(origin, dir, isPlayer) {
  const ray = new THREE.Raycaster(origin, dir, 0, 100);

  const wallIntersects = ray.intersectObjects(walls, true);
  let botIntersect = null;
  let minBotDist = Infinity;

  for (const bot of bots) {
    if (!bot.userData.alive) continue;
    const botBox = tempBox3.setFromCenterAndSize(
      bot.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
      new THREE.Vector3(1.0, 1.8, 1.0)
    );
    ray.ray.intersectBox(botBox, tempVec3);
    if (tempVec3) {
      const dist = origin.distanceTo(tempVec3);
      if (dist < minBotDist) {
        minBotDist = dist;
        botIntersect = { point: tempVec3.clone(), object: bot, distance: dist };
      }
    }
  }

  let hitPoint, hitObject, hitIsBot = false;
  const wallHit = wallIntersects[0];
  if (botIntersect && (!wallHit || botIntersect.distance < wallHit.distance)) {
    hitPoint = botIntersect.point;
    hitObject = botIntersect.object;
    hitIsBot = true;
  } else if (wallHit) {
    hitPoint = wallHit.point;
    hitObject = wallHit.object;
  } else {
    hitPoint = origin.clone().addScaledVector(dir, 100);
  }

  if (!isPlayer) {
    const playerChest = new THREE.Vector3();
    camera.getWorldPosition(playerChest);
    playerChest.y = 1.7;
    const toPlayer = new THREE.Vector3().subVectors(playerChest, origin);
    const playerDist = toPlayer.length();
    const playerDir = toPlayer.clone().normalize();
    const cosAngle = dir.dot(playerDir);
    if (cosAngle > 0.98 && playerDist <= 25) {
      let blocked = false;
      if (wallHit && wallHit.distance < playerDist) blocked = true;
      if (botIntersect && botIntersect.distance < playerDist) blocked = true;
      if (!blocked) {
        hitPoint = playerChest.clone();
        hitObject = camera;
        applyPlayerDamage(hitObject.userData?.botDamage || 10);
      }
    }
  }

  if (isPlayer) {
    tracerGeo.setFromPoints([origin.clone(), hitPoint.clone()]);
    tracerMat.opacity = 1;
    tracerTime = 0.08;
  } else {
    botTracerGeo.setFromPoints([origin.clone(), hitPoint.clone()]);
    botTracerMat.color.setHex(0xff0000);
    botTracerMat.opacity = 1;
    botTracerTime = 0.08;
  }

  if (hitPoint && hitObject !== floor) {
    const sparkCount = isPlayer ? 50 : 30;
    const positions = isPlayer ? sparkPositions : botSparkPositions;
    const velocities = isPlayer ? sparkVelocities : botSparkVelocities;
    for (let i = 0; i < sparkCount; i++) {
      positions[i * 3] = hitPoint.x;
      positions[i * 3 + 1] = hitPoint.y;
      positions[i * 3 + 2] = hitPoint.z;
      const v = velocities[i];
      v.set((Math.random() - 0.5) * 10, Math.random() * 5 + 2, (Math.random() - 0.5) * 10);
    }
    if (isPlayer) {
      sparkGeo.attributes.position.needsUpdate = true;
      sparkMat.opacity = 1;
      sparkTime = 0.5;
    } else {
      botSparkGeo.attributes.position.needsUpdate = true;
      botSparkMat.opacity = 1;
      botSparkTime = 0.4;
    }

    if (hitIsBot) {
      const bot = hitObject;
      const ud = bot.userData;
      ud.health -= currentWeapon.damage;
      ud.hitFlashTimer = 0.15;
      ud.bodyMesh.material.color.setHex(0xff6666);
      ud.headMesh.material.color.setHex(0xff6666);

      if (ud.health <= 0) {
        killBot(bot);
      }
    }
  }
}

function reload() {
  if (isReloading || currentAmmo >= currentWeapon.magSize || reserveAmmo <= 0 || isFreezetime || isRoundEnding) return;
  isReloading = true;
  reloadTimer = currentWeapon.reloadTime;
  updateHUD();
}

// ==== BOT SHOOTING ====
function botShoot(bot) {
  const ud = bot.userData;
  const gunWorldPos = new THREE.Vector3();
  ud.gunMesh.getWorldPosition(gunWorldPos);

  const playerPos = new THREE.Vector3();
  camera.getWorldPosition(playerPos);
  playerPos.y = 1.7;

  const dir = new THREE.Vector3().subVectors(playerPos, gunWorldPos).normalize();

  const spread = ud.isRifleBot ? 0.05 : 0.12;
  dir.x += (Math.random() - 0.5) * spread;
  dir.y += (Math.random() - 0.5) * spread;
  dir.z += (Math.random() - 0.5) * spread;
  dir.normalize();

  raycastShoot(gunWorldPos, dir, false);

  const flash = new THREE.PointLight(0xff0000, 30, 5);
  flash.position.copy(gunWorldPos);
  scene.add(flash);
  setTimeout(() => { scene.remove(flash); }, 50);

  ud.shotTimer = ud.shotCooldown;
}

function killBot(bot) {
  const ud = bot.userData;
  if (ud.isDying) return;
  ud.isDying = true;
  ud.alive = false;
  ud.deathTimer = 1.4;
  money += KILL_REWARD;
  updateHUD();

  // Check round win
  const aliveBots = bots.filter(b => b.userData.alive).length;
  if (aliveBots === 0) {
    roundWon();
  }
}

// ==== PLAYER DAMAGE WITH ARMOR ====
function applyPlayerDamage(amount) {
  if (isGameOver || isRoundEnding) return;
  
  if (armor > 0) {
    const armorDamage = Math.ceil(amount * ARMOR_ABSORPTION);
    const healthDamage = Math.floor(amount * ARMOR_ABSORPTION);
    armor = Math.max(0, armor - armorDamage);
    health -= healthDamage;
  } else {
    health -= amount;
  }
  health = Math.max(0, health);
  updateHUD();
  damageFlash.classList.add('active');
  setTimeout(() => damageFlash.classList.remove('active'), 300);

  if (health <= 0) {
    roundLost();
  }
}

// ==== BOT AI (KEEP EXISTING LOGIC) ====
function checkLOS(bot) {
  const ud = bot.userData;
  const headWorldPos = new THREE.Vector3();
  ud.headMesh.getWorldPosition(headWorldPos);

  const playerPos = new THREE.Vector3();
  camera.getWorldPosition(playerPos);

  const dist = headWorldPos.distanceTo(playerPos);
  if (dist > 22) {
    ud.hasLOS = false;
    return false;
  }

  const dir = new THREE.Vector3().subVectors(playerPos, headWorldPos).normalize();
  losRaycaster.set(headWorldPos, dir);
  losRaycaster.far = dist;

  const wallIntersects = losRaycaster.intersectObjects(walls, true);
  if (wallIntersects.length > 0) {
    ud.hasLOS = false;
    return false;
  }

  for (const otherBot of bots) {
    if (otherBot === bot || !otherBot.userData.alive) continue;
    const otherBox = tempBox3.setFromCenterAndSize(
      otherBot.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
      new THREE.Vector3(1.0, 1.8, 1.0)
    );
    if (losRaycaster.ray.intersectBox(otherBox, tempVec3)) {
      const hitDist = headWorldPos.distanceTo(tempVec3);
      if (hitDist < dist) {
        ud.hasLOS = false;
        return false;
      }
    }
  }

  ud.hasLOS = true;
  return true;
}

function updateBots(dt) {
  const playerPos = new THREE.Vector3();
  camera.getWorldPosition(playerPos);

  for (const bot of bots) {
    const ud = bot.userData;
    if (!ud.alive) {
      if (ud.isDying) {
        ud.deathTimer -= dt;
        const fallProgress = 1 - ud.deathTimer / 1.4;
        if (fallProgress < 0.4) {
          bot.rotation.x = -Math.PI / 2 * (fallProgress / 0.4);
        } else {
          bot.position.y = -(fallProgress - 0.4) / 0.6 * 1.5;
        }
        if (ud.deathTimer <= 0) {
          scene.remove(bot);
          ud.bodyMesh.geometry.dispose();
          ud.headMesh.geometry.dispose();
          ud.gunMesh.geometry.dispose();
        }
      }
      continue;
    }

    if (isFreezetime) continue;

    if (ud.hitFlashTimer > 0) {
      ud.hitFlashTimer -= dt;
      if (ud.hitFlashTimer <= 0) {
        ud.bodyMesh.material.color.copy(ud.originalBodyColor);
        ud.headMesh.material.color.copy(ud.originalBodyColor);
      }
    }

    if (ud.shotTimer > 0) ud.shotTimer -= dt;

    if (ud.state === 'idle') {
      ud.nextLOScheck -= dt;
      if (ud.nextLOScheck <= 0) {
        ud.nextLOScheck = 0.15 + Math.random() * 0.1;
        if (checkLOS(bot)) {
          ud.state = 'chase';
        }
      }
      bot.rotation.y += Math.sin(performance.now() * 0.001 + bot.position.x) * 0.0005;
    }
    else if (ud.state === 'patrol') {
      ud.nextLOScheck -= dt;
      if (ud.nextLOScheck <= 0) {
        ud.nextLOScheck = 0.15 + Math.random() * 0.1;
        if (checkLOS(bot)) {
          ud.state = 'chase';
        }
      }

      bot.position.x += ud.patrolDir * 2.0 * dt;
      if (Math.abs(bot.position.x - ud.homePos.x) >= ud.patrolRange) {
        ud.patrolDir *= -1;
        bot.position.x = ud.homePos.x + ud.patrolDir * ud.patrolRange;
      }

      const targetRot = Math.atan2(ud.patrolDir, 0);
      bot.rotation.y = THREE.MathUtils.lerp(bot.rotation.y, targetRot, 0.1);
    }
    else if (ud.state === 'chase') {
      const hasLOS = checkLOS(bot);
      if (hasLOS) {
        ud.LOSlostTimer = 0;
      } else {
        ud.LOSlostTimer += dt;
        if (ud.LOSlostTimer > 2.5) {
          ud.state = 'patrol';
          ud.LOSlostTimer = 0;
        }
      }

      const toPlayer = new THREE.Vector3().subVectors(playerPos, bot.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();

      if (dist < 1.2) {
        const pushDir = toPlayer.normalize().multiplyScalar(-1);
        bot.position.addScaledVector(pushDir, (1.2 - dist) * 2 * dt);
      }

      if (dist > 1.2 && dist < 18 && hasLOS && ud.shotTimer <= 0) {
        ud.state = 'attack';
      } else if (dist > 1.2) {
        const moveDir = toPlayer.normalize();
        const moveX = moveDir.x * ud.speed * dt;
        const moveZ = moveDir.z * ud.speed * dt;

        const botBox = tempBox3.setFromCenterAndSize(
          bot.position.clone().add(new THREE.Vector3(moveX, 0.9, 0)),
          new THREE.Vector3(1.0, 1.8, 1.0)
        );
        let hitWall = false;
        for (const wallBox of wallBoxes) {
          if (botBox.intersectsBox(wallBox)) { hitWall = true; break; }
        }
        if (!hitWall) bot.position.x += moveX;

        const botBoxZ = tempBox3.setFromCenterAndSize(
          bot.position.clone().add(new THREE.Vector3(0, 0.9, moveZ)),
          new THREE.Vector3(1.0, 1.8, 1.0)
        );
        hitWall = false;
        for (const wallBox of wallBoxes) {
          if (botBoxZ.intersectsBox(wallBox)) { hitWall = true; break; }
        }
        if (!hitWall) bot.position.z += moveZ;

        bot.position.x = THREE.MathUtils.clamp(bot.position.x, -38, 38);
        bot.position.z = THREE.MathUtils.clamp(bot.position.z, -38, 38);

        for (const otherBot of bots) {
          if (otherBot === bot || !otherBot.userData.alive) continue;
          const sepDist = bot.position.distanceTo(otherBot.position);
          if (sepDist < 1.5 && sepDist > 0.01) {
            const sepDir = new THREE.Vector3().subVectors(bot.position, otherBot.position).normalize();
            bot.position.addScaledVector(sepDir, (1.5 - sepDist) * 0.5 * dt);
          }
        }
      }

      const targetRot = Math.atan2(playerPos.x - bot.position.x, playerPos.z - bot.position.z);
      bot.rotation.y = THREE.MathUtils.lerp(bot.rotation.y, targetRot, 0.15);
    }
    else if (ud.state === 'attack') {
      const hasLOS = checkLOS(bot);
      const toPlayer = new THREE.Vector3().subVectors(playerPos, bot.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();

      if (!hasLOS || dist > 20) {
        ud.state = 'chase';
      } else if (dist < 1.2) {
        ud.state = 'chase';
      } else if (ud.shotTimer <= 0) {
        botShoot(bot);
      }

      const targetRot = Math.atan2(playerPos.x - bot.position.x, playerPos.z - bot.position.z);
      bot.rotation.y = THREE.MathUtils.lerp(bot.rotation.y, targetRot, 0.2);
    }
  }
}

// ==== INPUT HANDLERS ====
function onPointerLockChange() {
  pointerLocked = document.pointerLockElement === canvas;
  if (!pointerLocked && !touchMode && !isFreezetime && !isRoundEnding && !isMatchOver && !buyMenuOpen) {
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
  
  if (k === 'keyr') reload();
  if (k === 'keyb') toggleBuyMenu();
  if (k === 'escape') { if (buyMenuOpen) toggleBuyMenu(); }
  if (k === 'digit1') switchWeapon(1);
  if (k === 'digit2') switchWeapon(2);
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
  if (!touchMode && pointerLocked && !buyMenuOpen) shoot();
}

// ==== TOUCH INPUT HANDLERS ====
if (touchMode) {
  const joystickZone = document.getElementById('joystick-zone');
  const joystickBase = document.getElementById('joystick-base');
  const joystickKnob = document.getElementById('joystick-knob');
  const lookZone = document.getElementById('look-zone');
  const fireBtn = document.getElementById('fire-btn');
  const reloadBtn = document.getElementById('reload-btn');
  const buyBtn = document.getElementById('buy-btn');
  const swapBtn = document.getElementById('swap-btn');
  const JOY_RADIUS = 50;

  function updateJoystick(e) {
    const rect = joystickBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > JOY_RADIUS) { dx = (dx / len) * JOY_RADIUS; dy = (dy / len) * JOY_RADIUS; }
    joyDX = dx / JOY_RADIUS;
    joyDY = dy / JOY_RADIUS;
    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  joystickZone.addEventListener('pointerdown', (e) => {
    if (joyPointerId !== null) return;
    joyPointerId = e.pointerId;
    joystickZone.setPointerCapture(e.pointerId);
    updateJoystick(e);
  });
  joystickZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyPointerId) return;
    updateJoystick(e);
  });
  const endJoy = (e) => {
    if (e.pointerId !== joyPointerId) return;
    joyPointerId = null;
    joyDX = 0; joyDY = 0;
    joystickKnob.style.transform = 'translate(0px, 0px)';
  };
  joystickZone.addEventListener('pointerup', endJoy);
  joystickZone.addEventListener('pointercancel', endJoy);

  lookZone.addEventListener('pointerdown', (e) => {
    if (lookPointerId !== null) return;
    lookPointerId = e.pointerId;
    lookZone.setPointerCapture(e.pointerId);
    lookLastX = e.clientX;
    lookLastY = e.clientY;
  });
  lookZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== lookPointerId) return;
    const dx = e.clientX - lookLastX;
    const dy = e.clientY - lookLastY;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    mouse.x -= dx * 0.004;
    mouse.y -= dy * 0.004;
    mouse.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouse.y));
  });
  const endLook = (e) => { if (e.pointerId === lookPointerId) lookPointerId = null; };
  lookZone.addEventListener('pointerup', endLook);
  lookZone.addEventListener('pointercancel', endLook);

  fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); touchFiring = true; shoot(); });
  fireBtn.addEventListener('pointerup', () => { touchFiring = false; });
  fireBtn.addEventListener('pointercancel', () => { touchFiring = false; });
  reloadBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); reload(); });
  buyBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); toggleBuyMenu(); });
  swapBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (currentWeapon.name === 'PISTOL') switchWeapon(1); else switchWeapon(2);
  });
  // COD Mobile-style: JUMP button (tap to jump, like Space on desktop)
  const jumpBtn = document.getElementById('jump-btn');
  jumpBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (canJump) { velocity.y = 7; canJump = false; }
  });
  // COD Mobile-style: SPRINT button (hold to sprint, like Shift on desktop)
  const sprintBtn = document.getElementById('sprint-btn');
  sprintBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); keys.shift = true; });
  sprintBtn.addEventListener('pointerup', () => { keys.shift = false; });
  sprintBtn.addEventListener('pointercancel', () => { keys.shift = false; });
}

// ==== MAIN LOOP ====
function animate(time) {
  requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  frames++;
  if (time - lastFpsTime > 1000) { fps = frames; frames = 0; lastFpsTime = time; }
  fpsEl.textContent = `FPS: ${fps}`;

  const canControl = (pointerLocked || touchMode) && !isFreezetime && !isRoundEnding && !isMatchOver && !buyMenuOpen;
  if (canControl) {
    direction.z = Number(keys.w) - Number(keys.s);
    direction.x = Number(keys.d) - Number(keys.a);
    direction.normalize();

    if (touchMode) {
      keys.w = joyDY < -0.25; keys.s = joyDY > 0.25;
      keys.a = joyDX < -0.25; keys.d = joyDX > 0.25;
    }

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
    for (const wallBox of wallBoxes) {
      if (testBoxX.intersectsBox(wallBox)) { moveX = 0; velocity.x = 0; hitWall = true; }
      if (testBoxZ.intersectsBox(wallBox)) { moveZ = 0; velocity.z = 0; hitWall = true; }
    }
    for (const bot of bots) {
      if (!bot.userData.alive) continue;
      const botBox = tempBox3.setFromCenterAndSize(
        bot.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
        new THREE.Vector3(1.0, 1.8, 1.0)
      );
      if (testBoxX.intersectsBox(botBox)) { moveX = 0; velocity.x = 0; }
      if (testBoxZ.intersectsBox(botBox)) { moveZ = 0; velocity.z = 0; }
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

    updateBots(dt);

    if (roundTimerActive) {
      roundTimer -= dt;
      if (roundTimer <= 0) {
        roundTimer = 0;
        roundTimerActive = false;
        roundLost();
      }
      updateHUD();
    }
  }

  // Touch fire (hold FIRE)
  if (touchMode && touchFiring && !isFreezetime && !isRoundEnding && !isMatchOver && !buyMenuOpen) shoot();

  // Freezetime countdown
  if (isFreezetime) {
    freezetimeTimer -= dt;
    updateHUD();
    if (freezetimeTimer <= 0) {
      freezetimeTimer = 0;
      endFreezetime();
    }
  }

  // Reload timer
  if (isReloading) {
    reloadTimer -= dt;
    weaponNameEl.textContent = `WEAPON: ${currentWeapon.name} - RELOADING...`;
    if (reloadTimer <= 0) {
      const need = currentWeapon.magSize - currentAmmo;
      const take = Math.min(need, reserveAmmo);
      currentAmmo += take;
      reserveAmmo -= take;
      isReloading = false;
      updateHUD();
    }
  }

  // Visual effects
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
  if (botTracerTime > 0) {
    botTracerTime -= dt;
    if (botTracerTime <= 0) botTracerMat.opacity = 0;
  }
  if (sparkTime > 0) {
    sparkTime -= dt;
    for (let i = 0; i < 50; i++) {
      const v = sparkVelocities[i];
      v.y -= 20 * dt;
      sparkPositions[i * 3] += v.x * dt;
      sparkPositions[i * 3 + 1] += v.y * dt;
      sparkPositions[i * 3 + 2] += v.z * dt;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkMat.opacity = Math.max(0, sparkTime * 2);
    if (sparkTime <= 0) sparkMat.opacity = 0;
  }
  if (botSparkTime > 0) {
    botSparkTime -= dt;
    for (let i = 0; i < 30; i++) {
      const v = botSparkVelocities[i];
      v.y -= 20 * dt;
      botSparkPositions[i * 3] += v.x * dt;
      botSparkPositions[i * 3 + 1] += v.y * dt;
      botSparkPositions[i * 3 + 2] += v.z * dt;
    }
    botSparkGeo.attributes.position.needsUpdate = true;
    botSparkMat.opacity = Math.max(0, botSparkTime * 2.5);
    if (botSparkTime <= 0) botSparkMat.opacity = 0;
  }

  renderer.render(scene, camera);
}

// ==== EVENT LISTENERS ====
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

playAgainBtn.addEventListener('click', resetMatch);
retryBtn.addEventListener('click', resetMatch);

// Touch: tap start overlay to dismiss immediately (buy early, freezetime keeps running)
startOverlay.addEventListener('click', () => {
  if (touchMode && isFreezetime) {
    startOverlay.classList.add('hidden');
    hud.classList.add('visible');
    crosshair.classList.add('visible');
    document.body.classList.add('playing');
  }
});

window.startGame = startMatch;

// ==== INIT ====
startMatch();
animate(performance.now());
updateHUD();