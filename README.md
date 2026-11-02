# codenny

Everyday git shortcuts and your own scripts behind one command: `ny`.
Works on macOS (zsh) and Windows (Git Bash).

```
ny               list all commands and scripts
ny branch   (b)  switch branch, and see where each one stands
ny review   (r)  review a pull request in its own folder and IDE window
ny project  (p)  open one of your projects in the IDE
ny clean    (c)  delete local branches that are merged and gone from the server
ny workflow (w)  how the commands fit into a normal day
ny <command> --help
```

## Install

Needs Node 20+, git and [fzf](https://github.com/junegunn/fzf)
(`brew install fzf` or `winget install junegunn.fzf`).

```bash
git clone https://github.com/EnnyGit/codenny.git
cd codenny
npm install
npm run build
npm link
```

Add this to `~/.zshrc` (macOS) or `~/.bashrc` (Git Bash), then open a new terminal:

```bash
eval "$(codenny init)"
```

Update with `git pull && npm install && npm run build`.

## Settings

`ny config` shows your settings file, `~/.config/codenny/config.json`. Edit it
to match your machine:

| Setting | |
|---|---|
| `projectsDir` | folder your projects are in |
| `reviewDir` | where `ny review` puts review folders |
| `ide` | macOS: app name, like `"IntelliJ IDEA"`. Windows: a command, like `idea64` |
| `scriptsDir` | your own scripts |

On Windows both `D:/code` and `/d/code` work.

## Reviewing pull requests

`ny review` lists the open pull requests waiting for your review and opens the
one you pick in a separate folder, with its changes as uncommitted changes in
your IDE. It works out where the repo lives from its `origin`:

- **Bitbucket Data Center**, cloned over HTTPS: uses the login git already
  stored for the server, so there's nothing to set up.
- **GitHub**: uses [gh](https://cli.github.com) (`gh auth login` once).

Anything else, or `ny review --branches`: pick any branch instead.

## Your own scripts

Put `name.sh` in your `scriptsDir` and run it as `ny name`. The first comment
line shows up in `ny` as its description. Scripts always run with bash, so the
same script works on macOS and in Git Bash.

```bash
#!/usr/bin/env bash
# Restart the local Docker stack from scratch
docker compose down -v && docker compose up -d
```

Scripts in this repo's `scripts/` folder are available to everyone. To move
the terminal somewhere afterwards, write the folder to `$CODENNY_CD_FILE`.

## Adding a command

Each command is a file in `src/commands/`, listed in `src/cli.ts`.
`npm run dev` rebuilds on save, `npm test` runs the tests.
