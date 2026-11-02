// Bitbucket Data Center (Server) over its REST API, logged in with the
// username and password or token git already stored for the server.
import { spawnSync } from "node:child_process";
import tls from "node:tls";
import type { PullRequest } from "./pullRequests.js";
import { Fail } from "./run.js";

export interface BitbucketRepo {
  baseUrl: string; // https://bitbucket.company.nl, plus a context path if the server has one
  protocol: string;
  host: string; // with the port, if any
  project: string;
  slug: string;
}

// https://[user@]host[:port][/context]/scm/PROJECT/repo.git
export function parseBitbucketRemote(url: string): BitbucketRepo | undefined {
  const m = /^(https?):\/\/(?:[^@/]+@)?([^/]+)(\/.*?)?\/scm\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(url);
  if (!m) return undefined;
  const [, protocol, host, context = "", project, slug] = m as unknown as string[];
  return { baseUrl: `${protocol}://${host}${context}`, protocol: protocol!, host: host!, project: project!, slug: slug! };
}

interface BbRef {
  displayId: string;
  latestCommit: string;
  repository: { slug: string; project: { key: string } };
}

export interface BbPullRequest {
  id: number;
  title: string;
  author: { user: { name: string; displayName: string } };
  fromRef: BbRef;
  toRef: BbRef;
  reviewers: { user: { name: string; slug: string }; status: string; lastReviewedCommit?: string }[];
}

export async function bitbucketReviews(repo: BitbucketRepo): Promise<PullRequest[]> {
  const login = storedLogin(repo.protocol, repo.host);
  trustSystemCertificates();
  const auth = "Basic " + Buffer.from(`${login.username}:${login.password}`).toString("base64");

  const all: BbPullRequest[] = [];
  for (let start: number | undefined = 0; start !== undefined; ) {
    const url = `${repo.baseUrl}/rest/api/latest/dashboard/pull-requests?role=REVIEWER&state=OPEN&limit=100&start=${start}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
    } catch (err) {
      throw new Fail(`Can't reach ${repo.baseUrl}: ${causeOf(err)}`);
    }
    if (res.status === 401 || res.status === 403) {
      throw new Fail(`Bitbucket didn't accept the login git stored for ${repo.host} (${res.status}).`);
    }
    if (!res.ok) throw new Fail(`Bitbucket answered ${res.status} for ${url}`);
    const page = (await res.json()) as { values: BbPullRequest[]; isLastPage: boolean; nextPageStart?: number };
    all.push(...page.values);
    start = page.isLastPage ? undefined : page.nextPageStart;
  }
  return toPullRequests(all, repo, login.username);
}

// Only this repo's pull requests, with where your own review stands.
export function toPullRequests(prs: BbPullRequest[], repo: BitbucketRepo, me: string): PullRequest[] {
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  return prs
    .filter((p) => same(p.toRef.repository.project.key, repo.project) && same(p.toRef.repository.slug, repo.slug))
    .map((p) => {
      const mine = p.reviewers.find((r) => same(r.user.name, me) || same(r.user.slug, me));
      const newCommits = !!mine?.lastReviewedCommit && mine.lastReviewedCommit !== p.fromRef.latestCommit;
      let status = "to do";
      if (mine?.status === "APPROVED") status = newCommits ? "approved, new commits" : "approved";
      if (mine?.status === "NEEDS_WORK") status = newCommits ? "changes asked, new commits" : "changes asked";
      const sameRepo =
        same(p.fromRef.repository.project.key, repo.project) && same(p.fromRef.repository.slug, repo.slug);
      return {
        id: p.id,
        title: p.title,
        author: p.author.user.displayName,
        source: p.fromRef.displayId,
        target: p.toRef.displayId,
        status,
        todo: status !== "approved" && status !== "changes asked",
        fetchRef: `refs/pull-requests/${p.id}/from`,
        sameRepo,
      };
    });
}

// The username and password (or token) git keeps for the server, from the
// same credential helper git uses when you fetch.
function storedLogin(protocol: string, host: string): { username: string; password: string } {
  const res = spawnSync("git", ["credential", "fill"], {
    input: `protocol=${protocol}\nhost=${host}\n\n`,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  const fields = Object.fromEntries(
    res.stdout.split("\n").filter(Boolean).map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
  );
  if (res.status !== 0 || !fields.username || !fields.password) {
    throw new Fail(`git has no login stored for ${host}. Run git fetch once and log in, then try again.`);
  }
  return { username: fields.username, password: fields.password };
}

// Company networks often inspect HTTPS with their own certificate, which the
// operating system trusts but Node doesn't by default. Git uses the system's.
function trustSystemCertificates(): void {
  const t = tls as typeof tls & {
    getCACertificates?: (type: string) => string[];
    setDefaultCACertificates?: (certs: string[]) => void;
  };
  if (!t.getCACertificates || !t.setDefaultCACertificates) return; // Node older than 22.15/23.10
  t.setDefaultCACertificates([...t.getCACertificates("default"), ...t.getCACertificates("system")]);
}

function causeOf(err: unknown): string {
  const cause = (err as { cause?: { code?: string; message?: string } }).cause;
  return cause?.code ?? cause?.message ?? (err as Error).message;
}
