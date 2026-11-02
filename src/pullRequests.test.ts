import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBitbucketRemote, toPullRequests as fromBitbucket, type BbPullRequest } from "./bitbucket.js";
import { toPullRequests as fromGithub, type GhPullRequest } from "./github.js";
import { hostOf } from "./pullRequests.js";

test("recognizes Bitbucket Data Center and GitHub remotes", () => {
  assert.deepEqual(parseBitbucketRemote("https://enny@git.company.nl/scm/SHOP/web-app.git"), {
    baseUrl: "https://git.company.nl",
    protocol: "https",
    host: "git.company.nl",
    project: "SHOP",
    slug: "web-app",
  });
  assert.equal(parseBitbucketRemote("https://host:8443/bitbucket/scm/~enny/tools")?.baseUrl, "https://host:8443/bitbucket");
  assert.equal(hostOf("https://github.com/EnnyGit/loupe.git")?.kind, "github");
  assert.equal(hostOf("git@github.com:EnnyGit/loupe.git")?.kind, "github");
  assert.equal(hostOf("/some/local/path.git"), undefined);
});

const ref = (branch: string, commit: string, slug = "web-app", key = "SHOP") => ({
  displayId: branch,
  latestCommit: commit,
  repository: { slug, project: { key } },
});
const reviewer = (name: string, status: string, lastReviewedCommit?: string) => ({
  user: { name, slug: name },
  status,
  lastReviewedCommit,
});
const bbPr = (id: number, mine: ReturnType<typeof reviewer>, from = ref("feature", "c2")): BbPullRequest => ({
  id,
  title: `PR ${id}`,
  author: { user: { name: "sam", displayName: "Sam" } },
  fromRef: from,
  toRef: ref("develop", "c1"),
  reviewers: [reviewer("other", "APPROVED"), mine],
});

test("Bitbucket: this repo only, with where your review stands", () => {
  const repo = { baseUrl: "", protocol: "https", host: "", project: "shop", slug: "WEB-APP" };
  const other = { ...bbPr(9, reviewer("Enny", "UNAPPROVED")), toRef: ref("main", "x", "other-repo") };
  const prs = fromBitbucket(
    [
      bbPr(1, reviewer("enny", "UNAPPROVED")),
      bbPr(2, reviewer("enny", "APPROVED", "c2")),
      bbPr(3, reviewer("enny", "APPROVED", "c0")),
      bbPr(4, reviewer("enny", "NEEDS_WORK", "c2"), ref("fix", "c2", "web-app-fork", "~SAM")),
      other,
    ],
    repo,
    "Enny",
  );
  assert.deepEqual(
    prs.map((p) => [p.id, p.status, p.todo, p.sameRepo]),
    [
      [1, "to do", true, true],
      [2, "approved", false, true],
      [3, "approved, new commits", true, true],
      [4, "changes asked", false, false],
    ],
  );
  assert.equal(prs[0]?.target, "develop");
  assert.equal(prs[0]?.fetchRef, "refs/pull-requests/1/from");
});

test("GitHub: requested first, already reviewed after, no doubles", () => {
  const gh = (number: number, cross = false): GhPullRequest => ({
    number,
    title: `PR ${number}`,
    author: { login: "sam" },
    headRefName: "feature",
    baseRefName: "main",
    isCrossRepository: cross,
  });
  const prs = fromGithub([gh(5), gh(6, true)], [gh(6, true), gh(7)]);
  assert.deepEqual(
    prs.map((p) => [p.id, p.status, p.sameRepo, p.fetchRef]),
    [
      [5, "to do", true, "refs/pull/5/head"],
      [6, "to do", false, "refs/pull/6/head"],
      [7, "reviewed", true, "refs/pull/7/head"],
    ],
  );
});
