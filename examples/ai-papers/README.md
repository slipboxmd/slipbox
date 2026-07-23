# The LLM & AI field — an example slipbox

A slipbox built from **foundational papers in modern AI / large language models**.
It tests the harness on **dense, technical PDFs** and whether cross-note linking
draws the through-lines of the field (attention → transformers → scaling → RLHF →
tool use / retrieval).

**Format:** PDF. Needs the PDF extractor (roadmap M2) — drop a `paper.pdf` in
`sources/`, and the harness converts it to markdown in `sources/extracted/`.

## What it covers

~15 landmark papers from word embeddings and attention through GPT-scale models,
instruction tuning, RLHF, retrieval, and agents/tool use. See [SOURCES.md](SOURCES.md).

## How it's built

```
# (once the PDF extractor lands)
# drop the PDFs into sources/  (or ingest by arXiv URL)
slipbox
> ingest attention-is-all-you-need.pdf
> …one per paper, then link + summarize
```

Each paper → a reference + literature notes on its core ideas; `slipbox_autolink`
connects shared concepts across papers.

## Status

Sources tracked in [SOURCES.md](SOURCES.md). Blocked on the PDF extractor (M2).
All papers are openly available on arXiv.
