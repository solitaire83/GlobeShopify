#include <common>
#include <cube_uv_reflection_fragment>

const float uShoreThreshold = 0.39;

const float uWaterShadowMultiplier = 1.2;
const float uRoughness = 0.45;
const float uEnvMapIntensity = 0.02;
const float uNoiseScale = 1500.0;
const float uNoiseStrength = 0.75;
const float uBloomIntensity = 2.6;
const float uRoughness2 = 1.0;
const float uEnvMapIntensity2 = 0.19;
const float uNoiseScale2 = 2000.0;
const float uNoiseStrength2 = 1.0;
const float uBloomIntensity2 = 1.28;

const float uNoiseScaleMultiplier = 1.0;

varying vec2 vUv;
varying vec3 vReflectLand;
varying vec3 vReflectWater;
varying vec3 vPosition;

varying vec2 vNoiseQualityBounds;
varying float vNoiseQualityFresnel;

uniform sampler2D uEquirectangularMap;
uniform sampler2D uWaterColors;
uniform sampler2D uLandColors;

uniform float uNoiseQuality;
uniform float uTime;
uniform sampler2D envMap;
uniform float uLandEnvMultiplier;

//
// psrdnoise2.glsl
//
// Authors: Stefan Gustavson (stefan.gustavson@gmail.com)
// and Ian McEwan (ijm567@gmail.com)
// Version 2021-12-02, published under the MIT license (see below)
//
// Copyright (c) 2021 Stefan Gustavson and Ian McEwan.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the "Software"),
// to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense,
// and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
// THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.

float psrdnoise(vec2 x, float alpha, out vec2 gradient) {

    vec2 uv = vec2(x.x + x.y * 0.5, x.y);

    vec2 i0 = floor(uv);
    vec2 f0 = fract(uv);
    float cmp = step(f0.y, f0.x);
    vec2 o1 = vec2(cmp, 1.0 - cmp);

    vec2 i1 = i0 + o1;
    vec2 i2 = i0 + vec2(1.0, 1.0);

    vec2 v0 = vec2(i0.x - i0.y * 0.5, i0.y);
    vec2 v1 = vec2(v0.x + o1.x - o1.y * 0.5, v0.y + o1.y);
    vec2 v2 = vec2(v0.x + 0.5, v0.y + 1.0);

    vec2 x0 = x - v0;
    vec2 x1 = x - v1;
    vec2 x2 = x - v2;

    vec3 iu, iv;

    iu = vec3(i0.x, i1.x, i2.x);
    iv = vec3(i0.y, i1.y, i2.y);

    vec3 hash = mod(iu, 289.0);
    hash = mod((hash * 51.0 + 2.0) * hash + iv, 289.0);
    hash = mod((hash * 34.0 + 10.0) * hash, 289.0);

    vec3 psi = hash * 0.07482 + alpha;
    vec3 gx = cos(psi);
    vec3 gy = sin(psi);

    vec2 g0 = vec2(gx.x, gy.x);
    vec2 g1 = vec2(gx.y, gy.y);
    vec2 g2 = vec2(gx.z, gy.z);

    vec3 w = 0.8 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2));
    w = max(w, 0.0);
    vec3 w2 = w * w;
    vec3 w4 = w2 * w2;

    vec3 gdotx = vec3(dot(g0, x0), dot(g1, x1), dot(g2, x2));

    float n = dot(w4, gdotx);

    vec3 w3 = w2 * w;
    vec3 dw = -8.0 * w3 * gdotx;
    vec2 dn0 = w4.x * g0 + dw.x * x0;
    vec2 dn1 = w4.y * g1 + dw.y * x1;
    vec2 dn2 = w4.z * g2 + dw.z * x2;
    gradient = 10.9 * (dn0 + dn1 + dn2);

    return 10.9 * n;
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float mapValue(float value, float minInput, float maxInput) {
  return (value - minInput) / (maxInput - minInput);
}

vec2 rotate2d(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  mat2 m = mat2(c, s, -s, c);
  return m * v;
}

void main() {
  vec4 equirectangularMapColor = texture2D(uEquirectangularMap, vUv);
  float mixFactor = step(uShoreThreshold, equirectangularMapColor.r);
  float roughnessFactor = mix(uRoughness2, uRoughness, mixFactor);
  float customEnvMapIntensity = mix(uEnvMapIntensity2 * uLandEnvMultiplier, uEnvMapIntensity, mixFactor);
  float bloomIntensity = mix(uBloomIntensity2, uBloomIntensity, mixFactor);

  vec4 envMapColor = vec4(customEnvMapIntensity);

  roughnessFactor *= mix(1.15, 1.0, uNoiseQuality);

  if (equirectangularMapColor.r > uShoreThreshold) {
    envMapColor *= textureCubeUV(envMap, vReflectWater, roughnessFactor);
  } else {
    envMapColor *= textureCubeUV(envMap, vReflectLand, roughnessFactor);
  }

  vec3 outgoingLight = envMapColor.rgb;

  vec2 v = vec2(uNoiseScale * uNoiseScaleMultiplier * vUv);
  vec2 g;
  float noise = 0.5 + 0.4 * psrdnoise(v, 2.0 * uTime, g);
  const float o = 0.6;
  vec2 d = 0.2 * o * g;
  noise *= uNoiseStrength;

  noise = mix(vNoiseQualityBounds.x, vNoiseQualityBounds.y, noise);
  noise = mix(0.5, noise, vNoiseQualityFresnel);
  noise *= uNoiseStrength;

  float adjustedBrightness = luma(outgoingLight);

  float shadowIntensity = (1.0 - equirectangularMapColor.b * uWaterShadowMultiplier);
  adjustedBrightness *= shadowIntensity;

  float lerpFactor = clamp(noise * adjustedBrightness, 0.0, 1.0);

  if (equirectangularMapColor.r > uShoreThreshold) {
    gl_FragColor.rgb = texture2D(uWaterColors, vec2(lerpFactor, 0.5)).rgb;
  } else {
    gl_FragColor.rgb = texture2D(uLandColors, vec2(lerpFactor, 0.5)).rgb;
  }

  gl_FragColor.rgb *= bloomIntensity;
  gl_FragColor.a = 1.0;

  float angle = 3.14 * -0.05;
  vec2 rotatedVPosition = rotate2d(vPosition.xy, angle);
  float shadow = mapValue(rotatedVPosition.y, -1., 1.);
  shadow = smoothstep(0.0, 0.4, shadow);
  shadow = pow(shadow, 0.1);
  shadow = 1.0 - shadow;

  gl_FragColor = linearToOutputTexel(gl_FragColor);
}
