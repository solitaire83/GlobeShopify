uniform float size;
uniform float scaleMultiplier;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = (size / -mvPosition.z) * scaleMultiplier;
  gl_Position = projectionMatrix * mvPosition;
}
