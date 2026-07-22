# The `.slipbox` config file (DRAFT)

`.slipbox` is to a slipbox what `CLAUDE.md` is to a Claude project: a single
file at the root of a knowledge base that configures how the harness manages it.
It is **our** convention — read by `pi-slipbox`'s code, not by Pi itself.

Open question: format. Pi's own settings are JSON; a slipbox owner might prefer
YAML or markdown-with-frontmatter (human-editable, can hold prose house-style
notes). Proposed: **markdown with a YAML frontmatter config block**, so the file
doubles as machine config + human-readable "house style" instructions the agent
reads into context.

## Proposed shape

```markdown
---
# --- Layout: where each note type lives (relative to this file) ---
paths:
  references: references/
  reference_notes: reference-notes/
  literature_notes: literature-notes/
  permanent_notes: permanent-notes/
  maps: maps/
  sources: sources/          # cached extracted text (optional)
  index: .slipbox-index/      # derived cache (gitignored)

# --- Index / embeddings / search: delegated to QMD ---
# The harness drives QMD (github.com/tobi/qmd) for chunking, embedding, the
# vector+keyword index, and search. Chunking and embedding model are QMD's
# concern — set them in QMD's config (.qmd/index.yml `models.embed`) or via
# QMD_EMBED_MODEL — not here. This block only tells the harness how to talk to QMD.
qmd:
  collection: slipbox         # QMD collection name for this slipbox
  search_mode: query          # query (hybrid, best) | vsearch | search
  # embed_model is set in .qmd/index.yml or QMD_EMBED_MODEL, not here.

# --- Clustering (harness-owned; groups QMD chunk vectors into ideas) ---
clustering:
  method: hdbscan             # hdbscan | kmeans | agglomerative  (see ARCHITECTURE O4)
  min_cluster_size: 4

# --- Note conventions ---
notes:
  id_style: timestamp         # timestamp | slug | uid
  link_style: wikilink        # wikilink [[..]] | markdown []()
  frontmatter: yaml
---

# House style

Free-form instructions the agent should follow when writing notes for THIS
slipbox — tone, note length, tagging conventions, what makes a good permanent
note here, topics of interest, etc. Injected into agent context each session.
```

## Note frontmatter (proposed)

Every generated note carries YAML frontmatter, e.g. a literature note:

```markdown
---
id: 20260722T1043-affect-heuristic
type: literature-note
title: The affect heuristic shortcuts risk judgment
source: "[[ref/kahneman-thinking-fast-and-slow]]"
chunks: [c0182, c0184]
tags: [decision-making, heuristics]
links: ["[[lit/availability-cascade]]"]
created: 2026-07-22
---

In their own words: a one-idea note capturing the atomic thought, with a
pointer back to where it came from…
```

## Notes

- Everything above is a starting point; fields will change as we build Phase 1.
- The config should degrade gracefully: missing sections fall back to defaults.
- `.slipbox` lives in the slipbox repo (the user's knowledge base), not in this
  harness repo. This repo ships an **example** under `examples/`.
