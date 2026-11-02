// Pull requests waiting for your review, from the server origin points at:
// Bitbucket Data Center (with the login git already stored) or GitHub (via gh).
import { bitbucketReviews, parseBitbucketRemote, type BitbucketRepo } from "./bitbucket.js";
import { githubReviews } from "./github.js";
import { pick } from "./pick.js";
import { git, gitLoud, gitOk, requireRepo } from "./run.js";

export interface PullRequest {
  id: number;
  title: string;
  author: string;
  source: string; // branch name
  target: string; // branch name
  status: string; // where your review stands
  todo: boolean; // still waiting for you; listed first
  fetchRef: string; // ref on origin with the pull request's commit, also for forks
  sameRepo: boolean; // source branch is on origin itself
}

export type Host = { kind: "github" } | ({ kind: "bitbucket" } & BitbucketRepo);

export function hostOf(remoteUrl: string): Host | undefined {
  if (/github\.com[:/]/.test(remoteUrl)) return { kind: "github" };
  const bitbucket = parseBitbucketRemote(remoteUrl);
  if (bitbucket) return { kind: "bitbucket", ...bitbucket };
  return undefined;
}

export function originHost(): Host | undefined {
  try {
    return hostOf(git(["config", "--get", "remote.origin.url"]));
  } catch {
    return undefined;
  }
}

const paint = (code: string, s: string) => `\x1b[${code}m${s}\x1b[0m`;

export function formatPullRequests(prs: PullRequest[]): string[] {
  const width = (f: (p: PullRequest) => string) => Math.max(0, ...prs.map((p) => f(p).length));
  const short = (s: string) => (s.length > 60 ? s.slice(0, 57) + "..." : s);
  const [w1, w2, w3, w4] = [
    width((p) => `#${p.id}`),
    width((p) => p.status),
    width((p) => short(p.title)),
    width((p) => p.author),
  ];
  return prs.map((p) =>
    [
      `#${p.id}`.padEnd(w1),
      paint(p.todo ? "33" : "32", p.status.padEnd(w2)),
      short(p.title).padEnd(w3),
      p.author.padEnd(w4),
      paint("2", `${p.source} → ${p.target}`),
    ].join("  "),
  );
}

// Fetches, lists the pull requests waiting for you and returns the picked one.
// Undefined when cancelled; null when there are none.
export async function pickPullRequest(host: Host, query?: string): Promise<PullRequest | undefined | null> {
  requireRepo();
  gitLoud(["fetch", "--prune", "--quiet"]);
  const prs = host.kind === "github" ? githubReviews() : await bitbucketReviews(host);
  if (prs.length === 0) return null;
  const sorted = [...prs.filter((p) => p.todo), ...prs.filter((p) => !p.todo)];
  const picked = pick(formatPullRequests(sorted), {
    prompt: "review",
    query,
    header: "waiting for your review  ·  Enter pick  ·  Esc cancel",
  });
  return picked ? sorted.find((p) => `#${p.id}` === picked) : undefined;
}

// The commit to review: the branch on origin, or for a fork the pull
// request's own ref on the server.
export function pullRequestCommit(pr: PullRequest): string {
  if (pr.sameRepo && gitOk(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${pr.source}`])) {
    return `origin/${pr.source}`;
  }
  gitLoud(["fetch", "--quiet", "origin", pr.fetchRef]);
  return git(["rev-parse", "FETCH_HEAD"]);
}
