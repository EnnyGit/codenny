// The branch list behind ny branch and ny review: yours and the server's in
// one list, newest first, with where each one stands.
import { pick } from "./pick.js";
import { git, gitLoud, requireRepo } from "./run.js";

export interface Branch {
  name: string;
  status: string;
  color: string; // ANSI color code for the status
  gone: boolean;
  age: string;
  author: string;
  subject: string;
}

const paint = (code: string, s: string) => `\x1b[${code}m${s}\x1b[0m`;

// Turns `git for-each-ref` lines (tab separated: refname, short name,
// upstream, track, age, author, subject) into the list, gone ones last.
export function parseBranches(output: string): Branch[] {
  const rows = output.split("\n").filter(Boolean).map((line) => {
    const [ref = "", short = "", upstream = "", track = "", age = "", author = "", subject = ""] =
      line.split("\t");
    const mine = ref.startsWith("refs/heads/");
    return { mine, name: mine ? short : short.replace(/^origin\//, ""), upstream, track, age, author, subject };
  });
  const local = new Set(rows.filter((r) => r.mine).map((r) => r.name));

  const branches: Branch[] = [];
  for (const r of rows) {
    if (["HEAD", "origin", "review-base"].includes(r.name)) continue;
    if (!r.mine && local.has(r.name)) continue; // your copy already shows it

    let status: string, color: string;
    if (!r.mine) [status, color] = ["remote", "34"];
    else if (!r.upstream) [status, color] = ["local only", "35"];
    else if (r.track === "[gone]") [status, color] = ["gone", "2"];
    else if (!r.track) [status, color] = ["in sync", "32"];
    else {
      const parts = r.track.replace(/[[\]]/g, "").split(", ");
      status = parts
        .map((p) => p.replace(/^ahead /, "push ").replace(/^behind /, "pull "))
        .join(", ");
      color = "33";
    }
    const subject = r.subject.length > 60 ? r.subject.slice(0, 57) + "..." : r.subject;
    branches.push({ name: r.name, status, color, gone: status === "gone", age: r.age, author: r.author, subject });
  }
  return [...branches.filter((b) => !b.gone), ...branches.filter((b) => b.gone)];
}

export function formatBranches(branches: Branch[]): string[] {
  const width = (f: (b: Branch) => string) => Math.max(0, ...branches.map((b) => f(b).length));
  const [w1, w2, w3, w4] = [width((b) => b.name), width((b) => b.status), width((b) => b.age), width((b) => b.author)];
  return branches.map((b) =>
    [
      b.name.padEnd(w1),
      paint(b.color, b.status.padEnd(w2)),
      paint("2", b.age.padEnd(w3)),
      b.author.padEnd(w4),
      b.subject,
    ].join("  "),
  );
}

// Fetches, shows the branch list in fzf and returns the picked branch name.
export function pickBranch(query?: string): string | undefined {
  requireRepo();
  gitLoud(["fetch", "--prune", "--quiet"]);
  const current = git(["branch", "--show-current"]);
  const output = git([
    "for-each-ref",
    "--sort=-committerdate",
    "--format=%(refname)%09%(refname:short)%09%(upstream:short)%09%(upstream:track)%09%(committerdate:relative)%09%(authorname)%09%(subject)",
    "refs/heads",
    "refs/remotes/origin",
  ]);
  return pick(formatBranches(parseBranches(output)), {
    prompt: "branch",
    query,
    header: `on ${current || "(no branch)"}  ·  Enter pick  ·  Esc cancel`,
    preview:
      "git log --oneline --graph --color=always -20 {1} -- 2>/dev/null || git log --oneline --graph --color=always -20 origin/{1} --",
  });
}
