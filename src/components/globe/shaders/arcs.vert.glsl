precision mediump float;
uniform float uTime;
uniform float thickness;
uniform vec3 color;
uniform float opacity;
uniform float duration;
uniform vec2 noiseScale;

attribute vec3 startPos;
attribute vec3 midCoord1;
attribute vec3 midCoord2;
attribute vec3 endPos;
attribute float startTime;
attribute float distance;

varying vec3 vColor;
varying float age;
varying vec2 vUv;
varying float vAlpha;
varying vec2 vNoiseScale;

vec3 cubicBezier(vec3 startPoint, vec3 controlPoint1, vec3 controlPoint2, vec3 endPoint, float t) {
  float u = 1.0 - t;
  float tt = t * t;
  float uu = u * u;
  float uuu = uu * u;
  float ttt = tt * t;

  vec3 p = uuu * startPoint;
  p += 3.0 * uu * t * controlPoint1;
  p += 3.0 * u * tt * controlPoint2;
  p += ttt * endPoint;

  return p;
}

vec3 cubicBezierTangent(vec3 startPoint, vec3 controlPoint1, vec3 controlPoint2, vec3 endPoint, float t) {
  float u = 1.0 - t;
  float tt = t * t;
  float uu = u * u;

  vec3 p = -3.0 * uu * startPoint;
  p += 3.0 * (3.0 * tt - 4.0 * t + 1.0) * controlPoint1;
  p += 3.0 * (2.0 * t - 3.0 * tt) * controlPoint2;
  p += 3.0 * tt * endPoint;

  return normalize(p);
}

void main() {
  age = clamp((uTime - startTime) / duration, 0.0, 2.0);

  if(age <= 0.0 || age >= 2.0) {
    return;
  }

  float t = uv.y;
  float side = 2.0 * uv.x - 1.0;

  vec3 originalPosition = (modelMatrix * vec4(cubicBezier(startPos, midCoord1, midCoord2, endPos, t), 1.0)).xyz;
  vec3 direction = (modelMatrix * vec4(cubicBezierTangent(startPos, midCoord1, midCoord2, endPos, t), 1.0)).xyz;

  vec3 look;
  look = normalize(originalPosition - cameraPosition);
  vec3 offset = cross(look, direction * side);

  float distanceScalingFactor = distance * 0.5;

  vec3 adjustedPosition = originalPosition + normalize(offset) * thickness;

  vUv = uv;
  vAlpha = opacity;
  vColor = color;
  vNoiseScale = vec2(thickness * 2.0, distance) * noiseScale;

  gl_Position = projectionMatrix * viewMatrix * vec4(adjustedPosition, 1.0);
}
