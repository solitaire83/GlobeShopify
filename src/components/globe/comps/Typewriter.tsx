import { useEffect, useState } from "react";

// CONSTS & CONFIGS
const STEPMS = 50;
const PAUSEMS = 500;

export default function Typewriter({
  heading,
  subheading,
  icon,
  audio,
  typing,
}: {
  heading: string;
  subheading: string;
  icon: string;
  audio?: string;
  typing: boolean;
}) {
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!typing) return;
    const step = setInterval(() => setShown((n) => n + 1), STEPMS);
    const end = setTimeout(() => {
      setDone(true);
      if (!audio) return;
      const sound = new Audio(audio);
      sound.volume = 0.25;
      sound.play().catch(() => {});
    }, (heading.length + 2) * STEPMS + PAUSEMS);
    return () => {
      clearInterval(step);
      clearTimeout(end);
      setShown(0);
      setDone(false);
    };
  }, [typing, heading, audio]);

  return (
    <>
      <img
        src={icon}
        alt=""
        width={20}
        height={20}
        data-centered={typing || undefined}
        data-large={(typing && !done) || undefined}
        className="factoid-icon"
      />
      <div data-typing={typing || undefined} className="factoid-typewriter">
        <h4 className="factoid-heading">{heading}</h4>
        <p className="factoid-subheading">{subheading}</p>
        {typing && (
          <div className="factoid-typewriter-live">
            <h4 className="factoid-heading factoid-typewriter-heading">
              <span data-out={done || undefined} className="factoid-slide">
                {[...heading].map((char, i) => (
                  <span key={i} data-out={shown <= i || undefined} className="factoid-char">
                    {char === " " ? " " : char}
                  </span>
                ))}
              </span>
            </h4>
            <p data-out={!done || undefined} className="factoid-subheading factoid-typewriter-sub">
              {subheading}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
