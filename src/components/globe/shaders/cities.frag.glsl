uniform vec3 color;
uniform sampler2D dotTexture;
uniform float alphaTest;
uniform float bloomIntensity;

void main() {
  gl_FragColor = texture2D(dotTexture, gl_PointCoord);

  if(gl_FragColor.a < alphaTest)
    discard;

  gl_FragColor.rgb = color * bloomIntensity;
}
