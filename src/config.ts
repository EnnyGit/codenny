// Per-machine settings in ~/.config/codenny/config.json. Not in the repo: home
// and work have different folders.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export interface Config {
  projectsDir: string; // folder your projects live in, searched two levels deep
  reviewDir: string; // where review folders go, one per project
  ide: string; // Mac: the app's name. Windows: a command on your PATH, like idea64
  scriptsDir: string; // this machine's own scripts, never pushed
}

export const configDir = join(homedir(), ".config", "codenny");
export const configFile = join(configDir, "config.json");

function defaults(): Config {
  // The old git-shortcuts.sh settings, so the first config matches them.
  const env = process.env;
  return {
    projectsDir: env.GIT_PROJECTS_DIR ?? "~/code",
    reviewDir: env.GIT_REVIEW_DIR ?? "~/review",
    ide: env.GIT_IDE ?? (process.platform === "darwin" ? "IntelliJ IDEA" : "idea64"),
    scriptsDir: join(configDir, "scripts"),
  };
}

// Writes the config with defaults the first time, and returns where it is.
export function ensureConfig(): string {
  if (!existsSync(configFile)) {
    mkdirSync(dirname(configFile), { recursive: true });
    writeFileSync(configFile, JSON.stringify(defaults(), null, 2) + "\n");
  }
  return configFile;
}

export function loadConfig(): Config {
  ensureConfig();
  let saved: Partial<Config>;
  try {
    saved = JSON.parse(readFileSync(configFile, "utf8"));
  } catch (err) {
    throw new Error(`Can't read ${configFile}: ${(err as Error).message}`);
  }
  const merged = { ...defaults(), ...saved };
  return {
    projectsDir: expandPath(merged.projectsDir),
    reviewDir: expandPath(merged.reviewDir),
    ide: merged.ide,
    scriptsDir: expandPath(merged.scriptsDir),
  };
}

// Accepts ~/x, and on Windows also Git Bash style /d/x for D:\x.
export function expandPath(p: string): string {
  if (p === "~" || p.startsWith("~/")) p = join(homedir(), p.slice(1));
  if (process.platform === "win32") {
    const drive = /^\/([a-zA-Z])(\/|$)/.exec(p);
    if (drive) p = `${drive[1]!.toUpperCase()}:/${p.slice(3)}`;
  }
  return resolve(p);
}
