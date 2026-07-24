# The LLM & AI field — an example slipbox

A slipbox built from **40 landmark papers in modern AI / large language models**,
grouped into sub-fields (foundations, pretraining, scaling, alignment/RLHF,
reasoning & agents, efficiency, multimodal). It tests the harness on **dense,
technical PDFs** and whether cross-note linking draws the through-lines of the
field — attention → transformers → scaling → RLHF → tool use / retrieval.

**Format:** PDF (via the M2 PDF extractor — drop a `.pdf` in `sources/` and the
harness converts it to markdown in `sources/extracted/`).

## What it covers

See [SOURCES.md](SOURCES.md) for the full categorized list with arXiv ids.

## Corpus (git submodule)

The PDFs live in [slipboxmd/examples-ai](https://github.com/slipboxmd/examples-ai),
mounted here at `sources/`. Get them with:

```bash
git submodule update --init examples/ai/sources
# or clone the whole repo with --recursive
```

## How it's built

```bash
cd examples/ai
slipbox
> ingest attention-is-all-you-need.pdf
> …one per paper, then link + summarize
```

Each paper → a reference + literature notes on its core ideas; `slipbox_autolink`
connects shared concepts across papers.
