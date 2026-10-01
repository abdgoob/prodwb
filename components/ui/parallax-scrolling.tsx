"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

// Apply the supplied layered transition to the existing hero artwork.
export function ParallaxComponent({ children }: { children: ReactNode }) {
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = parallaxRef.current;
    if (!root) return;

    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const hero = root.querySelector<HTMLElement>("[data-parallax-layers]");
      if (!hero) return;

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      [
        { layer: "1", yPercent: 70 },
        { layer: "2", yPercent: 55 },
        { layer: "3", yPercent: 40 },
      ].forEach(({ layer, yPercent }) => {
        timeline.to(hero.querySelectorAll(`[data-parallax-layer="${layer}"]`), {
          yPercent,
          ease: "none",
        }, 0);
      });

      const lenis = new Lenis({
        lerp: 0.1,
        syncTouch: false,
        // Once the wheel reaches the viewport, its own scroll handler takes over.
        prevent: (node) => node.hasAttribute("data-works-wheel-stage") &&
          node.getBoundingClientRect().top <= 1,
      });
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
      };
    }, root);

    return () => media.revert();
  }, []);

  return <div ref={parallaxRef} className="bg-[#08070c]">{children}</div>;
}
