// GitHub through the gh command, which has its own login.
import { spawnSync } from "node:child_process";
import type { PullRequest } from "./pullRequests.js";
import { Fail } from "./run.js";

export interface GhPullRequest {
  number: number;
  title: string;
  author: { login: string };
  headRefName: string;
  baseRefName: string;
  isCrossRepository: boolean;
}

const fields = "number,title,author,headRefName,baseRefName,isCrossRepository";

function gh(search: string): GhPullRequest[] {
  const res = spawnSync("gh", ["pr", "list", "--search", search, "--json", fields, "--limit", "100"], {
    encoding: "utf8",
  });
  if (res.error) throw new Fail("Can't find gh, which ny uses for GitHub. Install it: brew install gh, then gh auth login");
  if (res.status !== 0) throw new Fail(res.stderr.trim() || "gh pr list failed");
  return JSON.parse(res.stdout);
}

// GitHub drops you from the requested reviewers once you've reviewed, so
// open pull requests you already reviewed come from a second search.
export function githubReviews(): PullRequest[] {
  return toPullRequests(gh("review-requested:@me"), gh("reviewed-by:@me"));
}

export function toPullRequests(requested: GhPullRequest[], reviewed: GhPullRequest[]): PullRequest[] {
  const todo = new Set(requested.map((p) => p.number));
  const all = [...requested, ...reviewed.filter((p) => !todo.has(p.number))];
  return all.map((p) => ({
    id: p.number,
    title: p.title,
    author: p.author.login,
    source: p.headRefName,
    target: p.baseRefName,
    status: todo.has(p.number) ? "to do" : "reviewed",
    todo: todo.has(p.number),
    fetchRef: `refs/pull/${p.number}/head`,
    sameRepo: !p.isCrossRepository,
  }));
}
