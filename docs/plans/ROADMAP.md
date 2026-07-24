# Roadmap & status

Living status across the 5 project phases (see PROJECT.md) and the Phase-1
milestones (PHASE1.md). Updated 2026-07-24.

## Phase status

| Phase | State |
| --- | --- |
| 1. Build the slipbox (ingest → notes) | **DONE.** All Phase-1 milestones complete; any source format → notes. |
| 2. Render the slipbox (localhost explorer) | **DONE.** `slipbox serve` / `slipbox build` in `@slipbox/web`. See `plans/PHASE2_EXPLORER.md`. |
| 3. Skills & tools for search + curation | Partial: `slipbox_search`, `slipbox_status`, `slipbox_sources`, `slipbox_feed`. Curation (dedup/merge/prune/refine) not started. |
| 4. Maps of Content | Not started (needs two-level "theme" grouping over clusters). |
| 5. Permanent notes | Not started. |

## Phase-1 milestones — all complete

- **M0 — walking skeleton: DONE.** ingest `.txt`/`.md` → clean → QMD index/embed →
  average-linkage cluster → `read_cluster` → literature notes → one reference
  (metadata + summary + links) → `autolink`. Plus the `slipbox` CLI, `/init`,
  `/tutor`, `slipbox_sources`, doctor/status/reindex.
- **M1 — review UX / flags: DONE.** Review-at-the-seams is the default; `slipbox
  --yolo` (or `slipbox_ingest(yolo: true)`) runs the pipeline one-shot through to
  the reference note. `slipbox_status` reports the active mode.
- **M2 — source formats: DONE.** `slipbox_ingest` accepts files *and* URLs; every
  extractor tested end-to-end. See `docs/FORMATS.md`.
- **M3 — clustering quality: DONE.** Average-linkage (fixed the 219-singleton
  problem), Gutenberg cleaning, tuned cutoff, autolink nearest-neighbor guarantee.

Phase-1 definition of done (from PHASE1.md) is met: ingest → reference + literature
notes + summary; step-by-step **or** one-shot; `slipbox_doctor` readiness with
graceful degradation; rebuildable index via `slipbox_reindex`.

## M2 — source formats (complete)

Each extractor follows "guide-don't-bundle": detect a local CLI, shell out, and
fail with a one-line install hint if it's missing (`slipbox_doctor` inventories
them). `slipbox_ingest` accepts a `sources/` filename OR an `https://` URL; feeds
are triaged with the new `slipbox_feed` tool.

| Source | External tool | Status |
| --- | --- | --- |
| Book (txt/md) | — | ✅ done |
| PDF | pdftotext + pdfinfo (poppler) | ✅ tested (AI corpus) |
| epub / docx / html / odt / rtf | pandoc | ✅ tested (epub) |
| Web article (URL) | trafilatura | ✅ tested |
| YouTube (URL) | yt-dlp | ✅ tested (transcript) |
| RSS / Atom feed | — (native fetch) | ✅ tested (RSS + Atom) |
| Audio / podcast | whisper (+ ffmpeg) | ✅ tested (60s clip → 16s, accurate) |

Chunking/clustering already works on any text, so once a format lands as clean
markdown, the rest of the pipeline is free. Spoken-word transcripts (podcasts,
talks) may want lighter cleaning + different cluster tuning — worth watching.

URL sources additionally pin a **Wayback snapshot** (`archived` + `archived_date`
on the reference) so notes survive the live page changing. Best-effort and
non-fatal; see `docs/FORMATS.md`.

## Phase 2 — the explorer (complete)

`slipbox serve` runs a live-reloading local site; `slipbox build` exports it as
static files for Vercel, GitHub Pages, or any static host. The app ships inside
`@slipbox/web` and runs from a hidden working copy, so nothing is scaffolded into
the user's slipbox. Templates exist for all four note types, plus a recent-notes
home feed, a source index, client-side search, and an interactive graph. Design is
serif prose on a ~68ch measure, light/dark following the OS. Full design record in
`plans/PHASE2_EXPLORER.md`.

## Known issues

- **URL captures are double-indexed.** A URL source's `sources/<id>.md` capture is
  indexed alongside its `sources/extracted/` copy. Search-only noise — clustering,
  `read_cluster`, and autolink all filter to `extracted/`/`literature-notes/`, so
  generated notes are unaffected. Fix = scope the QMD collection to the content
  dirs (QMD spans multiple named collections) or relocate captures; deferred
  because it touches the locked single-collection index design.

## Later (rough order)

1. **Phase 4 MOCs** — theme-level grouping over clusters. *Next up.* The explorer
   already has a MOC template waiting for content.
2. **Phase 3 curation** — dedup / merge / prune / refine tools.
3. **Phase 5 permanent notes** — the literature→permanent promotion workflow.
   (The explorer's permanent-note template is likewise ready.)

## Example corpora

Each example is its own repo in the `slipboxmd` org (`example-*`), mounted as a
submodule at `examples/<name>`. The repo is a complete, runnable slipbox (config +
sources + notes):

| Example | Repo | State |
| --- | --- | --- |
| odyssey | `example-odyssey` | ✅ corpus complete (public-domain scholarship); no notes yet |
| ai | `example-ai` | ✅ 40-paper corpus; 9 literature notes from 3 papers |
| sv-titans | `example-sv-titans` | ◑ 5 of ~14 authors acquired (182 files); 9 authors to go |
