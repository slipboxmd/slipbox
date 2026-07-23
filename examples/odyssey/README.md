# The Odyssey — an example slipbox

A slipbox built from **Homer's *Odyssey*: multiple translations + public-domain
commentary**. It tests how the harness handles the *same work seen many ways* —
several translations of one text plus essays about it — and whether cross-note
linking surfaces the connections between them (a scene in Butler's prose linking
to the same scene in Pope's verse, and to a critic's reading of it).

**Format:** books / plain text (Project Gutenberg `.txt`). This one **runs today**
— text is the format the harness already supports.

## What it covers

Four English translations of *The Odyssey* (prose and verse, 18th–20th c.) plus
public-domain commentary and essays on Homer. See [SOURCES.md](SOURCES.md).

## How it's built

Follows the standard flow — each source is one file in `sources/`, cleaned into
`sources/extracted/` for indexing:

```
# with QMD installed, in this folder:
slipbox                                  # or `pi` with @slipbox/core
> ingest butler-odyssey.txt              # (drop the .txt files in sources/ first)
> ingest pope-odyssey.txt
> …then link + summarize
```

Each translation becomes a reference with its own literature notes; `slipbox_autolink`
connects related passages/ideas across translations and commentary.

## Status

Sources tracked in [SOURCES.md](SOURCES.md); drop the Gutenberg `.txt` files into
`sources/` to run. (Generated `sources/extracted/` and `.qmd/` are gitignored.)
