"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";
import styles from "./BeatPlayer.module.css";
import LiveBeatWaveform from "./LiveBeatWaveform";

type Props = {
  peaks: readonly number[];
  elapsed: number;
  duration: number;
  playing: boolean;
  title: string;
  audioRef: RefObject<HTMLAudioElement | null>;
  analyserRef: RefObject<AnalyserNode | null>;
  onSeek: (seconds: number) => void;
  onPreview: () => void;
};

const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export default function BeatWaveform({ peaks, elapsed, duration, playing, title, audioRef, analyserRef, onSeek, onPreview }: Props) {
  const bounds = useRef<{ left: number; width: number } | null>(null);
  const pointer = useRef<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const progress = duration ? clamp(elapsed / duration) : 0;
  const previewPosition = hover === null ? 0 : clamp(hover);

  const point = (event: PointerEvent<HTMLInputElement>) => {
    const box = bounds.current;
    if (box?.width) setHover(clamp((event.clientX - box.left) / box.width));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    let target: number;
    const step = event.shiftKey ? 15 : 5;
    switch (event.key) {
      case "ArrowRight": case "ArrowUp": target = elapsed + step; break;
      case "ArrowLeft": case "ArrowDown": target = elapsed - step; break;
      case "Home": target = 0; break;
      case "End": target = duration; break;
      case "PageUp": target = elapsed + duration * .1; break;
      case "PageDown": target = elapsed - duration * .1; break;
      default: return;
    }
    event.preventDefault();
    onSeek(Math.max(0, Math.min(duration, target)));
  };

  return <div className={styles.waveform} data-beat-waveform="" data-playing={playing || undefined}>
    <LiveBeatWaveform peaks={peaks} elapsed={elapsed} duration={duration} audioRef={audioRef} analyserRef={analyserRef} />
    <span aria-hidden="true" className={styles.playhead} style={{ transform: `translate3d(${progress * 100}%,0,0)` }}><i /></span>
    {hover !== null ? <span aria-hidden="true" className={styles.preview} style={{ transform: `translate3d(${previewPosition * 100}%,0,0)` }}>
      <i /><span style={{ transform: `translateX(-${previewPosition * 100}%)` }}>{format(previewPosition * duration)}</span>
    </span> : null}
    <input className={styles.seek} type="range" min="0" max={duration || 1} step="0.1"
      value={Math.min(elapsed, duration || 1)} disabled={!duration} aria-label={`Seek ${title}`}
      aria-valuetext={`${format(elapsed)} of ${format(duration)}`} onKeyDown={onKeyDown}
      onChange={event => onSeek(Number(event.target.value))}
      onPointerEnter={event => { bounds.current = event.currentTarget.getBoundingClientRect(); point(event); }}
      onPointerMove={point}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return;
        pointer.current = event.pointerId;
        bounds.current = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture(event.pointerId);
        point(event);
      }}
      onPointerUp={event => {
        if (pointer.current !== event.pointerId) return;
        pointer.current = null;
        onPreview();
        if (event.pointerType !== "mouse") setHover(null);
      }}
      onPointerCancel={() => { pointer.current = null; setHover(null); }}
      onPointerLeave={() => { if (pointer.current === null) setHover(null); }} />
    <span className={styles.waveHint} aria-hidden="true">Click or drag to preview</span>
  </div>;
}
