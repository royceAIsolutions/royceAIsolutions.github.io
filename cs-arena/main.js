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

// ==== AUDIO (WebAudio-synthesized SFX — zero asset files, works on iPad) ====
const AudioSys = {
  ctx: null,
  master: null,
  noiseBuf: null,
  muted: false,
  enabled: false,
  init() {
    if (this.ctx) {
      // Chrome/Safari keep the context suspended until a user gesture; resume
      // whenever init runs inside one (pointerdown/keydown/click handlers).
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.enabled = true;
    } catch (e) { this.enabled = false; }
  },
  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
    const btn = document.getElementById('mute-btn');
    if (btn) { btn.textContent = this.muted ? '🔇' : '🔊'; btn.classList.toggle('muted', this.muted); }
    return this.muted;
  },
  _noise(dur, opts = {}) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + (opts.at || 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = opts.type || 'bandpass';
    filter.frequency.value = opts.freq || 1000;
    if (opts.q) filter.Q.value = opts.q;
    const g = this.ctx.createGain();
    const peak = opts.gain || 0.3;
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  },
  _tone(freq, dur, opts = {}) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + (opts.at || 0);
    const o = this.ctx.createOscillator();
    o.type = opts.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    const g = this.ctx.createGain();
    const peak = opts.gain || 0.25;
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  _seq(notes, gap) {
    notes.forEach((n, i) => {
      this._tone(n.f, n.d, { type: n.type || 'square', gain: n.gain || 0.18, at: i * gap });
    });
  },
  // ---- gameplay SFX ----
  shoot(w) {
    if (w.name === 'M4') {
      this._noise(0.14, { freq: 750, q: 0.8, gain: 0.5 });
      this._tone(150, 0.1, { type: 'square', slideTo: 60, gain: 0.35 });
      this._noise(0.05, { freq: 2600, q: 1, gain: 0.12 });
    } else if (w.name === 'MP5') {
      this._noise(0.09, { freq: 1100, q: 0.9, gain: 0.4 });
      this._tone(170, 0.07, { type: 'square', slideTo: 80, gain: 0.3 });
    } else {
      this._noise(0.1, { freq: 1700, q: 1.2, gain: 0.45 });
      this._tone(240, 0.09, { type: 'square', slideTo: 90, gain: 0.32 });
    }
  },
  botShot() { this._noise(0.08, { freq: 900, q: 0.8, gain: 0.16 }); },
  empty() { this._tone(1800, 0.025, { type: 'square', gain: 0.08 }); },
  hit() { this._tone(950, 0.045, { type: 'square', gain: 0.16 }); },
  headshot() { this._tone(1150, 0.06, { type: 'square', gain: 0.2 }); this._tone(1750, 0.09, { type: 'square', gain: 0.16 }); },
  hurt() { this._noise(0.12, { freq: 300, q: 0.7, gain: 0.3 }); this._tone(110, 0.14, { type: 'sine', slideTo: 60, gain: 0.35 }); },
  kill() { this._tone(660, 0.08, { type: 'square', gain: 0.18 }); this._tone(440, 0.1, { type: 'square', gain: 0.14 }); },
  buy() { this._seq([{ f: 523, d: 0.07 }, { f: 784, d: 0.1 }], 0.06); },
  swap() { this._noise(0.025, { freq: 2200, q: 2, gain: 0.12 }); },
  tick() { this._tone(1050, 0.03, { type: 'square', gain: 0.1 }); },
  go() { this._tone(1560, 0.16, { type: 'square', gain: 0.2 }); },
  reload() {
    this._noise(0.03, { freq: 2500, q: 2, gain: 0.18 });
    this._noise(0.03, { freq: 1900, q: 2, gain: 0.15, at: 0.16 });
  },
  footstep() { this._noise(0.05, { freq: 420, type: 'lowpass', gain: 0.1 }); },
  death() { this._noise(0.35, { freq: 250, q: 0.6, gain: 0.45 }); this._tone(180, 0.4, { type: 'sawtooth', slideTo: 40, gain: 0.3 }); },
  streak() { this._seq([{ f: 784, d: 0.08 }, { f: 988, d: 0.08 }, { f: 1319, d: 0.16 }], 0.05); },
  roundWin() { this._seq([{ f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.22 }], 0.11); },
  roundLoss() { this._seq([{ f: 392, d: 0.14 }, { f: 330, d: 0.14 }, { f: 262, d: 0.28 }], 0.12); },
  matchWin() { this._seq([{ f: 523, d: 0.14 }, { f: 659, d: 0.14 }, { f: 784, d: 0.14 }, { f: 1047, d: 0.34 }], 0.12); },
  // ---- ambient music (synthesized pad loop — zero assets, additive) ----
  AMBIENT: {
    dust:      { base: 110.0,  type: 'sine',     notes: [0, 3, 7, 12], filter: 900 }, // warm day — A major
    warehouse: { base: 82.41,  type: 'sawtooth', notes: [0, 3, 7],      filter: 550 }, // industrial — E minor
    rooftop:   { base: 98.0,   type: 'sine',     notes: [0, 7, 10],     filter: 700 }  // cool night — Gm7 frag
  },
  ambientNodes: [],
  _ambientGain: null,
  ambientOn(theme = 'dust') {
    if (!this.enabled) return;
    this.ambientOff();
    const cfg = this.AMBIENT[theme] || this.AMBIENT.dust;
    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.09, t + 3.5); // slow fade-in
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cfg.filter;
    gain.connect(filter); filter.connect(this.master); // mute routes through master
    const nodes = [];
    cfg.notes.forEach((semi, i) => {
      const o = this.ctx.createOscillator();
      o.type = cfg.type;
      o.frequency.value = cfg.base * Math.pow(2, semi / 12);
      const g = this.ctx.createGain();
      g.gain.value = 0.9 / cfg.notes.length;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.017; // slow breathing per voice
      const lg = this.ctx.createGain();
      lg.gain.value = 0.4 / cfg.notes.length; // never pulls voice gain below 0
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(gain);
      o.start(t); lfo.start(t);
      nodes.push(o, lfo, g, lg);
    });
    nodes.push(gain, filter);
    this.ambientNodes = nodes;
    this._ambientGain = gain;
  },
  ambientOff() {
    const g = this._ambientGain;
    if (!g) return;
    const t = this.ctx.currentTime;
    try { g.gain.linearRampToValueAtTime(0.001, t + 0.6); } catch (e) {}
    const stopAt = t + 0.9;
    this.ambientNodes.forEach(n => {
      try { if (typeof n.stop === 'function') n.stop(stopAt); else n.disconnect(); } catch (e) {}
    });
    this.ambientNodes = [];
    this._ambientGain = null;
  },
};
// Audio must start from a user gesture (iOS). Init on first pointer/key interaction.
window.addEventListener('pointerdown', () => AudioSys.init(), { capture: true });
window.addEventListener('keydown', () => AudioSys.init(), { capture: true });
document.getElementById('mute-btn').addEventListener('click', () => AudioSys.toggle());

// ==== THREE.JS SETUP ====
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 10, 80);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
camera.rotation.order = 'YXZ'; // FPS yaw-pitch order — default 'XYZ' rolls the view sideways when yaw+pitch combine (up vector tilts ~17° at 45° yaw + 20° pitch); 'YXZ' keeps up vertical (verified Aug 26 2026)
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
let blockers = [...walls]; // walls + props — used for bullet/LOS raycasts
let propBoxes = [];
let propMeshes = [];

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

// ==== LEVELS (3 maps — layout, theme, difficulty) ====
const crateMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.85, metalness: 0.1 });
const propBarrelMat = new THREE.MeshStandardMaterial({ color: 0x3d5a3d, roughness: 0.5, metalness: 0.6 });
const crateGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
const crateWideGeo = new THREE.BoxGeometry(3.2, 1.2, 1.2);
const propBarrelGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.4, 14);

const LEVELS = [
  {
    name: 'DUST ARENA', difficulty: 'CADET',
    theme: { bg: 0x87ceeb, fog: 0x87ceeb, wall: 0x3a3a4a, crate: 0x6b4a2a, barrel: 0x3d5a3d, floor: 0xb8a888 },
    innerWalls: [], // (x, z, w, d) dividing walls — create lanes
    props: [
      ...[[14, 10], [-14, -10], [14, -10], [-14, 10]].map(([x, z]) => ({ t: 'crate', x, z })),
      { t: 'bunker', x: 0, z: 0 },
      ...[[10, 20], [-10, -20], [10, -20], [-10, 20]].map(([x, z]) => ({ t: 'wide', x, z })),
      ...[[18, 0], [-18, 0], [0, 18], [0, -18], [8, -15], [-8, 15]].map(([x, z]) => ({ t: 'barrel', x, z })),
    ],
    botRounds: [3, 4, 5], timer: 60,
  },
  {
    name: 'WAREHOUSE', difficulty: 'OPERATOR',
    theme: { bg: 0x191410, fog: 0x191410, wall: 0x4a4038, crate: 0x8a6a3a, barrel: 0x556066, floor: 0x3a3528 },
    innerWalls: [
      { x: -14.5, z: -16, w: 23, d: 1.4 }, { x: 14.5, z: -16, w: 23, d: 1.4 },   // lane walls (center gap)
      { x: -14.5, z: 16, w: 23, d: 1.4 }, { x: 14.5, z: 16, w: 23, d: 1.4 },
      { x: -20, z: 0, w: 1.4, d: 26 }, { x: 20, z: 0, w: 1.4, d: 26 },           // side walls with gaps
    ],
    props: [
      { t: 'crate', x: 0, z: -8 }, { t: 'crate', x: 0, z: 8 },                   // center-lane cover
      { t: 'wide', x: -6, z: 0 }, { t: 'wide', x: 6, z: 0 },
      { t: 'crate', x: -14.5, z: 26 }, { t: 'crate', x: 14.5, z: 26 }, { t: 'crate', x: -14.5, z: -26 }, { t: 'crate', x: 14.5, z: -26 },
      { t: 'barrel', x: -26, z: -10 }, { t: 'barrel', x: -26, z: 10 }, { t: 'barrel', x: 26, z: -10 }, { t: 'barrel', x: 26, z: 10 },
      { t: 'barrel', x: -9, z: -16 }, { t: 'barrel', x: 9, z: 16 },
    ],
    botRounds: [4, 5, 6], timer: 75,
  },
  {
    name: 'ROOFTOP FORT', difficulty: 'VETERAN',
    theme: { bg: 0x0e1a2a, fog: 0x0e1a2a, wall: 0x3a4a5a, crate: 0x4a4a5a, barrel: 0x2a3a4a, floor: 0x2a3040 },
    innerWalls: [
      { x: 0, z: -15, w: 22, d: 1.4 }, { x: 0, z: 15, w: 22, d: 1.4 },          // vertical wall (center gap)
      { x: -15, z: 0, w: 1.4, d: 22 }, { x: 15, z: 0, w: 1.4, d: 22 },           // horizontal wall (center gap)
      { x: -30, z: -22, w: 1.4, d: 12 }, { x: 30, z: -22, w: 1.4, d: 12 },       // corner walls
      { x: -30, z: 22, w: 1.4, d: 12 }, { x: 30, z: 22, w: 1.4, d: 12 },
    ],
    props: [
      { t: 'tower', x: -10, z: -10 }, { t: 'tower', x: 10, z: 10 },              // corner towers
      { t: 'bunker', x: 0, z: 0 },
      { t: 'wide', x: -10, z: 10 }, { t: 'wide', x: 10, z: -10 },
      { t: 'crate', x: -22, z: 0 }, { t: 'crate', x: 22, z: 0 }, { t: 'crate', x: 0, z: -22 }, { t: 'crate', x: 0, z: 22 },
      { t: 'barrel', x: -26, z: -26 }, { t: 'barrel', x: 26, z: 26 }, { t: 'barrel', x: -26, z: 26 }, { t: 'barrel', x: 26, z: -26 },
    ],
    botRounds: [5, 6, 7], timer: 90,
  },
];

let currentLevel = 0;
let levelWalls = []; // inner dividing walls (collision + LOS)
let levelProps = []; // cover meshes

// ==== PROCEDURAL TEXTURES (CS-style surfaces, zero external assets) ====
function hexToCss(hex) { return '#' + hex.toString(16).padStart(6, '0'); }
function shade(hex, amt) {
  const r = Math.max(0, Math.min(255, ((hex >> 16) & 0xff) + amt));
  const g = Math.max(0, Math.min(255, ((hex >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (hex & 0xff) + amt));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
function makeTex(size, painter) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  painter(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(g, s, hex, alpha, step) {
  g.fillStyle = hex;
  for (let i = 0; i < 500; i++) {
    g.globalAlpha = alpha * Math.random();
    g.fillRect(Math.random() * s, Math.random() * s, step, step);
  }
  g.globalAlpha = 1;
}
const floorPainter = (hex) => (g, s) => {
  g.fillStyle = hexToCss(hex); g.fillRect(0, 0, s, s);
  speckle(g, s, '#ffffff', 0.05, 2); speckle(g, s, '#000000', 0.06, 2);
  g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 2;
  for (let i = 0; i <= s; i += 128) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke();
  }
};
const wallPainter = (hex) => (g, s) => {
  g.fillStyle = hexToCss(hex); g.fillRect(0, 0, s, s);
  speckle(g, s, '#ffffff', 0.04, 2); speckle(g, s, '#000000', 0.05, 3);
  g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, s * 0.5); g.lineTo(s, s * 0.5); g.stroke();
  g.lineWidth = 1; g.beginPath(); g.moveTo(0, s * 0.25); g.lineTo(s, s * 0.25); g.stroke();
  g.beginPath(); g.moveTo(0, s * 0.75); g.lineTo(s, s * 0.75); g.stroke();
};
const cratePainter = (hex) => (g, s) => {
  const plankH = s / 6;
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? shade(hex, 10) : hexToCss(hex);
    g.fillRect(0, i * plankH, s, plankH);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, i * plankH + plankH - 3, s, 3);
  }
  g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const y = Math.random() * s, x = Math.random() * s;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 46, y + 5); g.stroke();
  }
  g.fillStyle = 'rgba(0,0,0,0.4)';
  for (let i = 0; i < 6; i++) {
    g.beginPath(); g.arc(10, i * plankH + 8, 3, 0, 7); g.fill();
    g.beginPath(); g.arc(s - 10, i * plankH + 8, 3, 0, 7); g.fill();
  }
};
const barrelPainter = (hex) => (g, s) => {
  g.fillStyle = hexToCss(hex); g.fillRect(0, 0, s, s);
  const grad = g.createLinearGradient(0, 0, s, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.35)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.12)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.2)');
  grad.addColorStop(0.75, 'rgba(255,255,255,0.08)');
  grad.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  speckle(g, s, '#000000', 0.08, 3);
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    g.beginPath(); g.moveTo(0, (i + 0.5) * s / 3); g.lineTo(s, (i + 0.5) * s / 3); g.stroke();
  }
};
// sun tint per level: warm day / industrial orange / cool night
const SUNS = [0xfff2dd, 0xffd9a8, 0xa8c4ff];

function buildLevel(idx) {
  const L = LEVELS[idx];
  // clear previous level geometry
  [...levelWalls, ...levelProps].forEach(m => { scene.remove(m); m.geometry && m.geometry.dispose(); });
  levelWalls = []; levelProps = [];
  // theme — CS-style textured surfaces + per-level sun tint
  scene.background.setHex(L.theme.bg);
  scene.fog = new THREE.Fog(L.theme.fog, 10, 80);
  const ft = makeTex(256, floorPainter(L.theme.floor)); ft.repeat.set(16, 16);
  floorMat.map = ft; floorMat.color.setHex(0xffffff); floorMat.needsUpdate = true;
  const wt = makeTex(256, wallPainter(L.theme.wall)); wt.repeat.set(4, 2);
  wallMat.map = wt; wallMat.color.setHex(0xffffff); wallMat.needsUpdate = true;
  const ct = makeTex(256, cratePainter(L.theme.crate)); ct.repeat.set(2, 2);
  crateMat.map = ct; crateMat.color.setHex(0xffffff); crateMat.needsUpdate = true;
  const bt = makeTex(128, barrelPainter(L.theme.barrel)); bt.repeat.set(2, 1);
  propBarrelMat.map = bt; propBarrelMat.color.setHex(0xffffff); propBarrelMat.needsUpdate = true;
  dirLight.color.setHex(SUNS[idx] || 0xfff2dd);
  // base perimeter boxes
  wallBoxes.length = 0;
  walls.forEach(w => wallBoxes.push(new THREE.Box3().setFromObject(w)));
  // inner dividing walls
  L.innerWalls.forEach(spec => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(spec.w, wallH, spec.d), wallMat);
    m.position.set(spec.x, wallH / 2, spec.z);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    levelWalls.push(m);
    wallBoxes.push(new THREE.Box3().setFromObject(m));
  });
  // cover props
  L.props.forEach(spec => {
    let mesh;
    if (spec.t === 'crate') {
      mesh = new THREE.Mesh(crateGeo, crateMat); mesh.position.set(spec.x, 0.9, spec.z);
    } else if (spec.t === 'wide') {
      mesh = new THREE.Mesh(crateWideGeo, crateMat); mesh.position.set(spec.x, 0.6, spec.z);
    } else if (spec.t === 'barrel') {
      mesh = new THREE.Mesh(propBarrelGeo, propBarrelMat); mesh.position.set(spec.x, 0.7, spec.z);
    } else if (spec.t === 'tower') {
      [0.9, 2.7, 4.5].forEach(h => {
        const c = new THREE.Mesh(crateGeo, crateMat);
        c.position.set(spec.x, h, spec.z);
        c.castShadow = true; c.receiveShadow = true;
        scene.add(c); levelProps.push(c);
      });
      return;
    } else if (spec.t === 'bunker') {
      const c1 = new THREE.Mesh(crateGeo, crateMat); c1.position.set(spec.x, 0.9, spec.z);
      const c2 = new THREE.Mesh(crateGeo, crateMat); c2.position.set(spec.x, 2.7, spec.z);
      [c1, c2].forEach(c => { c.castShadow = true; c.receiveShadow = true; scene.add(c); levelProps.push(c); });
      return;
    }
    if (mesh) { mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); levelProps.push(mesh); }
  });
  propBoxes = levelProps.map(p => new THREE.Box3().setFromObject(p));
  blockers = [...walls, ...levelWalls, ...levelProps];
}
buildLevel(0);

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
gunGroup.position.set(0.14, -0.27, -0.55); // bottom-center-right, clear of FIRE/SWAP cluster (was 0.3,-0.3,-0.45 -> overlapped buttons)
gunGroup.rotation.y = 0.0; // barrel straight ahead toward crosshair (was -0.15 = yawed LEFT, off crosshair)
gunGroup.scale.set(1.1, 1.1, 1.1); // CS-style viewmodel presence — 2.2 was huge on touch, covered FIRE/JUMP cluster + blocked view
camera.add(gunGroup);
scene.add(camera); // camera in scene so viewmodel children (gun, muzzle) render

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

// ==== STATS / KILL FEED / STREAK / DAMAGE NUMBERS ====
const stats = { kills: 0, deaths: 0, headshots: 0, damageDealt: 0, shotsFired: 0, shotsHit: 0 };
let killsInRound = 0;
const dmgNums = [];
const STREAK_NAMES = ['', '', '', 'TRIPLE KILL', 'QUAD KILL', 'RAMPAGE', 'UNSTOPPABLE'];
function addKillFeed(killer, victim, weaponName, headshot, playerKill) {
  const feed = document.getElementById('kill-feed');
  const div = document.createElement('div');
  div.className = 'kf-entry' + (playerKill ? ' kf-you' : ' kf-death');
  div.innerHTML = `<span>${killer}</span> ▸ <span>${victim}</span>` +
    (weaponName ? ` <span style="color:#999">[${weaponName}]</span>` : '') +
    (headshot ? ' <span class="kf-hs">HEADSHOT</span>' : '');
  feed.prepend(div);
  while (feed.children.length > 5) feed.lastChild.remove();
  setTimeout(() => { div.style.opacity = '0'; setTimeout(() => div.remove(), 450); }, 4500);
}
function showStreak() {
  const name = STREAK_NAMES[Math.min(killsInRound, STREAK_NAMES.length - 1)];
  if (!name) return;
  const el = document.getElementById('streak-text');
  el.textContent = name;
  el.classList.remove('pop');
  void el.offsetWidth; // restart animation
  el.classList.add('pop');
  AudioSys.streak();
}
function addDamageNum(bot, amount, crit) {
  if (dmgNums.length > 24) dmgNums.shift().el?.remove();
  const p = new THREE.Vector3();
  bot.getWorldPosition(p);
  dmgNums.push({
    pos: p.add(new THREE.Vector3((Math.random() - 0.5) * 0.7, 1.95, 0)),
    val: amount, crit, t: 0, el: null
  });
}
function fillStats() {
  const acc = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
  document.getElementById('stat-kills').textContent = stats.kills;
  document.getElementById('stat-hs').textContent = stats.headshots;
  document.getElementById('stat-acc').textContent = acc + '%';
  document.getElementById('stat-dmg').textContent = stats.damageDealt;
  let best = parseInt(localStorage.getItem('csarena-best-kills') || '0', 10);
  if (stats.kills > best) { best = stats.kills; localStorage.setItem('csarena-best-kills', String(best)); }
  document.getElementById('stat-best').textContent = best;
}

// ==== PLAYER DEATH CAM ====
let isPlayerDead = false;
let playerDeathTimer = 0;
let bobPhase = 0;
let footstepTimer = 0;
let lastFreezeTick = 8;
let lastDryFire = 0;

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
    spread: 0.015, // FIXED: tighter pistol (was 0.02)
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
    spread: 0.035, // FIXED: usable SMG bloom (was 0.08)
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
    spread: 0.018, // FIXED: rifle taps accurate (was 0.03)
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
const tempBox3b = new THREE.Box3();

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
    else timerEl.style.color = '#ffffff';
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
  buySmgBtn.disabled = money < WEAPONS.smg.price || primaryWeapon.name === WEAPONS.smg.name;
  buyRifleBtn.disabled = money < WEAPONS.rifle.price || primaryWeapon.name === WEAPONS.rifle.name;
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
  const hpBonus = Math.max(0, currentRound - 3) * 10 + (isRifleBot ? 10 : 0);
  botGroup.userData = {
    health: 100 + hpBonus,
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

  let botCount = LEVELS[currentLevel].botRounds[Math.min(round - 1, 2)] || 3;

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
function startMatch(levelIdx) {
  if (typeof levelIdx === 'number') currentLevel = Math.max(0, Math.min(LEVELS.length - 1, levelIdx));
  const ls = document.getElementById('level-select');
  if (ls) ls.classList.remove('visible');
  buildLevel(currentLevel);
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
  stats.kills = 0; stats.deaths = 0; stats.headshots = 0; stats.damageDealt = 0; stats.shotsFired = 0; stats.shotsHit = 0;
  killsInRound = 0;
  isPlayerDead = false;
  AudioSys.init();
  AudioSys.ambientOn(['dust', 'warehouse', 'rooftop'][currentLevel] || 'dust');
  camera.position.set(0, 1.7, 10);
  velocity.set(0, 0, 0);
  camera.rotation.z = 0; // death cam rolls rotation.z to 0.14 — reset or the whole view stays tilted sideways for the session (Aug 26 2026)
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
  isPlayerDead = false;
  killsInRound = 0;
  lastFreezeTick = 8;
  currentAmmo = currentWeapon.magSize;
  reserveAmmo = currentWeapon.reserve;
  isReloading = false;
  reloadTimer = 0;
  
  camera.position.set(0, 1.7, 10);
  camera.rotation.y = 0; // face the arena, not the back wall
  camera.rotation.z = 0; // death cam rolls rotation.z to 0.14 — reset here too or the tilt persists all round (Aug 26 2026)
  mouse.x = 0;
  mouse.y = 0;
  velocity.set(0, 0, 0);
  
  spawnBotsForRound(currentRound);
  roundTimer = LEVELS[currentLevel].timer;
  roundTimerActive = true;
  
  isFreezetime = true;
  freezetimeTimer = 8;
  
  updateHUD();
  showStartOverlay();
}

function showStartOverlay() {
  startTitle.textContent = `ROUND ${currentRound} — ${LEVELS[currentLevel].name}`;
  startDesc.textContent = `Eliminate ${bots.length} terrorists | ${LEVELS[currentLevel].difficulty} | FREEZETIME: 8s`;
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
  AudioSys.go();
}

function roundWon() {
  if (isRoundEnding) return;
  isRoundEnding = true;
  roundTimerActive = false;
  ctWins++;
  money += ROUND_WIN_REWARD;
  AudioSys.roundWin();
  stats.roundsWon = (stats.roundsWon || 0) + 1;
  
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
  AudioSys.roundLoss();
  stats.roundsLost = (stats.roundsLost || 0) + 1;
  
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
  AudioSys.ambientOff();
  AudioSys.matchWin();
  fillStats();
  victoryTitle.textContent = 'MATCH WON';
  victoryTitle.style.color = '#00ff88';
  victoryTitle.style.textShadow = '0 0 30px #00ff88';
  victoryCt.textContent = ctWins;
  victoryT.textContent = tWins;
  const nextBtn = document.getElementById('next-level');
  if (nextBtn) nextBtn.style.display = (currentLevel < LEVELS.length - 1) ? 'inline-block' : 'none';
  victoryOverlay.classList.add('visible');
  hud.classList.remove('visible');
  crosshair.classList.remove('visible');
}

function nextLevel() {
  if (currentLevel < LEVELS.length - 1) startMatch(currentLevel + 1);
}

function matchLost() {
  isMatchOver = true;
  isGameOver = true;
  AudioSys.ambientOff();
  AudioSys.matchLoss();
  fillStats();
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
  if (!isFreezetime) return; // CS-style: buy time only
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
  if (money >= weapon.price && primaryWeapon.name !== weapon.name) {
    money -= weapon.price;
    primaryWeapon = { ...weapon };
    // Equip the new weapon (CS behavior — buying = holding)
    currentWeapon = { ...primaryWeapon };
    currentAmmo = primaryWeapon.magSize;
    reserveAmmo = primaryWeapon.reserve;
    AudioSys.buy();
    updateHUD();
  }
}

function buyArmor() {
  if (money >= ARMOR_PRICE && armor < MAX_ARMOR) {
    money -= ARMOR_PRICE;
    armor = MAX_ARMOR;
    AudioSys.buy();
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
  if (isRoundEnding) return;
  if (slot === 1) { // Primary
    if (primaryWeapon.name !== 'PISTOL') {
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
  AudioSys.swap();
  updateHUD();
}

// ==== SHOOTING ====
function shoot() {
  if (currentAmmo <= 0) {
    const now = performance.now();
    if (now - lastDryFire > 250) { AudioSys.empty(); lastDryFire = now; }
    return;
  }
  if (isReloading || isFreezetime || isRoundEnding || isMatchOver || isPlayerDead) return;
  
  const now = performance.now() / 1000;
  const timeSinceLastShot = now - lastShotTime;
  const minInterval = 1 / currentWeapon.fireRate;
  
  if (!currentWeapon.fullAuto && timeSinceLastShot < minInterval) return;
  if (currentWeapon.fullAuto && timeSinceLastShot < minInterval) return;
  
  lastShotTime = now;
  currentAmmo--;
  stats.shotsFired++;
  AudioSys.shoot(currentWeapon);
  updateHUD();

  recoil = 0.03;
  muzzleTime = 0.1;
  muzzleLight.intensity = 50;
  muzzleLight.distance = 10;
  spriteMat.opacity = 1;

  const origin = new THREE.Vector3();
  camera.getWorldPosition(origin);
  const dir = new THREE.Vector3();
  // FIXED: zero the visual recoil kick so the bullet goes exactly where the
  // crosshair is (recoil re-applies for the visual after the shot).
  camera.rotation.x = mouse.y;
  camera.rotation.y = mouse.x;
  camera.getWorldDirection(dir);

  // FIXED: CS-style spread — uniform cone (tangent offsets, no z-bias) + movement penalty
  const movingPenalty = (keys.shift || !(velocity.x || velocity.z)) ? 1.0 : 1.6;
  const baseSpread = currentWeapon.spread * movingPenalty;
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  dir.addScaledVector(right, (Math.random() - 0.5) * baseSpread)
     .addScaledVector(up, (Math.random() - 0.5) * baseSpread)
     .normalize();

  // Recoil is a visual camera kick (applied in the main loop) — bullets follow
  // the crosshair, not an extra pitch.

  raycastShoot(origin, dir, true);
}

function raycastShoot(origin, dir, isPlayer, dmg) {
  const ray = new THREE.Raycaster(origin, dir, 0, 100);

  const wallIntersects = ray.intersectObjects(blockers, true);
  let botIntersect = null;
  let minBotDist = Infinity;

  for (const bot of bots) {
    if (!bot.userData.alive) continue;
    const bodyBox = tempBox3.setFromCenterAndSize(
      bot.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
      new THREE.Vector3(1.0, 1.35, 1.0)
    );
    const headBox = tempBox3b.setFromCenterAndSize(
      bot.position.clone().add(new THREE.Vector3(0, 1.63, 0)),
      new THREE.Vector3(0.5, 0.5, 0.5)
    );
    const headHit = ray.ray.intersectBox(headBox, tempVec3b);
    const bodyHit = ray.ray.intersectBox(bodyBox, tempVec3);
    if (headHit || bodyHit) {
      const point = headHit ? tempVec3b.clone() : tempVec3.clone();
      const dist = origin.distanceTo(point);
      if (dist < minBotDist) {
        minBotDist = dist;
        botIntersect = { point, object: bot, distance: dist, head: !!headHit };
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
        applyPlayerDamage(dmg || 10);
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

    if (hitIsBot && isPlayer) {
      const bot = hitObject;
      const ud = bot.userData;
      const isHead = botIntersect.head;
      const dealt = isHead ? currentWeapon.damage * 3 : currentWeapon.damage;
      ud.health -= dealt;
      stats.damageDealt += dealt;
      stats.shotsHit++;
      if (isHead) {
        stats.headshots++;
        addDamageNum(bot, dealt, true);
        AudioSys.headshot();
      } else {
        addDamageNum(bot, dealt, false);
        AudioSys.hit();
      }
      ud.hitFlashTimer = 0.15;
      ud.bodyMesh.material.color.setHex(0xff6666);
      ud.headMesh.material.color.setHex(0xff6666);

      if (ud.health <= 0) {
        killBot(bot, isHead);
      }
    }
    // Bot shots clipping other bots: sparks only, no friendly damage
  }
}

function reload() {
  if (isReloading || currentAmmo >= currentWeapon.magSize || reserveAmmo <= 0 || isFreezetime || isRoundEnding) return;
  isReloading = true;
  reloadTimer = currentWeapon.reloadTime;
  AudioSys.reload();
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

  raycastShoot(gunWorldPos, dir, false, ud.botDamage);
  AudioSys.botShot();

  const flash = new THREE.PointLight(0xff0000, 30, 5);
  flash.position.copy(gunWorldPos);
  scene.add(flash);
  setTimeout(() => { scene.remove(flash); }, 50);

  ud.shotTimer = ud.shotCooldown;
}

function killBot(bot, wasHeadshot) {
  const ud = bot.userData;
  if (ud.isDying) return;
  ud.isDying = true;
  ud.alive = false;
  ud.deathTimer = 1.4;
  money += KILL_REWARD;
  stats.kills++;
  killsInRound++;
  AudioSys.kill();
  addKillFeed('YOU', 'BOT', currentWeapon.name, !!wasHeadshot, true);
  if (killsInRound >= 3) showStreak();
  updateHUD();

  // Check round win
  const aliveBots = bots.filter(b => b.userData.alive).length;
  if (aliveBots === 0) {
    roundWon();
  }
}

// ==== PLAYER DAMAGE WITH ARMOR ====
function applyPlayerDamage(amount) {
  if (isGameOver || isRoundEnding || isPlayerDead) return;
  
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
  AudioSys.hurt();
  damageFlash.classList.add('active');
  setTimeout(() => { if (!isPlayerDead) damageFlash.classList.remove('active'); }, 300);

  if (health <= 0) {
    health = 0;
    isPlayerDead = true;
    playerDeathTimer = 1.5;
    stats.deaths++;
    addKillFeed('BOT', 'YOU', null, false, false);
    AudioSys.death();
    // damageFlash stays active → red death screen while the camera falls
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

  const wallIntersects = losRaycaster.intersectObjects(blockers, true);
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
        for (const wb of wallBoxes) { if (botBox.intersectsBox(wb)) { hitWall = true; break; } }
        if (!hitWall) for (const pb of propBoxes) { if (botBox.intersectsBox(pb)) { hitWall = true; break; } }
        if (!hitWall) bot.position.x += moveX;

        const botBoxZ = tempBox3.setFromCenterAndSize(
          bot.position.clone().add(new THREE.Vector3(0, 0.9, moveZ)),
          new THREE.Vector3(1.0, 1.8, 1.0)
        );
        hitWall = false;
        for (const wb of wallBoxes) { if (botBoxZ.intersectsBox(wb)) { hitWall = true; break; } }
        if (!hitWall) for (const pb of propBoxes) { if (botBoxZ.intersectsBox(pb)) { hitWall = true; break; } }
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
  mouse.y += e.movementY * 0.002;  // FIXED: mouse up = look up (was -=, inverting aim)
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
  if (k === 'keym') AudioSys.toggle();
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

// Lock page scrolling while playing — the game never needs the page to scroll
// (wheel/trackpad/keys must not move the document under the FPS).
window.addEventListener('wheel', (e) => { if (document.pointerLockElement) e.preventDefault(); }, { passive: false });
window.addEventListener('keydown', (e) => {
  const k = e.code;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k) && document.pointerLockElement) e.preventDefault();
});

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
  // iOS Safari: preventDefault on touchstart stops the browser from hijacking the
  // gesture — without it, a second finger (e.g. SPRINT while joystick held) triggers
  // pointercancel storms that kill the active pointer (sprint/jump/fire feel dead).
  [joystickZone, lookZone, fireBtn, reloadBtn, buyBtn, swapBtn].forEach(el =>
    el.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false }));

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
    updateJoystick(e);
  });
  // Track move/up/cancel at window level so the joystick follows the thumb even when
  // it drifts outside the zone element (no setPointerCapture — that triggers iOS
  // pointercancel storms on multi-touch). pointerId filter keeps multi-touch safe.
  window.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyPointerId) return;
    updateJoystick(e);
  });
  const endJoy = (e) => {
    if (e.pointerId !== joyPointerId) return;
    joyPointerId = null;
    joyDX = 0; joyDY = 0;
    joystickKnob.style.transform = 'translate(0px, 0px)';
  };
  window.addEventListener('pointerup', endJoy);
  window.addEventListener('pointercancel', endJoy);

  lookZone.addEventListener('pointerdown', (e) => {
    if (lookPointerId !== null) return;
    lookPointerId = e.pointerId;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
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
  window.addEventListener('pointerup', endLook);
  window.addEventListener('pointercancel', endLook);

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
  const jump = (e) => {
    if (e.cancelable) e.preventDefault();
    if (canJump) { velocity.y = 7; canJump = false; }
  };
  jumpBtn.addEventListener('touchstart', jump, { passive: false });
  jumpBtn.addEventListener('pointerdown', jump);
  // COD Mobile-style: SPRINT button (hold to sprint, like Shift on desktop)
  // iOS Safari hardening: touchstart preventDefault stops gesture hijack (pointercancel
  // on the second finger kills keys.shift otherwise); touchstart/touchend act as a
  // redundant path so sprint survives even if the pointer stream misbehaves.
  const sprintBtn = document.getElementById('sprint-btn');
  let sprintTouches = 0;
  const sprintDown = (e) => { if (e.cancelable) e.preventDefault(); keys.shift = true; };
  const sprintTouchDown = (e) => { e.preventDefault(); sprintTouches++; keys.shift = true; };
  const sprintTouchUp = () => { sprintTouches = Math.max(0, sprintTouches - 1); if (!sprintTouches) keys.shift = false; };
  const sprintUp = () => { if (!sprintTouches) keys.shift = false; };
  sprintBtn.addEventListener('touchstart', sprintTouchDown, { passive: false });
  sprintBtn.addEventListener('touchend', sprintTouchUp);
  sprintBtn.addEventListener('touchcancel', sprintTouchUp);
  sprintBtn.addEventListener('pointerdown', sprintDown);
  sprintBtn.addEventListener('pointerup', sprintUp);
  sprintBtn.addEventListener('pointercancel', sprintUp);
}

// ==== MAIN LOOP ====
function animate(time) {
  requestAnimationFrame(animate);
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  frames++;
  if (time - lastFpsTime > 1000) { fps = frames; frames = 0; lastFpsTime = time; }
  fpsEl.textContent = `FPS: ${fps}`;

  const canControl = (pointerLocked || touchMode) && !isFreezetime && !isRoundEnding && !isMatchOver && !buyMenuOpen && !isPlayerDead;
  if (canControl) {
    // Movement: camera-relative + analog throttle (fixed Aug 26 2026).
    // Was: world-axis (turn 90° and the stick/WASD directions no longer matched
    // the view — "side to side is terrible") and digital 8-way (stick magnitude
    // discarded; tiny push = full speed, no fine control). Now the wish direction
    // rotates with camera yaw and stick deflection = throttle (0..1).
    const yaw = camera.rotation.y;
    const fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);  // horizontal forward
    const rgtX = Math.cos(yaw), rgtZ = -Math.sin(yaw);   // horizontal right
    let wishX = 0, wishZ = 0, throttle = 0;
    if (touchMode) {
      // intent flags kept for HUD/debug; movement uses analog joyDX/joyDY below
      keys.w = joyDY < -0.25; keys.s = joyDY > 0.25;
      keys.a = joyDX < -0.25; keys.d = joyDX > 0.25;
      const jx = joyDX, jz = -joyDY, jl = Math.hypot(jx, jz);
      if (jl > 0.1) {  // deadzone; then direction + proportional speed
        wishX = (fwdX * jz + rgtX * jx) / jl;
        wishZ = (fwdZ * jz + rgtZ * jx) / jl;
        throttle = Math.min((jl - 0.1) / 0.9, 1.0);
      }
    } else {
      const dx = Number(keys.d) - Number(keys.a);
      const dz = Number(keys.w) - Number(keys.s);
      const dl = Math.hypot(dx, dz);
      if (dl > 0) {
        wishX = (fwdX * dz + rgtX * dx) / dl;
        wishZ = (fwdZ * dz + rgtZ * dx) / dl;
        throttle = 1;
      }
    }
    const speed = keys.shift ? 15 : 8;  // walk 8 / sprint 15 (was 6/12 — felt slow on touch; ~3.4 -> ~4.6 m/s walk)
    velocity.x += wishX * speed * throttle * dt;
    velocity.z += wishZ * speed * throttle * dt;

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
    for (const pb of propBoxes) {
      if (testBoxX.intersectsBox(pb)) { moveX = 0; velocity.x = 0; }
      if (testBoxZ.intersectsBox(pb)) { moveZ = 0; velocity.z = 0; }
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

    // Camera bob + footsteps + sprint FOV kick
    const moving = camera.position.y <= 1.71 && (Math.abs(velocity.x) > 0.5 || Math.abs(velocity.z) > 0.5);
    if (moving) {
      bobPhase += dt * (keys.shift ? 11 : 7);
      camera.position.y = 1.7 + Math.sin(bobPhase) * 0.05 * (keys.shift ? 1.35 : 0.85);
      footstepTimer -= dt;
      if (footstepTimer <= 0) { AudioSys.footstep(); footstepTimer = keys.shift ? 0.26 : 0.38; }
    } else {
      footstepTimer = 0;
    }
    const targetFov = (keys.shift && moving) ? 82 : 75;
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov += (targetFov - camera.fov) * dt * 8;
      camera.updateProjectionMatrix();
    }

    // Framerate-independent damping: per-frame *=0.9 made terminal velocity
    // 80*throttle/fps — 0.67 m/s walk on 120Hz vs 1.33 on 60Hz. Fixed Aug 31 2026.
    const damp = Math.pow(0.9, dt * 60);
    velocity.x *= damp;
    velocity.z *= damp;

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
    const ftCeil = Math.ceil(freezetimeTimer);
    if (ftCeil !== lastFreezeTick) {
      lastFreezeTick = ftCeil;
      if (ftCeil > 0 && ftCeil <= 3) AudioSys.tick();
    }
    updateHUD();
    if (freezetimeTimer <= 0) {
      freezetimeTimer = 0;
      endFreezetime();
    }
  }

  // Death cam: camera falls + tilts down, then the round is lost
  if (isPlayerDead) {
    playerDeathTimer -= dt;
    camera.position.y = Math.max(camera.position.y - 3.4 * dt, 0.35);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, -1.45, dt * 6);
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, 0.14, dt * 5);
    if (playerDeathTimer <= 0) {
      isPlayerDead = false;
      damageFlash.classList.remove('active');
      roundLost();
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

  // Damage numbers (project 3D hit → screen)
  for (let i = dmgNums.length - 1; i >= 0; i--) {
    const dn = dmgNums[i];
    dn.t += dt;
    if (dn.t > 0.75) { dn.el?.remove(); dmgNums.splice(i, 1); continue; }
    const v = new THREE.Vector3(dn.pos.x, dn.pos.y + dn.t * 1.6, dn.pos.z).project(camera);
    if (v.z > 1) continue; // behind camera
    if (!dn.el) {
      dn.el = document.createElement('div');
      dn.el.className = 'dmg-num' + (dn.crit ? ' crit' : '');
      dn.el.textContent = dn.val;
      document.body.appendChild(dn.el);
    }
    dn.el.style.left = (((v.x + 1) / 2) * window.innerWidth) + 'px';
    dn.el.style.top = (((-v.y + 1) / 2) * window.innerHeight) + 'px';
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
const nextLevelBtn = document.getElementById('next-level');
if (nextLevelBtn) nextLevelBtn.addEventListener('click', nextLevel);

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

// ==== DEBUG HOOK (only with ?debug — used for headless playtest verification) ====
if (new URLSearchParams(location.search).has('debug')) {
  window.__csDebug = {
    killAllBots: () => { [...bots].forEach(b => { if (b.userData.alive) killBot(b, false); }); },
    giveMoney: (n) => { money += n; updateHUD(); },
    giveWeapon: (t) => {
      const w = WEAPONS[t];
      if (!w) return false;
      primaryWeapon = { ...w };
      currentWeapon = { ...w };
      currentAmmo = w.magSize; reserveAmmo = w.reserve;
      updateHUD(); return true;
    },
    endFreeze: () => endFreezetime(),
    restartMatch: () => resetMatch(),
    setHealth: (n) => { health = Math.max(0, n); updateHUD(); },
    killPlayer: () => applyPlayerDamage(999), // real death cam path — rolls rotation.z to 0.14, must reset on round restart
    aimBot: (i, part) => {
      const b = bots[i];
      if (!b || !b.userData.alive) return false;
      const target = b.position.clone().add(new THREE.Vector3(0, part === 'head' ? 1.63 : 0.9, 0));
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      const dir = new THREE.Vector3().subVectors(target, camPos).normalize();
      mouse.y = Math.asin(Math.max(-1, Math.min(1, dir.y)));
      mouse.x = Math.atan2(-dir.x, -dir.z);
      // apply rotation immediately so aim+fire in the same tick is accurate
      camera.rotation.y = mouse.x;
      camera.rotation.x = mouse.y;
      return true;
    },
    getState: () => ({
      round: currentRound, ct: ctWins, t: tWins, health, money, armor,
      weapon: currentWeapon.name, primary: primaryWeapon.name,
      ammo: currentAmmo, reserve: reserveAmmo, freezetime: isFreezetime,
      roundTimer: Math.round(roundTimer), botsAlive: bots.filter(b => b.userData.alive).length,
      playerDead: isPlayerDead, roundEnding: isRoundEnding, matchOver: isMatchOver,
      keys: { ...keys }, joy: { dx: +joyDX.toFixed(2), dy: +joyDY.toFixed(2), pid: joyPointerId }, pos: (() => { const p = new THREE.Vector3(); camera.getWorldPosition(p); return { x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3) }; })(), vel: { x: +velocity.x.toFixed(2), z: +velocity.z.toFixed(2) },
      rot: (() => { const d = new THREE.Vector3(); camera.getWorldDirection(d); const m = camera.matrixWorld.elements; return { rx: +camera.rotation.x.toFixed(3), ry: +camera.rotation.y.toFixed(3), order: camera.rotation.order, dx: +d.x.toFixed(3), dy: +d.y.toFixed(3), dz: +d.z.toFixed(3), upX: +m[1].toFixed(3), upY: +m[5].toFixed(3), upZ: +m[9].toFixed(3) }; })(),
      audio: { enabled: AudioSys.enabled, muted: AudioSys.muted, ctxState: AudioSys.ctx ? AudioSys.ctx.state : 'none' },
      stats: { ...stats }, killsInRound, props: propBoxes.length, damageNums: dmgNums.length
    }),
    probe: (i) => {
      const b = bots[i];
      if (!b) return null;
      window.__csDebug.aimBot(i, 'head');
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      const headBox = new THREE.Box3().setFromCenterAndSize(
        b.position.clone().add(new THREE.Vector3(0, 1.63, 0)),
        new THREE.Vector3(0.5, 0.5, 0.5)
      );
      const tmp = new THREE.Vector3();
      const hit = new THREE.Ray(camPos, fwd).intersectBox(headBox, tmp);
      return JSON.stringify({
        pointerLocked: document.pointerLockElement === canvas,
        touchMode,
        fps: document.getElementById('fps').textContent,
        camPos: camPos.toArray().map(v => +v.toFixed(2)),
        fwd: fwd.toArray().map(v => +v.toFixed(3)),
        botPos: [b.position.x.toFixed(1), b.position.z.toFixed(1)],
        headRayIntersect: hit ? tmp.toArray().map(v => +v.toFixed(2)) : null,
        botDist: b.position.distanceTo(camPos).toFixed(1)
      });
    },
    // Deterministic shot through the REAL raycast pipeline (no spread, no click plumbing)
    fireAt: (i, part) => {
      const b = bots[i];
      if (!b || !b.userData.alive) return false;
      const target = b.position.clone().add(new THREE.Vector3(0, part === 'head' ? 1.63 : 0.9, 0));
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      const dir = new THREE.Vector3().subVectors(target, camPos).normalize();
      raycastShoot(camPos, dir, true);
      return true;
    },
    // What does a shot ray actually hit first? (cover-occlusion diagnostic)
    trace: (i, part) => {
      const b = bots[i];
      if (!b) return null;
      const target = b.position.clone().add(new THREE.Vector3(0, part === 'head' ? 1.63 : 0.9, 0));
      const camPos = new THREE.Vector3();
      camera.getWorldPosition(camPos);
      const dir = new THREE.Vector3().subVectors(target, camPos).normalize();
      const ray = new THREE.Raycaster(camPos, dir, 0, 100);
      const blocker = ray.intersectObjects(blockers, true)[0] || null;
      let botHit = null;
      for (const bot of bots) {
        if (!bot.userData.alive) continue;
        const bodyBox = tempBox3.setFromCenterAndSize(bot.position.clone().add(new THREE.Vector3(0, 0.9, 0)), new THREE.Vector3(1.0, 1.35, 1.0));
        const headBox = tempBox3b.setFromCenterAndSize(bot.position.clone().add(new THREE.Vector3(0, 1.63, 0)), new THREE.Vector3(0.5, 0.5, 0.5));
        const h = ray.ray.intersectBox(headBox, tempVec3b);
        const bo = ray.ray.intersectBox(bodyBox, tempVec3);
        if (h || bo) {
          const d = camPos.distanceTo(h ? tempVec3b : tempVec3);
          if (!botHit || d < botHit.d) botHit = { d: +d.toFixed(1), head: !!h, bot: bots.indexOf(bot) };
        }
      }
      return JSON.stringify({
        blocker: blocker ? {
          dist: +blocker.distance.toFixed(1),
          isProp: propMeshes.includes(blocker.object),
          isWall: walls.includes(blocker.object)
        } : null,
        botHit,
        botTarget: i,
        distToTarget: camPos.distanceTo(target).toFixed(1)
      });
    },
    shootPlayer: (dmg) => applyPlayerDamage(dmg)
  };
}

// ==== INIT ====
document.getElementById('level-select').classList.add('visible');
animate(performance.now());
updateHUD();