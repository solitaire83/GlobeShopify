precision mediump float;

uniform sampler2D map;
uniform float alphaTest;
uniform vec3 color;
uniform float bloomIntensity;

varying float t;

void main() {
  if(t <= 0.0 || t >= 2.0) {
    discard;
  }

  gl_FragColor = texture2D(map, gl_PointCoord);

  if(gl_FragColor.a < alphaTest)
    discard;

  gl_FragColor.rgb = color * bloomIntensity;
}
