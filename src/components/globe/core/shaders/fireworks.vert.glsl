uniform float uTime;
const float thickness = 0.02;
const float launchDuration = 1.0;
const float delayDuration = -0.4;
const float burstDuration = 1.5;
const float burstHeight = 5.5;

const float burstScale = 3.0;
const vec3 burstPositionOffset = vec3(1,0,0);

attribute float startTime;
attribute float sizeModifier;
attribute vec3 color;
attribute vec3 trailTangent;
attribute float isBurstTrail;
varying vec2 vUv;
varying vec3 vColor;
varying float t;
varying float vIsBurstTrail;

float easeOutCubic(float t) {
    t = t - 1.0;
    return (t * t * t + 1.0);
}

void main() {

  vColor = color;
  vUv = uv;
  vIsBurstTrail = isBurstTrail;
  bool burstTrail = isBurstTrail > 0.0;

  float elapsedTime = uTime - startTime;

  if (burstTrail) {
    t = (elapsedTime - launchDuration - delayDuration) / burstDuration;
  } else {
    t = elapsedTime / launchDuration;
  }

  if (t <= 0.0 || t >= 1.0) {
    return;
  }

  vec3 adjustedPosition = position;

  vec3 burstOrigin = vec3(burstPositionOffset.x, (burstPositionOffset.y + burstHeight) * sizeModifier, burstPositionOffset.z);

  if (burstTrail) {
    adjustedPosition = adjustedPosition * burstScale + burstOrigin;
  } else {
    adjustedPosition = adjustedPosition * burstOrigin;
  }

  t = easeOutCubic(t);

  vec3 localCameraPosition = vec3(inverse(instanceMatrix * modelMatrix) * vec4(cameraPosition, 1.0));
  vec3 look = normalize(adjustedPosition - localCameraPosition);

  vec3 tangent = burstTrail ? trailTangent : normalize(burstOrigin);

  vec3 offset = cross(look, tangent * uv.x);

  adjustedPosition = adjustedPosition + normalize(offset) * thickness;

  gl_Position = projectionMatrix * modelViewMatrix  * instanceMatrix * vec4(adjustedPosition, 1.0);
}
