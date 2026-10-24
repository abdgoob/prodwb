export type BeatTrack = { src: string; title: string; duration?: number };
export type BeatPlayback = {
  track: BeatTrack; deck: number; elapsed: number; duration: number;
  playing: boolean; loading: boolean; error: string;
};
type Ramp = { from: number; to: number; start: number; end: number };
type Deck = {
  audio: HTMLAudioElement; track: BeatTrack | null; epoch: number;
  source?: MediaElementAudioSourceNode; gain?: GainNode; analyser?: AnalyserNode;
  ramp: Ramp; stop?: ReturnType<typeof setTimeout>; seek: number | null;
  remove: () => void; primed?: boolean;
};
export const BEAT_CROSSFADE_SECONDS = 1.5;

/** Two reusable media elements, one audio clock. No React/scroll/rAF volume animation. */
export class BeatCrossfade {
  private decks: Deck[];
  private context?: AudioContext;
  private selected = 0;
  private request = 0;
  private wanted = true;
  private visible = false;
  private destroyed = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private fallback?: ReturnType<typeof setTimeout>;
  private state: BeatPlayback;

  constructor(elements: HTMLAudioElement[], initial: BeatTrack, private tracks: BeatTrack[],
    private change: (state: BeatPlayback, audio: HTMLAudioElement, analyser: AnalyserNode | null) => void) {
    this.state = { track: initial, deck: 0, elapsed: 0, duration: initial.duration ?? 0, playing: false, loading: false, error: "" };
    this.decks = elements.map(audio => {
      const deck: Deck = { audio, track: null, epoch: 0, ramp: { from: 0, to: 0, start: 0, end: 0 }, seek: null, remove: () => {} };
      const update = () => {
        if (this.decks[this.selected] !== deck || deck.track?.src !== this.state.track.src || this.destroyed) return;
        if (Number.isFinite(audio.duration)) this.state.duration = audio.duration;
        if (deck.seek === null) this.state.elapsed = audio.currentTime;
        this.state.playing = !audio.paused && !audio.ended;
        this.publish();
      };
      const metadata = () => {
        if (deck.seek !== null) { audio.currentTime = Math.min(deck.seek, audio.duration); deck.seek = null; }
        update();
      };
      for (const event of ["timeupdate", "durationchange", "pause", "ended"]) audio.addEventListener(event, update);
      audio.addEventListener("loadedmetadata", metadata);
      deck.remove = () => {
        for (const event of ["timeupdate", "durationchange", "pause", "ended"]) audio.removeEventListener(event, update);
        audio.removeEventListener("loadedmetadata", metadata);
      };
      return deck;
    });
    this.configure(this.decks[0], initial, false);
    this.publish();
  }
  private publish() {
    if (!this.destroyed) this.change({ ...this.state }, this.decks[this.selected].audio, this.decks[this.selected].analyser ?? null);
  }
  private later(callback: () => void, seconds: number) {
    const timer = setTimeout(() => { this.timers.delete(timer); if (!this.destroyed) callback(); }, seconds * 1000);
    this.timers.add(timer); return timer;
  }
  private cancel(timer?: ReturnType<typeof setTimeout>) { if (timer) { clearTimeout(timer); this.timers.delete(timer); } }
  private clock() { return this.context?.currentTime ?? performance.now() / 1000; }
  private level(deck: Deck) {
    const { from, to, start, end } = deck.ramp;
    const t = end > start ? Math.max(0, Math.min(1, (this.clock() - start) / (end - start))) : 1;
    return from + (to - from) * (.5 - .5 * Math.cos(Math.PI * t));
  }
  private ramp(deck: Deck, to: number, seconds: number) {
    const now = this.clock(), from = this.level(deck);
    deck.ramp = { from, to, start: now, end: now + seconds };
    if (deck.gain && this.context) {
      const parameter = deck.gain.gain;
      parameter.cancelScheduledValues(0);
      parameter.setValueAtTime(from, now);
      if (seconds) {
        // Complementary S-curves keep total gain at unity without clipping spikes.
        const curve = Float32Array.from({ length: 64 }, (_, i) => from + (to - from) * (.5 - .5 * Math.cos(Math.PI * i / 63)));
        parameter.setValueCurveAtTime(curve, now, seconds);
      } else parameter.setValueAtTime(to, now);
    } else { deck.audio.volume = from; this.fallbackTick(); }
  }
  private fallbackTick = () => {
    if (this.context || this.destroyed || this.fallback) return;
    let moving = false;
    for (const deck of this.decks) { deck.audio.volume = this.level(deck); moving ||= this.clock() < deck.ramp.end; }
    if (moving) this.fallback = setTimeout(() => { this.fallback = undefined; this.fallbackTick(); }, 25);
  };
  private stop(deck: Deck) {
    this.cancel(deck.stop); deck.stop = undefined;
    deck.epoch++; this.ramp(deck, 0, 0); deck.audio.pause();
  }
  private fadeOut(deck: Deck, seconds: number) {
    this.cancel(deck.stop); this.ramp(deck, 0, seconds);
    deck.stop = this.later(() => {
      deck.stop = undefined;
      if (this.level(deck) < .001) {
        this.stop(deck); this.warmNext();
        if (this.decks.every(item => item.audio.paused)) void this.context?.suspend().catch(() => {});
      }
    }, seconds + .03);
  }
  private configure(deck: Deck, track: BeatTrack, warm = true) {
    this.stop(deck); deck.track = track; deck.seek = null;
    deck.audio.preload = warm ? "metadata" : "none"; deck.audio.src = track.src;
    if (warm) deck.audio.load();
  }
  private prepare() {
    if (!this.context && typeof AudioContext !== "undefined") {
      const levels = this.decks.map(deck => this.level(deck));
      try {
        this.context = new AudioContext({ latencyHint: "interactive" });
        this.decks.forEach((deck, index) => {
          const gain = this.context!.createGain(); gain.gain.value = levels[index];
          const analyser = this.context!.createAnalyser();
          analyser.fftSize = 1024; analyser.smoothingTimeConstant = .35;
          analyser.minDecibels = -85; analyser.maxDecibels = -20;
          const source = this.context!.createMediaElementSource(deck.audio);
          source.connect(gain); gain.connect(analyser); analyser.connect(this.context!.destination);
          Object.assign(deck, { source, gain, analyser, ramp: { from: levels[index], to: levels[index], start: 0, end: 0 } });
          deck.audio.volume = 1;
        });
      } catch {
        if (!this.decks.some(deck => deck.source)) { void this.context?.close().catch(() => {}); this.context = undefined; }
      }
    }
    void this.context?.resume().catch(() => {}); this.publish();
  }
  private warmNext() {
    if (!this.wanted || !this.visible) return;
    const index = this.tracks.findIndex(track => track.src === this.state.track.src);
    const next = this.tracks[index + 1];
    const idle = this.decks.find((deck, i) => i !== this.selected && deck.audio.paused && this.level(deck) < .001);
    if (next && idle && idle.track?.src !== next.src) this.configure(idle, next);
  }
  private start(deck: Deck, request: number) {
    if (this.destroyed || !this.visible || !this.wanted || request !== this.request) return;
    this.cancel(deck.stop); deck.stop = undefined;
    const epoch = deck.epoch;
    this.state.loading = true; this.state.error = ""; this.publish();
    if (deck.audio.error) deck.audio.load();
    void deck.audio.play().then(() => {
      if (this.destroyed || request !== this.request || epoch !== deck.epoch || !this.visible || !this.wanted) return;
      const outgoing = this.decks.find(item => item !== deck && !item.audio.paused && this.level(item) > .001);
      const seconds = outgoing ? BEAT_CROSSFADE_SECONDS : .3;
      this.ramp(deck, 1, seconds);
      for (const other of this.decks) if (other !== deck) this.fadeOut(other, seconds);
      this.state.loading = false; this.state.playing = true; this.publish(); this.warmNext();
    }).catch(error => {
      if (this.destroyed || request !== this.request || epoch !== deck.epoch) return;
      this.state.loading = false; this.state.playing = false;
      this.state.error = error?.name === "NotAllowedError" ? "Tap Listen once to enable sound." : "Unable to play. Please try again.";
      this.publish();
    });
  }
  select(track: BeatTrack) {
    if (this.destroyed || this.state.track.src === track.src) return;
    const request = ++this.request;
    let index = this.decks.findIndex(deck => deck.track?.src === track.src);
    if (index < 0) index = this.decks.reduce((lowest, deck, i) => this.level(deck) < this.level(this.decks[lowest]) ? i : lowest, 0);
    const deck = this.decks[index], reuse = deck.track?.src === track.src;
    this.selected = index;
    this.state = { track, deck: index, elapsed: reuse ? deck.audio.currentTime : 0, duration: track.duration ?? 0, playing: false, loading: this.wanted && this.visible, error: "" };
    this.publish();
    const ready = () => {
      if (request !== this.request) return;
      if (!reuse) this.configure(deck, track, this.wanted);
      this.publish();
      if (this.wanted && this.visible) { this.prepare(); this.start(deck, request); }
    };
    if (!reuse && !deck.audio.paused && this.level(deck) > .001) {
      this.ramp(deck, 0, .06);
      for (const other of this.decks) if (other !== deck && !other.audio.paused) this.ramp(other, 1, .06);
      this.later(ready, .065);
    } else ready();
  }
  private prime() {
    this.warmNext();
    this.decks.forEach((deck, index) => {
      if (index === this.selected || deck.primed || !deck.track || !deck.audio.paused || this.level(deck) > .001) return;
      const epoch = deck.epoch;
      void deck.audio.play().then(() => {
        if (this.destroyed || epoch !== deck.epoch) return;
        deck.primed = true;
        if (index !== this.selected && this.level(deck) < .001) { deck.audio.pause(); deck.audio.currentTime = 0; }
      }).catch(() => {});
    });
  }
  /** Run in a user gesture: prime both reusable elements for mobile autoplay. */
  play(gesture = false) {
    if (this.destroyed || !this.visible) return;
    this.wanted = true; this.prepare();
    if (gesture) this.prime();
    this.start(this.decks[this.selected], ++this.request);
  }
  toggle() { if (this.state.playing || this.state.loading) this.pause(); else this.play(true); }
  pause() { this.wanted = false; this.halt(0); }
  private halt(seconds: number) {
    ++this.request;
    for (const deck of this.decks) { if (seconds && !deck.audio.paused) this.fadeOut(deck, seconds); else this.stop(deck); }
    this.state.playing = false; this.state.loading = false; this.publish();
    if (!seconds) void this.context?.suspend().catch(() => {});
  }
  setVisible(visible: boolean) {
    if (this.visible === visible) { if (!visible && document.hidden) this.halt(0); return; }
    this.visible = visible;
    if (!visible) this.halt(document.hidden ? 0 : .3);
    else if (this.wanted && navigator.userActivation?.hasBeenActive !== false) this.play();
  }
  activate() {
    if (!this.visible || !this.wanted) return;
    if (!this.state.playing || this.state.loading) this.play(true);
    else { this.prepare(); this.prime(); }
  }
  preview() { if (!this.state.playing && !this.state.loading) this.play(true); }
  seek(seconds: number) {
    const deck = this.decks[this.selected]; this.state.elapsed = seconds;
    if (deck.audio.readyState) { deck.seek = null; deck.audio.currentTime = seconds; }
    else { deck.seek = seconds; deck.audio.preload = "metadata"; if (deck.audio.networkState === 0) deck.audio.load(); }
    this.publish();
  }
  destroy() {
    this.destroyed = true; ++this.request;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear(); clearTimeout(this.fallback);
    for (const deck of this.decks) { deck.remove(); deck.audio.pause(); deck.source?.disconnect(); deck.gain?.disconnect(); deck.analyser?.disconnect(); }
    void this.context?.close().catch(() => {});
  }
}
