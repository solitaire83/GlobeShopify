import { MathUtils, Vector3, type Camera, type Scene } from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";

// CONSTS & CONFIGS
const RING = 1.4;
const POLAR = { min: 1, max: 1.5, fade: 0.2 };

export function createCards(hosts: HTMLElement[], scene: Scene, camera: Camera, controls: OrbitControls) {
  const objects = hosts.map((host, i) => {
    const angle = (i / hosts.length) * Math.PI * 2;
    const object = new CSS2DObject(host);
    object.position.set(RING * Math.cos(angle), RING * Math.sin(Math.PI / 12), RING * Math.sin(angle));
    scene.add(object);
    return object;
  });

  const eye = new Vector3();
  const right = new Vector3();
  const dir = new Vector3();

  return () => {
    const polar = controls.getPolarAngle();
    const visible = MathUtils.clamp(1 - Math.max(POLAR.min - polar, polar - POLAR.max, 0) / POLAR.fade, 0, 1);
    const small = innerWidth < 900;
    const edgeEnd = small ? 0.2 : 0;
    const edgeStart = innerWidth < 1600 ? 1 : 0.9;
    eye.copy(camera.position).normalize();
    right.setFromMatrixColumn(camera.matrixWorld, 0);

    for (const object of objects) {
      const outer = object.element.firstElementChild as HTMLElement;
      const inner = outer.firstElementChild as HTMLElement;
      const dot = dir.copy(object.position).normalize().dot(eye);

      object.element.inert = dot <= edgeStart - 0.1;
      outer.style.opacity = `${visible}`;
      if (small && dot > 0.7) outer.style.scale = `${1 + ((1 - (dot - 0.5) / 0.2) * (innerWidth < 640 ? 0.6 : 0.5)) ** 2}`;

      if (dot > edgeStart) {
        inner.style.opacity = "1";
        inner.style.scale = "1";
        inner.style.translate = "0 0";
      } else if (dot < edgeEnd) {
        inner.style.opacity = "0";
      } else {
        const progress = 1 - (dot - edgeEnd) / (edgeStart - edgeEnd);
        const side = object.position.dot(right) >= 0 ? 1 : -1;
        inner.style.opacity = `${(1 - progress) ** 4}`;
        inner.style.scale = `${(1 - progress * 0.5) ** 0.5}`;
        inner.style.translate = `${side * progress ** 2 * -200}px ${progress ** 2 * -200}px`;
      }
    }
  };
}
