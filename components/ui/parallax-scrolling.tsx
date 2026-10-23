"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { PAGE_SCROLL_SEEK } from "@/lib/page-scroll";

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
          // Lenis already smooths the scroll position. Tracking it directly
          // avoids a second easing pass that can visibly catch up at low speed.
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
        lerp: 0.085,
        smoothWheel: true,
        syncTouch: false,
        // Keep vertical page scrolling smooth over the carousel while leaving
        // deliberate horizontal gestures to its own interaction engine.
        virtualScroll: ({ deltaX, deltaY, event }) => {
          const target = event.target;
          const overCarousel = target instanceof Element && target.closest(".dcc-root");
          return !(overCarousel && Math.abs(deltaX) > Math.abs(deltaY));
        },
        prevent: (node) => {
          return node.hasAttribute("data-works-wheel-stage") &&
            node.getAttribute("data-scroll-driven") !== "true" &&
            node.getBoundingClientRect().top <= 1;
        },
      });
      const tick = (time: number) => lenis.raf(time * 1000);
      const seek = (event: Event) => {
        event.preventDefault();
        const detail = (event as CustomEvent<number | { top: number; smooth: boolean }>).detail;
        const top = typeof detail === "number" ? detail : detail.top;
        const smooth = typeof detail === "number" ? false : detail.smooth;
        lenis.scrollTo(top, { immediate: !smooth, duration: smooth ? 0.9 : undefined, force: true });
      };
      window.addEventListener(PAGE_SCROLL_SEEK, seek);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.lagSmoothing(0);
      gsap.ticker.add(tick);

      return () => {
        window.removeEventListener(PAGE_SCROLL_SEEK, seek);
        gsap.ticker.remove(tick);
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
      };
    }, root);

    return () => media.revert();
  }, []);

  return <div ref={parallaxRef} className="bg-[#08070c]">{children}</div>;
}
