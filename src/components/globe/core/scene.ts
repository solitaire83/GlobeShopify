import {
  ACESFilmicToneMapping,
  Group,
  HalfFloatType,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  PMREMGenerator,
  Points,
  Raycaster,
  Scene,
  Sphere,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, KernelSize, NoiseEffect, RenderPass } from "postprocessing";

// UTILS
import { createArcs, createDots, createFireworks, createImpacts, createSurface } from "./objects";
import { createCards } from "./cards";
import { ASSETS, FIREWORK_SITES, type FactoidEffect } from "../utils/presets";

// DATA
import routes from "./data/routes.json";
import cities from "./data/cities.json";
import datacenters from "./data/datacenters.json";

// TYPES
export type GlobeScene = Awaited<ReturnType<typeof createScene>>;

// CONSTS & CONFIGS
const HITBOX = new Sphere(new Vector3(), 1.3);
const FADE = 0.4;
const SPIN = 1.5;

const toward = (from: number, to: number, step: number) => from + MathUtils.clamp(to - from, -step, step);

export async function createScene(container: HTMLElement, hosts: HTMLElement[]) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(20, 1, 0.005, 200);
  camera.position.set(-0.72, 1.55, 3.5);

  const renderer = new WebGLRenderer({ powerPreference: "high-performance", antialias: false, depth: false, stencil: false, alpha: true });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.75;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const loader = new TextureLoader();
  const [hdr, map, land, water, dot] = await Promise.all([
    new RGBELoader().loadAsync(ASSETS.env),
    loader.loadAsync(ASSETS.map),
    loader.loadAsync(ASSETS.land),
    loader.loadAsync(ASSETS.water),
    loader.loadAsync(ASSETS.dot),
  ]);

  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  scene.environmentRotation.y = -1.13;
  hdr.dispose();
  pmrem.dispose();

  const time = { value: 0 };
  const hiDpi = renderer.getPixelRatio() > 1.5;
  const surface = createSurface({ map, land, water }, time);
  const arcs = createArcs(time);
  const impacts = createImpacts(dot, time, hiDpi ? 16 : 12);
  const cityDots = createDots(dot, cities, { color: "#ffb670", size: hiDpi ? 15 : 12, bloom: 2, offset: 0.001 });
  const fireworks = createFireworks(time);
  const centerDots = createDots(dot, datacenters, { color: "#bd83ff", size: hiDpi ? 60 : 40, bloom: 4, offset: 0.01 });
  const globe = new Group().add(surface.sphere, surface.shell, arcs.mesh, impacts.points, cityDots, fireworks.mesh, centerDots);
  scene.add(globe);

  const composer = new EffectComposer(renderer, { multisampling: 0, stencilBuffer: false, frameBufferType: HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new EffectPass(
      camera,
      new BloomEffect({
        luminanceThreshold: 0.3,
        luminanceSmoothing: 1,
        intensity: 2.33,
        kernelSize: KernelSize.VERY_SMALL,
        mipmapBlur: true,
        radius: 0.7,
        blendFunction: BlendFunction.SCREEN,
        levels: 8,
      }),
    ),
  );
  composer.addPass(new EffectPass(camera, new NoiseEffect({ blendFunction: BlendFunction.ADD, premultiply: true })));

  const labels = new CSS2DRenderer();
  labels.domElement.className = "globe-labels";
  container.append(renderer.domElement, labels.domElement);

  let dragging = false;
  let hovering = false;
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableZoom: false, enablePan: false, enableDamping: true, autoRotate: true, autoRotateSpeed: -0.5 });

  const drag = (on: boolean) => {
    dragging = on;
    container.toggleAttribute("data-dragging", on);
    document.body.style.cursor = on ? "grabbing" : hovering ? "grab" : "";
  };
  controls.addEventListener("start", () => drag(true));
  controls.addEventListener("end", () => drag(false));

  const hover = (on: boolean) => {
    hovering = on;
    controls.autoRotate = !on;
    document.body.style.cursor = on ? "grab" : "";
  };

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  renderer.domElement.addEventListener("mousedown", (e) => e.preventDefault());
  renderer.domElement.addEventListener("mousemove", (e) => {
    if (dragging) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    hover(raycaster.ray.intersectsSphere(HITBOX));
  });
  renderer.domElement.addEventListener("mouseout", (e) => {
    if (!(e.relatedTarget instanceof Element && e.relatedTarget.closest(".factoid"))) hover(false);
  });

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;
    camera.zoom = innerWidth < 640 ? 0.25 : 0.35;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(width, height);
    labels.setSize(width, height);
    composer.setSize(width, height);
    surface.noise.value = ((MathUtils.clamp(height, 400, 1800) - 400) / 1400) * renderer.getPixelRatio();
  };
  addEventListener("resize", resize);
  resize();

  const updateCards = createCards(hosts, scene, camera, controls);
  const state = { highlight: 0, presence: 0, spin: 1 };
  const target = { highlight: 0, presence: 0 };
  let frame = 0;
  let last = 0;
  let sinceArc = 0;

  const loop = (now: number) => {
    const delta = last ? (now - last) / 1000 : 0;
    last = now;
    time.value += delta;
    controls.update();

    sinceArc += delta;
    if (sinceArc > 0.01) {
      sinceArc = 0;
      const [toLat, toLng, fromLat, fromLng] = routes[Math.floor(Math.random() * routes.length)];
      impacts.send(arcs.send(fromLat, fromLng, toLat, toLng));
    }

    state.highlight = toward(state.highlight, target.highlight, delta / FADE);
    state.presence = toward(state.presence, target.presence, delta / FADE);
    surface.landEnv.value = MathUtils.lerp(1, 3, state.highlight);
    cityDots.material.uniforms.scaleMultiplier.value = 1 - state.presence;
    centerDots.material.uniforms.scaleMultiplier.value = state.presence;

    if (state.spin < 1) {
      state.spin += delta / SPIN;
      if (state.spin < 1) globe.rotateY(-Math.sin(Math.PI * state.spin) * 0.1);
    }
    globe.scale.setScalar(MathUtils.lerp(globe.scale.x, hovering ? 1.02 : 1, Math.min(delta * 5, 1)));

    composer.render();
    labels.render(scene, camera);
    updateCards();
    frame = requestAnimationFrame(loop);
  };

  return {
    play() {
      if (!frame) frame = requestAnimationFrame(loop);
    },
    pause() {
      cancelAnimationFrame(frame);
      frame = last = 0;
    },
    effect(name: FactoidEffect, on: boolean) {
      controls.autoRotate = !on;
      if (name === "fireworks" && on) FIREWORK_SITES.forEach(([lat, lng]) => fireworks.launch(lat, lng));
      if (name === "spin-highlight") {
        target.highlight = on ? 1 : 0;
        if (on) state.spin = 0;
      }
      if (name === "points-of-presence") target.presence = on ? 1 : 0;
    },
    destroy() {
      cancelAnimationFrame(frame);
      removeEventListener("resize", resize);
      controls.dispose();
      scene.traverse((o) => {
        if (!(o instanceof Mesh || o instanceof Points)) return;
        o.geometry.dispose();
        [o.material].flat().forEach((m) => m.dispose());
      });
      [scene.environment, map, land, water, dot].forEach((t) => t?.dispose());
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labels.domElement.remove();
      document.body.style.cursor = "";
    },
  };
}
