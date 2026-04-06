// ─────────────────────────────────────────────
//  STROBILATION — Shader Library
//  All GLSL strings for the jellyfish entity
// ─────────────────────────────────────────────

export const BellVertexShader = /* glsl */`
  uniform float uTime;
  uniform float uSpeed;
  uniform float uPulseAmt;
  uniform float uHeadScale;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vDisplace;
  varying float vPulse;

  // Smooth noise helper
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
  }

  void main() {
    vPosition = position;
    vNormal = normal;

    // Normalized height of vertex (0 = tip, 1 = rim)
    float normY = clamp((position.y + uHeadScale) / (uHeadScale * 1.5), 0.0, 1.0);

    // Primary pulse wave — radial contraction from rim
    float pulse = sin(uTime * uSpeed * 2.2) * 0.5 + 0.5;

    // Secondary ripple for organic feel
    float ripple = sin(uTime * uSpeed * 4.1 + normY * 6.28) * 0.12;

    // Edge flutter — highest at rim, zero at apex
    float edgeFlutter = pow(normY, 2.0) * (pulse + ripple);

    // Radial displacement: rim contracts, apex is stable
    float radialDisplace = edgeFlutter * uPulseAmt * 0.38;

    // Vertical displacement — bell squishes down on contraction
    float vertDisplace = pulse * uPulseAmt * 0.22 * normY;

    // Apply: shrink XZ at rim, push Y apex up
    vec3 displaced = position;
    displaced.xz *= (1.0 - radialDisplace);
    displaced.y  -= vertDisplace;

    // Subtle warp noise for organic irregularity
    float warpAngle = atan(position.z, position.x);
    float warp = noise(warpAngle * 3.0 + uTime * uSpeed * 0.7) * 0.018 * uPulseAmt;
    displaced.xz += normalize(position.xz + 0.001) * warp;

    vDisplace = edgeFlutter;
    vPulse = pulse;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const BellFragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uSpeed;
  uniform vec3 uColorCore;
  uniform vec3 uColorRim;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vDisplace;
  varying float vPulse;

  void main() {
    // Distance from center axis
    float radial = length(vPosition.xz);

    // Normalized height blend
    float heightBlend = clamp((vPosition.y + 1.2) / 2.4, 0.0, 1.0);

    // Core glow — brighter at top apex, cooler toward rim
    float coreGlow = pow(1.0 - radial * 0.6, 2.0) * (0.6 + vPulse * 0.4);

    // Rim emission — pulses with displacement
    float rimGlow = pow(vDisplace, 1.4) * 1.8;

    // Translucent body color
    vec3 bodyColor = mix(uColorRim, uColorCore, heightBlend);
    bodyColor += uColorCore * coreGlow * 0.6;
    bodyColor += uColorRim * rimGlow * 0.5;

    // Bioluminescence flicker at veins (angular pattern)
    float angle = atan(vPosition.z, vPosition.x);
    float veins = abs(sin(angle * 8.0)) * pow(radial * 0.8, 0.5) * 0.3;
    bodyColor += uColorCore * veins * (0.5 + vPulse * 0.5);

    // Alpha: semi-transparent body, stronger at rim and glow zones
    float alpha = 0.12 + coreGlow * 0.35 + rimGlow * 0.5 + veins * 0.25;
    alpha = clamp(alpha, 0.0, 0.88);

    gl_FragColor = vec4(bodyColor, alpha);
  }
`;

// ── Wireframe / Edge lines on bell ──
export const EdgeVertexShader = /* glsl */`
  uniform float uTime;
  uniform float uSpeed;
  uniform float uPulseAmt;
  uniform float uHeadScale;

  void main() {
    float normY = clamp((position.y + uHeadScale) / (uHeadScale * 1.5), 0.0, 1.0);
    float pulse  = sin(uTime * uSpeed * 2.2) * 0.5 + 0.5;
    float ripple = sin(uTime * uSpeed * 4.1 + normY * 6.28) * 0.12;
    float edgeFlutter = pow(normY, 2.0) * (pulse + ripple);
    float radialDisplace = edgeFlutter * uPulseAmt * 0.38;
    float vertDisplace   = pulse * uPulseAmt * 0.22 * normY;

    vec3 displaced = position;
    displaced.xz *= (1.0 - radialDisplace);
    displaced.y  -= vertDisplace;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const EdgeFragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uSpeed;
  uniform vec3  uEdgeColor;

  void main() {
    float flicker = 0.85 + 0.15 * sin(uTime * uSpeed * 6.0);
    gl_FragColor = vec4(uEdgeColor * flicker, 0.9);
  }
`;

// ── Tentacle ──
export const TentacleVertexShader = /* glsl */`
  uniform float uTime;
  uniform float uSpeed;
  uniform float uWaveAmp;
  uniform float uPhaseOffset;
  uniform float uHeadScale;

  varying float vT;

  void main() {
    // t: 0 = attachment point, 1 = tip
    float t = clamp(-position.y / (uHeadScale * 4.0), 0.0, 1.0);
    vT = t;

    // Primary lateral wave — grows toward tip
    float primaryWave  = sin(uTime * uSpeed * 1.8 + uPhaseOffset + t * 5.0) * uWaveAmp * t * t;
    float secondaryWave = sin(uTime * uSpeed * 3.1 + uPhaseOffset * 1.7 + t * 9.0) * uWaveAmp * 0.35 * t;

    // Depth oscillation for 3D feel
    float depthWave = cos(uTime * uSpeed * 2.3 + uPhaseOffset * 0.8 + t * 4.0) * uWaveAmp * 0.5 * t;

    vec3 displaced = position;
    displaced.x += primaryWave + secondaryWave;
    displaced.z += depthWave;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const TentacleFragmentShader = /* glsl */`
  uniform vec3  uTentacleColor;
  uniform float uTime;
  uniform float uSpeed;

  varying float vT;

  void main() {
    // Fade toward tip
    float alpha = (1.0 - pow(vT, 1.2)) * 0.85;

    // Pulse glow
    float pulse = 0.75 + 0.25 * sin(uTime * uSpeed * 2.8 + vT * 8.0);
    vec3 col = uTentacleColor * pulse;

    // Bioluminescent dots along length
    float dot = step(0.92, sin(vT * 40.0 + uTime * uSpeed * 2.0));
    col += uTentacleColor * dot * 1.5;

    gl_FragColor = vec4(col, alpha);
  }
`;
