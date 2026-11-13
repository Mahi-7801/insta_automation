import { useEffect, useRef, useState } from "react";

export default function RotatingText({ texts, duration = 3000, className = "", highlightWords = {} }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(() => setIndex((i) => (i + 1) % texts.length), duration);
    return () => clearTimeout(timer.current);
  }, [index, paused, duration, texts.length]);

  const text = texts[index] || "";

  const parts = [];
  let remaining = text;
  const keys = Object.keys(highlightWords).sort((a, b) => b.length - a.length);
  while (remaining.length > 0) {
    let best = null;
    let bestIdx = -1;
    for (const k of keys) {
      const idx = remaining.indexOf(k);
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
        best = k;
        bestIdx = idx;
      }
    }
    if (bestIdx === -1) {
      parts.push(remaining);
      break;
    }
    if (bestIdx > 0) parts.push(remaining.slice(0, bestIdx));
    parts.push(
      <span key={`${best}-${parts.length}`} className={highlightWords[best]}>
        {best}
      </span>
    );
    remaining = remaining.slice(bestIdx + best.length);
  }

  return (
    <span
      className={className}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ display: "inline-block" }}
    >
      {parts}
    </span>
  );
}
