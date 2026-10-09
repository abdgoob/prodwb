"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AudioIntro.module.css";
import AlbumMaterial from "./AlbumMaterial";

const SESSION_KEY = "prodwb-intro-sleeve-v2";

export default function AudioIntro({ onReveal, onComplete }: { onReveal: () => void; onComplete: () => void }) {
  const [phase, setPhase] = useState<"preparing" | "cover-ready" | "entering" | "playing" | "revealing" | "complete">("preparing");
  const [artworkReady, setArtworkReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const revealRef = useRef(onReveal);
  const completeRef = useRef(onComplete);
  const skipRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<() => void>(() => {});
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => { revealRef.current = onReveal; completeRef.current = onComplete; }, [onReveal, onComplete]);

  useEffect(() => {
    let disposed = false;
    let finished = false;
    let started = false;
    let requested = false;
    let coverReady = false;
    let exitStarted = 0;
    let context: AudioContext | undefined;
    let source: AudioBufferSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    const spectrum = new Uint8Array(512);
    let buffer: AudioBuffer | undefined;
    let peaks: Float32Array | undefined;
    let startTime = 0;
    let frame = 0;
    let previousFrame = 0;
    let focusFrame = 0;
    const heights: number[] = [];
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    const timers: { prepare?: ReturnType<typeof setTimeout>; entering?: ReturnType<typeof setTimeout> } = {};
    const cover = new Image();
    const abort = new AbortController();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const blockScroll = (event: Event) => event.preventDefault();
    const unlock = () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("wheel", blockScroll, true);
      window.removeEventListener("touchmove", blockScroll, true);
    };
    const stopAudio = () => {
      if (source) {
        source.onended = null;
        try { source.stop(); } catch { /* Already stopped. */ }
        source.disconnect();
      }
      analyser?.disconnect();
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
    const finish = (immediate = false) => {
      if (disposed || finished) return;
      finished = true;
      clearTimeout(timers.prepare);
      abort.abort();
      exitStarted = performance.now();
      clearTimeout(timers.entering);
      stopAudio();
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* Storage is optional. */ }
      setPhase(immediate ? "complete" : "revealing");
      revealRef.current();
      const complete = () => {
        if (disposed) return;
        setPhase("complete");
        cancelAnimationFrame(frame);
        completeRef.current();
        unlock();
        focusFrame = requestAnimationFrame(() => {
        if (disposed) return;
        if (previousFocus && previousFocus !== document.body) previousFocus.focus();
        else {
          const hero = document.getElementById("hero-title");
          if (hero) {
            hero.setAttribute("tabindex", "-1");
            hero.focus({ preventScroll: true });
            hero.removeAttribute("tabindex");
          }
        }
        });
      };
      if (immediate) complete();
      else fadeTimer = setTimeout(complete, reduced.matches ? 180 : 2400);
    };
    finishRef.current = () => finish();
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        finish(true);
        return () => { disposed = true; cancelAnimationFrame(focusFrame); };
      }
    } catch { /* Play normally when storage is unavailable. */ }

    document.body.style.overflow = "hidden";
    window.addEventListener("wheel", blockScroll, { passive: false, capture: true });
    window.addEventListener("touchmove", blockScroll, { passive: false, capture: true });

    const draw = () => {
      if (disposed) return;
      const now = performance.now();
      const delta = previousFrame ? now - previousFrame : 16;
      previousFrame = now;
      const canvas = canvasRef.current;
      const pen = canvas?.getContext("2d");
      if (canvas && pen) {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);
        }
        pen.setTransform(dpr, 0, 0, dpr, 0, 0);
        pen.clearRect(0, 0, width, height);
        // The output clock compensates for device latency where supported.
        const timestamp = context?.getOutputTimestamp?.();
        const clock = timestamp && typeof timestamp.performanceTime === "number" && typeof timestamp.contextTime === "number" && timestamp.performanceTime > 0 && context?.state === "running"
          ? timestamp.contextTime + (performance.now() - timestamp.performanceTime) / 1000
          : context?.currentTime ?? 0;
        const elapsed = started ? Math.max(0, clock - startTime) : 0;
        // Fixed frequency positions pulse independently; nothing scrolls sideways.
        analyser?.getByteFrequencyData(spectrum);
        let energy = 0;
        const currentIndex = Math.floor(elapsed * 1000);
        if (started && !finished && clock >= startTime && peaks) {
          for (let offset = -8; offset <= 8; offset++) {
            const peak = peaks[currentIndex + offset] ?? 0;
            energy += peak * peak;
          }
          energy = Math.sqrt(energy / 17);
        }
        const center = height / 2;
        pen.beginPath();
        for (let x = 0; x < width; x += 4) {
          // Each bar keeps its horizontal position and its recording-derived shape.
          const time = x / width * (buffer?.duration ?? 0);
          const position = time * 1000;
          const index = Math.floor(position);
          // Interpolate neighboring samples instead of snapping between millisecond buckets.
          const a = peaks && index >= 0 && index < peaks.length ? peaks[index] : 0;
          const b = peaks && index + 1 >= 0 && index + 1 < peaks.length ? peaks[index + 1] : 0;
          const amplitude = a + (b - a) * (position - index);
          const edge = Math.sin(Math.PI * x / width) ** 0.8;
          const shape = Math.pow(amplitude, 1.15);
          const distance = Math.abs(x / width * 2 - 1);
          const frequency = 85 * Math.pow(100, distance);
          const bin = Math.min(spectrum.length - 1, frequency * 1024 / (context?.sampleRate ?? 48000));
          const lower = Math.floor(bin);
          const band = (spectrum[lower] + ((spectrum[Math.min(lower + 1, 511)] ?? 0) - spectrum[lower]) * (bin - lower)) / 255;
          const impact = Math.min(1, energy * 3.2);
          const activity = Math.pow(band, 1.6);
          const level = reduced.matches ? shape * 0.6
            : impact * (0.18 * shape + 0.82 * activity) * (0.38 + 0.62 * shape);
          const target = finished ? 0 : Math.tanh(level * 4.5) * height * 0.47 * edge;
          const bar = x / 4;
          const previous = heights[bar] ?? 0;
          // Fast attack preserves transients; slower release gives the spikes a fluid tail.
          const blend = 1 - Math.exp(-delta / (finished ? 150 : target > previous ? 12 : 85));
          heights[bar] = reduced.matches ? target : (heights[bar] ?? target) + (target - (heights[bar] ?? target)) * blend;
          const size = heights[bar];
          if (size < 0.3) continue;
          pen.moveTo(x, center - size);
          pen.lineTo(x, center + size);
        }
        pen.lineWidth = 1;
        pen.strokeStyle = "#ff1826";
        pen.shadowColor = "#ff0018";
        pen.shadowBlur = 12 + Math.min(1, energy * 3) * 10;
        pen.stroke();
        pen.shadowBlur = 5;
        pen.stroke();
        pen.shadowBlur = 0;
      }
      if (!finished || now - exitStarted < 700) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    const start = () => {
      if (!context || !buffer || !coverReady || !requested || disposed || finished || started) return;
      if (context.state !== "running") return;
      source = context.createBufferSource();
      source.buffer = buffer;
      analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.35;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -20;
      source.connect(analyser);
      analyser.connect(context.destination);
      source.onended = () => finish();
      startTime = context.currentTime + (reduced.matches ? 0.18 : 0.9);
      source.start(startTime);
      started = true;
      setPhase("entering");
      skipRef.current?.focus({ preventScroll: true });
      timers.entering = setTimeout(() => {
        if (!disposed && !finished) setPhase("playing");
      }, reduced.matches ? 180 : 1700);
    };
    startRef.current = () => {
      if (disposed || finished || started || !context) return;
      requested = true;
      // Called directly by the user gesture, including clicks before decoding finishes.
      void context.resume().then(start).catch(() => finish());
    };
    cover.onload = () => {
      if (disposed || finished) return;
      coverReady = true;
      setArtworkReady(true);
      if (peaks) { clearTimeout(timers.prepare); setPhase("cover-ready"); }
      start();
    };
    cover.onerror = () => finish();
    cover.src = "/works/cover-3.png";
    timers.prepare = setTimeout(() => finish(), 10000);
    void (async () => {
      try {
        context = new AudioContext();
        const response = await fetch("/audio/prodwbtag.mp3", { signal: abort.signal });
        if (!response.ok) throw new Error("Audio unavailable");
        buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (disposed || finished) return;
        // Cache one peak per millisecond, retaining transients across all channels.
        peaks = new Float32Array(Math.ceil(buffer.duration * 1000));
        let maximum = 0;
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const samples = buffer.getChannelData(channel);
          for (let i = 0; i < samples.length; i++) {
            const bucket = Math.floor(i / buffer.sampleRate * 1000);
            peaks[bucket] = Math.max(peaks[bucket], Math.abs(samples[i]));
            maximum = Math.max(maximum, peaks[bucket]);
          }
        }
        if (maximum > 0) for (let i = 0; i < peaks.length; i++) peaks[i] /= maximum;
        if (coverReady) { clearTimeout(timers.prepare); setPhase("cover-ready"); }
        start();
      } catch {
        if (!disposed && !finished) finish();
      }
    })();

    return () => {
      disposed = true;
      abort.abort();
      clearTimeout(timers.prepare);
      clearTimeout(fadeTimer);
      clearTimeout(timers.entering);
      cover.onload = null;
      cover.onerror = null;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(focusFrame);
      stopAudio();
      unlock();
      startRef.current = () => {};
      finishRef.current = () => {};
    };
  }, []);

  if (phase === "complete") return null;
  return (
    <div className={`${styles.overlay} ${phase === "revealing" ? styles.leaving : ""}`}
      data-phase={phase}
      data-artwork-ready={artworkReady}
      role="dialog" aria-modal="true" aria-label="PRODWB audio introduction"
      onKeyDown={(event) => {
        if (event.key === "Escape") finishRef.current();
        if (event.key !== "Tab") return;
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")).filter((button) => !button.closest("[inert]"));
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }}>
      <div className={styles.albumStage} inert={phase === "entering" || phase === "playing" || phase === "revealing"}>
        <button ref={enterRef} className={styles.album} onClick={() => startRef.current()}
          aria-label="Play PRODWB introduction with sound">
          <span className={styles.disc} aria-hidden="true">
            <span className={styles.discSurface} />
            <AlbumMaterial disc />
            <span className={styles.discLabel}>PRODWB</span>
            <span className={styles.discPrompt}><span className={styles.desktopPrompt}>Click</span><span className={styles.touchPrompt}>Tap</span> to enter</span>
          </span>
          <span className={styles.sleeve} aria-hidden="true"><AlbumMaterial /></span>
        </button>
      </div>
      <canvas ref={canvasRef} className={styles.waveform} aria-hidden="true" />
      <span className={styles.status} role="status">{phase === "preparing" ? "Preparing sound" : ""}</span>
      {phase !== "revealing" && <button ref={skipRef} className={styles.skip} onClick={() => finishRef.current()}>Skip intro</button>}
    </div>
  );
}
