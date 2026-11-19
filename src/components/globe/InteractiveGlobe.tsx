import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// UTILS
import { createScene, type GlobeScene } from "./core/scene";
import { FACTOIDS } from "./utils/presets";

// COMPONENTS
import FactoidCard from "./comps/FactoidCard";

export default function InteractiveGlobe() {
  const ref = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeScene | null>(null);
  const [ready, setReady] = useState(false);
  const [hosts] = useState(() => FACTOIDS.map(() => Object.assign(document.createElement("div"), { className: "factoid", inert: true })));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    let visible = false;
    const sync = () => (visible && !document.hidden ? globe.current?.play() : globe.current?.pause());

    createScene(el, hosts).then((scene) => {
      if (!alive) return scene.destroy();
      globe.current = scene;
      setReady(true);
      sync();
    });

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);

    return () => {
      alive = false;
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      globe.current?.destroy();
      globe.current = null;
    };
  }, [hosts]);

  return (
    <>
      <div ref={ref} data-ready={ready || undefined} className="globe-canvas" />
      {FACTOIDS.map((factoid, i) => createPortal(<FactoidCard factoid={factoid} globe={globe} />, hosts[i], factoid.heading))}
    </>
  );
}
