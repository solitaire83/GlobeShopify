varying vec3 vColor;
varying float vAlpha;
varying vec2 vUv;
varying float age;
varying vec2 vNoiseScale;

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 n) {
    const vec2 d = vec2(0.0, 1.0);
    vec2 b = floor(n), f = smoothstep(vec2(0.0), vec2(1.0), fract(n));
    return mix(mix(rand(b), rand(b + d.yx), f.x), mix(rand(b + d.xy), rand(b + d.yy), f.x), f.y);
}

float ramp(float t) {
    float v = step(0.0, t) * (1.0 - step(1.0, t));
    return smoothstep(0.0, 1.0, (1.0 - t)) * v;
}

void main() {
    if(age <= 0.0 || age >= 2.0) {
        discard;
    }

    float adjustedAge = age - vUv.y;

    float r = ramp(adjustedAge);
    vec2 uvScaled = vUv * vNoiseScale;
    float n = noise(uvScaled);

    float alpha = step(1.0 - r, n);

    gl_FragColor = vec4(vColor, alpha * vAlpha);
}
