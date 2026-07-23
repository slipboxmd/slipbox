# Scaling literature-note linking

`slipbox_autolink` connects each literature note to its most similar others. It
must stay cheap as a slipbox grows to hundreds of books / thousands of episodes.

## Where we are (after the OOM fix)

- Autolink no longer reads source chunks — only literature-note vectors
  (filtered in the query). For the 8-book corpus that's 604 KB / ~75 MB peak.
- **Remaining limits:**
  - **O(N²) time** — a full re-link compares every note to every other. At ~7,500
    notes (≈300 books) that's ~40 B ops ≈ 1 min; it degrades past ~10–20 k notes.
  - **O(N) memory** — it loads all note vectors (768 floats each). 10 k notes ≈
    60 MB, 100 k ≈ 600 MB. Fine for realistic sizes, heavy at the extreme.
  - It **re-links the whole slipbox every call**, even after adding one source.

## Why we can't just use QMD's index for KNN

Spiked it: a KNN query over QMD's `vectors_vec` returns the globally-nearest
vectors, but **source chunks vastly outnumber notes** (8 books ≈ 2,000+ chunks vs
60 notes), so a note's nearest vectors are almost all source passages — only
3 of 60 KNN hits were notes. Over-fetching to compensate gets worse as the corpus
grows. QMD `vsearch -c <collection>` can scope, but only by collection, and
re-embeds a text query (lossy vs the stored note vector).

## Plan

1. **Incremental linking (now).** Only link the *new* notes (those without links
   yet) into the existing network, not re-link everything. Turns each ingest from
   O(N²) into O(new × N). A `relink_all` flag does a full pass when wanted. This
   pushes the practical ceiling well past hundreds of books.
2. **Scoped ANN index (for extreme scale).** To drop the O(N) vector load + O(N²)
   entirely, give literature notes their own vector index so KNN is note-scoped:
   - **Option A — dedicated sqlite-vec table** of only note vectors that we
     maintain (add on write, KNN on link). Exact stored vectors, full control.
   - **Option B — literature notes as a separate QMD collection** so
     `qmd vsearch -c notes` is note-scoped. Delegates to QMD; re-embeds query text.
   Either gives O(new · log N) time and O(K) memory — scales to any size.

Recommendation: ship incremental now (this doc's step 1); build the scoped ANN
index (step 2, likely Option A) when a slipbox actually reaches tens of thousands
of notes, or sooner if we want it airtight.

**Decision (2026-07-23): incremental (step 1) is done and deemed good enough for
now; the ANN index (step 2) is deferred until a slipbox actually gets that large.**
