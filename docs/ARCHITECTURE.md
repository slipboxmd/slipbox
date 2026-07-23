# Architecture (DRAFT — planning)

This is a working draft of how `pi-slipbox` fits together. Sections marked
**OPEN** are decisions to make together before we build. Nothing here is locked.

## The big lever: QMD does the index + embedding + search

[QMD](https://github.com/tobi/qmd) (`@tobilu/qmd`, MIT) is a local, on-device
markdown search engine. It **chunks** markdown (~900 tokens, 15% overlap, smart
heading/code/paragraph boundaries), **embeds** each chunk locally via GGUF models
(node-llama-cpp; model configurable), stores everything in **SQLite** (FTS5 for
BM25 + sqlite-vec for vectors), and searches three ways: `qmd search` (keyword),
`qmd vsearch` (vector), `qmd query` (hybrid RRF + rerank + query expansion). It
has a project-local mode (`qmd init` → `.qmd/index.sqlite`), JSON output, a
Node SDK, and an MCP server.

**We treat QMD exactly like yt-dlp/ffmpeg (per D2): an external, user-installed
dependency the harness detects and drives — never bundled.** This means the
harness does NOT build a chunker, an embedding provider, or a vector store. QMD
is that layer. The harness owns *source extraction* and *Zettelkasten note
semantics* on top of QMD.

## The Phase-1 pipeline

```
source (epub/pdf/url/youtube/audio/…)
   │  [harness] extract via guided CLIs (pandoc/yt-dlp/whisper/…)
   ▼
reference.md + raw extracted text  (flat markdown in the slipbox)
   │  [QMD] qmd update  → FTS5 index
   │  [QMD] qmd embed   → chunk + vector store (sqlite-vec)
   ▼
chunk vectors (owned by QMD's sqlite)
   │  [harness] pull vectors, cluster by similarity      ← see O4 + the vector-access spike
   ▼
idea clusters
   │  [harness + LLM] write one literature note per cluster
   ▼
literature notes (flat markdown, frontmatter + [[links]])
   │  [QMD] re-index/embed the new notes
   │  [harness + LLM] synthesize source-level summary
   ▼
reference note
```

Outputs (all flat markdown):
- one **reference** file for the source + its metadata,
- N **literature notes** (one atomic idea each), linked to the reference and
  their supporting chunks,
- one **reference note** summarizing the whole source.

Search, retrieval, and "find related" throughout Phases 2–5 are just QMD calls
(`query`/`vsearch`/`get`), wrapped in `slipbox_*` tools for slipbox-aware UX.

## Storage layout (proposed)

```
<slipbox root>/
  .slipbox                 # our config (see SLIPBOX_SPEC.md)
  references/              # one file per source + metadata
  reference-notes/         # source-level summaries
  literature-notes/        # atomic ideas
  permanent-notes/         # refined, networked ideas
  maps/                    # MOCs
  sources/                 # (optional) cached raw extracted text per source
  .qmd/                    # QMD's project-local index (index.yml + index.sqlite)
```

`.qmd/` is QMD's derived cache (gitignore the `.sqlite`; the `.yml` may be
committed). Our own markdown is the source of truth; QMD's index is rebuildable
via `qmd update && qmd embed`.

Every note: YAML frontmatter (id, title, type, source, created, tags, links) +
markdown body with `[[wikilinks]]`. IDs stable enough to link against.

## Decisions (locked)

**D0. Minimal, distributable core.** The harness is a small, clean npm package.
It ships the *orchestration + abstractions*, not heavy machinery. It relies on
the user's local environment for the heavy tools and models, and its job is to
**detect what's available and walk the user through installing/running what's
missing** — never to bundle it.

**D1. Pure TypeScript** (resolves O2 → option A). No Python sidecar. Small
dependency footprint.

**D2. External tools are guided, not bundled** (extends D0). Extraction and
transcription lean on local CLIs — `yt-dlp`, `ffmpeg`, `whisper`, `pandoc`, etc.
The harness checks for them, and if absent, tells the user exactly how to get
them and what each is for. Ingestion degrades gracefully by source type based on
what's installed.

**D3. QMD is the index/embedding/search layer** (resolves O1; supersedes the old
"build our own pluggable embedding provider" plan). The harness delegates
chunking, embedding, vector storage, and search to QMD, and treats it as an
external dependency under D2. Embedding model choice lives in QMD's config
(`QMD_EMBED_MODEL` / project `.qmd/index.yml` `models.embed`), so the user still
picks the model — we just don't reimplement the machinery.

**D4. Ingestion automation is flag-controlled** (resolves O6). Default is
step-by-step with human review at the seams; a one-shot/`--yolo` mode runs the
whole pipeline for trusted bulk ingestion.

**D7. Standalone `slipbox` command via the Pi SDK.** Alongside the "load
`@slipbox/core` as a Pi package" mode, we ship a branded `slipbox` binary
(`packages/cli`, npm name `slipbox`). It uses Pi's SDK
(`createAgentSessionRuntime` + `createAgentSessionServices` with
`resourceLoaderOptions.extensionFactories`/`additionalSkillPaths` +
`InteractiveMode`) to launch the TUI preloaded with our extension + skill, and
passes `agentDir: getAgentDir()` (`~/.pi/agent`) so it **reuses the user's
existing Pi login, models, and settings** — Pi deliberately has no way to rename
that dir, which is what makes credential reuse work. A `/init` slash command
(registered by the extension) scaffolds a folder into a slipbox. `@slipbox/core`
therefore exposes a library entry (`exports` → `dist/index.js`: the extension
factory + `skillsDir`) in addition to its `pi` package field.

**D6. Monorepo (pnpm + turbo).** The repo becomes a monorepo (see
docs/plans/MONOREPO.md). `packages/core` (`@slipbox/core`) holds the ingestion
pipeline, note management, linking, and search — nearly everything in this doc.
Future *consumer* capabilities (MOC generation, writing, study guides, spaced-
repetition, the explorer web app) become separate publishable packages, and
ultimately a plugin ecosystem where users distribute their own slipbox packages.
Package names are scoped `@slipbox/*` (resolves O7). Restructure before M0 code.

**D5. What the harness uniquely owns.** Given D3, the harness's real surface is:
(1) **source extraction** — any format → markdown, via guided CLIs; (2)
**Zettelkasten note semantics** — clustering → literature notes → reference notes
→ permanent notes → MOCs, LLM-authored with correct frontmatter/links/house
style; (3) **QMD orchestration** — collection setup + `update`/`embed` lifecycle
+ exposing search to the agent; (4) the **`.slipbox` config** and **skill**.

## OPEN decisions (let's resolve these together)

### O1. Index/search layer — **RESOLVED → D3 (QMD).**

### O2. TypeScript-only vs Python sidecar — **RESOLVED → D1 (pure TS).**

### O3. Embedding provider — **RESOLVED → D3 (QMD owns embeddings; model configurable in QMD).**

### O4. Clustering method
- **Vector access — RESOLVED by the QMD spike (see docs/plans/SPIKE_QMD.md).**
  We reuse QMD's already-computed chunk vectors by reading `.qmd/index.sqlite`:
  join `vectors_vec.hash_seq` (`"<hash>_<seq>"`) → `content_vectors`
  (hash, seq, pos, total_chunks) → `documents`/`content`. Vectors are
  `float[768]`, cosine, **not normalized** (normalize first). Chunk text ≈
  `content.doc.slice(pos, nextPos)` (approximate; QMD chunks overlap ~15%).
  Fallback if we want exact chunk text: own-chunk + QMD `llm.embedBatch`.
- **Clustering algorithm — RESOLVED → average-linkage agglomerative (UPGMA).**
  Single-linkage/connected-components chains badly (on a 281-chunk book: 199
  singletons at cosine 0.75, one 249-blob at 0.65 — no usable middle).
  Average-linkage with a cosine cutoff (~0.64 default, configurable) gives a
  sensible spread (~49 substantive clusters + tail) and isolates boilerplate into
  its own cluster. Implemented in `pipeline/cluster.ts` (NN-array, O(n²) memory,
  guarded at 4000 items). No note quotas — cluster count emerges from the text;
  the agent writes notes for substantive clusters. Boilerplate (Project Gutenberg
  headers/license) is stripped pre-chunk in `extract/clean.ts`. **Future:** a
  two-level "themes → clusters" grouping and per-model cutoff calibration.

### O5. Chunking strategy — **RESOLVED → D3 (QMD chunks: ~900 tok, 15% overlap, smart boundaries).**

### O6. Agent-driven steps vs batch command — **RESOLVED → D4 (both, flag-controlled).**

### O7. Package name & scope — **RESOLVED → D6: scoped `@slipbox/*`; core is `@slipbox/core`.**

### O8. QMD integration: wrap-CLI vs consume-MCP
QMD exposes both a CLI (`qmd query … --json`) and an MCP server (`qmd mcp`). Pi
agents can consume MCP tools directly. Options: (a) wrap `qmd` CLI in our own
`slipbox_*` tools (full control, slipbox-aware framing, consistent UX); (b) point
the agent at QMD's MCP server for raw search + keep our tools only for
slipbox-specific ops; (c) both. Leaning (a) for Phase 1 for a tight, guided UX.

### O9. Runtime vector access without bloating our package — **RESOLVED (spike).**
Reading `vectors_vec` needs a SQLite driver with loadable-extension support to
decode sqlite-vec (`vec_to_json`). **Verified:** Node 22's built-in
**`node:sqlite`** (`DatabaseSync({ allowExtension: true })` + `loadExtension`)
reads QMD's vectors using only the `sqlite-vec` **loadable extension** — no
`better-sqlite3`, no native compile. So our sole runtime dep for this is the tiny
`sqlite-vec` platform binary (`vec0.dylib`/`.so`), which is already present in the
user's QMD install (we can locate it) or add as a small dependency.
**Caveat:** on Node 22, `node:sqlite` needs the `--experimental-sqlite` flag
(unflagged on Node 24+). Since a Pi extension can't set the host's Node flags, run
the vector read as a **subprocess** we launch via `pi.exec('node',
['--experimental-sqlite', reader.mjs, …])`, where we control the flag. Fallbacks
from O9's earlier options remain if needed.

## Tool surface (first sketch)

Built (M0+):
- `slipbox_ingest(source)` — extract + clean → QMD index/embed → average-linkage cluster → ranked idea groups
- `slipbox_read_cluster(source, seqs)` — full passages behind a cluster (so notes are substantive)
- `slipbox_write_note(...)` / `slipbox_write_reference_note(...)` — write literature / reference notes
- `slipbox_autolink({max_per_note, threshold})` — link literature notes to each other by similarity, across all sources
- `slipbox_search(query, {mode, k})` — wraps `qmd query`/`vsearch`/`search --json`
- `slipbox_reindex()` — `qmd update && qmd embed` (rebuild index from markdown)
- `slipbox_status()` — counts by type, QMD index freshness, tool readiness
- `slipbox_doctor()` — check for qmd + extraction CLIs; print install guidance
- commands: `/init` (scaffold a folder), `/tutor` (interactive tour)

Planned: `slipbox_moc(topic|cluster)` — draft a Map of Content (Phase 4).

## External dependencies (detected + guided, per D2)

| Tool | Used for | If missing |
| --- | --- | --- |
| **qmd** (`@tobilu/qmd`) | index, embed, search | required; guide `npm i -g @tobilu/qmd` (+ `brew install sqlite` on macOS) |
| **pandoc** | epub/docx/html → markdown | guide install; skip those source types |
| **yt-dlp** | YouTube audio/subtitles | guide install; skip video sources |
| **ffmpeg** | audio extraction/convert | guide install; skip audio sources |
| **whisper** (whisper.cpp / faster-whisper) | audio/podcast → transcript | guide install; skip transcription |
| PDF extractor (TBD: TS lib vs `pdftotext`) | pdf → text | guide/skip |

`slipbox_doctor` surfaces exactly what's installed and what each missing tool
would unlock.

## Phase 2+ (later)

- **Render**: static-site / localhost server over the markdown (Phase 2).
- **Curation**: dedupe, merge, prune, refine tools (Phase 3).
- **MOCs**: cluster → outline → summary note (Phase 4).
- **Permanent notes**: literature → permanent promotion workflow (Phase 5).
