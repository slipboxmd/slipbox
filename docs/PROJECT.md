# Project: pi-slipbox

## Vision

A Pi harness that acts as an automated librarian for a personal Zettelkasten.
You hand it a **source** — in any format — and it does most of the slipbox
process for you: extract the text, chunk it, embed it, group ideas by
similarity, and grow a network of **flat-markdown** notes you own and can edit.
The markdown is always the source of truth; the agent is the automation layer.

Modeled on the `prometheus` and `llm-slipbox` projects in the parent directory,
but re-cast as a distributable Pi package (npm) with flat-markdown storage
instead of a database.

## Sources (any format)

The harness should accept sources of many kinds and normalize them to text +
metadata before the pipeline runs:

- Books — epub, Kindle/azw, PDF, plain text
- Articles — web pages, PDFs
- Video — YouTube (transcript / audio)
- Audio — podcasts, recordings (transcription)

## Note types

- **Reference** — one file per source: bibliographic metadata, the whole-source
  summary, and links to the literature notes drawn from it. *(As built, this
  absorbed the originally-planned separate "reference note" — metadata and summary
  live in the same file.)*
- **Literature note** — one atomic idea from a source, in your own words,
  linked back to the reference and the supporting chunk(s).
- **Permanent note** — a refined, self-contained idea woven into the network.
- **Map of Content (MOC)** — an index note gathering + summarizing a topic
  cluster and linking to its notes.

## Scope & phases

Ordered by priority. **Phase 1 is the goal to reach ASAP;** the rest we build
over time and design together.

### 1. Build the slipbox (the ingestion pipeline) — FIRST

Given a source: extract text → chunk → create embeddings → group vectors by
similarity → turn clusters into **literature notes** → embed the literature
notes → create **reference notes**. Everything written as flat markdown.

### 2. Render the slipbox

A local website (localhost) for navigating the slipbox, wiki-style — browse
notes, follow `[[links]]`, explore the graph. There's an existing static-site
generator for slipboxes / digital gardens we may model on (name TBD). Design
this together.

### 3. Skills & tools for search and curation

Agent + human tooling to search, surface, dedupe, refine, and prune notes.

### 4. Maps of Content

Identify a grouping of literature notes and organize them into an MOC markdown
file: a topic summary that links out to the relevant notes.

### 5. Permanent notes

The hardest and most valuable step. Requires reviewing the Zettelkasten process
for turning literature notes into permanent, self-contained, interconnected
notes. Design deliberately.

## Principles

- **Flat markdown, always.** YAML frontmatter + `[[wikilinks]]`. Human-owned,
  portable, git-friendly. Any vector/search index is a rebuildable cache.
- **Harness automates, human curates.** The agent drafts; the human keeps,
  edits, merges, or discards. Nothing is precious until a human blesses it.
- **Distributable.** Ships via npm as a Pi package; works in any directory that
  has a `.slipbox` config.
- **Lean on local tools, don't rebuild them.** Indexing/embedding/search is
  delegated to [QMD](https://github.com/tobi/qmd); extraction to CLIs
  (pandoc/yt-dlp/ffmpeg/whisper). The harness detects and guides, never bundles.
- **Methodology-faithful.** Follows the Zettelkasten literature→permanent note
  distinction rather than dumping summaries.

## Prior art in this workspace

- `../prometheus` — Python agent (`adam`) + Next.js + Postgres/pgvector; tools
  for ingest, chunk, cluster, connect, reference, literature. Our pipeline
  mirrors its stages but targets flat markdown and a Pi/TS harness.
- `../llm-slipbox` — the same pipeline stated abstractly: index → cluster →
  summarize → connect → map.
