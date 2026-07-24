# Roadmap & status

Living status across the 5 project phases (see PROJECT.md) and the Phase-1
milestones (PHASE1.md). Updated 2026-07-23.

## Phase status

| Phase | State |
| --- | --- |
| 1. Build the slipbox (ingest → notes) | **Working for text sources.** Formats are the gap. |
| 2. Render the slipbox (localhost explorer) | Not started. Reference-note frontmatter `links:` + note `source:`/`links:` already give the backlink graph it will render. |
| 3. Skills & tools for search + curation | Partial: `slipbox_search`, `slipbox_status`, `slipbox_sources`. Curation (dedup/merge/prune/refine) not started. |
| 4. Maps of Content | Not started (needs two-level "theme" grouping over clusters). |
| 5. Permanent notes | Not started. |

## Phase-1 milestones

- **M0 — walking skeleton: DONE.** ingest `.txt`/`.md` → clean → QMD index/embed →
  average-linkage cluster → `read_cluster` → literature notes → one reference
  (metadata + summary + links) → `autolink`. Plus the `slipbox` CLI, `/init`,
  `/tutor`, `slipbox_sources`, doctor/status/reindex.
- **M1 — review UX / flags: partial.** Agent drives the pipeline step-by-step
  with the human in the loop; no explicit one-shot `--yolo` flag yet.
- **M2 — source formats: FIRST PASS BUILT (pending joint testing).** `slipbox_ingest`
  now accepts files *and* URLs; per-format extractors below. See `docs/FORMATS.md`.
- **M3 — clustering quality: DONE.** Average-linkage (fixed the 219-singleton
  problem), Gutenberg cleaning, tuned cutoff, autolink nearest-neighbor guarantee.

## M2 — source formats (first pass)

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
| Audio / podcast | whisper (+ ffmpeg) | ⚠️ built, not yet run (whisper not installed here) |

Chunking/clustering already works on any text, so once a format lands as clean
markdown, the rest of the pipeline is free. Spoken-word transcripts (podcasts,
talks) may want lighter cleaning + different cluster tuning — worth watching.

**Open item for joint review:** URL sources write a `sources/<id>.md` capture that
is currently double-indexed alongside its `sources/extracted/` copy (search noise
only; clustering/linking are unaffected). Fix = scope the QMD collection to the
content dirs or relocate captures — deferred as it touches the locked
single-collection design. Details in `docs/FORMATS.md`.

## Later (rough order)

1. **M2 formats** (above) — unblocks the example slipboxes.
2. **Phase 2 explorer** — localhost site rendering the backlink graph + note pages.
3. **Phase 4 MOCs** — theme-level grouping over clusters.
4. **Phase 3 curation** — dedup / merge / prune / refine tools.
5. **Phase 5 permanent notes** — the literature→permanent promotion workflow.
