// Beat scheduling logic, free of browser APIs: the caller supplies audio-clock
// times, so tests can drive it with a fake clock. See contracts/scheduler.md.

export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const DEFAULT_BPM = 120;
export const DEFAULT_BEATS_PER_BAR = 4;
export const LOOKAHEAD_SEC = 0.1;
export const START_DELAY_SEC = 0.05;

export type BeatsPerBar = 3 | 4;

export interface ScheduledBeat {
  time: number;
  accent: boolean;
  beatIndex: number;
}

export interface SchedulerOptions {
  bpm?: number; // defaults to DEFAULT_BPM
  beatsPerBar?: BeatsPerBar; // defaults to DEFAULT_BEATS_PER_BAR
  onBeat: (beat: ScheduledBeat) => void; // called once per scheduled beat
}

export interface Scheduler {
  start(now: number): void; // first beat at now + START_DELAY_SEC, accented
  stop(): void;
  tick(now: number): void; // schedules every beat with time < now + LOOKAHEAD_SEC; no-op when stopped
  setBpm(bpm: number): void; // clamped; applies from the next interval
  setBeatsPerBar(n: BeatsPerBar): void; // playing: from the next bar; stopped: immediately
  readonly isPlaying: boolean;
  readonly bpm: number;
  readonly beatsPerBar: BeatsPerBar; // the meter currently in effect
}

export function clampBpm(value: number): number {
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

export function createScheduler(options: SchedulerOptions): Scheduler {
  const { onBeat } = options;
  let bpm = clampBpm(options.bpm ?? DEFAULT_BPM);
  let beatsPerBar: BeatsPerBar = options.beatsPerBar ?? DEFAULT_BEATS_PER_BAR;
  let isPlaying = false;
  let beatIndex = 0;
  let lastBeatTime: number | null = null;
  let nextBeatTime = 0;
  let pendingBeatsPerBar: BeatsPerBar | null = null;

  return {
    start(now) {
      isPlaying = true;
      beatIndex = 0;
      if (pendingBeatsPerBar !== null) {
        beatsPerBar = pendingBeatsPerBar;
        pendingBeatsPerBar = null;
      }
      lastBeatTime = null;
      nextBeatTime = now + START_DELAY_SEC;
    },
    stop() {
      isPlaying = false;
    },
    tick(now) {
      if (!isPlaying) return;
      // Never catch up on beats that are already in the past: that would play a burst.
      if (nextBeatTime < now) nextBeatTime = now;
      while (nextBeatTime < now + LOOKAHEAD_SEC) {
        onBeat({ time: nextBeatTime, accent: beatIndex === 0, beatIndex });
        lastBeatTime = nextBeatTime;
        nextBeatTime = lastBeatTime + 60 / bpm;
        beatIndex = (beatIndex + 1) % beatsPerBar;
        if (beatIndex === 0 && pendingBeatsPerBar !== null) {
          beatsPerBar = pendingBeatsPerBar;
          pendingBeatsPerBar = null;
        }
      }
    },
    setBpm(value) {
      bpm = clampBpm(value);
      // Re-time the next, not yet scheduled beat; tick() pulls it forward if already past.
      if (isPlaying && lastBeatTime !== null) nextBeatTime = lastBeatTime + 60 / bpm;
    },
    setBeatsPerBar(n) {
      // While playing, finish the current bar first; the new meter starts at the next downbeat.
      if (isPlaying) {
        pendingBeatsPerBar = n;
      } else {
        beatsPerBar = n;
        pendingBeatsPerBar = null;
      }
    },
    get isPlaying() {
      return isPlaying;
    },
    get bpm() {
      return bpm;
    },
    get beatsPerBar() {
      return beatsPerBar;
    },
  };
}
