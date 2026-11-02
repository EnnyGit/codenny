#!/usr/bin/env node
import { branch } from "./commands/branch.js";
import { clean } from "./commands/clean.js";
import { project } from "./commands/project.js";
import { review } from "./commands/review.js";
import { config as configCommand, init } from "./commands/setup.js";
import type { Command } from "./command.js";
import { loadConfig, type Config } from "./config.js";
import { Fail } from "./run.js";
import { findScripts, runScript } from "./scripts.js";

const commands: Command[] = [branch, review, project, clean, configCommand, init];

function printHelp(config: Config): void {
  const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
  const label = (c: Command) => [c.name, ...c.aliases].join(", ");
  const scripts = [...findScripts(config.scriptsDir).values()];
  const width = Math.max(...commands.map((c) => label(c).length), ...scripts.map((s) => s.name.length));

  console.log("Usage: ny <command> [args]   ny <command> --help for more\n");
  console.log("Commands:");
  for (const c of commands) console.log(`  ${label(c).padEnd(width)}  ${c.summary}`);
  if (scripts.length > 0) {
    console.log("\nScripts:");
    for (const s of scripts) {
      console.log(`  ${s.name.padEnd(width)}  ${s.summary}${s.local ? dim("  (this machine)") : ""}`);
    }
  }
}

async function main(argv: string[]): Promise<number> {
  const config = loadConfig();
  const [name, ...args] = argv;
  if (!name || name === "help" || name === "--help" || name === "-h") {
    printHelp(config);
    return 0;
  }

  const command = commands.find((c) => c.name === name || c.aliases.includes(name));
  if (command) {
    if (args.includes("--help") || args.includes("-h")) {
      console.log(command.help);
      return 0;
    }
    await command.run(args, config);
    return 0;
  }

  const script = findScripts(config.scriptsDir).get(name);
  if (script) return runScript(script, args);

  console.error(`Unknown command: ${name}. Run ny to see them all.`);
  return 1;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (err) {
  if (!(err instanceof Fail)) throw err;
  if (err.message) console.error(err.message);
  process.exitCode = 1;
}
