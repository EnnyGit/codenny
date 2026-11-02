import type { Config } from "./config.js";

export interface Command {
  name: string;
  aliases: string[];
  summary: string; // one line for ny help
  help: string; // shown by ny <command> --help
  run(args: string[], config: Config): void | Promise<void>;
}
