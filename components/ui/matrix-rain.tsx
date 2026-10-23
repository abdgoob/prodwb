"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface MatrixRainProps {
  className?: string;
  variant?: "default" | "cyan" | "rainbow";
  width?: number;
  height?: number;
  fontSize?: number;
  speed?: number;
  fixedColor?: string;
  transparent?: boolean;
  paused?: boolean;
}

// Adapted from the supplied Componentry MatrixRain source.
export function MatrixRain({ className, variant = "default", width, height,
  fontSize = 16, speed = 50, fixedColor, transparent = false, paused = false }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const syncRef = useRef<() => void>(() => undefined);
  const workerRef = useRef<{ worker: Worker; cleanup: number } | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current();
  }, [paused]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof canvas.transferControlToOffscreen === "function" && typeof Worker !== "undefined") {
      let state = workerRef.current;
      if (state) window.clearTimeout(state.cleanup);
      else {
        const worker = new Worker("/matrix-rain-worker.js");
        const surface = canvas.transferControlToOffscreen();
        worker.postMessage({ type: "init", canvas: surface, options: {
          cell: Math.max(8, fontSize), interval: Math.max(16, speed), fixedColor, variant, transparent,
        } }, [surface]);
        state = { worker, cleanup: 0 };
        workerRef.current = state;
      }
      const worker = state.worker;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      worker.postMessage({ type: "configure", options: {
        cell: Math.max(8, fontSize), interval: Math.max(16, speed), fixedColor, variant, transparent,
      } });
      let visible = false;
      const sync = () => worker.postMessage({
        type: "active", active: visible && !pausedRef.current && !document.hidden && !reduced.matches,
      });
      syncRef.current = sync;
      const resize = () => worker.postMessage({
        type: "resize", width: Math.max(1, width ?? canvas.clientWidth),
        height: Math.max(1, height ?? canvas.clientHeight),
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      });
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
      intersection.observe(canvas);
      document.addEventListener("visibilitychange", sync);
      reduced.addEventListener("change", sync);
      resize();
      return () => {
        observer.disconnect();
        intersection.disconnect();
        document.removeEventListener("visibilitychange", sync);
        reduced.removeEventListener("change", sync);
        syncRef.current = () => undefined;
        state.cleanup = window.setTimeout(() => {
          worker.terminate();
          if (workerRef.current === state) workerRef.current = null;
        }, 0);
      };
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const chars = "??????????????????????????????0123456789";
    const cell = Math.max(8, fontSize);
    const interval = Math.max(16, speed);
    let w = 0, h = 0;
    let drops: number[] = [];
    let frame = 0;
    let last = 0;
    let visible = false;
    let disposed = false;
    const color = (column: number) => fixedColor ?? (variant === "rainbow"
      ? `hsl(${(Date.now() / 20 + column * 10) % 360}, 85%, 55%)`
      : variant === "cyan" ? "#22d3ee" : "#22c55e");
    const draw = () => {
      if (transparent) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,0.075)";
      } else ctx.fillStyle = "rgba(8,7,12,0.075)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      ctx.font = `${cell}px monospace`;
      drops.forEach((drop, column) => {
        ctx.fillStyle = color(column);
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], column * cell, drop * cell);
        drops[column] = drop * cell > h && Math.random() > .975 ? 0 : drop + 1;
      });
    };
    const tick = (now: number) => {
      frame = 0;
      if (disposed || pausedRef.current || !visible || document.hidden || reduced.matches) return;
      if (now - last >= interval) { draw(); last = now; }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (!disposed && !pausedRef.current && visible && !document.hidden && !reduced.matches) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    syncRef.current = sync;
    const resize = () => {
      w = Math.max(1, width ?? canvas.clientWidth);
      h = Math.max(1, height ?? canvas.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = Array.from({ length: Math.ceil(w / cell) }, () => Math.floor(Math.random() * h / cell));
      if (!transparent) { ctx.fillStyle = "#08070c"; ctx.fillRect(0, 0, w, h); }
      // Prepopulate trails so the section never starts with an empty canvas.
      for (let i = 0; i < 24; i++) draw();
      sync();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    intersection.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    resize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      syncRef.current = () => undefined;
    };
  }, [variant, fontSize, speed, fixedColor, width, height, transparent]);
  return <canvas ref={canvasRef} aria-hidden="true" data-paused={paused ? "" : undefined} className={cn("pointer-events-none block size-full", className)} style={{ width, height }} />;
}
