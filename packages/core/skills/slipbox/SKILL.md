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

   **Sources live in the slipbox's `sources/` folder.** To ingest, call
   `slipbox_ingest` with the filename (it resolves against `sources/`); don't hunt
   with find/grep. If the file isn't in `sources/`, ask the user to drop it there
   (or move it there) first. The harness writes its own cleaned copy to
   `extracted/` — that's derived; never ingest from `extracted/`.

1. **Extract** — `slipbox_ingest` extracts the source, strips boilerplate, and
   writes a cleaned copy to `extracted/` for QMD. The user's original in
   `sources/` is left untouched.
2. **Index + embed** via QMD (`qmd update` + `qmd embed`) — QMD chunks and
   embeds; do not build your own chunker/embedder.
3. **Cluster** the chunk vectors by similarity — each cluster of related
   passages is a candidate idea. (Harness-owned step; boilerplate like licenses
   is stripped before this.)
4. **Write literature notes** — for each SUBSTANTIVE cluster, first call
   `slipbox_read_cluster` to read the FULL passages (not just the excerpt), then
   write a note that **explains** the idea: the title is one short sentence
   stating the idea; the body summarizes ALL the cluster's passages, describing
   what the author says and means, and **quotes the author's own words** where
   they capture it best (woven in, not a bare list). Explanatory and
   self-contained. Link it to the reference and its chunks. **No fixed count and
   no length target** — a longer source naturally yields more notes; focus on the
   recurring themes, skip thin/repetitive/boilerplate ones, note standout one-offs,
   and don't cram unrelated ideas together.
5. **Link the notes** — once all the literature notes exist, run
   `slipbox_autolink` to connect related notes to each other by similarity, across
   ALL sources in the slipbox (not just this one).
6. **Re-index** so the new notes are searchable (`slipbox_reindex`).
7. **Write the reference note** — a source-level summary linking to its
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
