import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import type { Command } from "../command.js";
import { openInIde } from "../ide.js";
import { pick } from "../pick.js";
import { Fail, git } from "../run.js";
import { cdAfterExit } from "../shell.js";

export const project: Command = {
  name: "project",
  aliases: ["p"],
  summary: "open one of your projects in the IDE",
  help: `ny project [filter] [--cd]

Lists every git project in projectsDir (two levels deep), most recently
committed first, with the branch it's on. Enter opens it in its own IDE
window (or brings that window forward if it's already open), whose terminal
starts in the project.
  ny project        open the project in the IDE
  ny project loupe  skip the list when only one project matches
  ny project --cd   only move this terminal into the project`,
  run(args, config) {
    const cdOnly = args.includes("--cd");
    const query = args.find((a) => a !== "--cd");
    const root = config.projectsDir;
    if (!existsSync(root)) throw new Fail(`Can't find ${root}. Set "projectsDir" in ny config.`);

    const projects = findProjects(root, config.reviewDir).map((dir) => ({
      name: relative(root, dir).replaceAll("\\", "/"),
      time: Number(tryGit(["log", "-1", "--format=%ct"], dir) || 0),
      branch: tryGit(["branch", "--show-current"], dir) || "(detached)",
      age: tryGit(["log", "-1", "--format=%cr"], dir),
    }));
    projects.sort((a, b) => b.time - a.time);

    const w1 = Math.max(0, ...projects.map((p) => p.name.length));
    const w2 = Math.max(0, ...projects.map((p) => p.branch.length));
    const lines = projects.map(
      (p) => `${p.name.padEnd(w1)}  \x1b[36m${p.branch.padEnd(w2)}\x1b[0m  \x1b[2m${p.age}\x1b[0m`,
    );
    const picked = pick(lines, { prompt: "project", query, selectOne: true });
    if (!picked) return;

    const dir = join(root, picked);
    if (!cdOnly) return openInIde(dir, config);
    if (!cdAfterExit(dir)) console.log(`cd ${dir}   (ny does this for you; see ny init)`);
  },
};

// Folders one or two levels below root that hold a .git, skipping hidden
// folders, node_modules and the review folders.
function findProjects(root: string, reviewDir: string): string[] {
  const found: string[] = [];
  const walk = (dir: string, depth: number) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // no permission
    }
    for (const e of entries) {
      if (!e.isDirectory() || e.name.startsWith(".") || e.name === "node_modules") continue;
      const sub = join(dir, e.name);
      if (sub === reviewDir) continue;
      if (existsSync(join(sub, ".git"))) found.push(sub);
      else if (depth < 2) walk(sub, depth + 1);
    }
  };
  walk(root, 1);
  return found;
}

function tryGit(args: string[], cwd: string): string {
  try {
    return git(args, cwd);
  } catch {
    return "";
  }
}
