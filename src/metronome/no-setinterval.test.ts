import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = path.resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    const isSource = /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name);
    return isSource ? [full] : [];
  });
}

describe("timing", () => {
  it("never uses setInterval anywhere in src/", () => {
    const offenders = sourceFiles(SRC_DIR).filter((file) =>
      fs.readFileSync(file, "utf8").includes("setInterval"),
    );
    expect(offenders).toEqual([]);
  });
});
