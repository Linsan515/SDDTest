import { useCallback, useEffect, useState } from "react";
import { log } from "@/lib/logger";
import { createAudioEngine } from "@/metronome/audio";
import {
  DEFAULT_BEATS_PER_BAR,
  DEFAULT_BPM,
  createScheduler,
  type BeatsPerBar,
} from "@/metronome/scheduler";

const AUDIO_ERROR_MESSAGE = "無法啟動音訊，請改用支援 Web Audio 的瀏覽器";

export function useMetronome() {
  const [engine] = useState(createAudioEngine);
  const [scheduler] = useState(() =>
    createScheduler({ onBeat: (beat) => engine.playClick(beat.time, beat.accent) }),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bpm, setBpmState] = useState(DEFAULT_BPM);
  const [beatsPerBar, setBeatsPerBarState] = useState<BeatsPerBar>(DEFAULT_BEATS_PER_BAR);

  const start = useCallback(() => {
    // Checked on the scheduler, not React state: rapid clicks arrive before a re-render.
    if (scheduler.isPlaying) return;
    try {
      engine.ensureStarted();
      engine.startSession();
      scheduler.start(engine.now());
      scheduler.tick(engine.now());
      engine.startWakeLoop(() => scheduler.tick(engine.now()));
      setIsPlaying(true);
      setError(null);
      log("info", "metronome.start", { bpm: scheduler.bpm, beatsPerBar: scheduler.beatsPerBar });
    } catch (err) {
      setError(AUDIO_ERROR_MESSAGE);
      log("error", "audio.error", { message: err instanceof Error ? err.message : String(err) });
    }
  }, [engine, scheduler]);

  const stop = useCallback(() => {
    if (!scheduler.isPlaying) return;
    engine.stopWakeLoop();
    engine.stopSession();
    scheduler.stop();
    setIsPlaying(false);
    log("info", "metronome.stop");
  }, [engine, scheduler]);

  const setBpm = useCallback(
    (value: number) => {
      scheduler.setBpm(value);
      setBpmState(scheduler.bpm);
      log("info", "metronome.bpm_change", { bpm: scheduler.bpm });
    },
    [scheduler],
  );

  const toggleBeatsPerBar = useCallback(() => {
    const next: BeatsPerBar = beatsPerBar === 4 ? 3 : 4;
    scheduler.setBeatsPerBar(next);
    setBeatsPerBarState(next);
    log("info", "metronome.meter_change", { beatsPerBar: next });
  }, [scheduler, beatsPerBar]);

  useEffect(() => stop, [stop]);

  return { isPlaying, error, start, stop, bpm, setBpm, beatsPerBar, toggleBeatsPerBar };
}
