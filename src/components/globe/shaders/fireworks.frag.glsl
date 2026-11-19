varying vec2 vUv;
varying float vIsBurstTrail;
uniform float uTime;
varying float t;
varying vec3 vColor;

const float bloomIntensity = 9.0;

const float bloomFalloff = 18.0;
const float noiseFalloff = 3.0;
const vec2 noiseScale = vec2(10, 100);

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 n) {
	const vec2 d = vec2(0.0, 1.0);
  vec2 b = floor(n), f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
	return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
}

void main() {

  if (vUv.y > t) discard;

  vec2 uvScaled = vUv * noiseScale;
  float n = 1.0 - noise(uvScaled);

  float delayStart = vIsBurstTrail > 0.0 ? 0.15 : 0.25;
  float delayFactor = (pow(t, noiseFalloff * (vIsBurstTrail > 0.0 ? 1.0 : 1.3)) - delayStart) / (1.0 - delayStart);
  float noiseFade = smoothstep(0.0, t, vUv.y - delayFactor);

  if (n > noiseFade) discard;

  float colorFactor = clamp(1.0 - (t - vUv.y), 0.0, 1.0);

  float bloomEffect = bloomIntensity * pow(colorFactor, bloomFalloff);

  float bloomFade = 1.0 - smoothstep(0.85, 1.0, t);

  bloomEffect *= bloomFade;

  vec3 finalColor = vColor + vColor * bloomEffect;

  gl_FragColor = vec4(finalColor, 1.0);
}
