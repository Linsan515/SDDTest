// Wake loop that runs off the main thread: browsers throttle main-thread timers
// in background tabs to about once per second, but leave worker timers alone.

const WAKE_INTERVAL_MS = 25;

// The app's tsconfig uses DOM types, so describe the worker scope we rely on.
const scope = self as unknown as {
  postMessage(message: "tick"): void;
  onmessage: ((event: MessageEvent<"start" | "stop">) => void) | null;
};

let timer: ReturnType<typeof setTimeout> | null = null;

function wake() {
  scope.postMessage("tick");
  timer = setTimeout(wake, WAKE_INTERVAL_MS);
}

scope.onmessage = (event) => {
  if (event.data === "start" && timer === null) {
    timer = setTimeout(wake, WAKE_INTERVAL_MS);
  } else if (event.data === "stop" && timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
};
