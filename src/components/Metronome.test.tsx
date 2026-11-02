import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Metronome } from "@/components/Metronome";

const engine = vi.hoisted(() => ({
  ensureStarted: vi.fn(),
  now: vi.fn(() => 0),
  startSession: vi.fn(),
  stopSession: vi.fn(),
  playClick: vi.fn(),
  startWakeLoop: vi.fn(),
  stopWakeLoop: vi.fn(),
}));

vi.mock("@/metronome/audio", () => ({ createAudioEngine: () => engine }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("US1 start/stop", () => {
  it("starts and stops the metronome", () => {
    render(<Metronome />);
    const button = screen.getByRole("button", { name: "開始" });

    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "停止" })).toBeTruthy();
    expect(engine.startSession).toHaveBeenCalledTimes(1);
    expect(engine.startWakeLoop).toHaveBeenCalledTimes(1);
    expect(engine.playClick).toHaveBeenCalled();
    expect(engine.playClick.mock.calls[0][1]).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "停止" }));
    expect(screen.getByRole("button", { name: "開始" })).toBeTruthy();
    expect(engine.stopSession).toHaveBeenCalled();
    expect(engine.stopWakeLoop).toHaveBeenCalled();
  });

  it("does not start twice on rapid double clicks", () => {
    render(<Metronome />);
    const button = screen.getByRole("button", { name: "開始" });

    act(() => {
      button.click();
      button.click();
    });

    expect(engine.startSession).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "停止" })).toBeTruthy();
  });

  it("shows an error when audio cannot start", () => {
    engine.ensureStarted.mockImplementationOnce(() => {
      throw new Error("Web Audio API not supported");
    });
    render(<Metronome />);

    fireEvent.click(screen.getByRole("button", { name: "開始" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "無法啟動音訊，請改用支援 Web Audio 的瀏覽器",
    );
    expect(screen.getByRole("button", { name: "開始" })).toBeTruthy();
  });
});

describe("US2 bpm slider", () => {
  it("shows and adjusts the bpm within 40–240", () => {
    render(<Metronome />);
    const slider = screen.getByRole("slider", { name: "BPM" });
    expect(slider.getAttribute("aria-valuemin")).toBe("40");
    expect(slider.getAttribute("aria-valuemax")).toBe("240");
    expect(slider.getAttribute("aria-valuenow")).toBe("120");
    expect(screen.getByText("120 BPM")).toBeTruthy();

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(screen.getByText("121 BPM")).toBeTruthy();

    fireEvent.keyDown(slider, { key: "End" });
    expect(screen.getByText("240 BPM")).toBeTruthy();

    fireEvent.keyDown(slider, { key: "Home" });
    expect(screen.getByText("40 BPM")).toBeTruthy();
  });
});

describe("US3 meter toggle", () => {
  it("toggles between 4/4 and 3/4", () => {
    render(<Metronome />);

    fireEvent.click(screen.getByRole("button", { name: /4\/4/ }));
    expect(screen.getByRole("button", { name: /3\/4/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /3\/4/ }));
    expect(screen.getByRole("button", { name: /4\/4/ })).toBeTruthy();
  });
});
