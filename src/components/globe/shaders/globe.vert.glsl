varying vec2 vUv;
varying vec3 vReflectLand;
varying vec3 vReflectWater;
varying vec3 vPosition;
varying float vNoiseQualityFresnel;
varying vec2  vNoiseQualityBounds;

const float uRoughness = 0.45;
const float uRoughness2 = 1.0;

uniform float uNoiseQuality;
uniform mat3 envMapRotation;

vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
  return normalize((vec4(dir, 0.0) * matrix).xyz);
}

vec3 calculateReflection(vec3 viewDir, vec3 n, float rough) {
  vec3 reflectVec = reflect(-viewDir, n);
  reflectVec = normalize(mix(reflectVec, n, rough * rough));

  reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
  reflectVec = (viewMatrix * vec4(envMapRotation * reflectVec, 0.0)).xyz;
  return reflectVec;
}

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1);

  vec3 viewNormal = normalize(normalMatrix * normal);
  vec3 viewDir = normalize(-mvPosition.xyz);

  vUv = uv;
  vPosition = mvPosition.xyz;

  gl_Position = projectionMatrix * mvPosition;

  vReflectLand = calculateReflection(viewDir, viewNormal, uRoughness2);
  vReflectWater = calculateReflection(viewDir, viewNormal, uRoughness);

  float lower = mix(0.45, 0.0, uNoiseQuality);
  float higher = mix(0.65, 1.0, uNoiseQuality);
  vNoiseQualityBounds = vec2(lower, higher);

  vNoiseQualityFresnel = 1.0 - dot(viewNormal, viewDir);
  vNoiseQualityFresnel = 1.0 - pow(vNoiseQualityFresnel, mix(0.25, 3.0, uNoiseQuality)) * 1.5;
  vNoiseQualityFresnel = clamp(vNoiseQualityFresnel, 0.0, 1.0);
}
