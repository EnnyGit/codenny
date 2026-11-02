import type { Command } from "../command.js";
import { confirm, Fail, git, gitLoud, gitOk, mainBranch, requireRepo } from "../run.js";

export const clean: Command = {
  name: "clean",
  aliases: ["c"],
  summary: "delete local branches that were deleted on the server",
  help: `ny clean

Deletes local branches that were deleted on the server. Only removes a branch
when all its commits are in the server's main branch, so nothing unfinished
is lost. Shows the list and asks first.`,
  async run() {
    requireRepo();
    gitLoud(["fetch", "--prune", "--quiet"]);

    const main = mainBranch();
    if (!gitOk(["rev-parse", "--verify", "--quiet", main])) {
      throw new Fail("Can't tell which branch is main. Run: git remote set-head origin --auto");
    }
    const current = git(["branch", "--show-current"]);

    const gone = git(["for-each-ref", "--format=%(refname:short) %(upstream:track)", "refs/heads"])
      .split("\n")
      .map((line) => line.split(" "))
      .filter(([, track]) => track === "[gone]")
      .map(([name]) => name!);
    if (gone.length === 0) return console.log("Nothing to clean up.");

    const isSafe = (b: string) => b !== current && gitOk(["merge-base", "--is-ancestor", b, main]);
    const safe = gone.filter(isSafe);
    const kept = gone.filter((b) => !safe.includes(b));

    if (kept.length > 0) {
      console.log(`Keeping these (you're on it, or it has commits that aren't in ${main}):`);
      kept.forEach((b) => console.log(`  ${b}`));
      console.log();
    }
    if (safe.length === 0) return console.log("Nothing safe to delete.");

    console.log(`Fully merged into ${main} and deleted on the server:`);
    safe.forEach((b) => console.log(`  ${b}`));
    if (!(await confirm("Delete these local branches?"))) return console.log("Nothing deleted.");

    for (const b of safe) {
      if (gitOk(["branch", "-D", b])) console.log(`  deleted ${b}`);
    }
  },
};
