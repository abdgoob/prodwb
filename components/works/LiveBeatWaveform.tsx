"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import styles from "./BeatPlayer.module.css";

type Props = {
  peaks: readonly number[];
  elapsed: number;
  duration: number;
  audioRef: RefObject<HTMLAudioElement | null>;
  analyserRef: RefObject<AnalyserNode | null>;
};

/** A small, isolated canvas: no React state or layout reads in the audio frame loop. */
export default function LiveBeatWaveform({ peaks, elapsed, duration, audioRef, analyserRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const refreshRef = useRef<() => void>(() => {});
  const positionRef = useRef({ elapsed, duration });

  useEffect(() => {
    positionRef.current = { elapsed, duration };
    refreshRef.current();
  }, [elapsed, duration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    const pen = canvas?.getContext("2d");
    if (!canvas || !audio || !pen) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const spectrum = new Uint8Array(512);
    const samples = new Uint8Array(1024);
    const base = peaks.map(peak => 2 + Math.pow(Math.max(0, Math.min(1, peak)), 1.6) * 36);
    const heights = [...base];
    // Match the intro's frequency placement: bass at the center, highs toward the edges.
    const frequencies = peaks.map((_, index) => 85 * Math.pow(100, Math.abs(index / Math.max(1, peaks.length - 1) * 2 - 1)));
    let frame = 0;
    let previous = 0;
    let width = 0;
    let height = 48;
    let ratio = 1;
    let buffering = false;
    let disposed = false;

    const active = () => !disposed && !audio.paused && !audio.ended && !buffering && !document.hidden && !reduced.matches && !!analyserRef.current;
    const draw = (now: number, live: boolean) => {
      const delta = previous ? Math.min(50, now - previous) : 16;
      previous = now;
      const analyser = analyserRef.current;
      let energy = 0;
      if (live && analyser) {
        analyser.getByteFrequencyData(spectrum);
        analyser.getByteTimeDomainData(samples);
        for (let index = 0; index < samples.length; index++) energy += ((samples[index] - 128) / 128) ** 2;
        energy = Math.min(1, Math.sqrt(energy / samples.length) * 3.2);
      }
      const position = positionRef.current;
      const seconds = live ? audio.currentTime : position.elapsed;
      const progress = position.duration ? Math.min(1, Math.max(0, seconds / position.duration)) : 0;
      pen.setTransform(ratio, 0, 0, ratio, 0, 0);
      pen.clearRect(0, 0, width, height);
      const step = width / peaks.length;
      for (let index = 0; index < peaks.length; index++) {
        let target = base[index];
        if (live && analyser) {
          const bin = Math.min(spectrum.length - 1, frequencies[index] * analyser.fftSize / analyser.context.sampleRate);
          const low = Math.floor(bin);
          const band = (spectrum[low] + (spectrum[Math.min(low + 1, spectrum.length - 1)] - spectrum[low]) * (bin - low)) / 255;
          // Modulate the recording's shape with real sound, with restrained amplitude.
          target *= .78 + .32 * Math.pow(band, 1.6) * energy;
          const blend = 1 - Math.exp(-delta / (target > heights[index] ? 16 : 85));
          heights[index] += (target - heights[index]) * blend;
        } else heights[index] = target;
        const size = heights[index] / 48 * height;
        pen.fillStyle = (index + .5) / peaks.length <= progress ? "#cd404c" : "rgba(244,241,234,.25)";
        pen.fillRect(index * step, height * .54 - size * .65, Math.max(.5, step * .6), size);
      }
    };
    const tick = (now: number) => {
      frame = 0;
      const live = active();
      draw(now, live);
      if (live) frame = requestAnimationFrame(tick);
    };
    const refresh = () => {
      if (disposed) return;
      if (active()) {
        if (!frame) { previous = 0; frame = requestAnimationFrame(tick); }
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
        draw(performance.now(), false);
      }
    };
    const resize = (box: { width: number; height: number }) => {
      width = box.width;
      height = box.height;
      ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      refresh();
    };
    const observer = new ResizeObserver(([entry]) => resize(entry.contentRect));
    observer.observe(canvas);
    resize(canvas.getBoundingClientRect());
    const resume = () => { buffering = false; refresh(); };
    const wait = () => { buffering = true; refresh(); };
    audio.addEventListener("play", resume);
    audio.addEventListener("playing", resume);
    audio.addEventListener("pause", refresh);
    audio.addEventListener("ended", refresh);
    audio.addEventListener("waiting", wait);
    audio.addEventListener("seeking", refresh);
    audio.addEventListener("seeked", refresh);
    document.addEventListener("visibilitychange", refresh);
    reduced.addEventListener("change", refresh);
    refreshRef.current = refresh;
    refresh();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      refreshRef.current = () => {};
      audio.removeEventListener("play", resume);
      audio.removeEventListener("playing", resume);
      audio.removeEventListener("pause", refresh);
      audio.removeEventListener("ended", refresh);
      audio.removeEventListener("waiting", wait);
      audio.removeEventListener("seeking", refresh);
      audio.removeEventListener("seeked", refresh);
      document.removeEventListener("visibilitychange", refresh);
      reduced.removeEventListener("change", refresh);
    };
  }, [peaks, audioRef, analyserRef]);

  return <canvas ref={canvasRef} className={styles.waveShape} aria-hidden="true" data-audio-reactive="" />;
}
