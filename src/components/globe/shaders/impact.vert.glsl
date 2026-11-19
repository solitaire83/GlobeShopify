uniform float uTime;
uniform float duration;
uniform float size;
uniform float zoomLevelScalingFactor;

attribute float startTime;

varying float t;

float easeOutBack(float t) {
  float s = 1.70158;
  t = t - 1.0;
  return (t * t * ((s + 1.0) * t + s) + 1.0);
}

float easeInBack(float t) {
  float s = 2.70158;
  return t * t * ((s + 1.0) * t - s);
}

void main() {
  t = clamp((uTime - startTime) / duration, 0.0, 2.0);

  if(t <= 0.0 || t >= 2.0) {
    return;
  }

  float expandStartTime = 0.0;
  float expandEndTime = 0.4;

  float shrinkStartTime = 1.5;
  float shrinkEndTime = 2.0;

  float expandProgress = clamp((t - expandStartTime) / (expandEndTime - expandStartTime), 0.0, 1.0);
  float shrinkProgress = clamp((t - shrinkStartTime) / (shrinkEndTime - shrinkStartTime), 0.0, 1.0);

  float scale;
  if(t < expandEndTime) {
    scale = easeOutBack(expandProgress);
  } else if(t < shrinkStartTime) {
    scale = 1.0;
  } else {
    scale = 1.0 - easeInBack(shrinkProgress);
  }
  scale *= 1.75;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = scale * size * (1.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
