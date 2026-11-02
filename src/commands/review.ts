import { existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pickBranch } from "../branches.js";
import type { Command } from "../command.js";
import { openInIde } from "../ide.js";
import { Fail, git, gitLoud, gitOk, mainBranch } from "../run.js";

export const review: Command = {
  name: "review",
  aliases: ["r"],
  summary: "review a pull request in its own folder and IDE window",
  help: `ny review [filter]
ny review --done

Pick the branch, and it opens in <reviewDir>/<project> in its own IDE window.
Your own folder and its changes stay exactly as they are.
The first time per project it creates the folder (install dependencies there
once); after that it reuses it. The review folder shows the branch exactly as
it is on the server, without taking the branch itself, so ny branch in your
own folder can still switch to it.
It also points a local branch called review-base at the commit where the pull
request split off main. In IntelliJ: branch popup, review-base, Show Diff with
Working Tree shows only the pull request's own changes, like Bitbucket and
GitHub do, even when the branch is behind main. (Comparing with main instead
also shows everything main gained since, as if the pull request undid it.)
  --done   remove this project's review folder and review-base`,
  run(args, config) {
    let common: string;
    try {
      common = git(["rev-parse", "--path-format=absolute", "--git-common-dir"]);
    } catch {
      throw new Fail("not a git repo");
    }
    const dir = join(config.reviewDir, basename(common.replace(/[\\/]\.git$/, "")));

    if (args[0] === "--done") {
      gitLoud(["worktree", "remove", dir]);
      console.log(`Removed ${dir}`);
      gitOk(["branch", "--delete", "--force", "review-base"]);
      return;
    }

    const picked = pickBranch(args[0]);
    if (!picked) return;

    let created = false;
    if (!existsSync(dir)) {
      mkdirSync(dirname(dir), { recursive: true });
      gitLoud(["worktree", "add", "--quiet", "--detach", dir]);
      created = true;
    }

    // Prefer the server's version; fall back to a local-only branch.
    const target = gitOk(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${picked}`])
      ? `origin/${picked}`
      : picked;
    gitLoud(["-C", dir, "switch", "--quiet", "--detach", target]);
    console.log(`Reviewing ${picked} in ${dir}`);

    try {
      const base = git(["merge-base", mainBranch(), target]);
      git(["branch", "--force", "review-base", base]);
      console.log("In IntelliJ: branch popup > review-base > Show Diff with Working Tree");
    } catch {
      // No common history with main; skip review-base.
    }
    if (created) console.log(`New review folder: install dependencies there once (for example: cd ${dir} && npm install).`);

    openInIde(dir, config);
  },
};
