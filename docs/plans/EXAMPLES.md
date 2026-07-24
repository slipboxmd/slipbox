# Example slipboxes (plan)

A set of sample slipboxes under `examples/`, each exercising a different source
format, so we can test how the harness performs across formats and share
runnable demos. Most are **gated on M2 format extractors** (see ROADMAP.md) — the
example and the extractor get built together, the example acting as the test.

## Source-extraction pattern (all formats)

Every source — whatever its format — follows the same `sources/` → `extracted/`
shape:

- **`sources/<item>` — one file per source item.** For local files (PDF, txt,
  epub) it's the original the user drops. For URL-based sources (web page,
  YouTube video, podcast/RSS episode) the harness *generates* a markdown capture:
  frontmatter (url, title, date, author) + the content/transcript. Either way this
  is the human-readable, archival source.
- **`sources/extracted/<id>.md`** — the cleaned body the harness produces for QMD
  to chunk (gitignored, rebuildable).
- **`references/<id>.md`** — metadata + whole-source summary + links (as today).

Per format:

| Format | `sources/<item>` | How extracted |
| --- | --- | --- |
| PDF (paper) | `paper.pdf` (dropped) | pdftotext → `extracted/<id>.md` |
| Web page | `<slug>.md` (generated: url + readable content) | fetch + readability |
| YouTube video | `<slug>.md` (generated: link + metadata + transcript) | yt-dlp |
| RSS / podcast / channel | one `<item>.md` per episode/entry (link + transcript) | per-item; the feed is the entry point, each item becomes a source |
| Book | `book.txt` (dropped) | passthrough + clean (done) |

## Principles

- **No copyrighted payloads in the repo.** Use public-domain / open sources
  (Project Gutenberg, arXiv, CC-licensed, public feeds), or ship a **source
  manifest** (list of URLs) + config + README instead of the files, and let
  ingestion fetch them.
- Each example = `examples/<name>/` with: `.slipbox` (config + house style),
  a `sources/` folder OR a `SOURCES.md` manifest of URLs, and a `README.md`
  explaining the theme, what format it tests, and how to run it.
- Commit a **small sample of generated notes** in each so people can see good
  output without running it (gitignore the `.qmd` index + `sources/extracted/`).

## Scaffolded examples (in `examples/`)

Each is initialized as a slipbox (`.slipbox` + folders) with a `README.md` (what
it covers + how it's built) and a `SOURCES.md` (the tracked source list).

Each example lives in its **own repo** in the `slipboxmd` org (`example-*`) and is
mounted as a git submodule at `examples/<name>`. The repo *is* the slipbox — its
`.slipbox` config, `sources/`, and generated notes all travel together, so anyone
can clone just that example and run `slipbox` in it. It also keeps multi-MB source
texts out of the harness repo's history.

| Example | Theme | Format | Status |
| --- | --- | --- | --- |
| `odyssey/` | Homer's *Odyssey* — translations + commentary | book `.txt` | ✅ corpus complete (`example-odyssey`) |
| `ai/` | The LLM & AI field — foundational papers | PDF | ✅ 40-paper corpus (`example-ai`) |
| `sv-titans/` | Founder-essayists on building startups | web + PDF | ◑ 5 of ~14 authors acquired (`example-sv-titans`) |
| `classics/` | Christian thought & theology | book `.txt` | to move from `slipbox-test` (8 books + notes) |
| `tools-for-thought/` | essays on thinking tools / note-taking | web | not started (extractor ready) |
| `diary-of-a-ceo/` | the whole podcast | RSS / audio | not started (extractors ready); large — feed only, transcripts gitignored |

All M2 extractors now exist, so no example is blocked on format support.

## Decisions

- **`classics/` ships the full slipbox** — all 8 Gutenberg books + every generated
  note (move `slipbox-test` here when the batch finishes). ~5 MB; gitignore the
  `.qmd` index + `sources/extracted/`.
- **Build formats later** — we picked themes/sources first, then built the
  extractor + its example together. *(Done: all M2 formats shipped 2026-07-24.)*
- **Corpora live in their own repos** (`slipboxmd/example-*`) as submodules, so
  multi-MB source texts never enter the harness repo's history.

## Concrete theme + source proposals (to confirm together)

Each example wants ONE coherent theme so clustering + cross-note links are
meaningful. Proposals — swap freely:

- **`classics/`** — *Christian thought & theology* (already running):
  Augustine's *Confessions* + *City of God*, Talmage *Jesus the Christ*, *Life of
  St. Francis*, Chesterton *The Man Who Was Thursday*, Maclaren *Expositions of
  Holy Scripture*, Besant *Esoteric Christianity*, Gibbons *The Faith of Our
  Fathers*. (Gutenberg, public domain.)
- **`papers/` (PDF)** — *LLM agents & retrieval*: a handful of open arXiv papers
  (e.g. Attention Is All You Need, ReAct, RAG, Toolformer, a survey). Relevant +
  coherent + openly downloadable.
- **`reading-list/` (web)** — *tools for thought / note-taking*: essays from
  gwern, Andy Matuschak, Sönke Ahrens-adjacent pieces, Maggie Appleton, etc.
  (meta and fitting for a slipbox). Alt: Paul Graham essays (clean, coherent).
- **`feed/` (RSS)** — one active tech/thinking blog's feed, e.g. Simon Willison
  (simonwillison.net — great feed, LLM/tools focus).
- **`podcast/` (YouTube)** — 2-3 episodes of one AI podcast with good transcripts
  (e.g. Dwarkesh Patel or Latent Space) on a shared theme.
- **`talks/` (audio)** — defer (highest effort); a public/CC lecture later.

## Proposed set

| Example | Format | Sources | Tests | Needs |
| --- | --- | --- | --- | --- |
| `classics/` | book (.txt) | The Confessions, City of God, Jesus the Christ, The Man Who Was Thursday, St. Francis, … (Gutenberg) | large-book ingest, clustering, **cross-book linking** | ✅ works today (move `slipbox-test` here) |
| `papers/` | PDF | a few open-access arXiv papers on one topic | PDF extraction, dense academic prose, references | PDF extractor |
| `podcast/` | YouTube | a few episodes of one podcast (good transcripts) | transcript extraction, spoken-language clustering | yt-dlp |
| `reading-list/` | web articles | a curated URL list on a theme (e.g. essays) | HTML→article, varied authors, dedup | web/URL extractor |
| `feed/` | RSS | one blog's feed URL | feed → per-article ingest, incremental | RSS + web extractor |
| `talks/` | audio | a public/CC talk or podcast audio | transcription pipeline | yt-dlp + whisper |

## Build order (couples examples to M2)

1. **`classics/`** — do now: move the running `slipbox-test` here as the first
   real example (books already work). Decide whether to ship all sources or a
   curated 2–3 + the rest as Gutenberg ids in `SOURCES.md`.
2. **`papers/` (PDF)** — likely the highest-value next format.
3. **`reading-list/` (web)** — enables `feed/` (RSS) which reuses it.
4. **`podcast/` (YouTube)** → **`talks/` (audio)** — transcript then transcription.

## Open questions

- **URL ingestion:** `slipbox_ingest` currently resolves files in `sources/`. Web
  / YouTube / RSS / PDF-by-URL need it to accept URLs (fetch → extract). Design
  this as part of M2.
- **Themes:** pick a coherent topic per example so the clustering + cross-note
  links are meaningful (a grab-bag clusters poorly). Candidates to choose per
  example with the user.
- **Repo size:** the `classics/` books are ~5 MB of `.txt`; ship all, a subset,
  or by-URL manifest?
