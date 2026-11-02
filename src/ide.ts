import { spawn, spawnSync } from "node:child_process";
import type { Config } from "./config.js";
import { hasCommand } from "./run.js";

// Opens a folder in the IDE: config.ide is the app name on a Mac, a command
// elsewhere.
export function openInIde(dir: string, config: Config): void {
  if (process.platform === "darwin") {
    if (spawnSync("open", ["-a", config.ide, dir], { stdio: "ignore" }).status === 0) return;
  } else {
    const win = process.platform === "win32";
    for (const ide of [config.ide, "idea64", "idea.cmd", "idea"]) {
      if (!ide || !hasCommand(ide)) continue;
      // idea.cmd needs a shell on Windows, which doesn't quote arguments itself.
      spawn(ide, [win ? `"${dir}"` : dir], { detached: true, stdio: "ignore", shell: win }).unref();
      return;
    }
  }
  console.log(`Couldn't start the IDE. Open ${dir} yourself (File > Open), or set "ide" in ny config.`);
}
