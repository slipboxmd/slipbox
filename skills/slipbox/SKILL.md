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
- The derived index (`.slipbox-index/`) is a rebuildable cache — safe to delete
  and regenerate; never the source of truth.
- One idea per literature/permanent note. Split, don't cram.
- Always link a note back to where it came from.
- When unsure whether to keep a draft, ask.

## Tools

Prefer the `slipbox_*` tools (see the harness) over hand-rolling files:
`slipbox_ingest`, `slipbox_search`, `slipbox_link`, `slipbox_cluster`,
`slipbox_moc`, `slipbox_reindex`, `slipbox_status`. (Several are still being
built — check what's registered.)
