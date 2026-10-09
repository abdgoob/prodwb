"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

const vertex = `attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;
const fragment = `precision highp float;
varying vec2 vUv;
uniform vec2 uPointer;
uniform float uDisc;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  vec3 normal = normalize(vec3(p * mix(0.08, 0.32, uDisc), 1.0));
  vec3 light = normalize(vec3(uPointer * 1.5, 1.6));
  vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
  float specular = pow(max(dot(normal, halfway), 0.0), mix(48.0, 85.0, uDisc));
  float sheen = exp(-pow((p.x + p.y * 0.45 - uPointer.x * 0.8) * 3.0, 2.0));
  float rings = 0.5 + 0.5 * sin(r * 650.0);
  float reflection = specular * 0.24 + sheen * mix(0.07, 0.16, uDisc);
  reflection += uDisc * rings * specular * 0.08;
  float mask = mix(1.0, (1.0 - smoothstep(0.97, 1.0, r)) * smoothstep(0.1, 0.12, r), uDisc);
  vec3 tint = mix(vec3(1.0, 0.48, 0.43), vec3(1.0, 0.82, 0.77), specular);
  gl_FragColor = vec4(tint, reflection * mask);
}`;

export default function AlbumMaterial({ disc = false }: { disc?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const album = canvas?.closest("button");
    const stage = album?.parentElement;
    if (!canvas || !album || !stage) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)");
    let renderer: Renderer;
    try { renderer = new Renderer({ canvas, alpha: true, dpr: Math.min(devicePixelRatio, 1.5) }); }
    catch { return; } // CSS materials remain visible if WebGL is unavailable.
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const program = new Program(gl, {
      vertex, fragment, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uPointer: { value: [0, 0] }, uDisc: { value: disc ? 1 : 0 } },
    });
    // OGL leaves uniformLocations unset when linking fails. Never render that program.
    const linked = Boolean(gl.getProgramParameter(program.program, gl.LINK_STATUS));
    const mesh = linked ? new Mesh(gl, { geometry: new Triangle(gl), program }) : null;
    let disposed = false;
    let raf = 0;
    let last = 0;
    let x = 0, y = 0, tx = 0, ty = 0;
    const render = (now: number) => {
      raf = 0;
      if (disposed) return;
      const blend = 1 - Math.exp(-Math.min(last ? now - last : 16, 50) / 110);
      last = now;
      x += (tx - x) * blend;
      y += (ty - y) * blend;
      program.uniforms.uPointer.value = [x, -y];
      if (!disc) {
        album.style.setProperty("--magnet-x", `${x * 9}px`);
        album.style.setProperty("--magnet-y", `${y * 7}px`);
        album.style.setProperty("--tilt-x", `${-y * 5}deg`);
        album.style.setProperty("--tilt-y", `${x * 7}deg`);
      }
      if (mesh && !gl.isContextLost()) renderer.render({ scene: mesh });
      if (Math.abs(tx - x) + Math.abs(ty - y) > .001) raf = requestAnimationFrame(render);
    };
    const wake = () => { if (!disposed && !raf) { last = 0; raf = requestAnimationFrame(render); } };
    const reset = () => { tx = ty = 0; wake(); };
    const move = (event: PointerEvent) => {
      if (media.matches || stage.hasAttribute("inert")) { reset(); return; }
      const bounds = stage.getBoundingClientRect();
      const dx = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
      const dy = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      const influence = Math.max(0, Math.min(1, (2.4 - distance) / 1.0));
      tx = Math.max(-1, Math.min(1, dx)) * influence;
      ty = Math.max(-1, Math.min(1, dy)) * influence;
      wake();
    };
    const resize = new ResizeObserver(() => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      wake();
    });
    resize.observe(canvas);
    window.addEventListener("pointermove", move, { passive: true, capture: true });
    document.documentElement.addEventListener("pointerleave", reset);
    media.addEventListener("change", reset);
    wake();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      window.removeEventListener("pointermove", move, true);
      document.documentElement.removeEventListener("pointerleave", reset);
      media.removeEventListener("change", reset);
      mesh?.geometry.remove();
      program.remove();
      // React Strict Mode reuses this canvas during its effect cleanup/setup cycle.
      // Release owned resources without forcibly losing the shared canvas context.
      if (!disc) for (const name of ["--magnet-x", "--magnet-y", "--tilt-x", "--tilt-y"]) album.style.removeProperty(name);
    };
  }, [disc]);
  return <canvas ref={ref} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", borderRadius: "inherit" }} />;
}
