# Silicon Valley Titans — example slipbox

A [slipbox](../../README.md) built from the writing of people known for their
ideas about **building and running technology startups** — founders, operators,
and investors who wrote a lot: Paul Graham, Naval Ravikant, Marc Andreessen, Sam
Altman, Peter Thiel, Ben Horowitz, Fred Wilson, Reid Hoffman, Chris Dixon, Balaji
Srinivasan, Joel Spolsky, Patrick McKenzie, 37signals (Jason Fried / DHH), and
Jeff Bezos.

It's a **thematic** corpus, not a complete-works archive: each author's writing is
filtered down to the startup/operating material (founding, product, growth,
hiring, management, fundraising, strategy, scaling) and their off-theme work is
left out. See [`SOURCES.md`](./SOURCES.md) for the roster, sources, and the exact
keep/cut rubric.

## Layout

- `sources/` — the raw source texts, one folder per author (git submodule:
  [`slipboxmd/examples-sv-titans`](https://github.com/slipboxmd/examples-sv-titans)).
- The generated slipbox (references, literature notes, links) lives alongside once
  the pipeline has been run over the sources.

## Reproducing

```
slipbox ingest sources/paul-graham/ds.md      # a text source
slipbox ingest sources/jeff-bezos/shareholder-letters-1997-2020.pdf   # a PDF
```

Ingesting the web/PDF sources needs the M2 format extractors (pdftotext, pandoc,
trafilatura). Run `slipbox doctor` to check your tools; see
[`docs/FORMATS.md`](../../docs/FORMATS.md).

## Attribution & copyright

The texts in `sources/` are the property of their respective authors and are
included here for study and to demonstrate the slipbox pipeline. Each file records
its source URL. Nothing here is an original work of the corpus maintainers except
the slipbox notes derived from these sources. See [`NOTICE.md`](./NOTICE.md) for
per-author sources. If you are a rights holder and want your material removed, open
an issue.
