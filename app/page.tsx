"use client";

import { useState } from "react";
import AudioIntro from "@/components/intro/AudioIntro";
import HeroSection from "@/components/hero/HeroSection";
import GlowCursor from "@/components/ui/GlowCursor";
import WorksSection from "@/components/works/WorksSection";
import { ParallaxComponent } from "@/components/ui/parallax-scrolling";

export default function Home() {
  const [revealed, setRevealed] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  return (
    <main>
      <GlowCursor
        enabled
        color="#ff003b"
        secondaryColor="#000000"
        trailLength={24}
        trailWidth={8}
        trailTaper={0.8}
        followSpeed={0.28}
        glowIntensity={1.9}
        glowSpread={1.2}
        hotspot={0.65}
        brightness={1.25}
        opacity={1}
        pulseSpeed={4}
        noiseStrength={0.25}
        idleFade
        idleTimeout={700}
        fadeDuration={900}
        blendMode="screen"
        maxDevicePixelRatio={1}
      >
      <AudioIntro onReveal={() => setRevealed(true)} onComplete={() => setIntroComplete(true)} />
      <div inert={!introComplete}>
      <ParallaxComponent>
        <HeroSection revealed={revealed} />
        <WorksSection />
      </ParallaxComponent>
      </div>
      </GlowCursor>
    </main>
  );
}
