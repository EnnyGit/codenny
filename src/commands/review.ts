import { existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { pickBranch } from "../branches.js";
import type { Command } from "../command.js";
import { openInIde } from "../ide.js";
import { confirm, Fail, git, gitLoud, gitOk, mainBranch } from "../run.js";

// The pull request commit the review folder was set up from, to tell the
// pull request's changes apart from your own edits in that folder.
const reviewRef = "refs/codenny/review";

export const review: Command = {
  name: "review",
  aliases: ["r"],
  summary: "review a pull request in its own folder and IDE window",
  help: `ny review [filter]
ny review --done

Pick the branch, and it opens in <reviewDir>/<project> in its own IDE window,
with the pull request's changes as uncommitted local changes: the Commit
window lists the files it touched and the editor marks every changed line.
The files are the pull request's code, so you can run it and its tests there.
Your own folder and its changes stay exactly as they are.
The changes are the pull request's own, counted from where it split off main,
like Bitbucket and GitHub show them, even when the branch is behind main.
The first time per project it creates the folder (install dependencies there
once); after that it reuses it. Run it again on the same branch to pick up new
commits. If you edited files in the review folder, it asks before throwing
them away.
  --done   remove this project's review folder`,
  async run(args, config) {
    let common: string;
    try {
      common = git(["rev-parse", "--path-format=absolute", "--git-common-dir"]);
    } catch {
      throw new Fail("not a git repo");
    }
    const dir = join(config.reviewDir, basename(common.replace(/[\\/]\.git$/, "")));

    if (args[0] === "--done") {
      if (!existsSync(dir)) return console.log(`No review folder at ${dir}`);
      if (!(await okToDiscard(dir))) return;
      gitLoud(["worktree", "remove", "--force", dir]);
      gitOk(["update-ref", "-d", reviewRef]);
      gitOk(["branch", "--delete", "--force", "review-base"]); // from older versions
      return console.log(`Removed ${dir}`);
    }

    const picked = pickBranch(args[0]);
    if (!picked) return;

    let created = false;
    if (!existsSync(dir)) {
      mkdirSync(dirname(dir), { recursive: true });
      gitLoud(["worktree", "add", "--quiet", "--detach", dir]);
      created = true;
    } else {
      if (!(await okToDiscard(dir))) return;
      gitLoud(["-C", dir, "reset", "--hard", "--quiet"]);
      gitLoud(["-C", dir, "clean", "-fd", "--quiet"]);
    }

    // Prefer the server's version; fall back to a local-only branch.
    const target = gitOk(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${picked}`])
      ? `origin/${picked}`
      : picked;
    gitLoud(["-C", dir, "switch", "--quiet", "--detach", target]);
    git(["update-ref", reviewRef, git(["rev-parse", target])]);
    gitOk(["branch", "--delete", "--force", "review-base"]); // from older versions

    // Step back to where the pull request split off main, keeping its files:
    // everything it changed is now an uncommitted change.
    let base: string | undefined;
    try {
      base = git(["merge-base", mainBranch(), target]);
    } catch {
      // No common history with main.
    }
    console.log(`Reviewing ${picked} in ${dir}`);
    if (base) {
      gitLoud(["-C", dir, "reset", "--soft", "--quiet", base]);
      const stat = git(["-C", dir, "diff", "--cached", "--shortstat"]);
      console.log(stat ? `${stat}, shown as uncommitted changes in the IDE's Commit window.` : "No changes compared to main.");
    } else {
      console.log(`Can't find where ${picked} split off ${mainBranch()}, so its changes aren't shown as local changes.`);
    }
    if (created) console.log(`New review folder: install dependencies there once (for example: cd ${dir} && npm install).`);

    openInIde(dir, config);
  },
};

// Files you changed in the review folder yourself, on top of the pull request.
function ownEdits(dir: string): string[] {
  const from = gitOk(["rev-parse", "--verify", "--quiet", reviewRef]) ? reviewRef : "HEAD";
  const changed = git(["-C", dir, "diff", "--name-only", from]);
  const added = git(["-C", dir, "ls-files", "--others", "--exclude-standard"]);
  return [...changed.split("\n"), ...added.split("\n")].filter(Boolean);
}

// True when the review folder has no edits of your own, or you agree to lose them.
async function okToDiscard(dir: string): Promise<boolean> {
  const edits = ownEdits(dir);
  if (edits.length === 0) return true;
  console.log(`You changed ${edits.length === 1 ? "this file" : `these ${edits.length} files`} in the review folder:`);
  edits.slice(0, 10).forEach((f) => console.log(`  ${f}`));
  if (edits.length > 10) console.log(`  and ${edits.length - 10} more`);
  if (await confirm("Throw them away?")) return true;
  console.log("Nothing changed.");
  return false;
}
