# Phase 1 — Build the slipbox (ingestion pipeline)

> **STATUS: COMPLETE (2026-07-24).** All four milestones shipped and the definition
> of done below is met. This document is kept as the design record; where the built
> system diverged from the original plan, the divergence is noted inline. Current
> status lives in `ROADMAP.md`.

Goal: **given a source, the harness produces flat-markdown literature notes and a
reference note, using QMD for chunk/embed/search and clustering the vectors
ourselves.** Everything the user keeps is plain markdown they own.

This plan is sequenced as a **walking skeleton first** (thinnest end-to-end path),
then widened. Each milestone is independently demoable. Decisions from
`ARCHITECTURE.md` are assumed; sub-decisions left open there are pinned here.

## Definition of done (Phase 1)

Running Pi with `pi-slipbox` in a slipbox dir, the agent can:
1. `ingest <source>` → writes a `reference`, N `literature-notes` (one idea each,
   linked to the reference + supporting chunks), and a whole-source summary.
   *(Shipped beyond plan: any format — PDF/epub/docx/html/audio — plus URLs.
   Divergence: the summary lands on the **same** reference file rather than a
   separate `reference-note`; see "Note types" below.)*
2. Do this **step-by-step with review** (default) or **one-shot** (`--yolo`).
3. Report tool/model readiness via `slipbox_doctor`; degrade gracefully when an
   extractor is missing (`MissingToolError` carries the install hint).
4. Rebuild the QMD index from markdown at any time (`slipbox_reindex`).

Out of scope for Phase 1: rendering (P2), curation tools (P3), MOCs (P4),
permanent notes (P5), non-text source formats beyond a first couple.

## Pinned sub-decisions

- **Vector access:** reuse QMD vectors via `node:sqlite` + `sqlite-vec` in a
  subprocess (`--experimental-sqlite`). (ARCHITECTURE O9.)
- **Clustering (O4b):** ~~connected-components over a cosine-kNN graph~~ →
  **superseded in M3 by average-linkage (UPGMA)**, default threshold 0.64.
  Connected-components chained transitively and produced 219 singletons on a book;
  average-linkage fixed it. Still deterministic, no `k`, no native dep.
- **QMD integration (O8):** wrap the `qmd` **CLI** (`--json`) in our tools for
  Phase 1. MCP later.
- **Note authoring:** the **Pi agent's own LLM** writes the notes (we give it the
  cluster's chunk texts + house style via a tool that returns structured
  material). We do NOT call a separate LLM API — stay minimal.

## Module layout (`src/`)

```
src/
  extension.ts          # entry: registers tools/commands, loads config, injects context
  config/
    slipbox-config.ts   # find + parse .slipbox (frontmatter + house style)
  env/
    detect.ts           # which/version checks for qmd, pandoc, yt-dlp, ffmpeg, whisper
    guide.ts            # install/usage guidance strings per tool + OS
  qmd/
    cli.ts              # thin wrapper over `qmd` (init/update/embed/search/get) via pi.exec
    vectors.mjs         # subprocess reader: node:sqlite + sqlite-vec → chunk {id,vec,text,doc}
    vectors.ts          # spawn vectors.mjs, parse JSON
  extract/
    index.ts            # dispatch by source type → { markdown, metadata }
    text.ts             # txt/markdown passthrough (M0)
    pdf.ts              # pdf → text via pdftotext/pdfinfo (M2)
    doc.ts              # epub/docx/html/odt/rtf via pandoc (M2)
    web.ts              # web article URL via trafilatura (M2)
    youtube.ts          # youtube URL → transcript via yt-dlp (M2)
    audio.ts            # audio file → transcript via whisper (M2)
    rss.ts              # RSS/Atom feed parsing (native) (M2)
    archive.ts          # Wayback snapshot pinning for URL sources (M2)
    exec.ts             # runTool() + MissingToolError install guidance (M2)
  pipeline/
    cluster.ts          # average-linkage (UPGMA) over cosine distances (normalize first)
    ingest.ts           # orchestrates the full pipeline (step-by-step + one-shot)
  notes/
    write.ts            # frontmatter + body writers (reference, literature, source capture)
    ids.ts              # stable id/slug generation
    links.ts            # [[wikilink]] helpers
  tools/
    doctor.ts  ingest.ts  search.ts  reindex.ts  status.ts   # registerTool defs
  util/
    slug.ts  frontmatter.ts  fs.ts
```

Runtime deps kept minimal: `sqlite-vec` (loadable binary), a YAML parser, a
frontmatter/markdown helper. `@earendil-works/pi-coding-agent` + `typebox` are
peer/provided.

## Milestones

### M0 — Walking skeleton: text file → literature notes (end-to-end) — DONE
The thinnest path that touches every stage. Prove it, then widen.
- `config/slipbox-config.ts`: locate `.slipbox` from cwd upward; parse; defaults.
- `env/detect.ts` + `tools/doctor.ts`: detect `qmd`; print guidance if missing.
- `extract/text.ts`: read a `.txt`/`.md` file → `{ markdown, metadata }`.
- `notes/write.ts`: write the **reference** file (frontmatter + source metadata).
- `qmd/cli.ts`: `init` (if needed) + register collection + `update` + `embed`.
- `qmd/vectors.*`: read chunk vectors+text for the reference doc.
- `pipeline/cluster.ts`: normalize + kNN-cosine graph + connected components.
- `pipeline/ingest.ts`: for each cluster, hand the agent the chunk texts and ask
  it to draft one literature note; write approved notes with links back to the
  reference + chunk positions.
- `notes` for the **reference-note**: agent summarizes the source, links its
  literature notes.
- **Demo:** `ingest ./docs/some-essay.md` → reference + literature notes +
  reference note appear as markdown; `qmd query` finds them.

### M1 — Review UX + one-shot flag + status — DONE
- Step-by-step gating using `ctx.ui` (show candidate clusters/notes, confirm
  before writing). `--yolo` flag runs straight through.
- `tools/status.ts`: counts by type, orphans (notes with no links), QMD index
  freshness, missing tools.
- `tools/reindex.ts`: `qmd update && qmd embed` wrapper.
- Inject `.slipbox` house style into agent context (the `context` event).

### M2 — Widen source formats (guided extractors) — DONE (see docs/FORMATS.md)
- `extract/pdf.ts` (TS lib or `pdftotext`), `extract/html.ts`/article, then
  `epub` (pandoc), `youtube` (yt-dlp subs/audio), `audio` (ffmpeg + whisper).
- Each: detect the needed CLI; if absent, `guide.ts` tells the user exactly how
  to install it and what it unlocks; skip that source type gracefully.

### M3 — Quality pass on clustering + notes — DONE
- Tune chunk→cluster (threshold, kNN, min-cluster-size from `.slipbox`).
- De-dupe near-identical literature notes; link related literature notes.
- Optional: swap connected-components for HDBSCAN-js if quality warrants.

## Key interfaces (sketch)

```ts
// extract
type Extracted = { markdown: string; metadata: SourceMeta };
type SourceMeta = { title?: string; author?: string; date?: string;
                    kind: 'text'|'markdown'|'pdf'|'epub'|'html'|'web'|'youtube'|'audio'|'feed';
                    origin: string /* path or url */;
                    archived?: string; archived_date?: string /* Wayback snapshot (URL sources) */ };
interface Extractor { supports(src: string): boolean; extract(src: string): Promise<Extracted>; }

// qmd vector read (subprocess output)
type Chunk = { docPath: string; seq: number; pos: number; totalChunks: number;
               text: string; vector: number[] /* 768, raw */ };

// clustering
type Cluster = { id: string; chunks: Chunk[]; centroidTerms?: string[] };
function cluster(chunks: Chunk[], opts: { threshold: number; minSize: number }): Cluster[];  // average-linkage

// notes
interface NoteWriter {
  writeReference(meta: SourceMeta, body: string): Promise<NoteRef>;
  writeLiterature(input: { idea: string; body: string; source: NoteRef;
                           chunks: {seq:number;pos:number}[]; tags: string[] }): Promise<NoteRef>;
  // Divergence from plan: the summary + literature links are written back onto the
  // SAME reference file created at ingest — there is no separate reference-note file.
  updateReference(input: { reference: string; summary: string; literatureLinks: string[] }): Promise<NoteRef>;
}
type NoteRef = { id: string; path: string; wikilink: string };
```

## Note file formats

Literature note (see SLIPBOX_SPEC.md for the full example):

```markdown
---
id: 20260722T1043-<slug>
type: literature-note
title: <one-line idea>
source: "[[references/<ref-id>]]"
chunks: [3, 4]           # QMD seq indices in the source
tags: [<lowercase-hyphen>]
links: []
created: 2026-07-22
---
<one atomic idea, in the user's words, per house style>
```

Reference frontmatter carries `type: reference`, `title/author/date`, `origin`,
`kind`, `created`, `links:` to its literature notes, and — for URL sources —
`archived`/`archived_date` (Wayback snapshot). Its body is the whole-source
summary. **There is no separate reference-note file:** metadata, summary, and links
live in this one file per source.

## Testing strategy

- Unit: config parsing, id/slug, frontmatter round-trip, cluster() on synthetic
  vectors (known groups), `qmd/cli` arg building, `vectors.mjs` join on a fixture
  `.qmd/index.sqlite`.
- Integration (opt-in, needs qmd + models): ingest a small fixture markdown file
  end-to-end; assert reference + ≥1 literature note + reference note exist and
  link correctly, and `qmd query` returns them.
- Keep an env guard so unit tests run in CI without qmd/models installed.

## First actions (M0, in order)

1. Resolve `sqlite-vec` binary location strategy (bundle dep vs locate QMD's).
2. `config/slipbox-config.ts` + a real `examples/` slipbox dir to test against.
3. `qmd/cli.ts` + `qmd/vectors.*` (port the verified spike queries).
4. `pipeline/cluster.ts` (+ unit test on synthetic vectors).
5. `pipeline/ingest.ts` wiring + `tools/ingest.ts` + `tools/doctor.ts`.
6. End-to-end demo on a sample essay; iterate on note quality.
