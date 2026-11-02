import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { test } from "node:test";
import { findOnPath, printable } from "./run.js";

test("findOnPath never picks a program from the current folder", () => {
  const root = mkdtempSync(join(tmpdir(), "codenny-"));
  const onPath = join(root, "bin");
  const here = join(root, "repo");
  mkdirSync(onPath);
  mkdirSync(here);
  writeFileSync(join(onPath, "tool"), "");
  writeFileSync(join(here, "tool"), "");
  const [path, cwd] = [process.env.PATH, process.cwd()];
  try {
    process.chdir(here);
    process.env.PATH = [".", "", onPath].join(delimiter);
    assert.equal(findOnPath("tool", [""]), join(onPath, "tool"));
    process.env.PATH = [".", ""].join(delimiter);
    assert.equal(findOnPath("tool", [""]), undefined);
  } finally {
    process.env.PATH = path;
    process.chdir(cwd);
  }
});

test("printable keeps normal text and drops control characters", () => {
  assert.equal(printable("a\tb\nc\x1b[31md\x9be é ✓"), "abc[31mde é ✓");
});
