"use client";

import { useCallback, useEffect, useRef } from "react";
import localFont from "next/font/local";
import { MotionConfig, motion, useScroll, useTransform, useReducedMotion, useMotionValue } from "framer-motion";
import { MatrixRain } from "@/components/ui/matrix-rain";
import { WorksWheel, type WorksWheelItem } from "@/components/ui/works-wheel";
import TestimonialsSection from "@/components/testimonials/TestimonialsSection";
import { seekPage } from "@/lib/page-scroll";

const beatsFont = localFont({ src: "../../Aresink.otf", variable: "--font-beats", display: "swap" });
const SCROLL_PER_BEAT = 900;

// Temporary artwork descriptions; replace with track details when available.
const works: WorksWheelItem[] = [
  { title: "BEAT 01", description: "Monochrome faces. Red ink. Raw grain.", image: "/works/cover-1.png", backgroundColor: "#342124" },
  { title: "BEAT 02", description: "A face beneath the folds. Light against shadow.", image: "/works/cover-2.png", backgroundColor: "#24282a" },
  { title: "BEAT 03", description: "Crimson layers. Fractured portraits.", image: "/works/cover-3.png", backgroundColor: "#582c2b" },
  { title: "BEAT 04", description: "Deep shadows. A portrait traced in red.", image: "/works/cover-4.png", backgroundColor: "#301519" },
  { title: "BEAT 05", description: "On stage. Red light. A moment suspended.", image: "/works/cover-5.png", backgroundColor: "#4b211c" },
  { title: "BEAT 06", description: "Black and burgundy. Faces in the margins.", image: "/works/cover-6.png", backgroundColor: "#35232c" },
];

export default function WorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const horizontalRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const viewportWidth = useMotionValue(1);
  useEffect(() => {
    const measure = () => viewportWidth.set(document.documentElement.clientWidth);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [viewportWidth]);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "start start"] });
  const { scrollYProgress: horizontalProgress } = useScroll({
    target: horizontalRef,
    offset: ["start start", "end end"],
  });
  const rainOpacity = useTransform(scrollYProgress, [0, 0.2, 0.85, 1], [0, 0.06, 0.38, 0.42]);
  const wheelDistance = works.length * SCROLL_PER_BEAT;
  // One continuous position controls both phases, independent of pointer location.
  const travel = useTransform(() => horizontalProgress.get() * (wheelDistance + viewportWidth.get() * 1.7));
  const wheelPosition = useTransform(() => Math.min(works.length, Math.max(0, travel.get() / SCROLL_PER_BEAT)));
  const trackX = useTransform(() => -Math.min(viewportWidth.get(), Math.max(0, (travel.get() - wheelDistance) / 1.7)));
  const seekBeat = useCallback((position: number) => {
    const runway = horizontalRef.current;
    if (!runway) return;
    const start = window.scrollY + runway.getBoundingClientRect().top;
    seekPage(start + position * SCROLL_PER_BEAT);
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <div ref={sectionRef} id="works" className={`${beatsFont.variable} ${beatsFont.className} relative isolate z-10 bg-[#08070c] pt-[clamp(6rem,18svh,12rem)] sm:pt-[clamp(10rem,28svh,22rem)]`}>
        <h2 className="sr-only">Selected works</h2>
        <div
          ref={horizontalRef}
          data-works-runway
          className="relative"
          style={{ height: `calc(100svh + ${wheelDistance}px + 170vw)` }}
        >
          <div className="sticky top-0 h-svh overflow-hidden">
            <motion.div
              data-works-track
              className="flex h-full w-[200%]"
              style={{ x: trackX }}
            >
              <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-full w-1/2 shrink-0 overflow-hidden"
        >
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ opacity: reducedMotion ? 0.28 : rainOpacity, maskImage: "linear-gradient(to bottom, transparent 0%, black 24%, black 88%, transparent 100%)" }}
          >
            <MatrixRain fixedColor="#cd404c" fontSize={16} speed={65} transparent />
          </motion.div>
          <WorksWheel className="min-h-0" scrollPosition={wheelPosition} onSeek={seekBeat} style={{ backgroundColor: "transparent" }} items={works} label="BEATS" action="" showCaptions showIndex={false} />
          <p className="pointer-events-none absolute bottom-5 inset-x-5 text-center text-[0.6rem] uppercase tracking-[0.24em] text-[#f4f1ea]/45">
            <span className="sm:hidden">Scroll to explore</span>
            <span className="hidden sm:inline">Scroll or drag to explore · ↑ ↓ to navigate</span>
          </p>
              </motion.div>

              <div className="h-full w-1/2 shrink-0">
                <TestimonialsSection />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
