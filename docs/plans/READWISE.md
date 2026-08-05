# Readwise integration — design

`@slipbox/readwise`: an optional package that pulls Readwise highlights into a
slipbox and turns them into literature notes, incrementally. Built 2026-08-05.

## Goals

- Pull a source's highlights (Readwise books/articles, or Reader docs) into
  `sources/` as markdown with full metadata, highlights as the body.
- Run the literature-note process over those highlights.
- **Two workflows, one path:**
  1. once, after finishing a source;
  2. repeatedly, as you read and add more highlights.

## Decisions

- **Don't wrap the CLI.** The `readwise` CLI (and its skill) already fetch
  highlights well. The agent calls it directly; the package only does the
  slipbox-specific work — the marked-up capture and the incremental reconciliation.
- **Separate package**, not part of core. Registers a Pi extension (two tools) +
  the `slipbox-readwise` skill. Composes core's exported pipeline primitives.
- **Agent-driven**, like `slipbox_ingest` — the package clusters and plans; the
  agent authors the notes.
- **Incremental by re-clustering everything.** Per the user's steer, it's the
  proximity/grouping of highlights that decides update vs split vs new — so every
  sync re-clusters ALL highlights and reconciles against existing notes, rather
  than only processing new highlights in isolation.

## Provenance — the key idea

Every literature note from a Readwise source carries `readwise_highlights: [ids]` in
its frontmatter. That's the anchor that makes re-runs correct:

- The **capture** tags each highlight with a stable `<!-- rw:<id> -->` marker.
- A **note** records which highlight ids it drew from.
- On sync, `unnoted = all source highlight ids − union(note.readwise_highlights)`.

Ids are Readwise's stable highlight ids, so they survive re-syncs, edits, and
re-ordering. The capture/reference/extracted files use a **stable id** derived from
the source (`rw-<slug>`, de-duplicated), not a timestamp — so a re-sync overwrites
the same files and provenance keeps lining up.

## Pipeline (per sync)

```
readwise … --json  →  parse  →  writeCapture(sources/<slug>.md)
                                    │
      writeExtracted + writeReference (stable id, enriched metadata)
                                    │
             QMD ensureIndex → update → embed
                                    │
        readChunks → cluster(all highlights)
                                    │
   map chunks→highlights (text overlap) ; read existing notes' provenance
                                    │
                    reconcile → plan (per cluster)
```

**reconcile** classifies each cluster by its highlights vs existing notes:

| suggestion | meaning | agent action |
| --- | --- | --- |
| `new` | no note covers these | write a new note |
| `extend` | overlaps one note, has new highlights | update that note (keep id, re-draft, full id set) |
| `split` | overlaps ≥2 notes (grouping shifted) | decide: update one / split / merge |
| `settled` | fully noted, nothing new | skipped (not returned) |

The classification is a hint; the agent makes the call from the highlights.

## Chunk → highlight mapping

Clustering runs on QMD chunks; notes are anchored to highlights. A chunk covers a
highlight when either contains the other's ~48-char signature (normalized) —
handling both "several short highlights in one chunk" and "one long highlight split
across chunks". A cluster's highlights = union over its chunks.

## Modules

```
packages/readwise/src/
  parse.ts      readwise JSON → normalized Highlight/ReadwiseSource (tolerant)
  capture.ts    build/write sources/<slug>.md + stable-id lookup by readwise_id
  reconcile.ts  chunk→highlight map + cluster classification (pure, tested)
  sync.ts       orchestration: capture → core pipeline → reconcile → plan
  tools.ts      slipbox_readwise_sync, slipbox_readwise_write_note
  extension.ts  Pi extension entry
  skills/readwise/SKILL.md   the agent-facing workflow
```

Core exposes the primitives it composes (`ingestSource` bits: `writeExtracted`,
`writeReference`, QMD `ensureIndex/update/embed`, `readChunks`, `cluster`,
`writeLiterature` with optional `id`+`extra`, frontmatter helpers) via its index.

## Status & open items

- Built + unit-tested (parse, capture markers, chunk↔highlight map, reconcile
  classifications) and verified end-to-end against real QMD embeddings: a sync →
  note → re-sync run correctly reports new → settled → extend.
- **Not yet run against a live Readwise account** — the CLI's exact `--json` field
  names are handled defensively (`parse.ts`) but should be checked on first real
  use; adjust the normalizers if a field is named differently.
- Short highlights cluster tighter than book prose; a Readwise-heavy slipbox may
  want a higher `clustering.threshold`.
- Reader-doc metadata fetch (`reader-list-documents --id`) is best-effort.
- Not distributed yet (npm publish + docs) — it's a workspace package.
