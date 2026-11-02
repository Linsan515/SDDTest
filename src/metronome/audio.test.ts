import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudioEngine } from "@/metronome/audio";

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  url: URL | string;
  options?: WorkerOptions;
  constructor(url: URL | string, options?: WorkerOptions) {
    this.url = url;
    this.options = options;
    FakeWorker.instances.push(this);
  }
}

describe("wake loop", () => {
  afterEach(() => {
    FakeWorker.instances = [];
    vi.unstubAllGlobals();
  });

  // Main-thread timers are throttled to ~1/s in background tabs; worker timers are not.
  it("runs in a Web Worker so background tabs keep their tempo", () => {
    vi.stubGlobal("Worker", FakeWorker);
    const engine = createAudioEngine();
    const callback = vi.fn();

    engine.startWakeLoop(callback);

    expect(FakeWorker.instances).toHaveLength(1);
    const worker = FakeWorker.instances[0];
    expect(String(worker.url)).toContain("wake-worker");
    expect(worker.options).toMatchObject({ type: "module" });
    expect(worker.postMessage).toHaveBeenCalledWith("start");

    worker.onmessage?.(new MessageEvent("message", { data: "tick" }));
    worker.onmessage?.(new MessageEvent("message", { data: "tick" }));
    expect(callback).toHaveBeenCalledTimes(2);

    engine.stopWakeLoop();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
