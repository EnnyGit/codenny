// Small wrappers around child processes, so commands read like the shell
// scripts they replace.
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

export class Fail extends Error {}

// Runs git and returns its output, trimmed. Throws Fail when git fails.
export function git(args: string[], cwd?: string): string {
  const res = spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (res.error) throw new Fail(`Can't run git: ${res.error.message}`);
  if (res.status !== 0) throw new Fail(res.stderr.trim() || `git ${args[0]} failed`);
  return res.stdout.trim();
}

// Runs git and only says whether it worked.
export function gitOk(args: string[], cwd?: string): boolean {
  return spawnSync("git", args, { cwd, stdio: "ignore" }).status === 0;
}

// Runs git with its output going straight to the terminal.
export function gitLoud(args: string[], cwd?: string): void {
  const res = spawnSync("git", args, { cwd, stdio: "inherit" });
  if (res.status !== 0) throw new Fail("");
}

export function requireRepo(): void {
  if (!gitOk(["rev-parse", "--git-dir"])) throw new Fail("not a git repo");
}

// The server's main branch, like origin/main.
export function mainBranch(): string {
  try {
    return git(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]);
  } catch {
    return "origin/main";
  }
}

// Whether a command exists on this machine's PATH.
export function hasCommand(cmd: string): boolean {
  const finder = process.platform === "win32" ? "where" : "which";
  return spawnSync(finder, [cmd], { stdio: "ignore" }).status === 0;
}

// Asks a yes/no question; anything but y or yes is no.
export async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === "y" || answer === "yes";
}
