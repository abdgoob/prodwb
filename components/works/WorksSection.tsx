"use client";

import { useCallback, useRef } from "react";
import { MotionConfig, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import TestimonialsSection from "@/components/testimonials/TestimonialsSection";
import { MatrixRain } from "@/components/ui/matrix-rain";
import { seekPage } from "@/lib/page-scroll";

// Keep CD pacing unchanged; give the rightward transition 2.5 screens of scroll.
const CD_SCROLL_END = 5;
const HORIZONTAL_START = 6;
const SCROLL_END = HORIZONTAL_START + 2.5;

export default function WorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start start"],
  });
  const rainOpacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.85, 1],
    [0, 0.06, 0.38, 0.42],
  );
  const { scrollYProgress: runwayProgress } = useScroll({
    target: runwayRef,
    offset: ["start start", "end end"],
  });
  const discPosition = useTransform(runwayProgress, [0, CD_SCROLL_END / SCROLL_END, 1], [0, 5, 5]);
  const trackX = useTransform(runwayProgress, [0, HORIZONTAL_START / SCROLL_END, 1], ["0%", "0%", "-50%"]);
  const seekDisc = useCallback((index: number) => {
    const runway = runwayRef.current;
    if (!runway) return;
    const unit = (runway.offsetHeight - document.documentElement.clientHeight) / SCROLL_END;
    seekPage(window.scrollY + runway.getBoundingClientRect().top + index * unit, true);
  }, []);
  const seekReviews = useCallback(() => {
    const runway = runwayRef.current;
    if (!runway) return;
    const distance = runway.offsetHeight - document.documentElement.clientHeight;
    seekPage(window.scrollY + runway.getBoundingClientRect().top + distance, true, 1.6);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={sectionRef}
        id="works"
        className="relative isolate z-10 overflow-clip pt-[clamp(6rem,18svh,12rem)] sm:pt-[clamp(10rem,28svh,22rem)]"
        style={{
          background:
            "radial-gradient(circle at 35% 62%, rgba(174,18,38,0.2), rgba(8,7,12,0.18) 38%, rgba(8,7,12,0.72) 76%, #08070c 100%)",
        }}
      >
        <div ref={runwayRef} className="relative" style={{ height: `${(SCROLL_END + 1) * 100}svh` }}>
        {/* Motion owns horizontal travel; native focus scrolling must not offset this viewport. */}
        <div className="sticky top-0 h-svh overflow-clip">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          style={{
            opacity: reducedMotion ? 0.28 : rainOpacity,
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
        >
          <MatrixRain
            fixedColor="#cd404c"
            fontSize={16}
            speed={65}
            transparent
          />
        </motion.div>

        <h2 className="sr-only">Selected works</h2>
        <motion.div className="relative z-10 flex h-svh w-[200vw]" style={{ x: trackX }}>
          <TestimonialsSection
            scrollPosition={discPosition}
            onSeek={seekDisc}
            onEndReached={seekReviews}
          />
        </motion.div>
        </div>
        </div>
      </div>
    </MotionConfig>
  );
}
