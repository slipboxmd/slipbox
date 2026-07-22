# Spike: QMD as the index/embed/search layer

Date: 2026-07-22. QMD version **2.5.3**. Goal: confirm we can build the Phase-1
pipeline on QMD — specifically, get chunk **vectors + text** out for clustering
into literature notes. **Result: confirmed viable.**

## Environment facts

- Install: `npm i -g @tobilu/qmd`. Needs Node ≥22 / Bun. macOS: Homebrew SQLite
  present (QMD bundles `better-sqlite3` 12.x + `sqlite-vec` 0.1.9; runs on Metal).
- Models auto-download on `qmd pull` (~2.1 GB total): embeddinggemma-300M-Q8
  (embed, **768-dim**), qwen3-reranker-0.6b (rerank), qmd-query-expansion-1.7B
  (query expansion). Cached in `~/.cache/qmd/models/`.
- Embedding model is swappable via `QMD_EMBED_MODEL` or `.qmd/index.yml`
  `models.embed` (embeddinggemma default; Qwen3-Embedding for multilingual).

## Lifecycle (project-local)

```bash
qmd init                         # creates .qmd/index.yml + .qmd/index.sqlite
qmd collection add . --name slipbox   # register the slipbox dir (**/*.md)
qmd update                       # scan fs → FTS5 index (keyword works immediately)
qmd embed                        # chunk + embed → sqlite-vec  (~1s for tiny corpus)
qmd search "q" --json            # BM25;  qmd vsearch = vector;  qmd query = hybrid+rerank
```

## SQLite schema (the important part)

`.qmd/index.sqlite` tables we care about:

- `content(hash PK, doc, created_at)` — **full document text** per content hash.
- `documents(id, collection, path, title, hash, active, …)` — path → hash map.
- `content_vectors(hash, seq, pos, model, embed_fingerprint, total_chunks,
  embedded_at, PK(hash,seq))` — one row **per chunk**. `pos` is a **character
  offset into `content.doc`**; `total_chunks` = chunk count for that doc.
- `vectors_vec` — sqlite-vec virtual table:
  `vec0(hash_seq TEXT PRIMARY KEY, embedding float[768] distance_metric=cosine)`.
  **Key format: `"<hash>_<seq>"`** (underscore).
- `documents_fts` — FTS5 (porter/unicode61) over filepath/title/body.

### Getting all chunk vectors + text (verified)

```js
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
const db = new Database('.qmd/index.sqlite'); sqliteVec.load(db);

const rows = db.prepare(`
  SELECT v.hash_seq, cv.hash, cv.seq, cv.pos, cv.total_chunks,
         d.path, d.title, vec_to_json(v.embedding) AS vec
  FROM vectors_vec v
  JOIN content_vectors cv ON (cv.hash || '_' || cv.seq) = v.hash_seq
  JOIN documents d ON d.hash = cv.hash AND d.active = 1
`).all();
// chunk text ≈ content.doc.slice(pos[i], pos[i+1] ?? doc.length)
```

- Verified: 9-chunk doc → 9 rows, 768-dim vectors, cosine between distinct notes
  ~0.47. Text slices align with vectors.
- **Caveat:** stored vectors are **not unit-normalized** (norms ~370–520);
  normalize before cosine/clustering. Also, `pos`-slicing yields **approximate,
  non-overlapping** chunk text (QMD embeds ~900-token chunks with 15% overlap +
  smart boundaries), so slices can start mid-word. Fine for "what is this cluster
  about"; use `qmd get path:line` for clean surrounding context when needed.

## Node SDK (`@tobilu/qmd`)

`import { createStore } from '@tobilu/qmd'` → `QMDStore`:
`search` (hybrid+rerank), `searchLex` (BM25), `searchVector` (vector), `get`,
`getDocumentBody`, `multiGet`, `update`, `embed`, `getStatus`, collection/context
mgmt, `.internal` (advanced), `.close()`. Reopen an existing index by passing just
`dbPath`. The `llm` module also exposes `embed(text)`/`embedBatch(texts)` →
`{ embedding: number[] }` and `DEFAULT_EMBED_MODEL_URI` — i.e. QMD can embed
arbitrary text for us on demand.

## Decision inputs

Two viable ways to feed clustering:

- **Reuse QMD chunk vectors (recommended):** read `.qmd/index.sqlite` as above.
  No recompute; exact vectors; approximate chunk text (ok). Couples to schema.
- **Own-chunk + QMD embed:** we split the reference doc, call `llm.embedBatch`.
  Exact chunk text we control; small recompute; no schema coupling.

Either way QMD stays the embedding engine + search index; the harness adds
clustering + note semantics. See ARCHITECTURE O4 / O9.
