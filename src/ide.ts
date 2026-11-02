import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { Config } from "./config.js";
import { findOnPath, hasCommand } from "./run.js";

// Opens a folder in the IDE: config.ide is the app name on a Mac, a command
// elsewhere.
export function openInIde(dir: string, config: Config): void {
  if (process.platform === "darwin") {
    if (spawnSync("open", ["-a", config.ide, dir], { stdio: "ignore" }).status === 0) return;
  } else if (process.platform === "win32") {
    for (const ide of [config.ide, "idea64", "idea"]) {
      // A full path from the config, or one from PATH, never a program in the
      // current folder.
      const path = !ide ? undefined : isAbsolute(ide) ? (existsSync(ide) ? ide : undefined) : findOnPath(ide, [".exe", ".cmd", ".bat"]);
      if (!path) continue;
      if (/\.(cmd|bat)$/i.test(path)) {
        // Only cmd.exe runs these, and it doesn't quote anything itself.
        spawn(`"${path}" "${dir}"`, { detached: true, stdio: "ignore", shell: true }).unref();
      } else {
        spawn(path, [dir], { detached: true, stdio: "ignore" }).unref();
      }
      return;
    }
  } else {
    for (const ide of [config.ide, "idea"]) {
      if (!ide || !hasCommand(ide)) continue;
      spawn(ide, [dir], { detached: true, stdio: "ignore" }).unref();
      return;
    }
  }
  console.log(`Couldn't start the IDE. Open ${dir} yourself (File > Open), or set "ide" in ny config.`);
}
