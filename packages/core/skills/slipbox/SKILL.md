---
name: slipbox
description: Use when building or maintaining a Zettelkasten slipbox — ingesting a source (book, article, video, podcast, PDF) and turning it into flat-markdown reference, literature, permanent notes and maps of content. Explains the method and which slipbox tools to call.
---

# Slipbox (Zettelkasten) workflow

This slipbox stores everything as **flat markdown**. Notes are human-owned; you
(the agent) draft and organize, the human keeps, edits, or discards. Read the
slipbox's `.slipbox` config first — it defines paths, embedding/chunking
settings, and house style. Follow the house style.

## Note types (keep them distinct)

- **Reference** — the source itself + bibliographic metadata. One per source.
- **Reference note** — a summary of a whole source.
- **Literature note** — ONE atomic idea from a source, restated in your own
  words, linked to its reference and supporting chunk(s). Never a dump.
- **Permanent note** — a refined, self-contained idea connected into the wider
  network. The point of the slipbox. (Phase 5 — do deliberately.)
- **Map of Content (MOC)** — an index note gathering + summarizing a topic
  cluster and linking to its notes. (Phase 4.)

## Ingesting a source (Phase 1 pipeline)

Indexing, embedding, and search are done by **QMD** (an external tool, like
yt-dlp/ffmpeg). Confirm `qmd` and any needed extraction CLI are installed before
starting; if not, tell the user how to install them (`slipbox_doctor`).

1. **Extract** the source to markdown + metadata (title, author, date) using the
   right CLI for its format (pandoc, yt-dlp, whisper, …). Write it into the
   slipbox as a reference.
2. **Index + embed** via QMD (`qmd update` + `qmd embed`) — QMD chunks and
   embeds; do not build your own chunker/embedder.
3. **Cluster** the chunk vectors by similarity — each cluster is a candidate
   idea. (Harness-owned step.)
4. **Write literature notes** — one atomic idea per cluster, in the user's
   words, linked to the reference and the chunks it came from.
5. **Re-index** so the new literature notes are searchable (`qmd update`/`embed`).
6. **Write the reference note** — a source-level summary linking to its
   literature notes.

Prefer running the pipeline step-by-step with human review at the seams rather
than one silent batch. Show what you found before writing many files.

## Rules

- Flat markdown only. YAML frontmatter + `[[wikilinks]]`. Never invent a DB.
- QMD's index (`.qmd/`) is a rebuildable cache — safe to delete and regenerate
  via `slipbox_reindex`; never the source of truth.
- One idea per literature/permanent note. Split, don't cram.
- Always link a note back to where it came from.
- When unsure whether to keep a draft, ask.

## Tools

Use the `slipbox_*` tools rather than hand-rolling files:

- `slipbox_doctor` — check qmd + extractor CLIs; guide the user to install any gaps.
- `slipbox_ingest(source)` — extract → index/embed → cluster; returns idea
  clusters (with excerpts + chunk seqs) for you to write notes from.
- `slipbox_write_note(title, body, source, …)` — write ONE literature note per
  cluster, in the user's words, linked to the source reference.
- `slipbox_write_reference_note(reference, title, summary, literature_links)` —
  the source-level summary, after the literature notes exist.
- `slipbox_search(query, mode?)` — find related notes (query/vsearch/search).
- `slipbox_reindex()` — rebuild the index after hand edits.
- `slipbox_status()` — counts by type + index/tool readiness.

Typical flow: `slipbox_doctor` → `slipbox_ingest` → review clusters →
`slipbox_write_note` per cluster → `slipbox_write_reference_note`. (Planned:
`slipbox_moc`, permanent-note promotion — not built yet.)
