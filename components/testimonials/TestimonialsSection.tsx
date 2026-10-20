"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import localFont from "next/font/local";
import type { DiscCascadeItem } from "@/components/ui/disc-cascade-carousel";

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

export default function TestimonialsSection() {
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
      { rootMargin: "280px 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      aria-labelledby="testimonials-title"
      className={`${beatsFont.variable} relative isolate min-h-svh overflow-hidden bg-[#08070c] [contain:layout_paint]`}
    >
      <h2 id="testimonials-title" className="sr-only">Artist testimonials</h2>
      {ready ? (
        <DiscCascadeCarousel
          items={voices}
          brand="PRODWB"
          nav={[]}
          indexLabel="Voices"
          defaultIndex={0}
          loop
          frame={false}
          autoplay={0}
          spin={0}
          sheen={0.2}
          depth={0.24}
          height="100svh"
          background="radial-gradient(circle at 35% 50%, rgba(174,18,38,0.16), transparent 42%), #08070c"
          color="#f4f1ea"
          serif="var(--font-cybrok), var(--font-beats), serif"
          sans="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
          display="var(--font-beats), var(--font-cybrok), sans-serif"
          fontHref={null}
          hint={"Drag \u00b7 \u2190 \u2192"}
          ariaLabel="Testimonials"
        />
      ) : <div className="h-svh" aria-hidden="true" />}
    </section>
  );
}
