// Shell scripts as commands: scripts/name.sh in the repo (on every machine)
// and name.sh in this machine's scriptsDir (never pushed). The local one wins
// when both have the same name.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { program } from "./run.js";
import { cdFileVar } from "./shell.js";

export interface Script {
  name: string;
  path: string;
  summary: string; // first comment line after the shebang
  local: boolean;
}

export const sharedScriptsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts");

export function findScripts(localDir: string): Map<string, Script> {
  const found = new Map<string, Script>();
  for (const [dir, local] of [[sharedScriptsDir, false], [localDir, true]] as const) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith(".sh")) continue;
      const path = join(dir, file);
      const name = file.slice(0, -3);
      found.set(name, { name, path, summary: summaryOf(path), local });
    }
  }
  return found;
}

function summaryOf(path: string): string {
  for (const line of readFileSync(path, "utf8").split("\n").slice(0, 5)) {
    if (line.startsWith("#!")) continue;
    if (line.startsWith("#")) return line.replace(/^#+\s*/, "");
    break;
  }
  return "";
}

// Runs the script with bash, also on Windows (Git Bash). The script can write
// a folder to $CODENNY_CD_FILE to move the terminal there afterwards.
export function runScript(script: Script, args: string[]): number {
  const res = spawnSync(program("bash"), [script.path, ...args], {
    stdio: "inherit",
    env: { ...process.env, [cdFileVar]: process.env[cdFileVar] ?? "/dev/null" },
  });
  if (res.error) {
    console.error(`Can't run bash: ${res.error.message}`);
    return 1;
  }
  return res.status ?? 1;
}
