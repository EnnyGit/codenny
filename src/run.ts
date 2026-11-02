// Small wrappers around child processes, so commands read like the shell
// scripts they replace.
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";
import { createInterface } from "node:readline/promises";

export class Fail extends Error {}

// The program to start for a command. On Windows, Node can find a program in
// the current folder before PATH, so a git.exe inside a repo could run instead
// of git; there ny looks it up in PATH itself. Other systems only use PATH.
export function program(name: string, missing = `Can't find ${name} on your PATH.`): string {
  if (process.platform !== "win32") return name;
  const path = findOnPath(name, [".exe", ".com"]);
  if (!path) throw new Fail(missing);
  return path;
}

// The full path of a program in PATH, skipping entries that mean the current
// folder ("" or ".").
export function findOnPath(name: string, extensions: string[]): string | undefined {
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!isAbsolute(dir)) continue;
    for (const ext of extensions) {
      const path = join(dir, name.toLowerCase().endsWith(ext) ? name : name + ext);
      try {
        if (statSync(path).isFile()) return path;
      } catch {
        // Not here.
      }
    }
  }
  return undefined;
}

// Text from a server or a commit, without control characters, so a pull
// request title can't send escape codes to your terminal.
export const printable = (s: string) => s.replace(/[\x00-\x1f\x7f-\x9f]/g, "");

// Runs git and returns its output, trimmed. Throws Fail when git fails.
export function git(args: string[], cwd?: string): string {
  const res = spawnSync(program("git"), args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (res.error) throw new Fail(`Can't run git: ${res.error.message}`);
  if (res.status !== 0) throw new Fail(res.stderr.trim() || `git ${args[0]} failed`);
  return res.stdout.trim();
}

// Runs git and only says whether it worked.
export function gitOk(args: string[], cwd?: string): boolean {
  return spawnSync(program("git"), args, { cwd, stdio: "ignore" }).status === 0;
}

// Runs git with its output going straight to the terminal.
export function gitLoud(args: string[], cwd?: string): void {
  const res = spawnSync(program("git"), args, { cwd, stdio: "inherit" });
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

// Whether a command exists on this machine's PATH (macOS and Linux).
export function hasCommand(cmd: string): boolean {
  return spawnSync("which", [cmd], { stdio: "ignore" }).status === 0;
}

// Asks a yes/no question; anything but y or yes is no.
export async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === "y" || answer === "yes";
}
