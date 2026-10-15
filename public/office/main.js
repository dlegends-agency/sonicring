// SonicRing — 3D office (three.js), built from code, driven by scroll.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// Reveal side cards as they enter the viewport
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
  { threshold: 0.3 }
);
document.querySelectorAll(".card-panel").forEach((el) => io.observe(el));

const canvas = document.getElementById("stage");
const labelLayer = document.getElementById("labels");
const story = document.querySelector(".story");
const panels = [...story.querySelectorAll(".panel")];

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (e) {
  document.querySelector(".stage").classList.add("no-webgl");
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0f1c); // matches the page background
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);

// Post-processing: selective bloom. Only objects on BLOOM_LAYER (neon trim, screens,
// holograms) are rendered into the glow pass, which is then added over the normal render.
const BLOOM_LAYER = 1;
const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.36, 0.35, 0);
bloomComposer.addPass(bloom);
const mixPass = new ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: { baseTexture: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main() { gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }",
  }),
  "baseTexture"
);
mixPass.needsSwap = true;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(mixPass);
composer.addPass(new OutputPass());

scene.add(new THREE.HemisphereLight(0xfff1e2, 0x2a1f44, 0.85));
const sun = new THREE.DirectionalLight(0xfff4ea, 2.0);
sun.position.set(-14, 32, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 22, bottom: -22, near: 1, far: 90 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun);
// Coloured accent lights from the holograms
for (const [c, x, y, z, i] of [[0x9b5cff, -11, 2.2, -7.5, 3], [0x19d3ff, 10.1, 2, 7.2, 2.4], [0xf03cff, 8.1, 1.8, 8.1, 2.1], [0xb06bff, 11.9, 1.6, 5.6, 1.8]]) {
  const l = new THREE.PointLight(c, i, 7, 2);
  l.position.set(x, y, z);
  scene.add(l);
}

// ---------- materials ----------
const M = {
  base: new THREE.MeshStandardMaterial({ color: 0xe9cfae, roughness: 0.75 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xf0dfc8, roughness: 0.9 }),
  cap: new THREE.MeshStandardMaterial({ color: 0xd9c2a3, roughness: 0.8 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.6 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.85 }),
  deskTop: new THREE.MeshPhysicalMaterial({ color: 0xf6f3ee, roughness: 0.35, clearcoat: 0.4 }),
  black: new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.5, metalness: 0.3 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x232327, roughness: 0.6 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf3efe8, roughness: 0.5 }),
  rug: new THREE.MeshStandardMaterial({ color: 0x4f2580, roughness: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }),
  window: new THREE.MeshStandardMaterial({ color: 0x5aa7e6, roughness: 0.15, metalness: 0.2, emissive: 0x1d4f80, emissiveIntensity: 0.4 }),
  neon: new THREE.MeshBasicMaterial({ color: 0xd08bff }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x3f9a2a, roughness: 0.55, side: THREE.DoubleSide }),
  leaf2: new THREE.MeshStandardMaterial({ color: 0x6cc23a, roughness: 0.55, side: THREE.DoubleSide }),
  pot: new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.7 }),
  soil: new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 1 }),
  glowPurple: new THREE.MeshStandardMaterial({ color: 0x9b5cff, emissive: 0x7b3cff, emissiveIntensity: 2.4 }),
  glowCyan: new THREE.MeshStandardMaterial({ color: 0x3cc8ff, emissive: 0x0f8fd6, emissiveIntensity: 2.0, roughness: 0.3 }),
  glowPink: new THREE.MeshStandardMaterial({ color: 0xff5fd8, emissive: 0xff2fc8, emissiveIntensity: 2.6 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xffd23d, emissive: 0xc79a00, emissiveIntensity: 0.6 }),
};

function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (w, h, d, mat, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
const cyl = (rt, rb, h, mat, x, y, z, parent, seg = 32) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, parent);
// Rounded box: softer edges catch highlights and read as "designed" furniture
const rbox = (w, h, d, r, mat, x, y, z, parent) =>
  mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999), mat, x, y, z, parent);

// ---------- floor ----------
function woodTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d");
  const rows = 16, rh = 1024 / rows;
  for (let r = 0; r < rows; r++) {
    let x = -Math.random() * 400;
    while (x < 1024) {
      const len = 260 + Math.random() * 300;
      const l = 22 + Math.random() * 7;
      g.fillStyle = `hsl(${11 + Math.random() * 5}, 60%, ${l}%)`;
      g.fillRect(x, r * rh, len, rh);
      g.fillStyle = "rgba(255,255,255,0.04)";
      for (let k = 0; k < 6; k++) g.fillRect(x, r * rh + Math.random() * rh, len, 1);
      g.fillStyle = "rgba(40,10,0,0.55)";
      g.fillRect(x, r * rh, 2, rh);
      x += len;
    }
    g.fillStyle = "rgba(40,10,0,0.5)";
    g.fillRect(0, r * rh, 1024, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 10, 1 / 10);
  t.anisotropy = 8;
  return t;
}

const shapeFrom = (pts) => {
  const s = new THREE.Shape();
  pts.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)));
  return s;
};
const inner = [[-15, -11], [15, -11], [15, 7], [11, 11], [-11, 11], [-15, 7]];
const outer = [[-16.2, -12], [16.2, -12], [16.2, 7.5], [11.5, 12.2], [-11.5, 12.2], [-16.2, 7.5]];

const slab = mesh(new THREE.ExtrudeGeometry(shapeFrom(outer), { depth: 0.75, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3 }), M.base, 0, -0.87, 0);
slab.rotation.x = -Math.PI / 2;
const floorMat = new THREE.MeshPhysicalMaterial({ map: woodTexture(), roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.12 }); // lacquered wood
const floor = mesh(new THREE.ShapeGeometry(shapeFrom(inner)), floorMat, 0, 0.005, 0);
floor.rotation.x = -Math.PI / 2;
floor.castShadow = false;

// ---------- walls & glass ----------
function segment(x1, z1, x2, z2) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  return { len, cx: (x1 + x2) / 2, cz: (z1 + z2) / 2, ry: -Math.atan2(z2 - z1, x2 - x1) };
}
function wall(x1, z1, x2, z2, h = 4.2, t = 0.3, parent = scene) {
  const s = segment(x1, z1, x2, z2);
  const w = box(s.len + t, h, t, M.wall, s.cx, h / 2, s.cz, parent);
  w.rotation.y = s.ry;
  const cap = box(s.len + t + 0.06, 0.1, t + 0.1, M.cap, s.cx, h + 0.05, s.cz, parent);
  cap.rotation.y = s.ry;
  const skirt = box(s.len + t + 0.02, 0.16, t + 0.05, M.trim, s.cx, 0.08, s.cz, parent);
  skirt.rotation.y = s.ry;
  return w;
}
function glassWall(x1, z1, x2, z2, h = 2) {
  const s = segment(x1, z1, x2, z2);
  const g = new THREE.Group();
  g.position.set(s.cx, 0, s.cz);
  g.rotation.y = s.ry;
  scene.add(g);
  const pane = box(s.len, h, 0.04, M.glass, 0, h / 2, 0, g);
  pane.castShadow = false;
  box(s.len, 0.08, 0.1, M.black, 0, h, 0, g);
  box(s.len, 0.08, 0.1, M.black, 0, 0.04, 0, g);
  const n = Math.max(1, Math.round(s.len / 1.6));
  for (let i = 0; i <= n; i++) box(0.09, h, 0.09, M.black, -s.len / 2 + (i * s.len) / n, h / 2, 0, g);
}

// Outer walls (back + right) with neon trim. Each lives in a group that folds
// down when the rotating camera swings behind it, so the interior stays visible.
const backG = new THREE.Group(), rightG = new THREE.Group();
scene.add(backG, rightG);
wall(-15, -11, 15, -11, 4.2, 0.3, backG);
wall(15, -11, 15, 7, 4.2, 0.3, rightG);
box(30, 0.07, 0.07, M.neon, 0, 4.05, -10.8, backG);
box(0.07, 0.07, 18, M.neon, 14.8, 4.05, -2, rightG);
box(30, 0.05, 0.05, M.neon, 0, 0.12, -10.82, backG);
box(0.05, 0.05, 18, M.neon, 14.82, 0.12, -2, rightG);

// Glass railing around the open edges (gap = entrance)
glassWall(15, 7, 11, 11);
glassWall(11, 11, 2.2, 11);
glassWall(-1.8, 11, -11, 11);
glassWall(-11, 11, -15, 7);
glassWall(-15, 7, -15, -11, 2.6);
box(3.2, 0.03, 1.1, M.dark, 0.2, 0.02, 10.3); // door mat

// Integrations room (back-left)
wall(-7, -11, -7, -7.5);
glassWall(-7, -7.5, -7, -4, 4.2);
glassWall(-15, -4, -11.2, -4, 4.2);
glassWall(-9.4, -4, -7, -4, 4.2);
box(7.8, 0.02, 6.8, M.rug, -11, 0.02, -7.5).castShadow = false;

// Meeting room (back-centre)
wall(-3, -11, -3, -5);
glassWall(-3, -5, 0.4, -5, 4.2);
glassWall(2.2, -5, 6, -5, 4.2);
glassWall(6, -11, 6, -5, 4.2);

// Windows on the back wall
// Framed windows on the back wall
for (const x of [-13.6, -4.4, 3.6]) {
  box(1.8, 2.2, 0.05, M.window, x, 2.3, -10.83, backG);
  for (const [w, h, dx, dy] of [[1.9, 0.08, 0, 1.12], [1.9, 0.08, 0, -1.12], [0.08, 2.3, -0.92, 0], [0.08, 2.3, 0.92, 0], [0.05, 2.2, 0, 0], [1.8, 0.05, 0, 0.2]])
    box(w, h, 0.09, M.black, x + dx, 2.3 + dy, -10.8, backG);
}
// Orange artwork on the meeting room's outer wall
const art = box(2, 1.3, 0.06, new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0x8a2a00, emissiveIntensity: 0.5 }), -3.2, 2.2, -8);
art.rotation.y = -Math.PI / 2;

// ---------- screens ----------
function screenTexture(kind, title) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 320;
  const g = c.getContext("2d");
  const pal = ["#ff4fd8", "#3df5ff", "#9b6bff", "#ffd23d"];
  g.fillStyle = "#140c33"; g.fillRect(0, 0, 512, 320);
  g.fillStyle = "#2a1a66"; g.fillRect(0, 0, 512, 38);
  g.fillStyle = "#d9ccff"; g.font = "bold 20px sans-serif"; g.fillText(title || "", 16, 26);
  const R = Math.random;
  if (kind === "bars") {
    for (let i = 0; i < 9; i++) { const h = 60 + R() * 200; g.fillStyle = pal[i % 2]; g.fillRect(24 + i * 52, 305 - h, 34, h); }
  } else if (kind === "list") {
    for (let i = 0; i < 7; i++) { g.fillStyle = pal[i % 3]; g.fillRect(24, 60 + i * 36, 16, 16); g.fillStyle = "#5d4ca8"; g.fillRect(54, 64 + i * 36, 120 + R() * 300, 10); }
  } else if (kind === "cal") {
    for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) { g.fillStyle = R() < 0.35 ? pal[(r + k) % 3] : "#3a2780"; g.fillRect(18 + k * 70, 52 + r * 52, 60, 42); }
  } else if (kind === "dash") {
    for (let i = 0; i < 4; i++) { g.fillStyle = "#24175a"; g.fillRect(16 + i * 124, 52, 112, 80); g.fillStyle = pal[i]; g.fillRect(28 + i * 124, 100, 40 + R() * 50, 16); }
    g.strokeStyle = pal[1]; g.lineWidth = 4; g.beginPath();
    for (let x = 0; x <= 480; x += 30) g.lineTo(16 + x, 270 - R() * 90 - x * 0.12);
    g.stroke();
    for (let i = 0; i < 10; i++) { g.fillStyle = pal[0]; g.fillRect(24 + i * 48, 300 - R() * 30, 20, 30); }
  } else if (kind === "browser") {
    g.fillStyle = "#3a2780"; g.fillRect(16, 52, 480, 26);
    g.fillStyle = pal[2]; g.fillRect(16, 92, 300, 120);
    for (let i = 0; i < 5; i++) { g.fillStyle = "#5d4ca8"; g.fillRect(330, 96 + i * 24, 150, 10); }
    for (let i = 0; i < 3; i++) { g.fillStyle = pal[i]; g.fillRect(16 + i * 164, 226, 152, 76); }
  } else if (kind === "code") {
    for (let i = 0; i < 9; i++) { g.fillStyle = pal[i % 3]; g.fillRect(20 + (i % 3) * 20, 56 + i * 28, 60 + R() * 260, 10); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function screen(w, h, kind, title, parent = scene) {
  const g = new THREE.Group();
  parent.add(g);
  box(w + 0.14, h + 0.14, 0.08, M.black, 0, 0, 0, g);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: screenTexture(kind, title) }));
  face.position.z = 0.045;
  g.add(face);
  return g;
}
const onBack = (s, x, y) => { backG.add(s); s.position.set(x, y, -10.78); };
const onRight = (s, z, y) => { rightG.add(s); s.position.set(14.78, y, z); s.rotation.y = -Math.PI / 2; };

onBack(screen(3, 1.8, "bars", "Reports"), 8.6, 2.5);
onBack(screen(3, 1.8, "list", "Agent Missions"), 12.3, 2.5);
onRight(screen(4.6, 2, "dash", "Carpet Cleaning Hamilton"), -6.2, 2.5);
onRight(screen(3, 1.8, "list", "Your Tasks"), -1.4, 2.5);
onRight(screen(3, 1.8, "cal", "Calendar"), 2.9, 2.5);
onBack(screen(2.8, 1.6, "dash", "Meeting"), 1.5, 2.5);
// Integrations video wall
for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) onBack(screen(0.9, 0.55, "code", ""), -12.2 + k * 1.05, 1.4 + r * 0.7);

// ---------- furniture ----------
// Shared leaf blade: a flattened ellipsoid pivoting at its base
const leafGeo = new THREE.SphereGeometry(1, 10, 8);
leafGeo.scale(0.11, 0.62, 0.025);
leafGeo.translate(0, 0.6, 0);
function chair(parent, x, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  parent.add(g);
  rbox(0.62, 0.12, 0.58, 0.05, M.fabric, 0, 0.5, 0, g);                 // seat
  const back = rbox(0.6, 0.66, 0.1, 0.05, M.fabric, 0, 0.9, 0.3, g);    // back
  back.rotation.x = -0.12;
  for (const sx of [-1, 1]) rbox(0.06, 0.06, 0.4, 0.03, M.black, sx * 0.33, 0.68, 0.02, g); // armrests
  cyl(0.035, 0.035, 0.42, M.black, 0, 0.27, 0, g, 10);
  for (let i = 0; i < 5; i++) {
    const leg = box(0.32, 0.035, 0.05, M.black, 0, 0.06, 0, g);
    leg.rotation.y = (i / 5) * Math.PI * 2;
    leg.translateX(0.16);
    const wheel = mesh(new THREE.SphereGeometry(0.035, 8, 6), M.black, 0, 0.035, 0, g);
    wheel.position.set(Math.cos((i / 5) * Math.PI * 2) * 0.3, 0.035, -Math.sin((i / 5) * Math.PI * 2) * 0.3);
  }
  return g;
}

const seats = [];
function desk(x, z, ry = 0, boss = false) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  scene.add(g);
  const w = boss ? 2.6 : 2;
  rbox(w, 0.08, 1.1, 0.03, boss ? M.dark : M.deskTop, 0, 0.78, 0, g);
  for (const sx of [-1, 1]) {
    box(0.06, 0.74, 0.9, M.black, sx * (w / 2 - 0.1), 0.37, 0, g);     // panel legs
    box(0.06, 0.06, 1.0, M.black, sx * (w / 2 - 0.1), 0.03, 0, g);
  }
  if (boss) box(w - 0.3, 0.5, 0.04, M.black, 0, 0.5, -0.45, g);        // modesty panel
  cyl(0.16, 0.18, 0.02, M.black, 0, 0.83, -0.32, g, 20);               // monitor base
  box(0.06, 0.34, 0.06, M.black, 0, 0.99, -0.36, g);
  const mon = screen(1.05, 0.62, "dash", "", g);
  mon.position.set(0, 1.42, -0.38);
  mon.rotation.x = -0.06;
  rbox(0.62, 0.025, 0.2, 0.01, M.dark, -0.05, 0.835, 0.08, g);          // keyboard
  rbox(0.08, 0.03, 0.12, 0.015, M.dark, 0.42, 0.835, 0.1, g);           // mouse
  cyl(0.06, 0.05, 0.12, M.white, w / 2 - 0.25, 0.88, -0.1, g, 14);      // mug
  cyl(0.07, 0.06, 0.1, M.pot, -w / 2 + 0.25, 0.87, -0.2, g, 12);        // desk plant
  for (let i = 0; i < 5; i++) {
    const l = mesh(leafGeo, M.leaf2, -w / 2 + 0.25, 0.92, -0.2, g);
    l.scale.setScalar(0.32);
    l.rotation.set(0.4 + Math.random() * 0.4, (i / 5) * Math.PI * 2, 0, "YXZ");
  }
  chair(g, 0, 0.95);
  seats.push(g);
  return g;
}
// [name, x, z, colour, boss]
const TEAM = [
  ["Support", -4.8, -1.2, 0xa99bff],
  ["Research", -0.8, -3.2, 0xffd21f],
  ["Marketing", 3.4, -4.2, 0xff7fc8],
  ["Sales", 6.2, -1.4, 0x2fd06a],
  ["", 1.4, 0.4, 0x3fd8ff],
  ["Designer", 7.2, 3, 0xff8a1f],
  ["Receptionist", 1.2, 5.4, 0x36d6ff],
  ["CEO", -3.2, 3, 0xffd21f, true],
];
box(5.6, 0.02, 4.4, M.rug, -3.2, 0.02, 3.3).rotation.y = 0.3;
TEAM.forEach(([, x, z, , boss]) => desk(x, z, boss ? 0.3 : 0.05, boss));

// Meeting table
rbox(4.6, 0.1, 1.7, 0.05, M.dark, 1.5, 0.78, -8, scene);
for (const sx of [-1.8, 1.8]) box(0.12, 0.76, 1.2, M.black, 1.5 + sx, 0.38, -8);
for (let i = 0; i < 4; i++) {
  chair(scene, -0.3 + i * 1.2, -9.25, Math.PI);
  chair(scene, -0.3 + i * 1.2, -6.75, 0);
}

// Lounge
const lounge = new THREE.Group();
lounge.position.set(-8.6, 0, 6.6);
lounge.rotation.y = -0.3;
scene.add(lounge);
box(5.4, 0.02, 4.2, M.rug, 0, 0.02, -0.6, lounge).castShadow = false;
rbox(3.2, 0.3, 1.15, 0.08, M.fabric, 0, 0.25, 0.8, lounge);                       // sofa base
for (const sx of [-0.72, 0.72]) rbox(1.38, 0.2, 0.95, 0.08, M.fabric, sx, 0.48, 0.72, lounge); // seat cushions
for (const sx of [-0.72, 0.72]) {
  const b = rbox(1.38, 0.6, 0.26, 0.1, M.fabric, sx, 0.82, 1.22, lounge);        // back cushions
  b.rotation.x = -0.15;
}
for (const sx of [-1, 1]) rbox(0.3, 0.62, 1.15, 0.1, M.fabric, sx * 1.6, 0.42, 0.8, lounge); // arms
rbox(1.9, 0.07, 0.95, 0.03, M.black, 0, 0.46, -0.9, lounge);
for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, 0.42, 0.05, M.black, sx * 0.85, 0.21, -0.9 + sz * 0.38, lounge);
box(0.4, 0.02, 0.3, M.yellow, 0.3, 0.51, -0.9, lounge);
cyl(0.07, 0.06, 0.12, M.white, -0.5, 0.55, -0.9, lounge, 12);
for (let i = 0; i < 5; i++) {
  const l = mesh(leafGeo, M.leaf2, -0.5, 0.6, -0.9, lounge);
  l.scale.setScalar(0.3);
  l.rotation.set(0.5, (i / 5) * Math.PI * 2, 0, "YXZ");
}

// Web browser screen on a stand
const wb = screen(2.4, 1.5, "browser", "Web Browser");
wb.position.set(-14.4, 1.7, 3.4);
wb.rotation.y = Math.PI / 2;
box(0.1, 1, 0.1, M.black, -14.4, 0.5, 3.4);

// Plants
function plant(x, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  g.rotation.y = Math.random() * Math.PI;
  scene.add(g);
  rbox(0.58, 0.62, 0.58, 0.06, M.pot, 0, 0.31, 0, g);
  box(0.5, 0.02, 0.5, M.soil, 0, 0.61, 0, g);
  // Two rings of arching blades: an outer, wider ring and a taller inner one
  for (const [n, tilt, size, mat] of [[12, 0.95, 1.05, M.leaf], [9, 0.5, 1.15, M.leaf2], [5, 0.15, 1.0, M.leaf2]]) {
    for (let i = 0; i < n; i++) {
      const l = mesh(leafGeo, mat, 0, 0.6, 0, g);
      l.scale.setScalar(size * (0.85 + Math.random() * 0.3));
      l.rotation.set(tilt + (Math.random() - 0.5) * 0.25, (i / n) * Math.PI * 2 + Math.random() * 0.4, 0, "YXZ");
      l.castShadow = true;
    }
  }
}
[[-14.2, -10.2], [-7.8, -3.4], [-3.8, -10.2], [6.8, -10.2], [6.8, -4.3], [-2.4, -4.3], [-14.2, 6.4], [-10.6, 10.3],
 [14.2, 6.2], [10.4, 10.2], [-4.6, 10.3], [4.6, 10.3], [-14.2, -4.6]].forEach(([x, z]) => plant(x, z, 0.9 + Math.random() * 0.25));

// ---------- feature props ----------
const spinners = [];
function pedestal(x, z, r = 0.75) {
  cyl(r, r + 0.1, 0.22, M.dark, x, 0.11, z);
  const ring = mesh(new THREE.TorusGeometry(r + 0.02, 0.035, 8, 48), M.glowPurple, x, 0.23, z);
  ring.rotation.x = Math.PI / 2;
}

// Settings gear
{
  const s = new THREE.Shape();
  const teeth = 10;
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2, a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 ? 0.72 : 0.95;
    if (i === 0) s.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
    s.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
    s.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.32, 0, Math.PI * 2, true);
  s.holes.push(hole);
  pedestal(-3.8, 8.9);
  const gear = mesh(new THREE.ExtrudeGeometry(s, { depth: 0.32, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }), M.glowCyan, -3.8, 1.35, 8.75);
  gear.rotation.y = 0.3;
  spinners.push({ o: gear, axis: "z", v: 0.4 });
}
// Audit stack
pedestal(3.4, 9);
for (let i = 0; i < 3; i++) {
  cyl(0.62, 0.62, 0.36, M.glowCyan, 3.4, 0.45 + i * 0.44, 9);
  cyl(0.64, 0.64, 0.05, M.white, 3.4, 0.65 + i * 0.44, 9);
}
cyl(0.03, 0.03, 0.5, M.glowPink, 3.4, 1.85, 9, scene, 8);
mesh(new THREE.SphereGeometry(0.1, 12, 8), M.glowPink, 3.4, 2.12, 9);
// Reviews board
{
  const g = new THREE.Group();
  g.position.set(5.9, 0, 8.6);
  g.rotation.y = -0.35;
  scene.add(g);
  for (const sx of [-0.8, 0.8]) box(0.08, 1.1, 0.08, M.black, sx, 0.55, 0, g);
  box(2.2, 1.2, 0.08, M.black, 0, 1.6, 0, g);
  box(2.2, 0.16, 0.1, M.yellow, 0, 2.12, 0, g);
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.1 : 0.22;
    i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const sg = new THREE.ExtrudeGeometry(star, { depth: 0.05, bevelEnabled: false });
  for (let i = 0; i < 4; i++) mesh(sg, M.yellow, -0.72 + i * 0.48, 1.52, 0.04, g);
}
// Leads fountain
{
  pedestal(8.1, 8.1, 0.6);
  const g = new THREE.Group();
  g.position.set(8.1, 0.25, 8.1);
  scene.add(g);
  const geo = new THREE.CylinderGeometry(0.012, 0.02, 1.9, 4);
  geo.translate(0, 0.95, 0);
  for (let i = 0; i < 46; i++) {
    const f = new THREE.Mesh(geo, M.glowPink);
    f.rotation.set(0.15 + Math.random() * 0.55, 0, 0);
    const p = new THREE.Group();
    p.rotation.y = Math.random() * Math.PI * 2;
    p.add(f);
    g.add(p);
  }
  spinners.push({ o: g, axis: "y", v: 0.25 });
}
// Website globe
{
  pedestal(10.1, 7.2);
  const globe = mesh(new THREE.IcosahedronGeometry(0.85, 2), new THREE.MeshBasicMaterial({ color: 0x3df5ff, wireframe: true }), 10.1, 1.5, 7.2);
  mesh(new THREE.SphereGeometry(0.8, 32, 16), new THREE.MeshStandardMaterial({ color: 0x1b6dff, emissive: 0x0b3fbf, emissiveIntensity: 0.8, transparent: true, opacity: 0.55 }), 10.1, 1.5, 7.2);
  const ring = mesh(new THREE.TorusGeometry(1.1, 0.02, 8, 64), M.glowCyan, 10.1, 1.5, 7.2);
  ring.rotation.x = 1.2;
  spinners.push({ o: globe, axis: "y", v: 0.35 });
}
// Business memory (database)
pedestal(11.9, 5.6);
for (let i = 0; i < 3; i++) {
  cyl(0.62, 0.62, 0.42, M.glowPurple, 11.9, 0.5 + i * 0.5, 5.6);
  const r = mesh(new THREE.TorusGeometry(0.63, 0.025, 6, 40), M.glowPink, 11.9, 0.74 + i * 0.5, 5.6);
  r.rotation.x = Math.PI / 2;
}
// Files screen
{
  box(0.08, 1.1, 0.08, M.black, 13.1, 0.55, 3.9);
  pedestal(13.1, 3.9, 0.5);
  const s = screen(1.2, 0.8, "list", "Files");
  s.position.set(13.1, 1.6, 3.9);
  s.rotation.y = -0.7;
}
// Resources tube
pedestal(14, 1.9, 0.55);
cyl(0.45, 0.45, 2.1, M.glass, 14, 1.3, 1.9).castShadow = false;
cyl(0.22, 0.22, 1.9, M.glowPink, 14, 1.3, 1.9);
cyl(0.5, 0.5, 0.1, M.black, 14, 2.4, 1.9);
// Integrations orb
{
  pedestal(-11, -7.5, 0.7);
  cyl(0.06, 0.06, 0.8, M.black, -11, 0.6, -7.5, scene, 8);
  const orb = mesh(new THREE.SphereGeometry(0.75, 32, 16), new THREE.MeshStandardMaterial({ color: 0xc89bff, emissive: 0x8a3cff, emissiveIntensity: 1.5, roughness: 0.2 }), -11, 1.8, -7.5);
  orb.castShadow = false;
  for (const tilt of [0.5, -0.9]) {
    const r = mesh(new THREE.TorusGeometry(1.05, 0.025, 8, 64), M.glowCyan, -11, 1.8, -7.5);
    r.rotation.set(Math.PI / 2 + tilt, 0, 0);
    spinners.push({ o: r, axis: "z", v: tilt });
  }
}
// Phone kiosk (rings when nobody's there to answer)
const phoneScreenMat = new THREE.MeshStandardMaterial({ color: 0xf03cff, emissive: 0xf03cff, emissiveIntensity: 2.2 });
const phoneRings = [];
{
  const x = 10.6, z = 1.4;
  pedestal(x, z, 0.65);
  box(0.08, 1.2, 0.08, M.black, x, 0.7, z);
  const g = new THREE.Group();
  g.position.set(x, 1.9, z);
  g.rotation.y = -0.6;
  scene.add(g);
  box(0.75, 1.3, 0.1, M.black, 0, 0, 0, g);
  box(0.62, 1.12, 0.02, phoneScreenMat, 0, 0, 0.06, g);
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: 0xf03cff, transparent: true }));
    g.add(r);
    phoneRings.push(r);
  }
}

// ---------- AI agents ----------
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.2 });
const agents = seats.map((desk, i) => {
  const [name, , , color] = TEAM[i];
  const mat = new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.12, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
  const a = new THREE.Group();
  a.position.set(0, 0.55, 0.92);
  desk.add(a);
  mesh(new THREE.CapsuleGeometry(0.25, 0.3, 8, 20), mat, 0, 0.34, 0, a);           // body
  const head = new THREE.Group();
  head.position.set(0, 0.98, -0.02);
  a.add(head);
  mesh(new THREE.SphereGeometry(0.4, 40, 24), mat, 0, 0, 0, head);                  // head
  for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(0.055, 14, 10), eyeMat, sx * 0.14, 0.04, -0.38, head);
  const arms = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.29, 0.52, -0.02);
    a.add(pivot);
    const arm = mesh(new THREE.CapsuleGeometry(0.075, 0.34, 6, 10), mat, 0, -0.2, 0, pivot);
    arm.rotation.x = 0;
    pivot.rotation.x = 1.15;
    arms.push(pivot);
    const leg = mesh(new THREE.CapsuleGeometry(0.085, 0.34, 6, 10), mat, sx * 0.13, 0.04, -0.26, a);
    leg.rotation.x = Math.PI / 2;
  }
  a.userData = { phase: i * 0.7, name, arms, head };
  return a;
});

// ---------- labels ----------
const LABELS = [
  ["Meeting Room", 1.5, 4.6, -8], ["Integrations", -11, 3.6, -7.5], ["Reports", 8.6, 3.9, -10.7],
  ["Agent Missions", 12.3, 3.9, -10.7], ["Carpet Cleaning Hamilton", 14.7, 4, -6.2], ["Your Tasks", 14.7, 3.9, -1.4],
  ["Calendar", 14.7, 3.9, 2.9], ["Phone", 10.6, 3.2, 1.4], ["Files", 13.1, 2.5, 3.9], ["Resources", 14, 2.9, 1.9],
  ["Business Memory", 11.9, 2.4, 5.6], ["Website", 10.1, 2.8, 7.2], ["Leads", 8.1, 2.6, 8.1], ["Reviews", 5.9, 2.7, 8.6],
  ["Audit", 3.4, 2.5, 9], ["Settings", -3.8, 2.6, 8.9], ["Web Browser", -14.4, 2.9, 3.4],
];
const ICON = '<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="8" width="14" height="11" rx="3" fill="#3df5ff"/><circle cx="9.5" cy="13.5" r="1.5" fill="#1a1240"/><circle cx="14.5" cy="13.5" r="1.5" fill="#1a1240"/><path d="M12 8V4" stroke="#3df5ff" stroke-width="2"/></svg>';
const wallOf = (x, z) => (z < -10.5 && x > 6 ? backG : x > 14.5 ? rightG : null);
const labels = LABELS.map(([text, x, y, z]) => {
  const el = document.createElement("div");
  el.className = "lbl";
  el.innerHTML = ICON + "<span>" + text + "</span>";
  labelLayer.appendChild(el);
  return { el, p: new THREE.Vector3(x, y, z), g: wallOf(x, z) };
});
for (const a of agents) {
  if (!a.userData.name) continue;
  const el = document.createElement("div");
  el.className = "lbl lbl-agent";
  el.textContent = a.userData.name;
  labelLayer.appendChild(el);
  labels.push({ el, p: new THREE.Vector3(), agent: a });
}

// Everything that should glow: unlit materials (screens, neon, rings) and strong emissives
scene.traverse((o) => {
  const m = o.material;
  if (o.isMesh && m && (m.isMeshBasicMaterial || m.emissiveIntensity >= 1.5)) o.layers.enable(BLOOM_LAYER);
});

// ---------- scroll-driven camera ----------
// One stop per story panel: [target, azimuth, elevation, distance, offsetX, offsetY]
const STOPS = [
  { t: [0, 0, 0], az: -0.12, el: 0.78, d: 100, ox: 0, oy: -0.27, wide: true, hero: true }, // hero overview (fitted below the text)
  { t: [10.6, 1.6, 1.4], az: -0.5, el: 0.38, d: 14, ox: 0.2, oy: 0 },            // the ringing phone
  { t: [1.2, 0.8, -1], az: 0.55, el: 0.62, d: 21, ox: -0.2, oy: 0 },             // empty desks
  { t: [-8.6, 0.8, 5.8], az: 0.4, el: 0.5, d: 14, ox: 0.2, oy: 0 },              // the lounge
  { t: [12, 2.4, -4], az: -1.0, el: 0.3, d: 17, ox: -0.2, oy: 0 },               // dashboards
  { t: [0, 0, 0], az: 0.22, el: 0.88, d: 50, ox: 0, oy: 0.05, wide: true },      // full workforce
];
let anchors = [];
const heroFit = { d: 100, oy: -0.27, small: false };
function measure() {
  // Fit the rotating hero office into the space between the hero text and the bottom of the screen
  const contentBottom = document.querySelector(".hero-inner").getBoundingClientRect().bottom + scrollY;
  const avail = Math.max(H - contentBottom - 16, H * 0.34);
  const vis = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); // world units visible per unit of distance
  const dFitH = 24 / (vis * (avail * 0.92) / H);   // office is ~24 units tall on screen while it turns
  const dFitW = 38 / (vis * (W / H) * 0.9);         // and ~38 units across at its widest
  heroFit.d = Math.max(dFitH, dFitW, 90);
  heroFit.oy = 0.5 - (contentBottom + avail / 2) / H;
  heroFit.small = avail < 330; // too little room for readable labels in the hero
  const top = story.getBoundingClientRect().top + scrollY;
  anchors = panels.map((p, i) => (i === 0 ? 0 : top + p.offsetTop + p.offsetHeight / 2 - innerHeight / 2));
}
function storyIndex() {
  const y = scrollY;
  if (y <= anchors[0]) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (y < anchors[i + 1]) {
      const f = (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
      return i + f * f * (3 - 2 * f);
    }
  }
  return anchors.length - 1;
}

const lerp = (a, b, f) => a + (b - a) * f;
function stopAt(s, aspect, mobile) {
  const i = Math.min(Math.floor(s), STOPS.length - 2), f = s - i;
  const A = STOPS[i], B = STOPS[i + 1];
  const pick = (S) => {
    if (S.hero) return { t: S.t, az: S.az, el: S.el, d: heroFit.d, ox: 0, oy: heroFit.oy };
    const k = S.wide ? Math.max(1, 1.3 / aspect) : Math.max(1, 0.95 / aspect);
    return {
      t: S.t, az: S.az, el: S.el, d: S.d * k,
      ox: mobile ? 0 : S.ox,
      oy: mobile && !S.wide ? 0.2 : S.oy,
    };
  };
  const a = pick(A), b = pick(B);
  return {
    t: a.t.map((v, j) => lerp(v, b.t[j], f)),
    az: lerp(a.az, b.az, f), el: lerp(a.el, b.el, f), d: lerp(a.d, b.d, f),
    ox: lerp(a.ox, b.ox, f), oy: lerp(a.oy, b.oy, f),
  };
}

let W = 1, H = 1, cam = null, visible = true, heroSpin = 0;
function resize() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  renderer.setSize(W, H, false);
  for (const c of [composer, bloomComposer]) { c.setPixelRatio(renderer.getPixelRatio()); c.setSize(W, H); }
  camera.aspect = W / H;
  measure();
}
addEventListener("resize", resize);
addEventListener("load", measure);
new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(story);
resize();

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
const cOrange = new THREE.Color(0xf03cff), cCyan = new THREE.Color(0x19d3ff);

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  const s = storyIndex();
  const goal = stopAt(s, W / H, W < 900);
  if (!cam) cam = structuredClone(goal);
  const k = 1 - Math.exp(-dt * 5);
  for (const key of ["az", "el", "d", "ox", "oy"]) cam[key] = lerp(cam[key], goal[key], k);
  cam.t = cam.t.map((v, j) => lerp(v, goal.t[j], k));

  // Hero: slow turntable. The angle only advances while the page is at the very
  // top, then eases back to the story's camera as you scroll.
  if (s <= 0.001 && !reduceMotion) {
    heroSpin += dt * 0.18;
    heroSpin = Math.atan2(Math.sin(heroSpin), Math.cos(heroSpin));
  }
  const heroW = 1 - THREE.MathUtils.smoothstep(s, 0, 0.9);
  const az = cam.az + heroSpin * heroW + (reduceMotion ? 0 : Math.sin(time * 0.15) * 0.03 * (1 - heroW));
  camera.position.set(
    cam.t[0] + Math.sin(az) * Math.cos(cam.el) * cam.d,
    cam.t[1] + Math.sin(cam.el) * cam.d,
    cam.t[2] + Math.cos(az) * Math.cos(cam.el) * cam.d
  );
  camera.lookAt(cam.t[0], cam.t[1], cam.t[2]);
  camera.setViewOffset(W, H, cam.ox * W, cam.oy * H, W, H);

  // Fold outer walls down when the camera is behind them
  const fk = 1 - Math.exp(-dt * 6);
  backG.scale.y = lerp(backG.scale.y, camera.position.z < -11 ? 0.04 : 1, fk);
  rightG.scale.y = lerp(rightG.scale.y, camera.position.x > 15 ? 0.04 : 1, fk);

  // The team is there in the hero, gone during the "doing it alone" stops,
  // and back for the finale. The phone rings unanswered while they're away.
  const arrive = 1 - THREE.MathUtils.smoothstep(s, 0.25, 0.9) + THREE.MathUtils.smoothstep(s, 4, 4.9);
  agents.forEach((a, i) => {
    const local = THREE.MathUtils.clamp(arrive * 1.6 - i * 0.07, 0, 1);
    a.scale.setScalar(Math.max(0.001, local));
    a.userData.shown = local;
    a.position.y = 0.55 + (reduceMotion ? 0 : Math.sin(time * 2 + a.userData.phase) * 0.02);
    if (!reduceMotion) {
      const tp = time * 11 + a.userData.phase;
      a.userData.arms[0].rotation.x = 1.15 + Math.max(0, Math.sin(tp)) * 0.14;
      a.userData.arms[1].rotation.x = 1.15 + Math.max(0, Math.sin(tp + Math.PI)) * 0.14;
      a.userData.head.rotation.y = Math.sin(time * 0.6 + a.userData.phase) * 0.18;
      a.userData.head.rotation.x = Math.sin(time * 1.3 + a.userData.phase) * 0.04;
    }
  });
  const phoneColor = cOrange.clone().lerp(cCyan, arrive);
  phoneScreenMat.color.copy(phoneColor);
  phoneScreenMat.emissive.copy(phoneColor);
  phoneRings.forEach((r, i) => {
    const p = ((time * 0.9 + i / 3) % 1);
    r.scale.setScalar(0.4 + p * 1.2);
    r.material.opacity = (1 - p) * (1 - arrive) * 0.9;
    r.material.color.copy(phoneColor);
  });

  if (!reduceMotion) for (const sp of spinners) sp.o.rotation[sp.axis] += sp.v * dt;

  // Glow pass: only bloom-layer objects, on black
  const bg = scene.background;
  scene.background = null;
  camera.layers.set(BLOOM_LAYER);
  bloomComposer.render();
  camera.layers.set(0);
  scene.background = bg;
  composer.render();

  // Project labels (kept out of the hero so the headline stays clean)
  const labelScale = (0.78 + 0.22 * (1 - heroW)).toFixed(3); // smaller tags while the hero office is small
  for (const l of labels) {
    let vis = 1;
    if (l.agent) {
      l.agent.getWorldPosition(tmp);
      tmp.y += 1.75;
      vis = l.agent.userData.shown > 0.6 ? 1 : 0;
    } else {
      tmp.copy(l.p);
      if (l.g) { tmp.y *= l.g.scale.y; vis = l.g.scale.y > 0.6 ? 1 : 0; }
    }
    tmp.project(camera);
    const off = tmp.z > 1 || tmp.x < -1.2 || tmp.x > 1.2 || tmp.y < -1.2 || tmp.y > 1.2;
    if (heroFit.small) vis *= 1 - heroW;
    l.el.style.opacity = off ? 0 : vis;
    if (!off) l.el.style.transform = `translate(${((tmp.x + 1) / 2) * W}px, ${((1 - tmp.y) / 2) * H}px) translate(-50%, -100%) scale(${labelScale})`;
  }
}
frame();
