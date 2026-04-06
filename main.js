// ─────────────────────────────────────────────
//  STROBILATION — main.js
//  Scene, camera, lighting, render loop & UI
// ─────────────────────────────────────────────

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { Jellyfish } from './Jellyfish.js';

// ── State ────────────────────────────────────
const state = {
  headScale:     1.0,
  movementSpeed: 1.0,
};

// ── Scene setup ──────────────────────────────
const container = document.getElementById('canvas-container');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x030305, 1);
renderer.sortObjects = true;
container.appendChild(renderer.domElement);

const scene  = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030305, 0.08);

const camera = new THREE.PerspectiveCamera(
  52,
  window.innerWidth / window.innerHeight,
  0.01,
  100
);
camera.position.set(0, 0.4, 5.5);
camera.lookAt(0, 0, 0);

// ── Lighting (minimal — shaders self-illuminate) ──
const ambientLight = new THREE.AmbientLight(0x050510, 1);
scene.add(ambientLight);

const rimLight = new THREE.PointLight(0x00ffee, 0.6, 12);
rimLight.position.set(3, 2, 2);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xff00aa, 0.3, 10);
fillLight.position.set(-2, -1, 3);
scene.add(fillLight);

// ── Grid floor (brutalist) ───────────────────
const gridHelper = new THREE.GridHelper(20, 24, 0x00ffee, 0x0a1a1a);
gridHelper.position.y = -3.2;
gridHelper.material.opacity = 0.18;
gridHelper.material.transparent = true;
scene.add(gridHelper);

// ── Jellyfish ───────────────────────────────
const jellyfish = new Jellyfish({
  headScale:     state.headScale,
  tentacleCount: 18,
});
scene.add(jellyfish.group);

// ── Subtle camera drift (no position change to jellyfish) ──
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', e => {
  mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// ── Resize ───────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── UI Controls ─────────────────────────────
function initUI() {
  // Head Size slider
  const headSlider = document.getElementById('head-size');
  const headVal    = document.getElementById('head-val');

  headSlider.addEventListener('input', () => {
    const v = parseFloat(headSlider.value);
    state.headScale = v;
    headVal.textContent = v.toFixed(2);
    updateSliderTrack(headSlider);
    jellyfish.setHeadScale(v);
  });

  // Speed slider
  const speedSlider = document.getElementById('move-speed');
  const speedVal    = document.getElementById('speed-val');

  speedSlider.addEventListener('input', () => {
    const v = parseFloat(speedSlider.value);
    state.movementSpeed = v;
    speedVal.textContent = v.toFixed(2);
    updateSliderTrack(speedSlider);
  });

  // Init track fill
  updateSliderTrack(headSlider);
  updateSliderTrack(speedSlider);
}

function updateSliderTrack(slider) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const val = parseFloat(slider.value);
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.setProperty('--pct', pct + '%');
}

// ── Status bar ───────────────────────────────
const fpsEl  = document.getElementById('s-fps');
const timeEl = document.getElementById('s-time');
let lastTs = 0, frames = 0, fps = 0;

// ── Render loop ─────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // FPS counter
  frames++;
  if (elapsed - lastTs >= 1.0) {
    fps = frames;
    frames = 0;
    lastTs = elapsed;
  }

  // Update jellyfish
  jellyfish.update(elapsed, state.movementSpeed);

  // Subtle camera parallax (camera moves, jellyfish stays at 0,0,0)
  camera.position.x += (mouseX * 0.6 - camera.position.x) * 0.04;
  camera.position.y += (-mouseY * 0.3 + 0.4 - camera.position.y) * 0.04;
  camera.lookAt(0, 0, 0);

  // Rim light pulse synced to bell
  const pulse = Math.sin(elapsed * state.movementSpeed * 2.2) * 0.5 + 0.5;
  rimLight.intensity = 0.4 + pulse * 0.4;
  fillLight.intensity = 0.15 + (1 - pulse) * 0.3;

  // Status
  if (fpsEl)  fpsEl.textContent  = fps;
  if (timeEl) timeEl.textContent = elapsed.toFixed(1) + 's';

  renderer.render(scene, camera);
}

// ── Boot ────────────────────────────────────
initUI();
animate();
