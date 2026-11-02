# codenny

CLI (`codenny`, used through the `ny` shell function). TypeScript,
no runtime dependencies, Node 20+. Must work on macOS (zsh) and Windows Git
Bash: no Mac-only paths or tools, run `.sh` scripts through `bash`, and keep
the `ny` function in `src/shell.ts` valid in both zsh and bash.

- New command: a file in `src/commands/` exporting a `Command`, added to the
  list in `src/cli.ts`. `help` text in the same style as the others.
- The README is an overview: install, settings, a line per command. How a
  command works, its options and edge cases go in its `help` text
  (`ny <command> --help`), not the README.
- Throw `Fail` from `src/run.ts` for errors meant for the user; its message is
  printed without a stack trace.
- Only `src/pick.ts` talks to fzf.
- Changing the folder of the user's terminal goes through `cdAfterExit()`.
- Machine-specific values belong in the config (`src/config.ts`), never in the
  repo. Personal or work-internal scripts go in the local `scriptsDir`.
- `npm run build`, `npm test` (node:test, `*.test.ts` next to the code).
