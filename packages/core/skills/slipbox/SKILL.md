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

- **Reference** — one file per source (in `references/`): its bibliographic
  metadata, a whole-source summary, and links to the literature notes drawn from
  it. (There is no separate "reference note" file — it's all this one file.)
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

   **A source is either a file or a URL.**
   - **Files** live in the slipbox's `sources/` folder. To see what's available,
     call `slipbox_sources` (it lists each file with its title) — don't hunt with
     find/grep. Then call `slipbox_ingest` with the filename. Supported file types:
     `.txt`/`.md`, `.pdf`, `.epub`/`.docx`/`.html`/`.odt`/`.rtf`, and audio
     (`.mp3`/`.m4a`/`.wav`/…). If a source isn't in `sources/`, ask the user to drop
     it there.
   - **URLs** are ingested directly — pass the full `https://…` URL to
     `slipbox_ingest`. A web-page URL is read as an article; a YouTube URL is read
     as its transcript. The harness fetches it and archives a markdown **capture**
     into `sources/` (the source of record), so URL sources don't need a local file.
   - **Feeds** (RSS/Atom for a blog, newsletter, or podcast) are NOT one source —
     call `slipbox_feed(url)` to list recent items, then ingest the worthwhile ones
     individually by their links.

   The harness always writes its own cleaned copy under `sources/extracted/` —
   that's derived; never ingest from there.

   Each format needs an external CLI (pdftotext, pandoc, trafilatura, yt-dlp,
   whisper). Run `slipbox_doctor` to see what's installed and what each unlocks;
   guide the user to install any missing one. See `docs/FORMATS.md` for the full
   dependency table.

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
5. **Link the notes** — after writing a source's notes, run `slipbox_autolink`.
   It links the new notes into the network by similarity, across ALL sources
   (not just this one). It's incremental (only the new notes), so it stays cheap
   as the slipbox grows; use `relink_all` only for a deliberate full re-link.
6. **Re-index** so the new notes are searchable (`slipbox_reindex`).
7. **Fill in the reference** — `slipbox_write_reference_note` adds the
   whole-source summary + links to the literature notes onto the one reference
   file created at ingest (it does not create a second file).

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
- `slipbox_ingest(source)` — extract → index/embed → cluster; `source` is a file in
  `sources/` (by name) OR an `https://` URL (web article or YouTube). Returns idea
  clusters (with excerpts + chunk seqs) for you to write notes from.
- `slipbox_feed(url)` — list recent items in an RSS/Atom feed to triage, then
  ingest chosen items by their links.
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
