"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import localFont from "next/font/local";
import type { MotionValue } from "framer-motion";
import type {
  DiscCascadeItem,
  DiscPerformanceState,
} from "@/components/ui/disc-cascade-carousel";

const beatsFont = localFont({ src: "../../Aresink.otf", variable: "--font-beats", display: "swap" });

const DiscCascadeCarousel = dynamic(() => import("@/components/ui/disc-cascade-carousel"), {
  ssr: false,
  loading: () => <div className="h-svh" aria-hidden="true" />,
});

// Fictional placeholder voices; replace with approved client quotes before publishing.
const voices: DiscCascadeItem[] = [
  {
    title: "Mara Vex",
    label: "Mara",
    src: "/works/cover-1.png",
    faceSrc: "/works/face-1.png",
    alt: "Mara Vex",
    credits: [
      { label: "Role", value: "Vocalist" },
      { label: "Project", value: "BEAT 01" },
      { label: "Year", value: "2024" },
    ],
    reviews: [
      { source: "Mara Vex", quote: "The bounce hit before I even wrote a word", stars: 5 },
    ],
  },
  {
    title: "Kade Hollow",
    label: "Kade",
    src: "/works/cover-2.png",
    faceSrc: "/works/face-2.png",
    alt: "Kade Hollow",
    labelStyle: "block",
    credits: [
      { label: "Role", value: "MC" },
      { label: "Project", value: "BEAT 02" },
      { label: "Year", value: "2024" },
    ],
    reviews: [
      { source: "Kade Hollow", quote: "Cinematic without losing the pocket", stars: 5 },
    ],
  },
  {
    title: "Lumen Nyx",
    label: "Lumen",
    src: "/works/cover-3.png",
    faceSrc: "/works/face-3.png",
    alt: "Lumen Nyx",
    credits: [
      { label: "Role", value: "Artist" },
      { label: "Project", value: "BEAT 03" },
      { label: "Year", value: "2025" },
    ],
    reviews: [
      { source: "Lumen Nyx", quote: "Red light, grain, and a melody I still hear", stars: 5 },
    ],
  },
  {
    title: "Rio Ash",
    label: "Rio",
    src: "/works/cover-4.png",
    faceSrc: "/works/face-4.png",
    alt: "Rio Ash",
    credits: [
      { label: "Role", value: "Songwriter" },
      { label: "Project", value: "BEAT 04" },
      { label: "Year", value: "2025" },
    ],
    reviews: [
      { source: "Rio Ash", quote: "Dark enough to live in, wide enough to sing", stars: 4 },
    ],
  },
  {
    title: "Sable Wren",
    label: "Sable",
    src: "/works/cover-5.png",
    faceSrc: "/works/face-5.png",
    alt: "Sable Wren",
    labelStyle: "block",
    credits: [
      { label: "Role", value: "Performer" },
      { label: "Project", value: "BEAT 05" },
      { label: "Year", value: "2025" },
    ],
    reviews: [
      { source: "Sable Wren", quote: "Felt like the stage was already built", stars: 5 },
    ],
  },
  {
    title: "Noa Trace",
    label: "Noa",
    src: "/works/cover-6.png",
    faceSrc: "/works/face-6.png",
    alt: "Noa Trace",
    credits: [
      { label: "Role", value: "Vocalist" },
      { label: "Project", value: "BEAT 06" },
      { label: "Year", value: "2026" },
    ],
    reviews: [
      { source: "Noa Trace", quote: "Burgundy nights. Every bar had a face", stars: 5 },
    ],
  },
];

export default function TestimonialsSection({
  onPerformanceStateChange,
  scrollPosition,
  onSeek,
  onEndReached,
}: {
  onPerformanceStateChange?: (state: DiscPerformanceState) => void;
  scrollPosition?: MotionValue<number>;
  onSeek?: (index: number) => void;
  onEndReached?: () => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          io.disconnect();
        }
      },
      { rootMargin: "75% 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
    <section ref={sectionRef} id="cd-carousel" aria-label="CD carousel"
      className={`${beatsFont.variable} relative isolate h-svh w-screen shrink-0 overflow-hidden [contain:layout_paint]`}>
      {ready ? (
        <DiscCascadeCarousel
          items={voices}
          brand="PRODWB"
          nav={[]}
          indexLabel="Voices"
          defaultIndex={0}
          loop={false}
          reviews={false}
          frame={false}
          autoplay={0}
          spin={0}
          sheen={0.2}
          depth={0.24}
          height="100svh"
          background="transparent"
          color="#f4f1ea"
          serif="var(--font-cybrok), var(--font-beats), serif"
          sans="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
          display="var(--font-beats), var(--font-cybrok), sans-serif"
          fontHref={null}
          hint="Scroll to explore · Drag · ← →"
          ariaLabel="CD carousel"
          onEndReached={onEndReached}
          scrollPosition={scrollPosition}
          onSeek={onSeek}
          onPerformanceStateChange={onPerformanceStateChange}
        />
      ) : <div className="h-svh" aria-hidden="true" />}
    </section>
    <section id="testimonials" aria-labelledby="testimonials-title"
      className={`${beatsFont.variable} relative z-10 flex h-svh w-screen shrink-0 flex-col justify-start overflow-y-auto px-6 py-12 text-[#f4f1ea] [content-visibility:auto] [contain-intrinsic-size:100vw_100svh] sm:px-12 lg:justify-center`}>
      <p className="mb-4 text-xs uppercase tracking-[0.4em] text-[#cd404c]">Voices</p>
      <h2 id="testimonials-title" className="mb-12 font-[family-name:var(--font-beats)] text-[clamp(2rem,8vw,4.5rem)] leading-tight uppercase">Testimonials & reviews</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {voices.map((voice) => voice.reviews?.map((review) => (
          <figure key={voice.title} className="flex min-h-48 flex-col justify-between border border-white/15 bg-white/[0.035] p-6">
            <blockquote className="text-lg leading-relaxed">“{review.quote}”</blockquote>
            <figcaption className="mt-8 text-sm text-[#cd9ba0]">{review.source}</figcaption>
          </figure>
        )))}
      </div>
    </section>
    </>
  );
}
