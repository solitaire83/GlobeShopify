import { useEffect, useRef, useState } from "react";
import InteractiveGlobe from "./InteractiveGlobe";

export default function GlobeSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "100% 0% 100% 0%" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section data-loaded={near || undefined} className="globe-section">
      <div className="globe-container">
        <div className="globe-grid">
          <div className="globe-col">
            <div
              ref={ref}
              role="group"
              aria-label="Animation of rotating globe with lines showing sales from merchants to customers near and far"
              className="globe-stage"
            >
              {near && (
                <>
                  <InteractiveGlobe />
                  <div data-side="top" className="scroll-guard" />
                  <div data-side="bottom" className="scroll-guard" />
                </>
              )}
            </div>
          </div>

          <div className="globe-copy">
            <div className="globe-titles">
              <h3 className="globe-heading">Rock steady. Blazing fast.</h3>
              <p className="globe-subheading">Your Shopify store runs strong, even during your most epic product drops.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
