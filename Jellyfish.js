// ─────────────────────────────────────────────
//  STROBILATION — Jellyfish.js
//  Self-contained procedural entity class
// ─────────────────────────────────────────────

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {
  BellVertexShader, BellFragmentShader,
  EdgeVertexShader, EdgeFragmentShader,
  TentacleVertexShader, TentacleFragmentShader
} from './Shaders.js';

// ── Colour palette ──
const C_CYAN    = new THREE.Color(0x00ffee);
const C_MAGENTA = new THREE.Color(0xff00aa);
const C_WHITE   = new THREE.Color(0xe8f0ff);

export class Jellyfish {
  /**
   * @param {object} opts
   * @param {number} opts.headScale   – base bell radius (default 1)
   * @param {number} opts.pulseAmt    – displacement magnitude (default 1)
   * @param {number} opts.tentacleCount
   */
  constructor(opts = {}) {
    this.headScale      = opts.headScale      ?? 1.0;
    this.pulseAmt       = opts.pulseAmt       ?? 1.0;
    this.tentacleCount  = opts.tentacleCount  ?? 16;

    this.group = new THREE.Group();
    this.group.position.set(0, 0, 0); // ALWAYS STATIC

    this._bellMats     = [];
    this._tentacleMats = [];
    this._edgeMat      = null;

    this._build();
  }

  // ──────────────────────────────────────────
  //  GEOMETRY BUILDERS
  // ──────────────────────────────────────────

  _buildBell() {
    const S = this.headScale;

    // ── Lathe bell profile ──────────────────
    const points = [];
    const segments = 28;
    for (let i = 0; i <= segments; i++) {
      const t  = i / segments;
      const y  = THREE.MathUtils.lerp(S * 0.95, -S * 0.05, t);
      // Silhouette: wide dome tapering to a gentle lip
      const r  = Math.sin(t * Math.PI) * S * (1.0 + Math.pow(t, 3) * 0.18);
      points.push(new THREE.Vector2(r, y));
    }

    const bellGeo = new THREE.LatheGeometry(points, 64);

    // ── Translucent body ───────────────────
    const bellMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:       { value: 0 },
        uSpeed:      { value: 1 },
        uPulseAmt:   { value: this.pulseAmt },
        uHeadScale:  { value: S },
        uColorCore:  { value: C_CYAN },
        uColorRim:   { value: C_MAGENTA },
      },
      vertexShader:   BellVertexShader,
      fragmentShader: BellFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const bell = new THREE.Mesh(bellGeo, bellMat);
    this._bellMats.push(bellMat);
    this.group.add(bell);

    // ── Wireframe meridians (edge lines) ───
    this._buildBellEdges(points, S);

    // ── Inner apex dome ────────────────────
    this._buildApex(S);
  }

  _buildBellEdges(points, S) {
    const edgeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:      { value: 0 },
        uSpeed:     { value: 1 },
        uPulseAmt:  { value: this.pulseAmt },
        uHeadScale: { value: S },
        uEdgeColor: { value: C_CYAN },
      },
      vertexShader:   EdgeVertexShader,
      fragmentShader: EdgeFragmentShader,
      transparent: true,
      depthWrite: false,
    });
    this._edgeMat = edgeMat;

    // Meridian lines
    const meridians = 12;
    for (let m = 0; m < meridians; m++) {
      const angle = (m / meridians) * Math.PI * 2;
      const verts = [];
      points.forEach(p => {
        verts.push(Math.cos(angle) * p.x, p.y, Math.sin(angle) * p.x);
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      const line = new THREE.Line(geo, edgeMat);
      this.group.add(line);
    }

    // Latitude rings (sparse — brutalist grid)
    const rings = [0.15, 0.4, 0.7, 0.9];
    rings.forEach(t => {
      const idx   = Math.floor(t * (points.length - 1));
      const pt    = points[idx];
      const ring  = new THREE.RingGeometry(pt.x - 0.004, pt.x + 0.004, 64);
      const ringM = new THREE.Mesh(ring, edgeMat);
      ringM.rotation.x = -Math.PI / 2;
      ringM.position.y = pt.y;
      this.group.add(ringM);
    });
  }

  _buildApex(S) {
    // Glowing apex sphere at top of bell
    const apexGeo = new THREE.SphereGeometry(S * 0.08, 16, 16);
    const apexMat = new THREE.MeshBasicMaterial({
      color: C_WHITE,
      transparent: true,
      opacity: 0.9,
    });
    const apex = new THREE.Mesh(apexGeo, apexMat);
    apex.position.y = S * 0.92;
    this.group.add(apex);
  }

  _buildTentacles() {
    const S   = this.headScale;
    const N   = this.tentacleCount;
    const len = S * 4.2;

    for (let i = 0; i < N; i++) {
      const angle  = (i / N) * Math.PI * 2;
      const radius = S * (0.72 + (i % 3) * 0.08); // varied attachment radii
      const segLen = 60;

      // Tentacle as LineSegments with per-vertex positions
      const verts = [];
      for (let j = 0; j <= segLen; j++) {
        const t = j / segLen;
        verts.push(
          Math.cos(angle) * radius,
          -t * len,
          Math.sin(angle) * radius
        );
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime:          { value: 0 },
          uSpeed:         { value: 1 },
          uWaveAmp:       { value: S * 0.55 },
          uPhaseOffset:   { value: angle },
          uHeadScale:     { value: S },
          uTentacleColor: { value: i % 3 === 0 ? C_MAGENTA : C_CYAN },
        },
        vertexShader:   TentacleVertexShader,
        fragmentShader: TentacleFragmentShader,
        transparent: true,
        depthWrite: false,
      });

      this._tentacleMats.push(mat);
      const line = new THREE.Line(geo, mat);
      this.group.add(line);
    }
  }

  _buildOralArms() {
    // Central oral arms — thicker, shorter inner appendages
    const S   = this.headScale;
    const N   = 4;
    const len = S * 2.0;

    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2;
      const r     = S * 0.2;
      const verts = [];
      const segs  = 30;

      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        verts.push(Math.cos(angle) * r, -t * len, Math.sin(angle) * r);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime:          { value: 0 },
          uSpeed:         { value: 1 },
          uWaveAmp:       { value: S * 0.3 },
          uPhaseOffset:   { value: angle + Math.PI },
          uHeadScale:     { value: S },
          uTentacleColor: { value: C_WHITE },
        },
        vertexShader:   TentacleVertexShader,
        fragmentShader: TentacleFragmentShader,
        transparent: true,
        depthWrite: false,
      });

      this._tentacleMats.push(mat);
      const line = new THREE.Line(geo, mat);
      line.material.linewidth = 2;
      this.group.add(line);
    }
  }

  _build() {
    this._buildBell();
    this._buildTentacles();
    this._buildOralArms();
  }

  // ──────────────────────────────────────────
  //  PUBLIC API
  // ──────────────────────────────────────────

  /**
   * Called every frame from main.js
   * @param {number} time   – elapsed time (seconds)
   * @param {number} speed  – animation speed multiplier
   */
  update(time, speed) {
    // Bell shader uniforms
    this._bellMats.forEach(mat => {
      mat.uniforms.uTime.value  = time;
      mat.uniforms.uSpeed.value = speed;
    });

    // Edge mat
    if (this._edgeMat) {
      this._edgeMat.uniforms.uTime.value  = time;
      this._edgeMat.uniforms.uSpeed.value = speed;
    }

    // Tentacle shader uniforms
    this._tentacleMats.forEach(mat => {
      mat.uniforms.uTime.value  = time;
      mat.uniforms.uSpeed.value = speed;
    });

    // Position stays at (0,0,0) — only shaders animate
  }

  /**
   * Dynamically rescale the bell geometry by rebuilding.
   * Called when headScale slider changes.
   */
  setHeadScale(scale) {
    this.headScale = scale;
    // Remove all children and rebuild
    while (this.group.children.length) {
      const child = this.group.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.group.remove(child);
    }
    this._bellMats    = [];
    this._tentacleMats = [];
    this._edgeMat      = null;
    this._build();
  }
}
