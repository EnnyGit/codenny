// The one place that talks to fzf. Commands call pick(); swapping fzf for
// something else later only changes this file.
import { spawnSync } from "node:child_process";
import { Fail, program } from "./run.js";

export interface PickOptions {
  prompt: string;
  query?: string;
  header?: string;
  preview?: string; // shell command, {1} is the first word of the line
  selectOne?: boolean; // skip the list when only one line matches
}

// Shows the lines in fzf and returns the first word of the picked line, or
// undefined when cancelled or nothing matched.
export function pick(lines: string[], opts: PickOptions): string | undefined {
  const args = ["--ansi", "--height=60%", "--reverse", `--prompt=${opts.prompt}> `];
  if (opts.query) args.push(`--query=${opts.query}`);
  if (opts.header) args.push(`--header=${opts.header}`);
  if (opts.preview) args.push(`--preview=${opts.preview}`);
  if (opts.selectOne) args.push("--select-1", "--exit-0");

  // fzf draws on the terminal itself; it reads the list from stdin and writes
  // the choice to stdout.
  const res = spawnSync(program("fzf", fzfMissing), args, {
    input: lines.join("\n"),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
  });
  if (res.error) throw new Fail(fzfMissing);
  if (res.status !== 0) return undefined; // 1: no match, 130: Esc
  return res.stdout.trim().split(/\s+/)[0] || undefined;
}

const fzfMissing =
  process.platform === "win32"
    ? "Can't find fzf. Install it: winget install junegunn.fzf"
    : "Can't find fzf. Install it: brew install fzf";
