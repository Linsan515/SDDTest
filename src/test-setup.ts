import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Radix Slider measures its thumb with ResizeObserver, which jsdom lacks.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

afterEach(() => {
  cleanup();
});
