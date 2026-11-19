import { useEffect, useState } from "react";

// CONSTS & CONFIGS
const LIFEMS = 1000;
const EVERYMS = 1000 / 30;

export default function Bubbles({ icon }: { icon: string }) {
  const [bubbles, setBubbles] = useState<{ born: number; x: number; speed: number }[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      const now = performance.now();
      setBubbles((list) => [...list.filter((b) => now - b.born < LIFEMS), { born: now, x: Math.random() * 100, speed: 1 + Math.random() }]);
    }, EVERYMS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="factoid-bubbles">
      {bubbles.map((b) => (
        <div
          key={b.born}
          className="factoid-bubble"
          style={{
            left: `${b.x}%`,
            animation: `${b.x < 50 ? "bubble-left" : "bubble-right"} ${b.speed}s linear`,
            backgroundImage: `url(${icon})`,
          }}
        />
      ))}
    </div>
  );
}
