# Demo slipbox

A runnable example slipbox for trying `@slipbox/core` with Pi. It ships a
`.slipbox` config, a `.pi/settings.json` that loads the local extension + skill,
and a sample source in `inbox/` to ingest.

Generated output (`sources/`, `references/`, `literature-notes/`,
`reference-notes/`, `.qmd/`) is gitignored so the example stays a clean starting
point.

## One-time setup

From the **repo root**:

```bash
pnpm install            # installs the workspace deps the extension needs
```

Make sure the external tools are ready:

```bash
qmd --version           # need @tobilu/qmd  (npm i -g @tobilu/qmd; macOS: brew install sqlite)
qmd pull                # one-time: download the local embedding/rerank models (~2 GB)
```

Install Pi (the coding agent):

```bash
npm i -g @earendil-works/pi-coding-agent
```

> **Heads-up (this machine):** your shell has `pi` aliased to `pipenv run
> python`, which shadows the real binary. For this session run `unalias pi`
> before launching, or invoke it as `\pi` / by full path
> (`$(npm prefix -g)/bin/pi`). Inside Pi's TUI the alias doesn't matter.

Authenticate Pi once: either `export ANTHROPIC_API_KEY=...` before launching, or
run `/login` inside Pi for a Claude subscription.

## Run it

```bash
cd examples/demo-slipbox
unalias pi 2>/dev/null   # if the alias is set
pi
```

On first launch Pi asks whether to **trust** this folder (it has a local
`.pi/settings.json` + extension). Approve it — that's what lets the slipbox tools
load.

Then talk to the agent:

1. **Check the environment**

   > check the slipbox environment

   The agent runs `slipbox_doctor` and reports which tools are installed (qmd is
   required; pandoc/yt-dlp/ffmpeg/whisper are optional for other formats later).

2. **Ingest the sample source**

   > ingest inbox/on-note-systems.md

   The agent runs `slipbox_ingest`: it writes a raw copy to `sources/` and a
   reference record to `references/`, indexes + embeds with QMD, reads the chunk
   vectors, and clusters the ideas. For this essay expect **~3 chunks → 2 idea
   clusters**. It reports the clusters with excerpts.

3. **Write the notes**

   > write a literature note for each cluster, then a reference note

   The agent writes one atomic **literature note** per cluster (in your words,
   per the house style in `.slipbox`) via `slipbox_write_note`, then a
   source-level **reference note** via `slipbox_write_reference_note`.

4. **Explore**

   > what's in the slipbox now?      (runs slipbox_status)
   > search the slipbox for "atomic notes"   (runs slipbox_search)

## What you should end up with

```
sources/<id>.md              raw extracted text (what QMD chunked)
references/<id>.md           the source record + metadata
literature-notes/<id>.md     one atomic idea each, linked to the reference
reference-notes/<id>.md      whole-source summary linking its literature notes
.qmd/index.sqlite            QMD's index (rebuildable cache)
```

Open the markdown files — they're yours, plain and portable.

## Reset

```bash
rm -rf sources references reference-notes literature-notes permanent-notes maps .qmd
```

## Troubleshooting

- **Slipbox tools don't appear / extension didn't load.** Pi resolves the
  `extensions`/`skills` paths in `.pi/settings.json` relative to this folder. If
  your Pi build resolves them differently, switch them to absolute paths:
  ```json
  {
    "extensions": ["/Users/zacharyfleischmann/projects/agents/slipbox-harness/packages/core/src/extension.ts"],
    "skills": ["/Users/zacharyfleischmann/projects/agents/slipbox-harness/packages/core/skills"]
  }
  ```
  Also make sure you approved the trust prompt.
- **"QMD is not installed".** `npm i -g @tobilu/qmd`, then `qmd pull`.
- **Ingest fails reading vectors.** Ensure Node ≥22 (`node --version`); the
  vector reader runs under `--experimental-sqlite`.
- **The index went somewhere unexpected.** The harness sets `PWD` so `.qmd/`
  lands here. If you ran `qmd` by hand from another directory, its global index
  (`~/.cache/qmd`) may hold a stray collection — `qmd collection list`.
