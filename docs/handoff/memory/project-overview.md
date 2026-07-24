---
name: project-overview
description: "What pi-slipbox is, its core design decisions, and where the planning docs live"
metadata: 
  node_type: memory
  type: project
  originSessionId: e37be9fc-7e8a-4183-9a47-02177ba68808
---

`pi-slipbox` is a **Pi.dev harness distributed via npm** that builds/maintains a
Zettelkasten slipbox (references, reference notes, literature notes, permanent
notes, MOCs) from any source, stored as **flat markdown**. Modeled on the sibling
`../prometheus` and `../llm-slipbox` projects, but flat-markdown + Pi/TS instead
of Python/Postgres.

Locked decisions (detail in `docs/ARCHITECTURE.md`): pure TypeScript, minimal
package; **QMD** (`@tobilu/qmd`) owns chunk/embed/index/search; external tools
(qmd, pandoc, yt-dlp, ffmpeg, whisper) are **detected + guided, never bundled**;
embeddings model is user's choice via QMD; ingestion is flag-controlled
(step-by-step default, `--yolo` one-shot). Clustering of QMD's chunk vectors is
the harness's job (read via `node:sqlite`+`sqlite-vec`, no native dep — verified).

**Monorepo (pnpm + turbo, like ../prometheus):** `packages/core` (`@slipbox/core`)
holds nearly everything (ingestion, notes, linking, search). `packages/cli` (npm
name `slipbox`) is a standalone branded launcher over the Pi SDK — run `slipbox`
in any folder; reuses the user's Pi login via `getAgentDir()` (~/.pi/agent); has a
`/init` command to scaffold a folder into a slipbox. M0 pipeline works end-to-end;
tools: slipbox_doctor/ingest/write_note/write_reference_note/search/reindex/status. Future *consumer*
packages split out — MOC generation, writing, study guides, spaced-repetition,
explorer web app — building toward a plugin ecosystem where users publish their
own slipbox packages. Scoped `@slipbox/*` names. Restructure planned before M0
code. Detail in `docs/plans/MONOREPO.md`.

Key docs: `docs/PROJECT.md` (vision + 5-phase scope), `docs/ARCHITECTURE.md`
(design + decisions D0–D6 + open items O-numbers), `docs/PI_HARNESS_REFERENCE.md`,
`docs/SLIPBOX_SPEC.md`, `docs/plans/SPIKE_QMD.md` (QMD facts), `docs/plans/PHASE1.md`
(build plan), `docs/plans/MONOREPO.md`. See [[working-style]].
