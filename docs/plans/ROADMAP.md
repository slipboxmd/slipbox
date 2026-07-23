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
- **M2 — source formats: NEXT (not started).** Only `.txt`/`.md` today.
- **M3 — clustering quality: DONE.** Average-linkage (fixed the 219-singleton
  problem), Gutenberg cleaning, tuned cutoff, autolink nearest-neighbor guarantee.

## What's next: M2 — source formats

This is the priority, and it's exactly what the example slipboxes below need. Each
extractor follows "guide-don't-bundle": detect a local CLI, guide the user to
install it if missing, shell out. `slipbox_ingest` also needs to accept **URLs**
(fetch), not just files in `sources/`.

| Source | Extractor approach | External tool |
| --- | --- | --- |
| Book (txt/md) | passthrough + clean | — (done) |
| PDF | `pdftotext` (poppler) or a TS lib | pdftotext |
| epub / docx | pandoc → markdown | pandoc |
| Web article (URL) | fetch + readability → markdown | — (TS) or pandoc |
| YouTube | subtitles/transcript | yt-dlp |
| RSS feed | parse feed → each item = a web article | — (TS) + web extractor |
| Audio / podcast | download + transcribe | yt-dlp + whisper |

Chunking/clustering already works on any text, so once a format lands as clean
markdown, the rest of the pipeline is free. Spoken-word transcripts (podcasts,
talks) may want lighter cleaning + different cluster tuning — worth watching.

## Later (rough order)

1. **M2 formats** (above) — unblocks the example slipboxes.
2. **Phase 2 explorer** — localhost site rendering the backlink graph + note pages.
3. **Phase 4 MOCs** — theme-level grouping over clusters.
4. **Phase 3 curation** — dedup / merge / prune / refine tools.
5. **Phase 5 permanent notes** — the literature→permanent promotion workflow.
