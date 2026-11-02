import { pickBranch } from "../branches.js";
import type { Command } from "../command.js";
import { gitLoud } from "../run.js";

export const branch: Command = {
  name: "branch",
  aliases: ["b"],
  summary: "see every branch and where it stands, then switch",
  help: `ny branch [filter]

See every branch and where it stands, then switch with fuzzy search.
Yours and remote ones in one list, newest first. Type to filter, Enter
switches, Esc cancels. A remote-only branch gets a local copy that tracks it.
  in sync    same as the server
  push 2     you have 2 commits the server doesn't
  pull 11    the server has 11 commits you don't
  local only never pushed
  remote     only on the server, you don't have it yet
  gone       deleted on the server (usually merged); listed last, ny clean tidies them`,
  run(args) {
    const picked = pickBranch(args[0]);
    if (picked) gitLoud(["switch", picked]);
  },
};
