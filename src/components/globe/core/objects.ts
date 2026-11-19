import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedBufferGeometry,
  InstancedInterleavedBuffer,
  InstancedMesh,
  InterleavedBufferAttribute,
  LinearFilter,
  MathUtils,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Points,
  ShaderMaterial,
  Sphere,
  SphereGeometry,
  Vector2,
  Vector3,
  type Texture,
} from "three";

// SHADERS
import globeVert from "./shaders/globe.vert.glsl?raw";
import globeFrag from "./shaders/globe.frag.glsl?raw";
import arcsVert from "./shaders/arcs.vert.glsl?raw";
import arcsFrag from "./shaders/arcs.frag.glsl?raw";
import citiesVert from "./shaders/cities.vert.glsl?raw";
import citiesFrag from "./shaders/cities.frag.glsl?raw";
import impactVert from "./shaders/impact.vert.glsl?raw";
import impactFrag from "./shaders/impact.frag.glsl?raw";
import fireworksVert from "./shaders/fireworks.vert.glsl?raw";
import fireworksFrag from "./shaders/fireworks.frag.glsl?raw";

// TYPES
type Time = { value: number };
type Impact = { position: Vector3; time: number };

// CONSTS & CONFIGS
const ARC_SEGMENTS = 30;
const FIREWORK_COLORS = ["#c08fff", "#ff96cc", "#fa99ff"];
const FIREWORK_SCALE = new Vector3(0.1, 0.1, 0.1);
const ORIGIN = new Vector3();

const latLng = (lat: number, lng: number) =>
  new Vector3().setFromSphericalCoords(1, MathUtils.degToRad(90 - lat), MathUtils.degToRad(lng + 90));

function instanced(geometry: InstancedBufferGeometry, count: number, layout: [string, number][]) {
  const stride = layout.reduce((sum, [, size]) => sum + size, 0);
  const buffer = new InstancedInterleavedBuffer(new Float32Array(count * stride).fill(-10), stride);
  let offset = 0;
  for (const [name, size] of layout) {
    geometry.setAttribute(name, new InterleavedBufferAttribute(buffer, size, offset));
    offset += size;
  }
  return buffer;
}

export function createSurface({ map, land, water }: Record<"map" | "land" | "water", Texture>, time: Time) {
  const noise = { value: 1 };
  const landEnv = { value: 1 };
  land.minFilter = water.minFilter = LinearFilter;

  const material = new MeshStandardMaterial();
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uTime: time,
      uEquirectangularMap: { value: map },
      uWaterColors: { value: water },
      uLandColors: { value: land },
      uNoiseQuality: noise,
      uLandEnvMultiplier: landEnv,
    });
    shader.vertexShader = globeVert;
    shader.fragmentShader = globeFrag;
  };

  const sphere = new Mesh(new IcosahedronGeometry(1, 14), material);
  sphere.rotation.y = Math.PI;

  const shell = new Mesh(
    new SphereGeometry(2, 10, 10),
    new ShaderMaterial({
      vertexShader: "void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.01); }",
      transparent: true,
      side: BackSide,
    }),
  );
  shell.renderOrder = -1;

  return { sphere, shell, noise, landEnv };
}

export function createArcs(time: Time, count = 1000) {
  const geometry = new InstancedBufferGeometry();
  const uv: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= ARC_SEGMENTS; i++) {
    uv.push(0, i / ARC_SEGMENTS, 1, i / ARC_SEGMENTS);
    if (i) index.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i, 2 * i - 1, 2 * i + 1);
  }
  geometry.setIndex(index);
  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(uv.length * 1.5), 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  const buffer = instanced(geometry, count, [["startPos", 3], ["midCoord1", 3], ["midCoord2", 3], ["endPos", 3], ["startTime", 1], ["distance", 1]]);

  const mesh = new Mesh(
    geometry,
    new ShaderMaterial({
      uniforms: {
        uTime: time,
        thickness: { value: 0.0018 },
        noiseScale: { value: new Vector2(800, 800) },
        opacity: { value: 1 },
        duration: { value: 1 },
        color: { value: new Color("#ffffff") },
      },
      vertexShader: arcsVert,
      fragmentShader: arcsFrag,
      depthWrite: false,
      transparent: true,
    }),
  );

  let next = 0;
  const send = (fromLat: number, fromLng: number, toLat: number, toLng: number): Impact => {
    const start = latLng(fromLat, fromLng);
    const end = latLng(toLat, toLng);
    const distance = start.distanceTo(end);
    const lift = 1 + (distance / 2) ** 2;
    const angle = start.angleTo(end);
    const along = (t: number) =>
      (angle
        ? start.clone().multiplyScalar(Math.sin((1 - t) * angle)).addScaledVector(end, Math.sin(t * angle)).divideScalar(Math.sin(angle))
        : start.clone()
      ).multiplyScalar(lift);

    const startTime = time.value + Math.random() * 2;
    buffer.array.set([...start.toArray(), ...along(0.25).toArray(), ...along(0.75).toArray(), ...end.toArray(), startTime, distance], next * 14);
    buffer.needsUpdate = true;
    next = (next + 1) % count;
    return { position: end, time: startTime + 1 };
  };

  return { mesh, send };
}

export function createDots(
  texture: Texture,
  data: number[][],
  { color, size, bloom, offset }: { color: string; size: number; bloom: number; offset: number },
) {
  const points = new Points(
    new BufferGeometry().setFromPoints(data.map(([lat, lng]) => latLng(lat, lng).multiplyScalar(1 + offset))),
    new ShaderMaterial({
      uniforms: {
        size: { value: size },
        color: { value: new Color(color) },
        dotTexture: { value: texture },
        alphaTest: { value: 0.9 },
        bloomIntensity: { value: bloom },
        scaleMultiplier: { value: 1 },
      },
      vertexShader: citiesVert,
      fragmentShader: citiesFrag,
      transparent: true,
    }),
  );
  points.renderOrder = 1;
  return points;
}

export function createImpacts(texture: Texture, time: Time, size: number, count = 2000) {
  const position = new BufferAttribute(new Float32Array(count * 3), 3);
  const startTime = new BufferAttribute(new Float32Array(count).fill(-10), 1);
  const geometry = new BufferGeometry().setAttribute("position", position).setAttribute("startTime", startTime);
  geometry.boundingSphere = new Sphere(ORIGIN, 1.5);

  const points = new Points(
    geometry,
    new ShaderMaterial({
      uniforms: {
        uTime: time,
        duration: { value: 1 },
        size: { value: size },
        color: { value: new Color("#ffb670") },
        map: { value: texture },
        alphaTest: { value: 0.9 },
        bloomIntensity: { value: 2.4 },
      },
      vertexShader: impactVert,
      fragmentShader: impactFrag,
      transparent: true,
    }),
  );
  points.renderOrder = 1;

  let next = 0;
  const send = (impact: Impact) => {
    const { x, y, z } = impact.position.clone().multiplyScalar(1.001);
    position.setXYZ(next, x, y, z);
    startTime.setX(next, impact.time);
    position.needsUpdate = startTime.needsUpdate = true;
    next = (next + 1) % count;
  };

  return { points, send };
}

export function createFireworks(time: Time, count = 50) {
  const position: number[] = [];
  const uv: number[] = [];
  const tangent: number[] = [];
  const burst: number[] = [];
  const index: number[] = [];

  const trail = (points: Vector3[], isBurst: number) => {
    const base = position.length / 3;
    points.forEach((p, i) => {
      const t = (i < points.length - 1 ? points[i + 1].clone().sub(p) : p.clone().sub(points[i - 1])).normalize();
      const v = i / (points.length - 1);
      position.push(...p.toArray(), ...p.toArray());
      uv.push(-1, v, 1, v);
      tangent.push(...t.toArray(), ...t.toArray());
      burst.push(isBurst, isBurst);
      if (i) index.push(base + 2 * i - 2, base + 2 * i - 1, base + 2 * i, base + 2 * i, base + 2 * i - 1, base + 2 * i + 1);
    });
  };

  const shape = new IcosahedronGeometry(1, 1).getAttribute("position");
  const directions: Vector3[] = [];
  for (let i = 0; i < shape.count; i++) {
    const v = new Vector3().fromBufferAttribute(shape, i).normalize();
    if (!directions.some((d) => d.equals(v))) directions.push(v);
  }

  trail([new Vector3(), new Vector3(1, 1, 1)], 0);
  for (const d of directions) {
    trail(Array.from({ length: 6 }, (_, i) => d.clone().multiplyScalar(i / 5).sub(new Vector3(0, 0.45 * (i / 5) ** 2, 0))), 1);
  }

  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setAttribute("trailTangent", new Float32BufferAttribute(tangent, 3));
  geometry.setAttribute("isBurstTrail", new Float32BufferAttribute(burst, 1));
  const buffer = instanced(geometry, count, [["startTime", 1], ["sizeModifier", 1], ["color", 3]]);

  const mesh = new InstancedMesh(
    geometry,
    new ShaderMaterial({ uniforms: { uTime: time }, vertexShader: fireworksVert, fragmentShader: fireworksFrag, depthWrite: false, transparent: true }),
    count,
  );
  mesh.frustumCulled = false;

  let next = 0;
  const launch = (lat: number, lng: number, times = 3) => {
    const p = latLng(lat, lng);
    for (let r = 0; r < times; r++) {
      const twist = new Matrix4().makeRotationFromEuler(new Euler(Math.PI / 2, Math.random() * Math.PI * 2, 0));
      mesh.setMatrixAt(next, new Matrix4().lookAt(p, ORIGIN, mesh.up).setPosition(p).multiply(twist).scale(FIREWORK_SCALE));
      const color = new Color(FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]).offsetHSL(Math.random() * 0.02 - 0.01, 0, 0);
      buffer.array.set([time.value + r * 0.25, 1 - Math.random() * 0.5, color.r, color.g, color.b], next * 5);
      next = (next + 1) % count;
    }
    mesh.instanceMatrix.needsUpdate = buffer.needsUpdate = true;
  };

  return { mesh, launch };
}
