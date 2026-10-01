"use client";

import { MotionConfig, motion } from "framer-motion";
import { WorksWheel, type WorksWheelItem } from "@/components/ui/works-wheel";

// Descriptions are for accessibility only; artwork captions are hidden.
const works: WorksWheelItem[] = [
  { title: "Grainy monochrome portrait with red lettering", image: "/works/cover-1.png", backgroundColor: "#342124" },
  { title: "Black and white portrait behind translucent fabric", image: "/works/cover-2.png", backgroundColor: "#24282a" },
  { title: "Red collage with a figure wearing a beanie", image: "/works/cover-3.png", backgroundColor: "#582c2b" },
  { title: "Dark portrait collage with red highlights", image: "/works/cover-4.png", backgroundColor: "#301519" },
  { title: "Red and black live performance collage", image: "/works/cover-5.png", backgroundColor: "#4b211c" },
  { title: "Dark red portrait and tracklist collage", image: "/works/cover-6.png", backgroundColor: "#35232c" },
];

export default function WorksSection() {
  return (
    <MotionConfig reducedMotion="user">
      <div id="works" className="relative z-10 bg-[#08070c] pt-[clamp(6rem,18svh,12rem)] sm:pt-[clamp(10rem,28svh,22rem)]">
        <h2 className="sr-only">Selected works</h2>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-svh min-h-[36rem]"
        >
          <WorksWheel items={works} label="Works '26" action="" showCaptions={false} />
          <p className="pointer-events-none absolute bottom-5 inset-x-5 text-center text-[0.6rem] uppercase tracking-[0.24em] text-[#f4f1ea]/45">
            <span className="sm:hidden">Swipe sideways to explore</span>
            <span className="hidden sm:inline">Scroll or drag to explore · ↑ ↓ to navigate</span>
          </p>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
