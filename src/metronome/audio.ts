// Web Audio side of the metronome. Click times come from the audio clock; the
// wake loop only decides when to schedule, never when a click sounds.

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const CLICK_ATTACK_SEC = 0.001;
const CLICK_DECAY_SEC = 0.05;

export interface AudioEngine {
  ensureStarted(): void;
  now(): number;
  startSession(): void;
  stopSession(): void;
  playClick(time: number, accent: boolean): void;
  startWakeLoop(callback: () => void): void;
  stopWakeLoop(): void;
}

export function createAudioEngine(): AudioEngine {
  let ctx: AudioContext | null = null;
  let session: GainNode | null = null;
  let wakeWorker: Worker | null = null;

  return {
    // Must be called synchronously inside a user gesture (browser autoplay rules).
    ensureStarted() {
      if (!ctx) {
        const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
        if (!AudioContextClass) throw new Error("Web Audio API not supported");
        ctx = new AudioContextClass();
      }
      void ctx.resume();
    },
    now() {
      return ctx?.currentTime ?? 0;
    },
    // Each playback gets its own bus so stop can silence already-scheduled clicks.
    startSession() {
      if (!ctx) return;
      session = ctx.createGain();
      session.gain.value = 1;
      session.connect(ctx.destination);
    },
    stopSession() {
      session?.disconnect();
      session = null;
    },
    playClick(time, accent) {
      if (!ctx || !session) return;
      const osc = ctx.createOscillator();
      const envelope = ctx.createGain();
      osc.frequency.value = accent ? 1500 : 1000;
      envelope.gain.setValueAtTime(0, time);
      envelope.gain.linearRampToValueAtTime(accent ? 1.0 : 0.6, time + CLICK_ATTACK_SEC);
      envelope.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_DECAY_SEC);
      osc.connect(envelope);
      envelope.connect(session);
      osc.start(time);
      osc.stop(time + CLICK_DECAY_SEC + 0.01);
    },
    // The loop lives in a worker so it keeps waking every 25 ms in background tabs.
    startWakeLoop(callback) {
      wakeWorker?.terminate();
      wakeWorker = new Worker(new URL("./wake-worker.ts", import.meta.url), { type: "module" });
      wakeWorker.onmessage = () => callback();
      wakeWorker.postMessage("start");
    },
    stopWakeLoop() {
      wakeWorker?.terminate();
      wakeWorker = null;
    },
  };
}
