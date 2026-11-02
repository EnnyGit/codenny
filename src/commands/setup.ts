// Commands about codenny itself: its config and the ny shell function.
import { readFileSync } from "node:fs";
import type { Command } from "../command.js";
import { ensureConfig } from "../config.js";
import { shellFunction } from "../shell.js";

export const config: Command = {
  name: "config",
  aliases: [],
  summary: "show this machine's settings and where they live",
  help: `ny config

Shows this machine's settings file, creating it the first time. Edit the file
to change them:
  projectsDir  folder your projects live in (ny project)
  reviewDir    where review folders go (ny review)
  ide          Mac: the app's name, like "IntelliJ IDEA". Windows: a command, like idea64
  scriptsDir   this machine's own scripts, never pushed
On Windows, paths like /d/review work too.`,
  run() {
    const file = ensureConfig();
    console.log(file);
    console.log(readFileSync(file, "utf8"));
  },
};

export const init: Command = {
  name: "init",
  aliases: [],
  summary: "print the ny shell function for your .zshrc or .bashrc",
  help: `ny init

Prints the ny shell function. Add this line to ~/.zshrc (Mac) or ~/.bashrc
(Git Bash):
  eval "$(codenny init)"
ny runs codenny, and lets commands like ny project --cd move your terminal.`,
  run() {
    process.stdout.write(shellFunction);
  },
};
