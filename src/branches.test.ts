import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBranches } from "./branches.js";

const line = (...fields: string[]) => fields.join("\t");

test("status of each kind of branch, gone ones last", () => {
  const output = [
    line("refs/heads/old", "old", "origin/old", "[gone]", "3 weeks ago", "Enny", "Old work"),
    line("refs/heads/main", "main", "origin/main", "", "2 hours ago", "Enny", "Merge"),
    line("refs/heads/feature", "feature", "origin/feature", "[ahead 2, behind 11]", "1 day ago", "Enny", "Add x"),
    line("refs/heads/spike", "spike", "", "", "2 days ago", "Enny", "Try y"),
    line("refs/remotes/origin/main", "origin/main", "", "", "2 hours ago", "Enny", "Merge"),
    line("refs/remotes/origin/theirs", "origin/theirs", "", "", "3 days ago", "Sam", "Fix z"),
    line("refs/remotes/origin/HEAD", "origin", "", "", "2 hours ago", "Enny", "Merge"),
  ].join("\n");

  assert.deepEqual(
    parseBranches(output).map((b) => [b.name, b.status]),
    [
      ["main", "in sync"],
      ["feature", "push 2, pull 11"],
      ["spike", "local only"],
      ["theirs", "remote"],
      ["old", "gone"],
    ],
  );
});

test("long subjects are cut off", () => {
  const [b] = parseBranches(line("refs/heads/x", "x", "", "", "now", "Enny", "a".repeat(80)));
  assert.equal(b?.subject, "a".repeat(57) + "...");
});
