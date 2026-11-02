import { describe, expect, it } from "vitest";
import {
  LOOKAHEAD_SEC,
  clampBpm,
  createScheduler,
  type ScheduledBeat,
  type SchedulerOptions,
} from "@/metronome/scheduler";

function setup(options: Omit<SchedulerOptions, "onBeat"> = {}) {
  const beats: ScheduledBeat[] = [];
  const scheduler = createScheduler({ ...options, onBeat: (beat) => beats.push(beat) });
  return { scheduler, beats };
}

// Deterministic pseudo-random generator (LCG) so the jitter test is repeatable.
function lcg(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

describe("US1 start/stop", () => {
  it("(a) schedules the first beat START_DELAY_SEC after start, accented", () => {
    const { scheduler, beats } = setup();
    scheduler.start(10);
    scheduler.tick(10);
    expect(beats).toHaveLength(1);
    expect(beats[0].time).toBeCloseTo(10.05, 9);
    expect(beats[0].accent).toBe(true);
    expect(beats[0].beatIndex).toBe(0);
  });

  it("(b) spaces beats 60 / bpm apart at 120 BPM", () => {
    const { scheduler, beats } = setup();
    scheduler.start(10);
    for (let now = 10; now < 13; now += 0.025) scheduler.tick(now);
    beats.forEach((beat, n) => expect(beat.time).toBeCloseTo(10.05 + n * 0.5, 9));
  });

  it("(c) does not drift over 5 minutes of jittered wake-ups (SC-001)", () => {
    const { scheduler, beats } = setup();
    const random = lcg(42);
    scheduler.start(0);
    for (let now = 0; now < 300; now += 0.025 + random() * 0.02) scheduler.tick(now);

    expect(beats.length).toBeGreaterThanOrEqual(599);
    expect(beats.length).toBeLessThanOrEqual(601);
    beats.forEach((beat, n) => {
      expect(Math.abs(beat.time - (0.05 + n * 0.5))).toBeLessThan(1e-6);
    });
    expect(new Set(beats.map((b) => b.time)).size).toBe(beats.length);
  });

  it("(d) only schedules beats inside the lookahead window", () => {
    const { scheduler, beats } = setup();
    scheduler.start(0);
    for (let now = 0; now < 5; now += 0.03) {
      scheduler.tick(now);
      beats.forEach((beat) => expect(beat.time).toBeLessThan(now + LOOKAHEAD_SEC));
    }
  });

  it("(e) accents the first beat of every 4/4 bar", () => {
    const { scheduler, beats } = setup();
    scheduler.start(0);
    for (let now = 0; beats.length < 8; now += 0.025) scheduler.tick(now);
    expect(beats.slice(0, 8).map((b) => b.accent)).toEqual([
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it("(f) stops scheduling after stop()", () => {
    const { scheduler, beats } = setup();
    scheduler.start(0);
    scheduler.tick(0);
    scheduler.stop();
    const count = beats.length;
    scheduler.tick(1);
    scheduler.tick(2);
    expect(beats).toHaveLength(count);
    expect(scheduler.isPlaying).toBe(false);
  });

  it("(g) restarts from an accented first beat (FR-009)", () => {
    const { scheduler, beats } = setup();
    scheduler.start(0);
    for (let now = 0; now < 1.2; now += 0.025) scheduler.tick(now);
    scheduler.stop();
    beats.length = 0;
    scheduler.start(5);
    scheduler.tick(5);
    expect(beats[0]).toMatchObject({ beatIndex: 0, accent: true });
    expect(beats[0].time).toBeCloseTo(5.05, 9);
  });

  it("(h) does not catch up on missed beats after a late wake-up", () => {
    const { scheduler, beats } = setup();
    scheduler.start(0);
    scheduler.tick(2);
    expect(beats).toHaveLength(1);
    expect(beats[0].time).toBeCloseTo(2, 9);
    scheduler.tick(2.5);
    expect(beats).toHaveLength(2);
    expect(beats[1].time).toBeCloseTo(2.5, 9);
  });
});

describe("US2 bpm", () => {
  it("(a) clamps and rounds bpm", () => {
    expect(clampBpm(39)).toBe(40);
    expect(clampBpm(241)).toBe(240);
    expect(clampBpm(120.4)).toBe(120);
    expect(clampBpm(120.6)).toBe(121);
  });

  it("(b) uses a bpm set while stopped", () => {
    const { scheduler, beats } = setup();
    scheduler.setBpm(60);
    scheduler.start(0);
    for (let now = 0; now < 4; now += 0.025) scheduler.tick(now);
    beats.forEach((beat, n) => expect(beat.time).toBeCloseTo(0.05 + n * 1.0, 9));
  });

  it("(c) applies a bpm change from the next interval without resetting the bar", () => {
    const { scheduler, beats } = setup();
    scheduler.start(0);
    let now = 0;
    for (; beats.length < 3; now += 0.025) scheduler.tick(now);
    scheduler.setBpm(60);
    for (; beats.length < 4; now += 0.025) scheduler.tick(now);
    expect(beats[3].time).toBeCloseTo(beats[2].time + 1.0, 9);
    expect(beats[3].beatIndex).toBe(3);
  });

  it("(d) clamps setBpm input", () => {
    const { scheduler } = setup();
    scheduler.setBpm(500);
    expect(scheduler.bpm).toBe(240);
  });

  it("(e) does not burst when switching from slow to fast", () => {
    const { scheduler, beats } = setup({ bpm: 40 });
    scheduler.start(0);
    let now = 0;
    for (; now <= 1.4; now += 0.025) scheduler.tick(now);
    expect(beats).toHaveLength(1);
    const before = beats.length;
    scheduler.setBpm(240);
    for (; now <= 3; now += 0.025) scheduler.tick(now);

    const after = beats.slice(before);
    expect(after.length).toBeGreaterThan(1);
    expect(after[0].time).toBeGreaterThanOrEqual(1.4);
    for (let i = 1; i < after.length; i++) {
      expect(after[i].time - after[i - 1].time).toBeGreaterThanOrEqual(60 / 240 - 1e-9);
    }
  });
});

describe("US3 meter", () => {
  it("(a) uses a meter set while stopped", () => {
    const { scheduler, beats } = setup();
    scheduler.setBeatsPerBar(3);
    scheduler.start(0);
    for (let now = 0; beats.length < 6; now += 0.025) scheduler.tick(now);
    expect(beats.slice(0, 6).map((b) => b.accent)).toEqual([
      true,
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(scheduler.beatsPerBar).toBe(3);
  });

  it("(b) switches meter at the next bar while playing", () => {
    const { scheduler, beats } = setup();
    scheduler.start(0);
    let now = 0;
    for (; beats.length < 2; now += 0.025) scheduler.tick(now);
    scheduler.setBeatsPerBar(3);
    for (; beats.length < 8; now += 0.025) scheduler.tick(now);

    const next = beats.slice(2, 8);
    expect(next.map((b) => b.beatIndex)).toEqual([2, 3, 0, 1, 2, 0]);
    next.forEach((b) => expect(b.accent).toBe(b.beatIndex === 0));
    expect(scheduler.beatsPerBar).toBe(3);
  });

  it("(c) keeps the beat interval when switching meter", () => {
    const { scheduler, beats } = setup();
    scheduler.start(0);
    let now = 0;
    for (; beats.length < 2; now += 0.025) scheduler.tick(now);
    scheduler.setBeatsPerBar(3);
    for (; beats.length < 10; now += 0.025) scheduler.tick(now);
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i].time - beats[i - 1].time).toBeCloseTo(0.5, 9);
    }
  });
  it("(d) applies a pending meter change when restarted mid-bar", () => {
    const { scheduler, beats } = setup();
    scheduler.start(0);
    let now = 0;
    for (; beats.length < 2; now += 0.025) scheduler.tick(now);
    scheduler.setBeatsPerBar(3);
    scheduler.stop();
    beats.length = 0;
    scheduler.start(5);
    for (now = 5; beats.length < 4; now += 0.025) scheduler.tick(now);
    expect(beats.map((b) => b.beatIndex)).toEqual([0, 1, 2, 0]);
    expect(scheduler.beatsPerBar).toBe(3);
  });
});
