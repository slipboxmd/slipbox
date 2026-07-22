# slipbox

The **Slipbox** command — a standalone [Pi](https://pi.dev)-powered harness for
building and growing a flat-markdown Zettelkasten. Run `slipbox` in any directory
to open the agent preloaded with the slipbox tools and skill.

It's a thin branded launcher over the Pi SDK: it starts Pi's interactive TUI with
`@slipbox/core` injected, and **reuses your existing Pi login, models, and
settings** (from `~/.pi/agent`). Log in once with Pi and `slipbox` just works.

## Install (planned, once published)

```bash
npm install -g slipbox
slipbox                     # in any folder
```

## Use

```bash
cd ~/my-knowledge-base
slipbox
> /init                     # scaffold this folder into a slipbox (.slipbox + folders)
> ingest ~/reading/some-essay.md
> write a literature note for each cluster, then a reference note
> what's in the slipbox now?
```

- `/init` turns the current folder into a slipbox (creates `.slipbox` and the
  note-type folders). Idempotent.
- Everything else is a normal conversation; the agent uses the `slipbox_*` tools.

## Requirements

- Node ≥ 22
- [QMD](https://github.com/tobi/qmd): `npm i -g @tobilu/qmd` then `qmd pull`
- A Pi login. If you've run `pi` and logged in, you're set. Otherwise run
  `/login` inside `slipbox` (it's the same interactive session), or set
  `ANTHROPIC_API_KEY`.

## Local development (unpublished)

From the repo root, build the workspace, then either run the bin directly or link
a global `slipbox` command:

```bash
pnpm build

# Option A — run the built bin directly (no global install):
cd ~/some-folder
node /ABSOLUTE/PATH/TO/slipbox-harness/packages/cli/dist/bin.js

# Option B — a real `slipbox` command on your PATH:
pnpm --filter slipbox link --global
cd ~/some-folder && slipbox
```

The launcher reuses `~/.pi/agent`, so your Pi credentials and model choice carry
over automatically.

## Troubleshooting

- **`/login` hangs on "Waiting for authentication…".** Known issue with the
  embedded login flow: the OAuth device flow **does** complete and your
  credentials **are** saved to `~/.pi/agent/auth.json`, but the TUI can fail to
  return from the waiting screen. Press `esc`/`ctrl+c` (or close the tab), then
  relaunch `slipbox` — you'll already be authenticated. Alternatively, log in
  once with the `pi` CLI (`pi` → `/login`); `slipbox` reuses that login.
- **`zsh: command not found: slipbox`.** Open a new terminal (or `source
  ~/.zshrc`) so `~/Library/pnpm/bin` is on your PATH.
- **The harness thinks a parent folder is the slipbox.** Slipbox discovery walks
  up to the nearest `.slipbox`. Run `slipbox` in a clean folder (not nested under
  an existing slipbox) and use `/init`.
