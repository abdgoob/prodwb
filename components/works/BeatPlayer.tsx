"use client";
// @refresh reset
// A MediaElementAudioSourceNode cannot be rebound to a new context after a dev refresh.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { BeatCrossfade, type BeatPlayback, type BeatTrack } from "@/lib/beat-crossfade";
import styles from "./BeatPlayer.module.css";
import BeatWaveform from "./BeatWaveform";
import waveforms from "@/lib/beat-waveforms.json";

export type BeatPlayerHandle = { toggle: () => void; pause: () => void; select: (track: BeatTrack) => void };
type Props = BeatTrack & { tracks: BeatTrack[] };
const time = (seconds: number) => {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
};

const BeatPlayer = forwardRef<BeatPlayerHandle, Props>(function BeatPlayer({ src, title, duration = 0, tracks }, ref) {
  const elements = useRef<(HTMLAudioElement | null)[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const controller = useRef<BeatCrossfade | null>(null);
  const initial = useRef({ track: { src, title, duration }, tracks });
  const [state, setState] = useState<BeatPlayback>({ track: { src, title, duration }, deck: 0, elapsed: 0, duration, playing: false, loading: false, error: "" });

  useImperativeHandle(ref, () => ({
    toggle: () => controller.current?.toggle(),
    pause: () => controller.current?.pause(),
    select: track => controller.current?.select(track),
  }), []);

  useEffect(() => {
    const engine = new BeatCrossfade(elements.current as HTMLAudioElement[], initial.current.track, initial.current.tracks, (next, audio, analyser) => {
      audioRef.current = audio; analyserRef.current = analyser; setState(next);
    });
    controller.current = engine;
    const section = elements.current[0]?.closest("#cd-carousel");
    let intersecting = false;
    const sync = () => engine.setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= .25) intersecting = true;
      else if (!entry.isIntersecting || entry.intersectionRatio < .01) intersecting = false;
      sync();
    }, { threshold: [0, .01, .25] });
    if (section) observer.observe(section);
    const gesture = (event: Event) => {
      if (!event.isTrusted) return;
      const target = event.target;
      if (target instanceof Element && target.closest("[data-dcc-player],.dcc-slide[data-active]")) return;
      engine.activate();
    };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pointerdown", gesture, { passive: true });
    window.addEventListener("keydown", gesture);
    return () => {
      engine.destroy(); controller.current = null;
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointerdown", gesture);
      window.removeEventListener("keydown", gesture);
    };
  }, []);

  // The carousel's imperative hero selection owns track changes. Settled header
  // props must not replay an older track after a rapid scroll reversal.

  return <div className={styles.player} data-dcc-ui="" data-dcc-player="">
    {[0, 1].map(index => <audio key={index} ref={element => { elements.current[index] = element; if (element && !audioRef.current) audioRef.current = element; }} preload="none"
      data-beat-deck={index} data-beat-active={state.deck === index ? "" : undefined} />)}
    <div className={styles.controls}>
      <button type="button" className={styles.play} onClick={() => controller.current?.toggle()}
        aria-label={`${state.playing || state.loading ? "Pause" : "Play"} ${state.track.title}`} aria-pressed={state.playing}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
          {state.playing || state.loading ? <path d="M7 5h3v14H7zm7 0h3v14h-3z" /> : <path d="m8 5 11 7-11 7z" />}
        </svg>
        <span>{state.loading ? "Loading" : state.playing ? "Pause" : "Listen"}</span>
      </button>
      <span className={styles.time} aria-label={`${time(state.elapsed)} of ${time(state.duration)}`}>{time(state.elapsed)} / {time(state.duration)}</span>
    </div>
    <BeatWaveform peaks={(waveforms as Record<string, number[]>)[state.track.src] ?? [0]} elapsed={state.elapsed} duration={state.duration}
      playing={state.playing} title={state.track.title} audioRef={audioRef} analyserRef={analyserRef}
      onSeek={seconds => controller.current?.seek(seconds)} onPreview={() => controller.current?.preview()} />
    {state.error ? <p className={styles.error} role="status">{state.error}</p> : null}
  </div>;
});

export default BeatPlayer;
