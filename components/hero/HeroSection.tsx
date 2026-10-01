"use client";

import { MotionConfig, motion } from "framer-motion";

import DitherVeil from "./DitherVeil";
import GrainSplash from "./GrainSplash";
import grainStyles from "./GrainSplash.module.css";

const HERO_IMAGE = "/hero-artist.jpg";

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.8,
    delay,
    ease: [0.22, 1, 0.36, 1] as const,
  },
});

function SocialMarks() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-5 text-[#cd404c]"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.7" r="0.8" fill="currentColor" stroke="none" />
      </svg>
      <svg viewBox="0 0 24 24" className="h-[18px] w-[22px]" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" />
        <path d="m10 9 5 3-5 3V9Z" fill="#08070c" />
      </svg>
      <svg viewBox="0 0 28 20" className="h-[18px] w-[25px]" fill="currentColor">
        <path d="M1 13.1h1.2V17H1v-3.9Zm2.2-2h1.3V17H3.2v-5.9Zm2.3-2.4h1.3V17H5.5V8.7Zm2.3-1.8h1.3V17H7.8V6.9Zm2.3-1.2h1.3V17h-1.3V5.7Zm2.4-.7h1.3v12h-1.3V5Zm2.3 1.2c.6-.3 1.4-.5 2.1-.5 2.4 0 4.4 1.8 4.7 4.1.3-.1.7-.2 1.1-.2 2 0 3.6 1.6 3.6 3.6S24.7 17 22.7 17h-7.9V6.2Z" />
      </svg>
      <svg viewBox="0 0 24 24" className="size-[19px]" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <path d="M7.1 9.2c3.5-1 7.8-.7 10.8.9" fill="none" stroke="#08070c" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7.7 12.2c3-.8 6.8-.5 9.4.8" fill="none" stroke="#08070c" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M8.2 15c2.5-.6 5.6-.4 7.8.7" fill="none" stroke="#08070c" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function HeroSection() {
  return (
    <MotionConfig reducedMotion="user">
      <section
        data-parallax-layers
        aria-labelledby="hero-title"
        className="relative isolate min-h-screen min-h-svh w-full overflow-hidden bg-[#08070c] text-[#f4f1ea]"
      >
        <div
          aria-hidden="true"
          data-parallax-layer="1"
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(105,5,14,0.22),transparent_64%),linear-gradient(180deg,#08070c,#10070b_65%,#08070c)]"
        />

        <motion.header
          {...reveal(0.08)}
          className="absolute inset-x-0 top-0 z-[60] flex h-20 items-center justify-between px-5 sm:h-24 sm:px-8 lg:px-12 xl:px-20"
        >
          <span className="text-[0.68rem] font-semibold text-[#ed343c] uppercase tracking-[0.38em] sm:text-xs">
            PRODWB
          </span>

          <nav
            aria-label="Portfolio preview"
            className="hidden items-center gap-5 text-[0.62rem] font-medium uppercase tracking-[0.34em] text-[#f4f1ea]/58 sm:absolute sm:left-1/2 sm:top-20 sm:flex sm:-translate-x-1/2 md:gap-9 lg:gap-14 xl:static xl:translate-x-0"
          >
            <span>About</span>
            <span>Beats</span>
            <span>Projects</span>
            <span>Contact</span>
          </nav>

        </motion.header>

        <div data-parallax-layer="3" className="pointer-events-none absolute inset-0 z-[48]">
        <motion.h1
          id="hero-title"
          {...reveal(0.18)}
          className="pointer-events-none absolute left-1/2 top-[55svh] w-max max-w-[94vw] -translate-x-1/2 origin-bottom [scale:1_0.8] whitespace-nowrap bg-[linear-gradient(180deg,#d43139_0%,#be1522_28%,#8b0b18_52%,#450810_74%,#16070b_90%,#08070c_100%)] bg-clip-text text-center text-[19vw] font-extrabold leading-[0.85] tracking-[-0.065em] text-transparent drop-shadow-[0_0_12px_rgba(200,20,38,0.22)] sm:top-auto sm:bottom-[0.5svh] sm:text-[20vw]"
        >
          PRODWB
          <span
            aria-hidden="true"
            className={`${grainStyles.texture} absolute inset-0 bg-clip-text text-transparent opacity-85 mix-blend-multiply`}
            style={{
              backgroundImage: "url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22180%22%20height%3D%22180%22%3E%3Cfilter%20id%3D%22grain%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%22.95%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3CfeColorMatrix%20type%3D%22saturate%22%20values%3D%220%22%2F%3E%3CfeComponentTransfer%3E%3CfeFuncR%20type%3D%22linear%22%20slope%3D%224.5%22%20intercept%3D%22-1.75%22%2F%3E%3CfeFuncG%20type%3D%22linear%22%20slope%3D%224.5%22%20intercept%3D%22-1.75%22%2F%3E%3CfeFuncB%20type%3D%22linear%22%20slope%3D%224.5%22%20intercept%3D%22-1.75%22%2F%3E%3C%2FfeComponentTransfer%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23grain)%22%2F%3E%3C%2Fsvg%3E')",
              maskImage: "linear-gradient(180deg, black 0%, black 70%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(180deg, black 0%, black 70%, transparent 100%)",
            }}
          >
            PRODWB
          </span>
          <GrainSplash variant="title" />
        </motion.h1>
        </div>

        <div
          aria-hidden="true"
          data-parallax-layer="2"
          className="absolute left-1/2 z-40 -translate-x-1/2 mix-blend-lighten [--title-edge:calc(55svh_+_3.23vw)] [--portrait-top:max(4.5rem,8svh)] sm:[--title-edge:calc(99.5svh_-_13.6vw)] sm:[--portrait-top:max(5rem,9svh)]"
          style={{
            // Fit the full head above the title rather than moving it offscreen.
            top: "calc(var(--portrait-top) - 5svh)",
            height: "calc((var(--title-edge) - var(--portrait-top)) / 0.70)",
            width: "min(94vw, (var(--title-edge) - var(--portrait-top)) / 0.70 * 1400 / 1939)",
          }}
        >
          <DitherVeil
            src={HERO_IMAGE}
            fit="contain"
            pattern="floyd"
            pixelSize={2}
            inkColor="#08070c"
            paperColor="#bc303a"
            revealRadius={200}
            softness={0.6}
            linger={1}
            className="h-full w-full"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[8%] mix-blend-screen bg-[radial-gradient(ellipse_at_50%_48%,rgba(180,15,30,0.12)_0%,rgba(150,10,25,0.07)_35%,transparent_68%)]"
          />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[45] bg-[radial-gradient(ellipse_at_center,transparent_18%,rgba(0,0,0,0.14)_48%,rgba(0,0,0,0.68)_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[45] h-[38%] bg-gradient-to-t from-[#08070c] via-[#08070c]/60 to-transparent sm:h-[28%]"
        />

        <motion.div
          {...reveal(0.58)}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-7 left-5 z-20 hidden text-[#f4f1ea]/55 sm:block sm:bottom-10 sm:left-8 lg:bottom-14 lg:left-20"
        >
          <p className="text-[0.55rem] font-medium uppercase tracking-[0.34em]">Scroll</p>
          <div className="ml-1 mt-4 h-12 w-px bg-gradient-to-b from-[#cd404c]/80 to-[#cd404c]/10">
            <span className="absolute bottom-0 -ml-[2px] size-[5px] rounded-full bg-[#f4f1ea]" />
          </div>
        </motion.div>

        <motion.div
          {...reveal(0.62)}
          aria-hidden="true"
          className="pointer-events-none absolute right-8 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center text-[0.55rem] tracking-[0.24em] text-[#cd404c]/80 md:flex lg:right-14 xl:right-20"
        >
          <span>01</span>
          <span className="my-4 h-px w-4 bg-[#e63742]/85" />
          <span className="h-11 w-px bg-[#e63742]/40" />
          <span className="my-4 h-px w-4 bg-[#e63742]/65" />
          <span>03</span>
        </motion.div>

        <motion.div
          {...reveal(0.66)}
          className="absolute left-1/2 top-14 z-[60] flex h-12 -translate-x-1/2 items-center sm:top-0 sm:h-24"
        >
          <SocialMarks />
        </motion.div>
      </section>
    </MotionConfig>
  );
}
