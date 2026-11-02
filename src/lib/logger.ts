export type LogLevel = "info" | "error";

// One-line JSON log entries: info → console.info, error → console.error.
export function log(level: LogLevel, event: string, data: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...data });
  if (level === "error") {
    console.error(line);
  } else {
    console.info(line);
  }
}
