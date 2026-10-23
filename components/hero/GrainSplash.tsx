"use client";

import { useEffect, useRef } from "react";
import styles from "./GrainSplash.module.css";

type GrainSplashProps = { variant: "title" | "portrait" };

// Seeded positions plus fixed-precision SVG attributes avoid engine rounding mismatches.
function particles(variant: GrainSplashProps["variant"]) {
  let seed = variant === "title" ? 31 : 97;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 420 }, (_, index) => {
    const angle = random() * Math.PI * 2;
    const spread = random();
    const x = variant === "title" ? 25 + random() * 950 : 500 + Math.cos(angle) * (290 + spread * 175);
    const y = variant === "title" ? 650 + random() * 330 : 485 + Math.sin(angle) * (355 + spread * 125);
    return { index, x, y, radius: 0.8 + random() * 1.8, opacity: 0.22 + random() * 0.6 };
  });
}

const grains = { title: particles("title"), portrait: particles("portrait") };

export default function GrainSplash({ variant }: GrainSplashProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      // The old SVG animated in its 1000-unit viewBox before nonuniform scaling.
      // Keep that coordinate system so paths, rotation and drift stay identical.
      box.style.setProperty("--grain-scale-x", String(entry.contentRect.width / 1000));
      box.style.setProperty("--grain-scale-y", String(entry.contentRect.height / 1000));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      className="pointer-events-none absolute -inset-[6%] h-[112%] w-[112%] overflow-visible text-[#cf3543]"
    >
      <div className={styles.coordinateSpace}>
      {Array.from({ length: 6 }, (_, group) => (
        <div
          key={group}
          className={styles.drift}
          style={{ animationDelay: `-${(group * 1.7).toFixed(1)}s`, animationDuration: `${8 + group}s` }}
        >
          <svg aria-hidden="true" focusable="false" width="1000" height="1000" viewBox="0 0 1000 1000" className={styles.particles}>
          {grains[variant].filter(({ index }) => index % 6 === group).map(({ index, x, y, radius, opacity }) => (
            <circle key={index} cx={x.toFixed(3)} cy={y.toFixed(3)} r={radius.toFixed(3)} opacity={opacity.toFixed(3)} fill="currentColor" />
          ))}
          </svg>
        </div>
      ))}
      </div>
    </div>
  );
}
