import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MAX_BPM, MIN_BPM } from "@/metronome/scheduler";
import { useMetronome } from "@/metronome/useMetronome";

export function Metronome() {
  const { isPlaying, error, start, stop, bpm, setBpm, beatsPerBar, toggleBeatsPerBar } =
    useMetronome();

  return (
    <section className="flex w-full max-w-sm flex-col items-center gap-6">
      <p className="text-5xl font-bold tabular-nums">{bpm} BPM</p>
      <Slider
        thumbLabel="BPM"
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        value={[bpm]}
        onValueChange={([value]) => setBpm(value)}
      />
      <div className="flex gap-3">
        <Button size="lg" className="w-32" onClick={isPlaying ? stop : start}>
          {isPlaying ? "停止" : "開始"}
        </Button>
        <Button size="lg" variant="outline" onClick={toggleBeatsPerBar}>
          拍號：{beatsPerBar}/4
        </Button>
      </div>
      {error !== null && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
