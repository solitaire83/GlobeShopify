import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import type { GlobeScene } from "../core/scene";
import type { Factoid, FactoidEffect } from "../utils/presets";
import Typewriter from "./Typewriter";
import Bubbles from "./Bubbles";

const TAP_MS: Partial<Record<FactoidEffect, number>> = { typewriter: 2500, none: 3000 };

export default function FactoidCard({ factoid, globe }: { factoid: Factoid; globe: RefObject<GlobeScene | null> }) {
  const { heading, subheading, icon, effect, audio } = factoid;
  const [active, setActive] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const toggle = (on: boolean) => {
    setActive(on);
    globe.current?.effect(effect, on);
  };

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    if (e.pointerType === "mouse") return;
    toggle(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => toggle(false), TAP_MS[effect] ?? 2000);
  };

  return (
    <div>
      <div
        data-wide={effect === "typewriter" || undefined}
        data-active={active || undefined}
        onPointerEnter={(e) => e.pointerType === "mouse" && toggle(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && toggle(false)}
        onPointerDown={onPointerDown}
        className="factoid-group"
      >
        {effect === "coins" && active && <Bubbles icon={icon} />}
        <div className="factoid-card">
          {effect === "typewriter" ? (
            <Typewriter heading={heading} subheading={subheading} icon={icon} audio={audio} typing={active} />
          ) : (
            <>
              <img src={icon} alt="" width={20} height={20} className="factoid-icon" />
              <div className="factoid-text">
                <h4 className="factoid-heading">{heading}</h4>
                <p className="factoid-subheading">{subheading}</p>
              </div>
            </>
          )}
          <span className="factoid-border" />
        </div>
      </div>
    </div>
  );
}
