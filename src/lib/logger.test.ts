import { afterEach, describe, expect, it, vi } from "vitest";
import { log } from "@/lib/logger";

describe("log", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes info events to console.info as one-line JSON", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    log("info", "metronome.start", { bpm: 120 });

    expect(info).toHaveBeenCalledTimes(1);
    const line = info.mock.calls[0][0] as string;
    expect(line).not.toContain("\n");
    const entry = JSON.parse(line);
    expect(entry).toMatchObject({ level: "info", event: "metronome.start", bpm: 120 });
    expect(new Date(entry.ts).toISOString()).toBe(entry.ts);
  });

  it("writes error events to console.error", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    log("error", "audio.error", { message: "x" });

    expect(info).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    expect(JSON.parse(error.mock.calls[0][0] as string)).toMatchObject({
      level: "error",
      event: "audio.error",
      message: "x",
    });
  });
});
